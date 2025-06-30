import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  let tempFilePath: string | null = null

  try {
    const { requestorEmail } = await request.json()

    if (!requestorEmail) {
      return NextResponse.json({ success: false, error: "Requestor email is required" }, { status: 400 })
    }

    // First verify the requestor is an admin
    const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: requestorEmail }),
    })

    const verifyResult = await verifyResponse.json()
    if (!verifyResult.success || !verifyResult.isAdmin) {
      return NextResponse.json({ success: false, error: "Only admins can view accounts" }, { status: 403 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    tempFilePath = join(os.tmpdir(), `google-credentials-accounts-${Date.now()}.json`)
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID

    // Get People sheet data - columns B (Last Name), C (First Name), and U (Unique Number/Account Number)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "People!A:AN", // full columns so we never get trimmed rows
    })

    const data = response.data.values || []

    if (data.length <= 1) {
      return NextResponse.json({
        success: true,
        accounts: [],
        message: "No accounts found",
      })
    }

    const headerRow = data[0]

    // Dynamically get index for "Unique Number", "First Name", and "Last Name"
    const accountNumberIndex = headerRow.findIndex(h => h?.toLowerCase().includes("unique"))
    const firstNameIndex = headerRow.findIndex(h => h?.toLowerCase().includes("first"))
    const lastNameIndex = headerRow.findIndex(h => h?.toLowerCase().includes("last"))

    console.log("Column indexes:", {
      accountNumberIndex,
      firstNameIndex,
      lastNameIndex,
    })

    // Process accounts data
    const accounts = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i]

      const accountNumber = row[accountNumberIndex]?.toString().trim() || ""
      const firstName = row[firstNameIndex]?.toString().trim() || ""
      const lastName = row[lastNameIndex]?.toString().trim() || ""

      // Only include rows that have an account number
      if (accountNumber) {
        accounts.push({
          value: accountNumber,
          label: `${accountNumber} - ${firstName} ${lastName}`.trim(),
        })
      }
    }

    // Sort accounts by account number
    accounts.sort((a, b) => {
      const numA = Number.parseInt(a.value) || 0
      const numB = Number.parseInt(b.value) || 0
      return numA - numB
    })

    console.log(`Found ${accounts.length} accounts`)
    console.log("Sample accounts:", accounts.slice(0, 5))

    return NextResponse.json({
      success: true,
      accounts: accounts,
      total: accounts.length,
    })
  } catch (error) {
    console.error("Error fetching accounts:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch accounts",
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
