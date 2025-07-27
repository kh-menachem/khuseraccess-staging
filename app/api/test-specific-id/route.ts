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

    // Try to get a sample of data from the People sheet with full column range
    let peopleData = null
    let peopleHeaders = null
    if (sheetNames.includes("People")) {
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "People!A1:AQ5", // Changed from A1:Z5 to A1:AQ5
      })
      peopleData = dataResponse.data.values || []
      if (peopleData.length > 0) {
        peopleHeaders = peopleData[0]
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties?.title,
      sheetNames,
      peopleHeaders,
      totalColumnsInPeople: peopleHeaders?.length || 0,
      samplePeopleData: peopleData?.slice(0, 3) || [], // First 3 rows including header
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
