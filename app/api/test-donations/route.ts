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

    // Try to get the Donations sheet data
    const donationsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Donations!A:AQ",
    })

    const donationsData = donationsResponse.data.values || []

    if (donationsData.length <= 1) {
      return NextResponse.json({
        success: false,
        error: "No data found in Donations sheet",
      })
    }

    const headerRow = donationsData[0]

    // Find important columns
    const personIdIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "personid" ||
        header?.toLowerCase().trim() === "person id" ||
        header?.toLowerCase().trim() === "person_id",
    )
    const dateIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "date" ||
        header?.toLowerCase().trim() === "date/time" ||
        header?.toLowerCase().trim() === "datetime",
    )
    const donorIdIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "donorid" ||
        header?.toLowerCase().trim() === "donor id" ||
        header?.toLowerCase().trim() === "donor_id",
    )
    const purposeIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "purpose" ||
        header?.toLowerCase().trim() === "reason" ||
        header?.toLowerCase().trim() === "description" ||
        header?.toLowerCase().trim() === "notes",
    )
    const amountIndex = headerRow.findIndex(
      (header: string) =>
        header?.toLowerCase().trim() === "amount" ||
        header?.toLowerCase().trim() === "value" ||
        header?.toLowerCase().trim() === "total",
    )

    // Try to get the Donors sheet data for name lookup
    let donorsData = []
    try {
      const donorsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Donors!A:AQ",
      })
      donorsData = donorsResponse.data.values || []
    } catch (error) {
      console.error("Error fetching Donors sheet:", error)
    }

    // Process donors data - only use name column
    const donorsMap = new Map<string, string>()
    if (donorsData.length > 1) {
      const donorsHeaderRow = donorsData[0]
      const donorUniqueIdIndex = donorsHeaderRow.findIndex(
        (header: string) => header?.toLowerCase().trim() === "uniqueid" || header?.toLowerCase().trim() === "unique id",
      )
      const nameIndex = donorsHeaderRow.findIndex(
        (header: string) =>
          header?.toLowerCase().trim() === "name" ||
          header?.toLowerCase().trim() === "full name" ||
          header?.toLowerCase().trim() === "fullname",
      )

      for (let i = 1; i < donorsData.length; i++) {
        const row = donorsData[i]
        if (row[donorUniqueIdIndex] && row[nameIndex]) {
          const donorId = row[donorUniqueIdIndex].trim()
          const name = row[nameIndex].trim()
          donorsMap.set(donorId, name)
        }
      }
    }

    // Get column names
    const columnNames = {
      personId: personIdIndex !== -1 ? headerRow[personIdIndex] : "Not Found",
      date: dateIndex !== -1 ? headerRow[dateIndex] : "Not Found",
      donorId: donorIdIndex !== -1 ? headerRow[donorIdIndex] : "Not Found",
      purpose: purposeIndex !== -1 ? headerRow[purposeIndex] : "Not Found",
      amount: amountIndex !== -1 ? headerRow[amountIndex] : "Not Found",
    }

    // Get sample data with donor name lookup
    const sampleData = donationsData.slice(1, 6).map((row) => {
      const donorId = donorIdIndex !== -1 && row[donorIdIndex] ? row[donorIdIndex] : "N/A"
      let donorName = "N/A"

      if (donorId !== "N/A" && donorsMap.has(donorId)) {
        donorName = donorsMap.get(donorId)!
      } else if (donorId !== "N/A") {
        donorName = donorId // Fallback to donor ID
      }

      return {
        personId: personIdIndex !== -1 && row[personIdIndex] ? row[personIdIndex] : "N/A",
        date: dateIndex !== -1 && row[dateIndex] ? row[dateIndex] : "N/A",
        donorId: donorId,
        donorName: donorName,
        purpose: purposeIndex !== -1 && row[purposeIndex] ? row[purposeIndex] : "N/A",
        amount: amountIndex !== -1 && row[amountIndex] ? row[amountIndex] : "N/A",
      }
    })

    return NextResponse.json({
      success: true,
      totalRows: donationsData.length,
      headerRow,
      columnNames,
      columnIndexes: {
        personIdIndex,
        dateIndex,
        donorIdIndex,
        purposeIndex,
        amountIndex,
      },
      sampleData,
      donorsFound: donorsMap.size,
      donorsMapSample: Object.fromEntries(Array.from(donorsMap.entries()).slice(0, 5)),
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
