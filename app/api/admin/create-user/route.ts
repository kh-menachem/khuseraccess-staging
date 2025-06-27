import { NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Parse service account once
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })
    if (process.env.NODE_ENV !== "production") {
      console.log("Firebase Admin initialized:", serviceAccount.project_id)
    }
  } catch (err) {
    console.error("Firebase Admin init error:", err)
  }
}

export async function POST(request: Request) {
  if (!getApps().length) {
    return NextResponse.json({ success: false, error: "Firebase Admin not initialized" }, { status: 500 })
  }

  try {
    const { email, password, language = "he" } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters and include at least 1 number" }, { status: 400 })
    }

    const auth = getAuth()
    const userRecord = await auth.createUser({ email, password, emailVerified: false })

    return NextResponse.json({
      success: true,
      message: `User created successfully. Can now login with ${email}`,
      userId: userRecord.uid,
      email: userRecord.email,
      projectId: serviceAccount.project_id,
      createdAt: new Date().toISOString(),
    })
  } catch (err: any) {
    const code = err.code || ""
    const msg = err.message || "Unknown error"

    if (process.env.NODE_ENV !== "production") {
      console.error("User creation error:", { code, msg })
    }

    if (code === "auth/email-already-exists") {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 })
    }

    if (code === "auth/invalid-email") {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 })
    }

    if (code === "auth/weak-password") {
      return NextResponse.json({ success: false, error: "Password is too weak" }, { status: 400 })
    }

    if (msg.includes("Identity Toolkit API") || msg.includes("identitytoolkit.googleapis.com") || msg.includes("SERVICE_DISABLED")) {
      const apiLink = `https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${serviceAccount.project_id}`
      return NextResponse.json({
        success: false,
        error: "Identity Toolkit API is not enabled",
        projectId: serviceAccount.project_id,
        apiEnableLink: apiLink,
        instructions: [
          `1. Click: ${apiLink}`,
          "2. Click 'Enable'",
          "3. Wait 5-10 minutes",
          "4. Retry",
        ],
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: "Firebase error: " + msg,
      code,
      projectId: serviceAccount.project_id,
    }, { status: 500 })
  }
}
