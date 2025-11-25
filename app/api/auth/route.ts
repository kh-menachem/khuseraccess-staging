import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"
import { writeLogToSheet } from "@/lib/server-logger"

export const maxDuration = 60

async function handleWithErrorBoundary(handler: () => Promise<NextResponse>) {
  try {
    return await handler()
  } catch (error) {
    console.error("[AUTH FATAL ERROR]", error)

    return NextResponse.json(
      {
        success: false,
        error: "Server error occurred",
        code: "FATAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    )
  }
}

export async function POST(request: NextRequest) {
  return handleWithErrorBoundary(async () => {
    const requestId = request.headers.get("x-request-id") || globalThis.crypto.randomUUID()
    const startTime = Date.now()

    writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "INFO",
      event: "AUTH_API_CALL",
      message: "Authentication API called",
      metadata: JSON.stringify({ method: "POST" }),
      requestId,
    }).catch(console.error)

    console.log("[AUTH] API route called")

    let body
    try {
      const text = await request.text()
      console.log("[AUTH] Request body text:", text)

      if (!text || text.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "Empty request body",
            code: "EMPTY_BODY",
          },
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      body = JSON.parse(text)
    } catch (parseError) {
      console.error("[AUTH] Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          code: "PARSE_ERROR",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error",
        },
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const { email } = body
    console.log("[AUTH] Email received:", email)

    if (!email) {
      writeLogToSheet({
        timestamp: new Date().toISOString(),
        level: "WARN",
        event: "AUTH_MISSING_EMAIL",
        message: "No email provided in auth request",
        requestId,
      }).catch(console.error)

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
    console.log("[AUTH] Credentials available:", !!credentials)

    if (!credentials) {
      return NextResponse.json(
        {
          success: false,
          error: "Google credentials not configured",
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
    console.log("[AUTH] Writing credentials to temp file:", tempFilePath)

    try {
      writeFileSync(tempFilePath, credentials)
    } catch (writeError) {
      console.error("[AUTH] Error writing credentials file:", writeError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to initialize Google authentication",
          code: "WRITE_ERROR",
          details: writeError instanceof Error ? writeError.message : "Unknown error",
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Initialize the Sheets API client
    console.log("[AUTH] Initializing Google Auth")
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID
    console.log("[AUTH] Spreadsheet ID:", spreadsheetId)

    if (!spreadsheetId) {
      console.log("[AUTH] No spreadsheet ID found in environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Spreadsheet ID not configured",
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
        new Promise((_, reject) => setTimeout(() => reject(new Error("Spreadsheet verification timeout")), 8000)),
      ])) as any

      const sheetNames = spreadsheet.data.sheets?.map((sheet: any) => sheet.properties?.title) || []
      console.log("[AUTH] Available sheets:", sheetNames)

      if (!sheetNames.includes("People")) {
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

      console.log("[AUTH] Fetching People sheet (A:AQ)")

      const response = (await Promise.race([
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "People!A:AQ",
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("People sheet fetch timeout after 12s")), 12000)),
      ])) as any

      const rows = response.data.values || []
      console.log("[AUTH] Rows fetched:", rows.length)

      if (rows.length === 0) {
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
      console.log("[AUTH] Header row:", headerRow)
      console.log("[AUTH] Total columns found:", headerRow.length)

      // Find the UNIQUEID column (the unique identifier for each person)
      const uniqueIdIndex = headerRow.findIndex(
        (header: string) => header?.toLowerCase().trim() === "uniqueid" || header?.toLowerCase().trim() === "unique id",
      )
      console.log("[AUTH] UNIQUEID column index:", uniqueIdIndex)

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
      console.log("[AUTH] Unique Number column index:", uniqueNumberIndex)

      // Find the user access column (email)
      const userAccessIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "user access" ||
          header?.toLowerCase().trim() === "useraccess" ||
          header?.toLowerCase().trim() === "email" ||
          header?.toLowerCase().trim() === "user email",
      )
      console.log("[AUTH] User access column index:", userAccessIndex)

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

      console.log("[AUTH] Name column index:", nameIndex)

      if (userAccessIndex === -1) {
        console.log("[AUTH] User access column not found")
        return NextResponse.json(
          {
            success: false,
            error: "User access column not found in People sheet",
            code: "USER_ACCESS_COLUMN_NOT_FOUND",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500 },
        )
      }

      if (uniqueIdIndex === -1) {
        console.log("[AUTH] UNIQUEID column not found")
        return NextResponse.json(
          {
            success: false,
            error: "UNIQUEID column not found in People sheet",
            code: "UNIQUEID_COLUMN_NOT_FOUND",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500 },
        )
      }

      // Find ALL user rows with matching email
      console.log("[AUTH] Looking for user with email:", email)
      const userRows = rows.filter((row: string[]) => {
        if (!row[userAccessIndex]) return false
        const userEmail = row[userAccessIndex].toLowerCase().trim()
        return userEmail === email.toLowerCase().trim()
      })

      if (userRows.length === 0) {
        await writeLogToSheet({
          timestamp: new Date().toISOString(),
          level: "WARN",
          event: "AUTH_USER_NOT_FOUND",
          message: `User not found in People sheet: ${email}`,
          metadata: JSON.stringify({ email }),
          user: email,
          requestId,
        }).catch(console.error)

        console.log("[AUTH] User not found")
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
      console.log(`[AUTH] Completed successfully in ${duration}ms for ${email}`)

      writeLogToSheet({
        timestamp: new Date().toISOString(),
        level: "INFO",
        event: "AUTH_SUCCESS",
        message: `User authenticated successfully: ${email}`,
        metadata: JSON.stringify({ email, accountCount: userRows.length, duration }),
        user: email,
        requestId,
      }).catch(console.error)

      console.log(`[AUTH] Found ${userRows.length} accounts for user:`, email)

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

        // Get first and last name, with fallbacks
        let firstName = ""
        let lastName = ""
        let fullName = ""

        if (firstNameIndex !== -1 && userRow[firstNameIndex]) {
          firstName = userRow[firstNameIndex].trim()
        }

        if (lastNameIndex !== -1 && userRow[lastNameIndex]) {
          lastName = userRow[lastNameIndex].trim()
        }

        // If we have both first and last name, use them
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`
        } else if (firstName) {
          fullName = firstName
        } else if (lastName) {
          fullName = lastName
        } else if (nameIndex !== -1 && userRow[nameIndex]) {
          // Fallback to full name column
          fullName = userRow[nameIndex].trim()
        } else {
          // Final fallback to email username
          fullName = email.split("@")[0]
        }

        return {
          userId: userId,
          accountNumber: accountNumber,
          name: fullName,
          firstName: firstName,
          lastName: lastName,
        }
      })

      console.log("[AUTH] Processed accounts:", accounts)

      return NextResponse.json(
        {
          success: true,
          user: {
            email: email,
            accounts: accounts,
            hasMultipleAccounts: accounts.length > 1,
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

      writeLogToSheet({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        event: "AUTH_SPREADSHEET_ERROR",
        message: "Failed to access spreadsheet",
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          email,
          duration,
        }),
        user: email,
        requestId,
      }).catch(console.error)

      console.error("[AUTH] Spreadsheet access error:", error)

      const isTimeout = error instanceof Error && error.message.includes("timeout")
      const errorMessage = isTimeout
        ? "Request timed out accessing database. Please try again."
        : error instanceof Error
          ? error.message
          : "Unknown error accessing database"

      return NextResponse.json(
        {
          success: false,
          error: isTimeout ? "Request timed out" : "Failed to access database",
          code: isTimeout ? "TIMEOUT" : "SPREADSHEET_ERROR",
          details: errorMessage,
        },
        {
          status: isTimeout ? 504 : 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  })
}
