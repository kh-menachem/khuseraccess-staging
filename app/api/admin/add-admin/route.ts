import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

export const dynamic = "force-dynamic"

function ensureFirebaseAdmin() {
  if (getApps().length) return

  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || "khuserappsheet",
  })
}

export async function POST(request: Request) {
  let tempFilePath: string | null = null

  try {
    const body = await request.json()
    const adminEmail = body.adminEmail || body.email
    const adminName = body.adminName || body.name
    const adminRole = body.adminRole || "user"
    const requestorEmail = body.requestorEmail
    const createFirebaseUser = body.createFirebaseUser !== false
    console.log("Request to add admin received:", {
      adminEmail,
      adminName,
      adminRole,
      requestorEmail,
      createFirebaseUser,
    })

    if (!adminEmail || !adminName) {
      return NextResponse.json({ success: false, error: "Admin email and name are required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json({ success: false, error: "Invalid admin email format" }, { status: 400 })
    }

    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    tempFilePath = join(os.tmpdir(), `google-credentials-admin-${Date.now()}.json`)
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
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()
    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: "Spreadsheet ID not found" }, { status: 500 })
    }

    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId })
    const adminSheet = sheetMetadata.data.sheets?.find((sheet) => sheet.properties?.title?.toLowerCase() === "admin")
    if (!adminSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: "Admin" } } }],
        },
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Admin!A1:C1",
        valueInputOption: "RAW",
        requestBody: { values: [["Email", "Name", "Role"]] },
      })
    }

    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:C",
    })
    const adminData = adminResponse.data.values || []

    const exists = adminData.some(
      (row, idx) => idx > 0 && row[0]?.toLowerCase().trim() === adminEmail.toLowerCase().trim(),
    )
    if (exists) {
      return NextResponse.json({ success: false, error: "Admin already exists" }, { status: 400 })
    }

    const newRowIndex = adminData.length + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Admin!A${newRowIndex}:C${newRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [[adminEmail, adminName, adminRole]] },
    })

    let firebaseResult = null

    if (createFirebaseUser) {
      try {
        ensureFirebaseAdmin()
        console.log("Creating Firebase user for:", adminEmail)
        const firebaseAuth = getAuth()
        const tempPassword = Math.random().toString(36).slice(-12) + "A1!"
        const userRecord = await firebaseAuth.createUser({
          email: adminEmail,
          password: tempPassword,
          emailVerified: false,
        })
        console.log("Firebase user created:", userRecord.uid)

        const resetLink = await firebaseAuth.generatePasswordResetLink(adminEmail, {
          url: process.env.NEXT_PUBLIC_SITE_URL + "/admin/login",
          handleCodeInApp: false,
        })
        console.log("Password reset link generated")

        firebaseResult = {
          userId: userRecord.uid,
          resetLink,
          note: "Password reset email sent to admin",
        }
      } catch (e: any) {
        console.error("Firebase user creation error:", e.message)
        firebaseResult = {
          error: e.message,
          note: "Admin was added to sheet, but Firebase user creation failed",
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Admin added successfully",
      email: adminEmail,
      name: adminName,
      role: adminRole,
      firebase: firebaseResult,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  } finally {
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (e) {
        console.error("Failed to delete temp file:", e)
      }
    }
  }
}
