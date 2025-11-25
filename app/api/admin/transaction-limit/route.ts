import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import * as os from "os"

interface TransactionLimit {
  enabled: boolean
  limitType: "years" | "date"
  limitValue: string
}

const DEFAULT_LIMIT: TransactionLimit = {
  enabled: false,
  limitType: "years",
  limitValue: "1",
}

async function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const spreadsheetId = process.env.SPREADSHEET_ID

  if (!credentials || !spreadsheetId) {
    throw new Error("Missing credentials or spreadsheet ID")
  }

  const tempFilePath = join(os.tmpdir(), "google-credentials-transaction-limit.json")
  writeFileSync(tempFilePath, credentials)

  const auth = new google.auth.GoogleAuth({
    keyFile: tempFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  return { sheets, spreadsheetId }
}

async function getTransactionLimit(): Promise<TransactionLimit> {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Settings!A:B",
    })

    const rows = response.data.values || []

    let enabled = false
    let limitType: "years" | "date" = "years"
    let limitValue = "1"

    for (const row of rows) {
      const key = row[0]?.toLowerCase().trim()
      const value = row[1]

      if (key === "transaction_limit_enabled") enabled = value === "TRUE" || value === "true"
      else if (key === "transaction_limit_type") limitType = value === "date" ? "date" : "years"
      else if (key === "transaction_limit_value") limitValue = value || "1"
    }

    return { enabled, limitType, limitValue }
  } catch (error) {
    console.error("Error reading transaction limit from sheets:", error)
    return DEFAULT_LIMIT
  }
}

async function saveTransactionLimit(limit: TransactionLimit): Promise<void> {
  try {
    const { sheets, spreadsheetId } = await getGoogleSheetsClient()

    const updates = [
      ["transaction_limit_enabled", limit.enabled.toString()],
      ["transaction_limit_type", limit.limitType],
      ["transaction_limit_value", limit.limitValue],
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
    console.error("Error saving transaction limit to sheets:", error)
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

export async function GET(request: NextRequest) {
  try {
    const limit = await getTransactionLimit()
    return NextResponse.json({
      success: true,
      data: limit,
    })
  } catch (error) {
    console.error("Error getting transaction limit:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get transaction limit settings",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestorEmail, enabled, limitType, limitValue } = body

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

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid enabled value",
        },
        { status: 400 },
      )
    }

    if (enabled) {
      if (!limitType || !["years", "date"].includes(limitType)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid limit type",
          },
          { status: 400 },
        )
      }

      if (!limitValue) {
        return NextResponse.json(
          {
            success: false,
            error: "Limit value is required when enabled",
          },
          { status: 400 },
        )
      }
    }

    const newLimit: TransactionLimit = {
      enabled,
      limitType: limitType || "years",
      limitValue: limitValue || "1",
    }

    await saveTransactionLimit(newLimit)

    return NextResponse.json({
      success: true,
      data: newLimit,
    })
  } catch (error) {
    console.error("Error updating transaction limit:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transaction limit settings",
      },
      { status: 500 },
    )
  }
}
