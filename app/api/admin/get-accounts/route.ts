import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"
import { requireAdmin } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Verify admin authentication
  const authResult = await requireAdmin(request)

  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  console.log("Get accounts API route called by admin:", authResult.user.email)

  try {
    const { requestorEmail } = await request.json()

    // 🔒 SECURITY: Verify the authenticated user matches the requestor
    if (authResult.user.email !== requestorEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized: Email mismatch" }, { status: 403 })
    }

    console.log("Requestor email:", requestorEmail)

    if (!requestorEmail) {
      console.log("No requestor email provided")
      return NextResponse.json({ success: false, error: "Requestor email is required" }, { status: 400 })
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
    const tempFilePath = join(os.tmpdir(), "google-credentials-get-accounts.json")
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
    console.log("Initializing Google Auth for get accounts")
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
      // Fetch the People sheet to get all accounts
      console.log("Fetching People sheet for accounts")
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "People!A:Z", // Get all columns to be safe
      })

      const rows = response.data.values || []
      console.log("People rows fetched:", rows.length)

      if (rows.length === 0) {
        console.log("No data found in People sheet")
        return NextResponse.json({ success: false, error: "No data found in People sheet" }, { status: 404 })
      }

      const headerRow = rows[0]
      console.log("People header row:", headerRow)

      // Find the required columns in People sheet
      const accountNumberIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "account number" ||
          header?.toLowerCase().trim() === "accountnumber" ||
          header?.toLowerCase().trim() === "account" ||
          header?.toLowerCase().trim() === "uniqueid",
      )

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

      console.log("Column indices - Account:", accountNumberIndex, "First:", firstNameIndex, "Last:", lastNameIndex)

      if (accountNumberIndex === -1) {
        console.log("Account number column not found in People sheet")
        return NextResponse.json(
          {
            success: false,
            error: "Account number column not found in People sheet",
            availableColumns: headerRow,
          },
          { status: 500 },
        )
      }

      if (firstNameIndex === -1 || lastNameIndex === -1) {
        console.log("First name or last name column not found in People sheet")
        return NextResponse.json(
          {
            success: false,
            error: "First name or last name column not found in People sheet",
            availableColumns: headerRow,
          },
          { status: 500 },
        )
      }

      // Process all accounts from People sheet
      const accounts = []
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (row[accountNumberIndex] && row[firstNameIndex] && row[lastNameIndex]) {
          const accountNumber = row[accountNumberIndex].toString().trim()
          const firstName = row[firstNameIndex].toString().trim()
          const lastName = row[lastNameIndex].toString().trim()

          accounts.push({
            accountNumber,
            firstName,
            lastName,
          })
        }
      }

      console.log(`Found ${accounts.length} accounts in People sheet`)

      // Sort accounts by account number
      accounts.sort((a, b) => {
        const aNum = Number.parseInt(a.accountNumber) || 0
        const bNum = Number.parseInt(b.accountNumber) || 0
        return aNum - bNum
      })

      return NextResponse.json({
        success: true,
        accounts: accounts,
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
    console.error("Get accounts error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching accounts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
