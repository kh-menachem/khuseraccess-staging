import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function GET() {
  try {
    // Use the specific spreadsheet ID directly
    const spreadsheetId = "1X_YEt73_oZEJoU1pITVqZZ8AHGxj3Ic2QuNRb8zVbGo"

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
    const columnIndexes = {}

    for (const sheetName of sheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:AQ1`,
        })

        if (response.data.values && response.data.values.length > 0) {
          const headers = response.data.values[0]
          sheetHeaders[sheetName] = headers

          // Find important column indexes
          const indexes = {
            uniqueId: headers.findIndex(
              (header: string) =>
                header?.toLowerCase().trim() === "uniqueid" || header?.toLowerCase().trim() === "unique id",
            ),
            person: headers.findIndex((header: string) => header?.toLowerCase().trim() === "person"),
            userAccess: headers.findIndex(
              (header: string) =>
                header?.toLowerCase().trim() === "user access" || header?.toLowerCase().trim() === "useraccess",
            ),
            amount: headers.findIndex(
              (header: string) =>
                header?.toLowerCase().trim() === "amount" ||
                header?.toLowerCase().trim() === "value" ||
                header?.toLowerCase().trim() === "total",
            ),
            type: headers.findIndex((header: string) => header?.toLowerCase().trim() === "type"),
          }
          columnIndexes[sheetName] = indexes
        } else {
          sheetHeaders[sheetName] = []
          columnIndexes[sheetName] = {}
        }
      } catch (error) {
        sheetHeaders[sheetName] = `Error: ${error.message}`
        columnIndexes[sheetName] = {}
      }
    }

    return NextResponse.json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties?.title,
      sheetNames,
      sheetHeaders,
      columnIndexes,
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
