import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function GET() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ error: "No credentials found" }, { status: 404 })
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

    // Try to get the spreadsheet info
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    // Get sheet names
    const sheetNames = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || []

    // Get headers from each sheet
    const sheetHeaders = {}

    for (const sheetName of sheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:AQ1`,
        })

        if (response.data.values && response.data.values.length > 0) {
          sheetHeaders[sheetName] = response.data.values[0]
        } else {
          sheetHeaders[sheetName] = []
        }
      } catch (error) {
        sheetHeaders[sheetName] = `Error: ${error.message}`
      }
    }

    // Try to get the Percentages sheet data if it exists
    let percentagesData = null
    if (sheetNames.includes("Percentages")) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Percentages!A:D",
        })
        percentagesData = response.data.values || []
      } catch (error) {
        percentagesData = `Error: ${error.message}`
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties?.title,
      sheetNames,
      sheetHeaders,
      percentagesData: percentagesData ? percentagesData.slice(0, 5) : null, // First 5 rows of percentages
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to access spreadsheet",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
