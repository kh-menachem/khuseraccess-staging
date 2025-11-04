import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

// In-memory storage for the system message
// In production, this should be stored in a database
let systemMessage = {
  enabled: false,
  message: "",
  showOnDashboard: true,
  showOnLogin: true,
}

async function verifyAdmin(email: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean }> {
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const spreadsheetId = process.env.SPREADSHEET_ID

    if (!credentials || !spreadsheetId) {
      return { isAdmin: false, isSuperAdmin: false }
    }

    const tempFilePath = join(os.tmpdir(), "google-credentials-admin.json")
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admins!A:C",
    })

    const rows = response.data.values || []

    if (rows.length <= 1) return { isAdmin: false, isSuperAdmin: false }

    const headerRow = rows[0]
    const emailIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "email")
    const roleIndex = headerRow.findIndex((header: string) => header?.toLowerCase().trim() === "role")

    if (emailIndex === -1) return { isAdmin: false, isSuperAdmin: false }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row[emailIndex]?.toLowerCase().trim() === email.toLowerCase().trim()) {
        const role = roleIndex !== -1 ? row[roleIndex]?.toLowerCase().trim() : ""
        return { isAdmin: true, isSuperAdmin: role === "superadmin" }
      }
    }

    return { isAdmin: false, isSuperAdmin: false }
  } catch (error) {
    console.error("Error verifying admin:", error)
    return { isAdmin: false, isSuperAdmin: false }
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: systemMessage,
    })
  } catch (error) {
    console.error("Error fetching system message:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch system message",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestorEmail, enabled, message, showOnDashboard, showOnLogin } = body

    // Verify admin access
    if (!requestorEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Requestor email is required",
        },
        { status: 400 },
      )
    }

    const { isAdmin, isSuperAdmin } = await verifyAdmin(requestorEmail)

    if (!isAdmin || !isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Superadmin access required",
        },
        { status: 403 },
      )
    }

    // Update system message
    systemMessage = {
      enabled: enabled ?? systemMessage.enabled,
      message: message ?? systemMessage.message,
      showOnDashboard: showOnDashboard ?? systemMessage.showOnDashboard,
      showOnLogin: showOnLogin ?? systemMessage.showOnLogin,
    }

    return NextResponse.json({
      success: true,
      data: systemMessage,
    })
  } catch (error) {
    console.error("Error updating system message:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update system message",
      },
      { status: 500 },
    )
  }
}
