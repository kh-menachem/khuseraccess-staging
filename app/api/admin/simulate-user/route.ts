import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminEmail, accountNumber } = body

    if (!adminEmail || !accountNumber) {
      return NextResponse.json({ error: "Admin email and account number are required" }, { status: 400 })
    }

    // Verify admin is a superadmin
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const spreadsheetId = process.env.SPREADSHEET_ID

    if (!credentials || !spreadsheetId) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const tempFilePath = join(os.tmpdir(), "google-credentials.json")
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    // Check if admin is superadmin
    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:D",
    })

    const adminRows = adminResponse.data.values || []
    const adminRow = adminRows.find((row) => row[1]?.toLowerCase() === adminEmail.toLowerCase())

    if (!adminRow || adminRow[3]?.toLowerCase() !== "superadmin") {
      return NextResponse.json({ error: "Superadmin access required" }, { status: 403 })
    }

    // Fetch account details from People sheet
    const peopleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "People!A:AO",
    })

    const peopleRows = peopleResponse.data.values || []
    const headers = peopleRows[0] || []
    const uniqueNumberIndex = headers.findIndex((h) => h === "Unique Number")

    if (uniqueNumberIndex === -1) {
      return NextResponse.json({ error: "Invalid sheet structure" }, { status: 500 })
    }

    // Find the account
    const accountRow = peopleRows.slice(1).find((row) => row[uniqueNumberIndex] === accountNumber)

    if (!accountRow) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const firstNameIndex = headers.findIndex((h) => h === "First Name")
    const lastNameIndex = headers.findIndex((h) => h === "Last Name")
    const userAccessIndex = headers.findIndex((h) => h === "User Access")

    const simulatedUser = {
      id: accountNumber,
      accountNumber: accountNumber,
      firstName: accountRow[firstNameIndex] || "",
      lastName: accountRow[lastNameIndex] || "",
      name: `${accountRow[firstNameIndex] || ""} ${accountRow[lastNameIndex] || ""}`.trim(),
      email: accountRow[userAccessIndex] || adminEmail,
      isSimulation: true,
      simulatedBy: adminEmail,
      language: "en",
    }

    return NextResponse.json({
      success: true,
      user: simulatedUser,
    })
  } catch (error) {
    console.error("Error simulating user:", error)
    return NextResponse.json({ error: "Failed to simulate user" }, { status: 500 })
  }
}
