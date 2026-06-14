import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

// This is a test endpoint to verify Google Sheets connection
export async function GET() {
  try {
    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

    if (!credentials) {
      return NextResponse.json(
        {
          success: false,
          error: "Google credentials not found",
        },
        { status: 500 },
      )
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), "google-credentials-test.json")
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Spreadsheet ID not found",
        },
        { status: 500 },
      )
    }

    // Get spreadsheet info
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    // Get sheet names
    const sheetNames = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || []

    // Try to get a sample of data from the People sheet
    let peopleData = null
    try {
      const peopleResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "People!A1:Z5", // Just get the first few rows
      })
      peopleData = peopleResponse.data.values || []
    } catch (error) {
      peopleData = `Error fetching People sheet: ${error instanceof Error ? error.message : String(error)}`
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties?.title,
      sheetNames,
      peopleData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Google Sheets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
