import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, readFileSync, existsSync } from "fs"
import { join } from "path"
import * as os from "os"

const TRANSACTION_LIMIT_FILE = join(os.tmpdir(), "transaction-limit.json")

interface TransactionLimit {
  enabled: boolean
  limitType: "years" | "date" // "years" for "1 year back", "date" for "not earlier than 2024"
  limitValue: string // "1" for 1 year, "2024" for year 2024, etc.
}

// Default settings
const DEFAULT_LIMIT: TransactionLimit = {
  enabled: false,
  limitType: "years",
  limitValue: "1",
}

// Get current transaction limit settings
function getTransactionLimit(): TransactionLimit {
  try {
    if (existsSync(TRANSACTION_LIMIT_FILE)) {
      const data = readFileSync(TRANSACTION_LIMIT_FILE, "utf-8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error reading transaction limit file:", error)
  }
  return DEFAULT_LIMIT
}

// Save transaction limit settings
function saveTransactionLimit(limit: TransactionLimit): void {
  try {
    writeFileSync(TRANSACTION_LIMIT_FILE, JSON.stringify(limit, null, 2))
  } catch (error) {
    console.error("Error saving transaction limit file:", error)
    throw error
  }
}

// Verify admin access
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

// GET: Retrieve current transaction limit settings
export async function GET(request: NextRequest) {
  try {
    const limit = getTransactionLimit()
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

// POST: Update transaction limit settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestorEmail, enabled, limitType, limitValue } = body

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

    // Validate input
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

    // Save the settings
    const newLimit: TransactionLimit = {
      enabled,
      limitType: limitType || "years",
      limitValue: limitValue || "1",
    }

    saveTransactionLimit(newLimit)

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
