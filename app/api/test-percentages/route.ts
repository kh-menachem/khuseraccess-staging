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

    // Try to get the Percentages sheet data
    const percentagesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Percentages!A:Z",
    })

    const percentagesData = percentagesResponse.data.values || []

    if (percentagesData.length <= 1) {
      return NextResponse.json({
        success: false,
        error: "No data found in Percentages sheet",
      })
    }

    const headerRow = percentagesData[0]

    // Find the type and percentage columns
    const typeIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "type")

    const percentageIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "percentage" ||
        header?.toLowerCase().trim() === "percent" ||
        header?.toLowerCase().trim() === "rate",
    )

    if (typeIndex === -1 || percentageIndex === -1) {
      return NextResponse.json({
        success: false,
        error: "Could not find type or percentage columns in Percentages sheet",
        headers: headerRow,
      })
    }

    // Process the percentages data
    const percentagesMap = {}

    for (let i = 1; i < percentagesData.length; i++) {
      const row = percentagesData[i]
      if (row[typeIndex] && row[percentageIndex]) {
        const type = row[typeIndex].trim()
        // Try to parse the percentage value
        let percentage
        try {
          // Handle percentage with % sign
          const percentageStr = row[percentageIndex].toString().trim()
          percentage = Number.parseFloat(percentageStr.replace("%", ""))

          // Convert to decimal if needed
          if (percentage > 1) {
            percentage = percentage / 100
          }

          percentagesMap[type] = percentage
        } catch (error) {
          percentagesMap[type] = `Error parsing: ${row[percentageIndex]}`
        }
      }
    }

    // Test applying percentages to sample values
    const testValues = [
      { value: 100, type: Object.keys(percentagesMap)[0] || "Unknown" },
      { value: -100, type: Object.keys(percentagesMap)[0] || "Unknown" },
      { value: 50, type: Object.keys(percentagesMap)[1] || "Unknown" },
    ]

    const testResults = testValues.map((test) => {
      const percentage = percentagesMap[test.type] || 0
      const originalValue = test.value

      // Preserve the sign when applying the percentage
      const isNegative = originalValue < 0
      const absValue = Math.abs(originalValue)

      // Apply the percentage adjustment
      const adjustedValue = absValue * (1 - percentage)

      // Restore the sign
      const finalValue = isNegative ? -adjustedValue : adjustedValue

      return {
        originalValue,
        type: test.type,
        percentage: percentage * 100 + "%",
        adjustedValue: finalValue,
        calculation: `${originalValue} * (1 - ${percentage}) = ${finalValue}`,
      }
    })

    return NextResponse.json({
      success: true,
      percentagesData: percentagesData.slice(0, 10), // First 10 rows
      typeColumnIndex: typeIndex,
      percentageColumnIndex: percentageIndex,
      percentagesMap,
      testResults,
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
