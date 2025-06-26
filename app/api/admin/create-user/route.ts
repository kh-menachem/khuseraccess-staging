import { NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")

    console.log("=== FIREBASE ADMIN INITIALIZATION ===")
    console.log("Service Account Project ID:", serviceAccount.project_id)
    console.log("Environment Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    console.log("Service Account Client Email:", serviceAccount.client_email)

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id, // Use project_id from service account
    })
    console.log("Firebase Admin initialized with project ID:", serviceAccount.project_id)
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, language = "he" } = await request.json()

    // Get the actual project ID from service account
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")
    const actualProjectId = serviceAccount.project_id

    console.log("=== CREATE USER REQUEST ===")
    console.log("Email:", email)
    console.log("Password length:", password?.length)
    console.log("Language:", language)
    console.log("ACTUAL PROJECT ID:", actualProjectId)
    console.log(
      "API ENABLE LINK:",
      `https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${actualProjectId}`,
    )

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const auth = getAuth()

    try {
      console.log("Creating user in Firebase Auth...")

      // Create the user in Firebase Auth
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: false,
      })

      console.log("User created successfully:", userRecord.uid)

      return NextResponse.json({
        success: true,
        message: `User created successfully. User can now login with email: ${email}`,
        userId: userRecord.uid,
        email: userRecord.email,
        projectId: actualProjectId,
        note: "User can login immediately with the provided password",
      })
    } catch (firebaseError: any) {
      console.error("Firebase error details:", {
        code: firebaseError.code,
        message: firebaseError.message,
      })

      // Handle specific Firebase errors
      if (firebaseError.code === "auth/email-already-exists") {
        return NextResponse.json(
          {
            success: false,
            error: "A user with this email already exists",
          },
          { status: 400 },
        )
      }

      if (firebaseError.code === "auth/invalid-email") {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid email address",
          },
          { status: 400 },
        )
      }

      if (firebaseError.code === "auth/weak-password") {
        return NextResponse.json(
          {
            success: false,
            error: "Password is too weak",
          },
          { status: 400 },
        )
      }

      // Handle Identity Toolkit API issues with clear link
      if (
        firebaseError.message?.includes("Identity Toolkit API") ||
        firebaseError.message?.includes("identitytoolkit.googleapis.com") ||
        firebaseError.message?.includes("SERVICE_DISABLED")
      ) {
        const apiLink = `https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${actualProjectId}`

        return NextResponse.json(
          {
            success: false,
            error: "Identity Toolkit API is not enabled for your project",
            projectId: actualProjectId,
            apiEnableLink: apiLink,
            instructions: [
              `1. Click this link: ${apiLink}`,
              "2. Click the 'Enable' button",
              "3. Wait 5-10 minutes for activation",
              "4. Try creating user again",
            ],
            note: `Enable Identity Toolkit API for project: ${actualProjectId}`,
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Firebase error: " + (firebaseError.message || firebaseError.code || "Unknown error"),
          code: firebaseError.code,
          projectId: actualProjectId,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
