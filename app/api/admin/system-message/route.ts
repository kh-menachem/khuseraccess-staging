import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

async function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

  if (!credentials || !spreadsheetId) {
    throw new Error("Missing credentials or spreadsheet ID")
  }

  const tempFilePath = join(os.tmpdir(), "google-credentials-system-message.json")
  writeFileSync(tempFilePath, credentials)

  const auth = new google.auth.GoogleAuth({
    keyFile: tempFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  return { sheets, spreadsheetId }
}

async function verifyAdmin(email: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean }> {
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

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
      range: "Admin!A:D",
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

async function getSystemMessage() {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })

    const rows = response.data.values || []

    // Find system message settings
    let enabled = false
    let message = ""
    let showOnDashboard = true
    let showOnLogin = true

    for (const row of rows) {
      const key = row[0]?.toLowerCase().trim()
      const value = row[1]

      if (key === "system_message_enabled") enabled = value === "TRUE" || value === "true"
      else if (key === "system_message_text") message = value || ""
      else if (key === "system_message_show_dashboard") showOnDashboard = value === "TRUE" || value === "true"
      else if (key === "system_message_show_login") showOnLogin = value === "TRUE" || value === "true"
    }

    return { enabled, message, showOnDashboard, showOnLogin }
  } catch (error) {
    console.error("Error reading system message from sheets:", error)
    return { enabled: false, message: "", showOnDashboard: true, showOnLogin: true }
  }
}

async function saveSystemMessage(data: {
  enabled: boolean
  message: string
  showOnDashboard: boolean
  showOnLogin: boolean
}) {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    // Update or create settings rows
    const updates = [
      ["system_message_enabled", data.enabled.toString()],
      ["system_message_text", data.message],
      ["system_message_show_dashboard", data.showOnDashboard.toString()],
      ["system_message_show_login", data.showOnLogin.toString()],
    ]

    // Get existing settings
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })

    const rows = response.data.values || []
    const existingKeys = new Map(rows.map((row) => [row[0]?.toLowerCase().trim(), row]))

    // Prepare batch update
    const updateData = updates.map(([key, value]) => {
      const rowIndex = rows.findIndex((row) => row[0]?.toLowerCase().trim() === key.toLowerCase())
      if (rowIndex >= 0) {
        return {
          range: `Settings!A${rowIndex + 1}:B${rowIndex + 1}`,
          values: [[key, value]],
        }
      } else {
        // Append new row
        return {
          range: `Settings!A${rows.length + 1}:B${rows.length + 1}`,
          values: [[key, value]],
        }
      }
    })

    // Execute batch update
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updateData,
      },
    })
  } catch (error) {
    console.error("Error saving system message to sheets:", error)
    throw error
  }
}

export async function GET() {
  try {
    const systemMessage = await getSystemMessage()
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

    // Get current settings
    const currentSettings = await getSystemMessage()

    // Update with new values
    const newSettings = {
      enabled: enabled ?? currentSettings.enabled,
      message: message ?? currentSettings.message,
      showOnDashboard: showOnDashboard ?? currentSettings.showOnDashboard,
      showOnLogin: showOnLogin ?? currentSettings.showOnLogin,
    }

    // Save to Google Sheets
    await saveSystemMessage(newSettings)

    return NextResponse.json({
      success: true,
      data: newSettings,
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
