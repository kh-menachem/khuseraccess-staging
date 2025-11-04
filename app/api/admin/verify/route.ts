import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: NextRequest) {
  console.log("Admin verify API route called")

  try {
    const { email } = await request.json()
    console.log("Email received for admin verification:", email)

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
    const tempFilePath = join(os.tmpdir(), "google-credentials-admin.json")
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
    console.log("Initializing Google Auth for admin verification")
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
      console.log("Verifying spreadsheet access for admin check")
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      })

      const sheetNames = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || []
      console.log("Available sheets:", sheetNames)

      // Check if Admin sheet exists
      if (!sheetNames.includes("Admin")) {
        console.log("Admin sheet not found")
        return NextResponse.json(
          {
            success: false,
            error: "Admin sheet not found in spreadsheet",
            availableSheets: sheetNames,
          },
          { status: 404 },
        )
      }

      // Fetch the Admin sheet - only need email column
      console.log("Fetching Admin sheet")
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Admin!A:Z", // Get all columns to be safe
      })

      const rows = response.data.values || []
      console.log("Admin rows fetched:", rows.length)

      if (rows.length === 0) {
        console.log("No data found in Admin sheet")
        return NextResponse.json({ success: false, error: "No data found in Admin sheet" }, { status: 404 })
      }

      const headerRow = rows[0]
      console.log("Admin header row:", headerRow)

      const emailIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "email" ||
          header?.toLowerCase().trim() === "admin email" ||
          header?.toLowerCase().trim() === "user email",
      )

      const roleIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "role")

      console.log("Email column index in Admin sheet:", emailIndex)
      console.log("Role column index in Admin sheet:", roleIndex)

      if (emailIndex === -1) {
        console.log("Email column not found in Admin sheet")
        return NextResponse.json(
          {
            success: false,
            error: "Email column not found in Admin sheet",
            availableColumns: headerRow,
          },
          { status: 500 },
        )
      }

      // Check if the email exists in Admin sheet
      console.log("Looking for admin with email:", email)
      const adminRow = rows.find((row: string[]) => {
        if (!row[emailIndex]) return false
        const adminEmail = row[emailIndex].toLowerCase().trim()
        return adminEmail === email.toLowerCase().trim()
      })

      if (adminRow) {
        const role = roleIndex !== -1 && adminRow[roleIndex] ? adminRow[roleIndex].toLowerCase().trim() : "user"

        console.log("Admin found:", email, "with role:", role)
        return NextResponse.json({
          success: true,
          isAdmin: true,
          email: email,
          role: role, // Return the role
        })
      } else {
        console.log("Admin not found:", email)
        return NextResponse.json({
          success: true,
          isAdmin: false,
          email: email,
        })
      }
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
    console.error("Admin verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during admin verification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
