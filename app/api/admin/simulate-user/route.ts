import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminEmail, accountNumber } = body

    console.log("[v0] Simulate user request:", { adminEmail, accountNumber })

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

    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:Z",
    })

    const adminRows = adminResponse.data.values || []
    console.log("[v0] Admin sheet rows count:", adminRows.length)

    if (adminRows.length === 0) {
      return NextResponse.json({ error: "Admin sheet is empty" }, { status: 500 })
    }

    const adminHeaders = adminRows[0]
    console.log("[v0] Admin headers:", adminHeaders)

    // Find column indices dynamically
    const emailIndex = adminHeaders.findIndex(
      (h: string) =>
        h?.toLowerCase().trim() === "email" ||
        h?.toLowerCase().trim() === "admin email" ||
        h?.toLowerCase().trim() === "user email",
    )
    const roleIndex = adminHeaders.findIndex((h: string) => h?.toLowerCase().trim() === "role")

    console.log("[v0] Column indices - email:", emailIndex, "role:", roleIndex)

    if (emailIndex === -1) {
      return NextResponse.json({ error: "Email column not found in Admin sheet" }, { status: 500 })
    }

    // Find admin row
    const adminRow = adminRows
      .slice(1)
      .find((row) => row[emailIndex]?.toLowerCase().trim() === adminEmail.toLowerCase().trim())

    console.log("[v0] Admin row found:", !!adminRow)

    if (!adminRow) {
      return NextResponse.json({ error: "Admin not found" }, { status: 403 })
    }

    const role = roleIndex !== -1 && adminRow[roleIndex] ? adminRow[roleIndex].toLowerCase().trim() : "user"
    console.log("[v0] Admin role:", role)

    if (role !== "superadmin") {
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

    console.log("[v0] Simulation successful for account:", accountNumber)

    return NextResponse.json({
      success: true,
      user: simulatedUser,
    })
  } catch (error) {
    console.error("[v0] Error simulating user:", error)
    return NextResponse.json({ error: "Failed to simulate user" }, { status: 500 })
  }
}
