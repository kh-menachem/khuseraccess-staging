import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  try {
    const { requestorEmail } = await request.json()

    if (!requestorEmail) {
      return NextResponse.json({ success: false, error: "Requestor email is required" }, { status: 400 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), "google-credentials-admin.json")
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

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
      return NextResponse.json({ success: false, error: "Only admins can view admin list" }, { status: 403 })
    }

    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:C",
    })

    const adminData = adminResponse.data.values || []

    if (adminData.length <= 1) {
      return NextResponse.json({
        success: true,
        admins: [],
        message: "No admins found",
      })
    }

    const admins = adminData
      .slice(1)
      .map((row: string[], index: number) => ({
        id: index + 1,
        email: row[0] || "",
        name: row[1] || "",
        role: row[2] || "user", // Default to "user" if role is not set
      }))
      .filter((admin) => admin.email) // Filter out empty rows

    return NextResponse.json({
      success: true,
      admins,
      total: admins.length,
    })
  } catch (error) {
    console.error("Error listing admins:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list admins",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
