import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })
  } catch (error) {
    console.error("Firebase Admin initialization error:", error)
  }
}

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
      range: "People!U:AN",
    })
    const allData = dataResponse.data.values || []

    let targetRowIndex = -1
    let existingEmail = null

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i]
      const uniqueNumberValue = row?.[0]?.toString().trim()

      if (
        uniqueNumberValue === accountNumber ||
        (typeof uniqueNumberValue === "string" && uniqueNumberValue.replace(/\D/g, "") === accountNumber)
      ) {
        targetRowIndex = i + 1
        existingEmail = row?.[39] // Column AN = index 39
        break
      }
    }

    if (targetRowIndex === -1) {
      return NextResponse.json({ success: false, error: `Account number ${accountNumber} not found` }, { status: 404 })
    }

    if (existingEmail) {
      return NextResponse.json({ success: false, error: `User already exists for this account`, existingEmail }, { status: 400 })
    }

    // Update email in sheet
    const updateRange = `People!AN${targetRowIndex}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: { values: [[userEmail]] },
    })

    // Generate a temp password
    const tempPassword = Math.random().toString(36).slice(-8) + "A1!"

    // Create Firebase user
    const firebaseAuth = getAuth()
    const userRecord = await firebaseAuth.createUser({ email: userEmail, password: tempPassword, emailVerified: false })

    // Generate password reset link
    const resetLink = await firebaseAuth.generatePasswordResetLink(userEmail)

    return NextResponse.json({
      success: true,
      message: `User created and access granted for account ${accountNumber}`,
      userId: userRecord.uid,
      tempPassword,
      resetLink,
      row: targetRowIndex,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  } finally {
    if (tempFilePath) {
      try { unlinkSync(tempFilePath) } catch (e) { console.error("Temp cleanup failed:", e) }
    }
  }
}
