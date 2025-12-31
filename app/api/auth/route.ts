import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"
import crypto from "crypto"

export const maxDuration = 30

function generateRequestId() {
  return crypto.randomUUID()
}

async function logEvent(level: string, event: string, message: string, metadata: any, email?: string) {
  try {
    // Fire and forget - don't await
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        message,
        metadata: JSON.stringify(metadata),
        user: email || "",
        requestId: metadata.requestId || "",
      }),
    }).catch(() => {}) // Silently fail
  } catch (error) {
    // Ignore logging errors
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    logEvent("INFO", "AUTH_API_CALL", "Authentication API called", { method: "POST", requestId })

    console.log("Auth API route called")

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          code: "PARSE_ERROR",
        },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const { email } = body
    console.log("Email received:", email)

    if (!email) {
      logEvent("WARN", "AUTH_MISSING_EMAIL", "No email provided in auth request", { requestId })

      console.log("No email provided")
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
          code: "MISSING_EMAIL",
        },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    console.log("Credentials available:", !!credentials)

    if (!credentials) {
      console.log("No credentials found in environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Google credentials not found",
          code: "MISSING_CREDENTIALS",
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), `google-credentials-${requestId}.json`)
    console.log("Writing credentials to temp file:", tempFilePath)

    try {
      writeFileSync(tempFilePath, credentials)
      console.log("Credentials written successfully")
    } catch (writeError) {
      console.error("Error writing credentials file:", writeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to write credentials file",
          code: "WRITE_ERROR",
        },
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    // Initialize the Sheets API client
    console.log("Initializing Google Auth")
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID
    console.log("Spreadsheet ID:", spreadsheetId)

    if (!spreadsheetId) {
      console.log("No spreadsheet ID found in environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Spreadsheet ID not found",
          code: "MISSING_SPREADSHEET_ID",
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    try {
      const spreadsheet = (await Promise.race([
        sheets.spreadsheets.get({ spreadsheetId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Spreadsheet verification timeout")), 10000)),
      ])) as any

      const sheetNames = spreadsheet.data.sheets?.map((sheet: any) => sheet.properties?.title) || []
      console.log("Available sheets:", sheetNames)

      if (!sheetNames.includes("People")) {
        console.log("People sheet not found")
        return NextResponse.json(
          {
            success: false,
            error: "People sheet not found in spreadsheet",
            code: "SHEET_NOT_FOUND",
            availableSheets: sheetNames,
          },
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      console.log("Fetching People sheet (A:AQ)")
      const response = (await Promise.race([
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "People!A:AQ",
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("People sheet fetch timeout")), 15000)),
      ])) as any

      const rows = response.data.values || []
      console.log("Rows fetched:", rows.length)

      if (rows.length === 0) {
        console.log("No data found in People sheet")
        return NextResponse.json(
          {
            success: false,
            error: "No data found in People sheet",
            code: "NO_DATA",
          },
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      const headerRow = rows[0]
      console.log("Header row:", headerRow)
      console.log("Total columns found:", headerRow.length)

      // Find the UNIQUEID column (the unique identifier for each person)
      const uniqueIdIndex = headerRow.findIndex(
        (header: string) => header?.toLowerCase().trim() === "uniqueid" || header?.toLowerCase().trim() === "unique id",
      )
      console.log("UNIQUEID column index:", uniqueIdIndex)

      // Find the unique number column (the account number)
      const uniqueNumberIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "unique number" ||
          header?.toLowerCase().trim() === "uniquenumber" ||
          header?.toLowerCase().trim() === "account number" ||
          header?.toLowerCase().trim() === "accountnumber" ||
          header?.toLowerCase().trim() === "account #" ||
          header?.toLowerCase().trim() === "account#",
      )
      console.log("Unique Number column index:", uniqueNumberIndex)

      // Find the user access column (email)
      const userAccessIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "user access" ||
          header?.toLowerCase().trim() === "useraccess" ||
          header?.toLowerCase().trim() === "email" ||
          header?.toLowerCase().trim() === "user email",
      )
      console.log("User access column index:", userAccessIndex)

      // Find the name columns - look for both first and last name
      const firstNameIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "first name" ||
          header?.toLowerCase().trim() === "firstname" ||
          header?.toLowerCase().trim() === "first",
      )

      const lastNameIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "last name" ||
          header?.toLowerCase().trim() === "lastname" ||
          header?.toLowerCase().trim() === "last",
      )

      // Keep the original name index as fallback
      const nameIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "name" ||
          header?.toLowerCase().trim() === "full name" ||
          header?.toLowerCase().trim() === "fullname",
      )

      const FundDisplayNameIndex = 36 // AK (0-based)

      console.log("Name column index:", nameIndex)

      if (userAccessIndex === -1) {
        console.log("User access column not found")
        return NextResponse.json(
          {
            success: false,
            error: "User access column not found in People sheet",
            code: "USER_ACCESS_COLUMN_NOT_FOUND",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }

      if (uniqueIdIndex === -1) {
        console.log("UNIQUEID column not found")
        return NextResponse.json(
          {
            success: false,
            error: "UNIQUEID column not found in People sheet",
            code: "UNIQUEID_COLUMN_NOT_FOUND",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500, headers: { "Content-Type": "application/json" } },
        )
      }

      // Find ALL user rows with matching email
      console.log("Looking for user with email:", email)
      const userRows = rows.filter((row: string[]) => {
        if (!row[userAccessIndex]) return false
        const userEmail = row[userAccessIndex].toLowerCase().trim()
        return userEmail === email.toLowerCase().trim()
      })

      if (userRows.length === 0) {
        logEvent("WARN", "AUTH_USER_NOT_FOUND", `User not found in People sheet: ${email}`, { email, requestId }, email)

        console.log("User not found")
        const sampleEmails = rows
          .slice(1, 6)
          .map((row) => row[userAccessIndex])
          .filter(Boolean)
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
            code: "USER_NOT_FOUND",
            sampleEmails: sampleEmails,
            emailColumnName: headerRow[userAccessIndex],
            totalColumns: headerRow.length,
          },
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      const duration = Date.now() - startTime
      console.log(`[v0] Auth completed in ${duration}ms`)

      logEvent(
        "INFO",
        "AUTH_SUCCESS",
        `User authenticated successfully: ${email}`,
        { email, accountCount: userRows.length, duration, requestId },
        email,
      )

      console.log(`Found ${userRows.length} accounts for user:`, email)

      // Process each account
      const accounts = userRows.map((userRow, index) => {
        const userId = userRow[uniqueIdIndex] // This is the UNIQUEID from People table

        // Get the unique number (account number)
        let accountNumber = ""
        if (uniqueNumberIndex !== -1 && userRow[uniqueNumberIndex]) {
          accountNumber = userRow[uniqueNumberIndex].trim()
        } else {
          // Fallback to UNIQUEID if unique number column not found
          accountNumber = userId
        }

        let FundDisplayName = ""

        if (userRow[FundDisplayNameIndex]) {
          FundDisplayName = userRow[FundDisplayNameIndex].trim()
        }

        // 1️⃣ People!AK override
        let fullName = ""

        // First + Last (still needed as fallback)
        let firstName = ""
        let lastName = ""

        if (firstNameIndex !== -1 && userRow[firstNameIndex]) {
          firstName = userRow[firstNameIndex].trim()
        }

        if (lastNameIndex !== -1 && userRow[lastNameIndex]) {
          lastName = userRow[lastNameIndex].trim()
        }

        if (FundDisplayName) {
          fullName = FundDisplayName
        } else if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`
        } else if (firstName || lastName) {
          fullName = firstName || lastName
        } else if (nameIndex !== -1 && userRow[nameIndex]) {
          fullName = userRow[nameIndex].trim()
        } else {
          fullName = email.split("@")[0]
        }

        return {
          userId,
          accountNumber,
          name: fullName, // display name
          firstName,
          lastName,
          FundDisplayName, // 👈 THIS IS THE KEY
        }
      })

      console.log("Processed accounts:", accounts)

      return NextResponse.json(
        {
          success: true,
          user: {
            email: email,
            accounts: accounts,
            hasMultipleAccounts: accounts.length > 1,
            FundDisplayName: accounts[0]?.FundDisplayName || "", // Use fund display name for primary account
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      )
    } catch (error) {
      const duration = Date.now() - startTime

      logEvent(
        "ERROR",
        "AUTH_SPREADSHEET_ERROR",
        "Failed to access spreadsheet",
        {
          error: error instanceof Error ? error.message : String(error),
          duration,
          requestId,
        },
        email,
      )

      console.error("Spreadsheet access error:", error)

      const errorMessage =
        error instanceof Error && error.message.includes("timeout")
          ? "Request timed out. Please try again."
          : error instanceof Error
            ? error.message
            : String(error)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to access spreadsheet",
          code: error instanceof Error && error.message.includes("timeout") ? "TIMEOUT" : "SPREADSHEET_ERROR",
          details: errorMessage,
        },
        {
          status: error instanceof Error && error.message.includes("timeout") ? 504 : 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    const duration = Date.now() - startTime

    console.error("Authentication error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during authentication",
        code: "AUTH_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
