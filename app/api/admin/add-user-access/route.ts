import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"

export async function POST(request: Request) {
  let tempFilePath: string | null = null

  try {
    const { accountNumber, userEmail } = await request.json()

    if (!accountNumber || !userEmail) {
      return NextResponse.json({ success: false, error: "Account number and email are required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    tempFilePath = join(os.tmpdir(), `google-credentials-${Date.now()}.json`)
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
      ],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID
    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: "Spreadsheet ID not found" }, { status: 500 })
    }

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "People!A:AN",
    })
    const allData = dataResponse.data.values || []

    const headerRow = allData[0]
    const uniqueNumberIndex = headerRow.findIndex((h) => h?.trim() === "Unique Number")

    if (uniqueNumberIndex === -1) {
      return NextResponse.json({ success: false, error: "Unique Number column not found" }, { status: 500 })
    }

    let targetRowIndex = -1

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i]
      const uniqueNumberValue = row?.[uniqueNumberIndex]?.toString().trim()

      if (
        uniqueNumberValue === accountNumber ||
        (typeof uniqueNumberValue === "string" && uniqueNumberValue.replace(/\D/g, "") === accountNumber)
      ) {
        targetRowIndex = i + 1
        const userAccessEmail = row?.[39]?.trim()
        if (userAccessEmail) {
          return NextResponse.json(
            {
              success: false,
              error: `Email already assigned: ${userAccessEmail}`,
            },
            { status: 400 },
          )
        }
        break
      }
    }

    if (targetRowIndex === -1) {
      return NextResponse.json({ success: false, error: `Account number ${accountNumber} not found` }, { status: 404 })
    }

    const updateRange = `People!AN${targetRowIndex}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: { values: [[userEmail]] },
    })

    return NextResponse.json({
      success: true,
      message: `User access granted for account ${accountNumber}`,
      updatedRow: targetRowIndex,
    })
  } catch (err: any) {
    const defaultError = { success: false, error: "An unexpected error occurred" }

    // Handle Google Sheets quota exceeded error
    if (
      err?.response?.data?.error?.code === 429 ||
      err?.response?.data?.error?.status === "RESOURCE_EXHAUSTED" ||
      /quota|Rate Limit Exceeded/i.test(err?.message || "")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please wait a moment and try again.",
        },
        { status: 429 },
      )
    }

    // Fall back to default error
    return NextResponse.json(
      {
        success: false,
        error: err?.message || defaultError.error,
      },
      { status: 500 },
    )
  } finally {
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (e) {
        console.error("Temp cleanup failed:", e)
      }
    }
  }
}
