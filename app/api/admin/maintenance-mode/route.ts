import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

interface MaintenanceMode {
  enabled: boolean
  message: string
  estimatedTime?: string
}

const DEFAULT_MAINTENANCE: MaintenanceMode = {
  enabled: false,
  message: "System maintenance in progress. Please try again later.",
  estimatedTime: "",
}

async function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const spreadsheetId = process.env.SPREADSHEET_ID

  if (!credentials || !spreadsheetId) {
    throw new Error("Missing credentials or spreadsheet ID")
  }

  const tempFilePath = join(os.tmpdir(), "google-credentials-maintenance.json")
  writeFileSync(tempFilePath, credentials)

  const auth = new google.auth.GoogleAuth({
    keyFile: tempFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  return { sheets, spreadsheetId }
}

async function getMaintenanceMode(): Promise<MaintenanceMode> {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })

    const rows = response.data.values || []

    let enabled = false
    let message = DEFAULT_MAINTENANCE.message
    let estimatedTime = ""

    for (const row of rows) {
      const key = row[0]?.toLowerCase().trim()
      const value = row[1]

      if (key === "maintenance_mode_enabled") enabled = value === "TRUE" || value === "true"
      else if (key === "maintenance_mode_message") message = value || DEFAULT_MAINTENANCE.message
      else if (key === "maintenance_mode_estimated_time") estimatedTime = value || ""
    }

    return { enabled, message, estimatedTime }
  } catch (error) {
    console.error("Error reading maintenance mode from sheets:", error)
    return DEFAULT_MAINTENANCE
  }
}

async function saveMaintenanceMode(data: MaintenanceMode): Promise<void> {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    const updates = [
      ["maintenance_mode_enabled", data.enabled.toString()],
      ["maintenance_mode_message", data.message],
      ["maintenance_mode_estimated_time", data.estimatedTime || ""],
    ]

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })

    const rows = response.data.values || []

    const updateData = updates.map(([key, value]) => {
      const rowIndex = rows.findIndex((row) => row[0]?.toLowerCase().trim() === key.toLowerCase())
      if (rowIndex >= 0) {
        return {
          range: `Settings!A${rowIndex + 1}:B${rowIndex + 1}`,
          values: [[key, value]],
        }
      } else {
        return {
          range: `Settings!A${rows.length + 1}:B${rows.length + 1}`,
          values: [[key, value]],
        }
      }
    })

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updateData,
      },
    })
  } catch (error) {
    console.error("Error saving maintenance mode to sheets:", error)
    throw error
  }
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

export async function GET() {
  try {
    const maintenanceMode = await getMaintenanceMode()
    return NextResponse.json({
      success: true,
      data: maintenanceMode,
    })
  } catch (error) {
    console.error("Error fetching maintenance mode:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch maintenance mode settings",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestorEmail, enabled, message, estimatedTime } = body

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

    const currentSettings = await getMaintenanceMode()

    const newSettings: MaintenanceMode = {
      enabled: enabled ?? currentSettings.enabled,
      message: message ?? currentSettings.message,
      estimatedTime: estimatedTime ?? currentSettings.estimatedTime,
    }

    await saveMaintenanceMode(newSettings)

    return NextResponse.json({
      success: true,
      data: newSettings,
    })
  } catch (error) {
    console.error("Error updating maintenance mode:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update maintenance mode settings",
      },
      { status: 500 },
    )
  }
}
