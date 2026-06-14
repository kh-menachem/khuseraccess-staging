import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function GET() {
  try {
     const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

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

    // Find the type and value columns
    const typeIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "type")

    const valueIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "value" ||
        header?.toLowerCase().trim() === "multiplier" ||
        header?.toLowerCase().trim() === "percentage" ||
        header?.toLowerCase().trim() === "percent" ||
        header?.toLowerCase().trim() === "rate",
    )

    if (typeIndex === -1 || valueIndex === -1) {
      return NextResponse.json({
        success: false,
        error: "Could not find type or value columns in Percentages sheet",
        headers: headerRow,
      })
    }

    // Process the percentages data
    const multipliersMap = {}

    // Add the hardcoded values from the user's list
    const hardcodedValues = [
      { type: "Check", value: 1 },
      { type: "Credit Card", value: 0.965 },
      { type: "Donor Fund", value: 0.97 },
      { type: "Cash", value: 1 },
      { type: "Links", value: 0.965 },
      { type: "Wires", value: 1 },
      { type: "Remote Checks", value: 1 },
      { type: "Post Dated", value: 1 },
      { type: "Machine Rental", value: -1 },
      { type: "Payout", value: -1 },
      { type: "Fees", value: -1 },
      { type: "Ramp", value: -1 },
      { type: "Bounced Check Fee", value: -1 },
      { type: "Coins 0%", value: 1 },
      { type: "Phone Rental", value: -1 },
      { type: "Transfer From +", value: 1 },
      { type: "Transfer To -", value: -1 },
      { type: "0", value: 1 },
      { type: "Coins", value: 0.9 },
    ]

    // Add the hardcoded values to the map
    for (const { type, value } of hardcodedValues) {
      multipliersMap[type.toLowerCase()] = value
    }

    // Process each row to build the map (will override hardcoded values if found in sheet)
    for (let i = 1; i < percentagesData.length; i++) {
      const row = percentagesData[i]
      if (row[typeIndex] && row[valueIndex]) {
        const type = row[typeIndex].trim()
        // Try to parse the value directly as a multiplier
        try {
          const valueStr = row[valueIndex].toString().trim().replace("%", "")
          let multiplier = Number.parseFloat(valueStr)

          if (!isNaN(multiplier)) {
            // If it's a percentage (e.g., 96.5), convert to multiplier (0.965)
            if (multiplier > 1) {
              multiplier = multiplier / 100
            }
            multipliersMap[type.toLowerCase()] = multiplier
          } else {
            multipliersMap[type.toLowerCase()] = `Error parsing: ${row[valueIndex]}`
          }
        } catch (error) {
          multipliersMap[type.toLowerCase()] = `Error parsing: ${row[valueIndex]}`
        }
      }
    }

    // Test applying multipliers to sample values
    const testValues = [
      { value: 100, type: "Credit Card" },
      { value: -100, type: "Credit Card" },
      { value: 100, type: "Machine Rental" },
      { value: -100, type: "Machine Rental" },
      { value: 100, type: "Donor Fund" },
      { value: -100, type: "Donor Fund" },
      { value: 100, type: "Coins" },
      { value: -100, type: "Coins" },
      { value: 100, type: "Transfer To -" },
      { value: -100, type: "Transfer To -" },
      { value: 100, type: "Transfer From +" },
      { value: -100, type: "Transfer From +" },
    ]

    const testResults = testValues.map((test) => {
      const multiplier =
        typeof multipliersMap[test.type.toLowerCase()] === "number" ? multipliersMap[test.type.toLowerCase()] : 1

      const originalValue = test.value
      const finalValue = originalValue * multiplier

      return {
        originalValue,
        type: test.type,
        multiplier,
        finalValue: finalValue.toFixed(2),
        calculation: `${originalValue} * ${multiplier} = ${finalValue.toFixed(2)}`,
      }
    })

    return NextResponse.json({
      success: true,
      percentagesData: percentagesData.slice(0, 10), // First 10 rows
      typeColumnIndex: typeIndex,
      valueColumnIndex: valueIndex,
      multipliersMap,
      hardcodedMultipliers: hardcodedValues,
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
