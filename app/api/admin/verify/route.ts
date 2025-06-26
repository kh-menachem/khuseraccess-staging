import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), "google-credentials-admin.json")
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID

    // Check if there's an Admin sheet
    let isAdmin = false
    let adminUser = null

    try {
      // First, verify the Admin sheet exists
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      })

      const sheetNames = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || []

      if (!sheetNames.includes("Admin")) {
        console.log("Admin sheet not found in spreadsheet")
        return NextResponse.json({
          success: false,
          error: "Admin sheet not found in spreadsheet",
          availableSheets: sheetNames,
        })
      }

      // Get Admin sheet data
      const adminResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Admin!A:Z",
      })

      const adminData = adminResponse.data.values || []
      console.log("Admin sheet data:", adminData)

      if (adminData.length <= 1) {
        console.log("No admin users found in Admin sheet")
        return NextResponse.json({
          success: false,
          error: "No admin users found in Admin sheet",
        })
      }

      const headerRow = adminData[0]
      console.log("Admin sheet headers:", headerRow)

      // Find the email and name columns
      const emailIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "email" ||
          header?.toLowerCase().trim() === "user email" ||
          header?.toLowerCase().trim() === "admin email",
      )

      const nameIndex = headerRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "name" ||
          header?.toLowerCase().trim() === "full name" ||
          header?.toLowerCase().trim() === "admin name",
      )

      console.log("Email column index:", emailIndex)
      console.log("Name column index:", nameIndex)

      if (emailIndex === -1) {
        return NextResponse.json({
          success: false,
          error: "Email column not found in Admin sheet",
          availableColumns: headerRow,
        })
      }

      // Check if user email exists in admin sheet
      const adminRow = adminData.slice(1).find((row: string[]) => {
        const adminEmail = row[emailIndex]?.toLowerCase().trim()
        const userEmail = email.toLowerCase().trim()
        console.log(`Comparing: "${adminEmail}" === "${userEmail}"`)
        return adminEmail === userEmail
      })

      if (adminRow) {
        isAdmin = true
        adminUser = {
          email: adminRow[emailIndex],
          name: nameIndex !== -1 ? adminRow[nameIndex] : email.split("@")[0],
        }
        console.log("Admin user found:", adminUser)
      } else {
        console.log("User not found in admin sheet")
        // Show sample emails for debugging
        const sampleEmails = adminData
          .slice(1, 6)
          .map((row) => row[emailIndex])
          .filter(Boolean)
        console.log("Sample admin emails:", sampleEmails)
      }
    } catch (error) {
      console.error("Error accessing Admin sheet:", error)
      return NextResponse.json({
        success: false,
        error: "Error accessing Admin sheet",
        details: error instanceof Error ? error.message : String(error),
      })
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      adminUser,
    })
  } catch (error) {
    console.error("Error verifying admin access:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify admin access",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
