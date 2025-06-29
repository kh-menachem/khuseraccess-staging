import { NextResponse } from "next/server"
import { google } from "googleapis"
import { writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import * as os from "os"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")
    initializeApp({
      credential: cert(serviceAccount),
      projectId: "khuserappsheet",
    })
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
  }
}

export async function POST(request: Request) {
  let tempFilePath: string | null = null

  try {
    const body = await request.json()
    console.log("=== ADD ADMIN REQUEST ===")
    console.log("Request body:", body)

    // Handle both old and new parameter names
    const adminEmail = body.adminEmail || body.email
    const adminName = body.adminName || body.name
    const requestorEmail = body.requestorEmail
    const createFirebaseUser = body.createFirebaseUser !== true // Default to true

    console.log("Parsed values:")
    console.log("Admin Email:", adminEmail)
    console.log("Admin Name:", adminName)
    console.log("Requestor Email:", requestorEmail)
    console.log("Create Firebase User:", createFirebaseUser)

    if (!adminEmail || !adminName) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin email and name are required",
          received: {
            adminEmail,
            adminName,
            requestorEmail,
          },
        },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json({ success: false, error: "Invalid admin email format" }, { status: 400 })
    }

    // Get the credentials from the environment variable
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (!credentials) {
      console.error("Google credentials not found in environment variables")
      return NextResponse.json({ success: false, error: "Google credentials not found" }, { status: 500 })
    }

    // Create a temporary file with the credentials
    tempFilePath = join(os.tmpdir(), `google-credentials-admin-${Date.now()}.json`)
    writeFileSync(tempFilePath, credentials)

    // Initialize the Sheets API client
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
      console.error("Spreadsheet ID not found in environment variables")
      return NextResponse.json({ success: false, error: "Spreadsheet ID not found" }, { status: 500 })
    }

    console.log("Testing spreadsheet access...")

    // Test spreadsheet access
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
      })
      console.log("Spreadsheet access successful:", spreadsheet.data.properties?.title)
    } catch (accessError: any) {
      console.error("Cannot access spreadsheet:", accessError.message)
      return NextResponse.json(
        {
          success: false,
          error: "Cannot access spreadsheet",
          details: accessError.message,
          serviceAccountEmail: "firebase-adminsdk-fbsvc@khuserappsheet.iam.gserviceaccount.com",
        },
        { status: 403 },
      )
    }

    // Check if Admin sheet exists, create if it doesn't
    let adminSheetExists = false
    try {
      const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId,
      })

      const adminSheet = sheetMetadata.data.sheets?.find((sheet) => sheet.properties?.title?.toLowerCase() === "admin")

      if (adminSheet) {
        adminSheetExists = true
        console.log("Admin sheet found")
      } else {
        console.log("Admin sheet not found, creating...")
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Admin",
                  },
                },
              },
            ],
          },
        })

        // Add headers to the new Admin sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: "Admin!A1:B1",
          valueInputOption: "RAW",
          requestBody: {
            values: [["Email", "Name"]],
          },
        })

        adminSheetExists = true
        console.log("Admin sheet created with headers")
      }
    } catch (sheetError: any) {
      console.error("Error with Admin sheet:", sheetError)
      return NextResponse.json(
        {
          success: false,
          error: "Cannot access or create Admin sheet",
          details: sheetError.message,
        },
        { status: 500 },
      )
    }

    // Get existing admin data
    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Admin!A:B",
    })

    const adminData = adminResponse.data.values || []
    console.log("Admin sheet rows found:", adminData.length)

    // Check if admin already exists
    const existingAdmin = adminData.find((row, index) => {
      if (index === 0) return false // Skip header row
      return row[0]?.toLowerCase().trim() === adminEmail.toLowerCase().trim()
    })

    if (existingAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin with this email already exists",
        },
        { status: 400 },
      )
    }

    // Add the new admin to the sheet
    const newRowIndex = adminData.length + 1
    const range = `Admin!A${newRowIndex}:B${newRowIndex}`

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[adminEmail, adminName]],
      },
    })

    console.log("Admin added to sheet successfully")

    // Create Firebase user if requested
    let firebaseResult = null
    if (createFirebaseUser) {
      try {
        const auth = getAuth()

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + "A1!"

        console.log("Creating Firebase user for admin...")

        const userRecord = await auth.createUser({
          email: adminEmail,
          password: tempPassword,
          emailVerified: false,
        })

        console.log("Firebase user created:", userRecord.uid)

        // Generate password reset link
        const resetLink = await auth.generatePasswordResetLink(adminEmail, {
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/login`,
          handleCodeInApp: false,
        })

        firebaseResult = {
          userId: userRecord.uid,
          resetLink: resetLink,
          note: "Password reset email sent to admin",
        }

        console.log("Password reset link generated for admin")
      } catch (firebaseError: any) {
        console.error("Error creating Firebase user for admin:", firebaseError)
        firebaseResult = {
          error: "Failed to create Firebase user: " + firebaseError.message,
          note: "Admin added to sheet but Firebase user creation failed",
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Admin ${adminName} (${adminEmail}) added successfully`,
      email: adminEmail,
      name: adminName,
      addedToRow: newRowIndex,
      firebase: firebaseResult,
    })
  } catch (error) {
    console.error("Error adding admin:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add admin",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (e) {
        console.error("Error cleaning up temp file:", e)
      }
    }
  }
}
