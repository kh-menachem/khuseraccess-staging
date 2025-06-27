import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: NextRequest) {
  console.log("Auth API route called")

  try {
    const { email } = await request.json()
    console.log("Email received:", email)

    if (!email) {
      console.log("No email provided")
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
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
        },
        { status: 500 },
      )
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), "google-credentials.json")
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
        },
        { status: 500 },
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
        },
        { status: 500 },
      )
    }

    try {
      // First, verify the spreadsheet exists and get available sheets
      console.log("Verifying spreadsheet access")
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      })

      const sheetNames = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || []
      console.log("Available sheets:", sheetNames)

      // Check if People sheet exists
      if (!sheetNames.includes("People")) {
        console.log("People sheet not found")
        return NextResponse.json(
          {
            success: false,
            error: "People sheet not found in spreadsheet",
            availableSheets: sheetNames,
          },
          { status: 404 },
        )
      }

      // Fetch the People sheet - Updated to include columns A through AQ
      console.log("Fetching People sheet (A:AQ)")
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "People!A:AQ",
      })

      const rows = response.data.values || []
      console.log("Rows fetched:", rows.length)

      if (rows.length === 0) {
        console.log("No data found in People sheet")
        return NextResponse.json({ success: false, error: "No data found in People sheet" }, { status: 404 })
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

      console.log("Name column index:", nameIndex)

      if (userAccessIndex === -1) {
        console.log("User access column not found")
        return NextResponse.json(
          {
            success: false,
            error: "User access column not found in People sheet",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500 },
        )
      }

      if (uniqueIdIndex === -1) {
        console.log("UNIQUEID column not found")
        return NextResponse.json(
          {
            success: false,
            error: "UNIQUEID column not found in People sheet",
            availableColumns: headerRow,
            totalColumns: headerRow.length,
          },
          { status: 500 },
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
        console.log("User not found")
        // Show some sample emails for debugging
        const sampleEmails = rows
          .slice(1, 6)
          .map((row) => row[userAccessIndex])
          .filter(Boolean)
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
            sampleEmails: sampleEmails,
            emailColumnName: headerRow[userAccessIndex],
            totalColumns: headerRow.length,
          },
          { status: 404 },
        )
      }

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

      console.log("Processed accounts:", accounts)

      return NextResponse.json({
        success: true,
        user: {
          email: email,
          accounts: accounts,
          hasMultipleAccounts: accounts.length > 1,
        },
      })
    } catch (error) {
      console.error("Spreadsheet access error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to access spreadsheet",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during authentication",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
