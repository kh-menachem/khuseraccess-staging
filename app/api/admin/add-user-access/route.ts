import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  let tempFilePath: string | null = null

  try {
    const { accountNumber, userEmail } = await request.json()

    console.log("=== ADD USER ACCESS REQUEST ===")
    console.log("Account Number:", accountNumber)
    console.log("User Email:", userEmail)

    if (!accountNumber || !userEmail) {
      return NextResponse.json({ success: false, error: "Account number and user email are required" }, { status: 400 })
    }

    // Validate account number is 4 digits
    if (!/^\d{4}$/.test(accountNumber)) {
      return NextResponse.json({ success: false, error: "Account number must be 4 digits" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      console.error("Google credentials not found in environment variables")
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    tempFilePath = join(os.tmpdir(), `google-credentials-${Date.now()}.json`)
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client with write permissions
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID

    if (!spreadsheetId) {
      console.error("Spreadsheet ID not found in environment variables")
      return NextResponse.json({ success: false, error: "Spreadsheet ID not found" }, { status: 500 })
    }

    console.log("Testing spreadsheet access...")

    // First test if we can access the spreadsheet at all
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      })
      console.log("Spreadsheet access successful:", spreadsheet.data.properties?.title)
    } catch (accessError: any) {
      console.error("Cannot access spreadsheet:", accessError.message)

      if (accessError.message?.includes("does not have permission")) {
        return NextResponse.json(
          {
            success: false,
            error: "Service account does not have access to the spreadsheet",
            details:
              "Please share the Google Spreadsheet with the service account email and grant 'Editor' permissions",
            serviceAccountEmail: "firebase-adminsdk-fbsvc@khuserappsheet.iam.gserviceaccount.com",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Cannot access spreadsheet",
          details: accessError.message,
        },
        { status: 500 },
      )
    }

    console.log("Fetching People sheet data...")

    // Get the specific columns we need: U (Unique Number) and AN (User Access)
    // Column U = index 20 (U is the 21st letter, 0-indexed = 20)
    // Column AN = index 39 (A=0, N=13, so AN = 26+13 = 39)
    const uniqueNumberColumn = "U" // Column U
    const userAccessColumn = "AN" // Column AN

    // First, get the header row to verify columns
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "People!U1:AN1",
    })

    const headerData = headerResponse.data.values?.[0] || []
    console.log("Header data - Column U:", headerData[0])
    console.log("Header data - Column AN:", headerData[headerData.length - 1])

    // Get all data from columns U and AN
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "People!U:AN",
    })

    const allData = dataResponse.data.values || []
    console.log("Total rows found:", allData.length)

    if (allData.length === 0) {
      return NextResponse.json({ success: false, error: "No data found in People sheet" }, { status: 404 })
    }

    // Find the row with the matching account number in column U (index 0 in our range)
    let targetRowIndex = -1
    console.log(`Searching for account number: "${accountNumber}" in column U`)

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i]
      const uniqueNumberValue = row[0] // Column U is index 0 in our U:AN range

      if (!uniqueNumberValue) continue

      // Try different formats
      const cellString = uniqueNumberValue.toString().trim()
      const cellNumber = cellString.replace(/\D/g, "") // Remove non-digits

      console.log(`Row ${i + 1}: Column U value: "${uniqueNumberValue}" -> "${cellString}" -> "${cellNumber}"`)

      if (
        cellString === accountNumber ||
        cellNumber === accountNumber ||
        cellString === accountNumber.toString() ||
        Number.parseInt(cellString) === Number.parseInt(accountNumber)
      ) {
        targetRowIndex = i + 1 // +1 because sheets are 1-indexed
        console.log("Found matching account at row:", targetRowIndex)

        // Show current User Access value (column AN is the last column in our range)
        const currentUserAccess = row[row.length - 1] || "(empty)"
        console.log("Current User Access value:", currentUserAccess)
        break
      }
    }

    if (targetRowIndex === -1) {
      // Show sample data for debugging
      const sampleData = allData.slice(1, 11).map((row, index) => ({
        row: index + 2,
        uniqueNumber: row[0] || "(empty)",
        userAccess: row[row.length - 1] || "(empty)",
      }))

      console.log("Account number not found. Sample data from columns U and AN:", sampleData)

      return NextResponse.json(
        {
          success: false,
          error: `Account number ${accountNumber} not found in column U`,
          sampleData: sampleData,
          hint: "Check if the account number exists in column U of the People sheet",
        },
        { status: 404 },
      )
    }

    // Update column AN (User Access) for the found row
    const range = `People!${userAccessColumn}${targetRowIndex}`

    console.log("Updating range:", range, "with email:", userEmail)

    try {
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[userEmail]],
        },
      })

      console.log("Update response:", updateResponse.data)
      console.log("User access updated successfully")

      // Verify the update by reading the cell back
      const verifyResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      const updatedValue = verifyResponse.data.values?.[0]?.[0]
      console.log("Verified updated value:", updatedValue)

      return NextResponse.json({
        success: true,
        message: `User access added successfully for account ${accountNumber}`,
        accountNumber,
        userEmail,
        updatedRow: targetRowIndex,
        updatedRange: range,
        updatedValue: updatedValue,
        note: "User can now login with their email to access this account",
      })
    } catch (updateError: any) {
      console.error("Error updating spreadsheet:", updateError)

      if (
        updateError.message?.includes("does not have permission") ||
        updateError.message?.includes("insufficient permission")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "No permission to edit spreadsheet",
            details: "The service account needs 'Editor' permissions on the Google Spreadsheet",
            solution: "Share the spreadsheet with the service account email and grant 'Editor' access",
            serviceAccountEmail: "firebase-adminsdk-fbsvc@khuserappsheet.iam.gserviceaccount.com",
            steps: [
              "1. Open your Google Spreadsheet",
              "2. Click 'Share' button (top right)",
              "3. Add this email: firebase-adminsdk-fbsvc@khuserappsheet.iam.gserviceaccount.com",
              "4. Set permission to 'Editor' (not Viewer!)",
              "5. Click 'Send'",
              "6. Wait 1-2 minutes, then try again",
            ],
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to update spreadsheet",
          details: updateError.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error adding user access:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add user access",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (e) {
        console.error("Error cleaning up temp file:", e)
      }
    }
  }
}
