import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  try {
    const { adminEmail, requestorEmail } = await request.json()

    if (!adminEmail || !requestorEmail) {
      return NextResponse.json(
        { success: false, error: "Admin email and requestor email are required" },
        { status: 400 },
      )
    }

    // Prevent self-removal
    if (adminEmail.toLowerCase().trim() === requestorEmail.toLowerCase().trim()) {
      return NextResponse.json({ success: false, error: "You cannot remove yourself as an admin" }, { status: 400 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    const tempFilePath = join(os.tmpdir(), "google-credentials-admin.json")
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client with write permissions
    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID

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
      return NextResponse.json({ success: false, error: "Only admins can remove admins" }, { status: 403 })
    }

    // Get current Admin sheet data
    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:B",
    })

    const adminData = adminResponse.data.values || []

    if (adminData.length <= 1) {
      return NextResponse.json({ success: false, error: "No admins found to remove" }, { status: 404 })
    }

    // Find the admin to remove
    let targetRowIndex = -1
    for (let i = 1; i < adminData.length; i++) {
      const row = adminData[i]
      if (row[0]?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
        targetRowIndex = i + 1 // +1 because sheets are 1-indexed
        break
      }
    }

    if (targetRowIndex === -1) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 })
    }

    // Check if this is the last admin
    const activeAdmins = adminData.slice(1).filter((row) => row[0]?.trim())
    if (activeAdmins.length <= 1) {
      return NextResponse.json({ success: false, error: "Cannot remove the last admin" }, { status: 400 })
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming Admin sheet is the first sheet, you might need to get the actual sheet ID
                dimension: "ROWS",
                startIndex: targetRowIndex - 1, // 0-indexed for the API
                endIndex: targetRowIndex,
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      message: `Admin ${adminEmail} removed successfully`,
      removedEmail: adminEmail,
      removedBy: requestorEmail,
    })
  } catch (error) {
    console.error("Error removing admin:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove admin",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
