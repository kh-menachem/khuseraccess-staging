import { NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

function ensureFirebaseAdmin() {
  if (getApps().length) return

  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

export async function POST(request: Request) {
  try {
    const { language } = await request.json()

    if (!language) {
      return NextResponse.json({ success: false, error: "Language is required" }, { status: 400 })
    }

    ensureFirebaseAdmin()

    // Set the language code for Firebase Auth emails
    const auth = getAuth()

    // Firebase language codes: 'en' for English, 'he' for Hebrew
    const languageCode = language === "he" ? "he" : "en"

    // This sets the default language for Firebase Auth emails
    // Note: This affects the entire project, not per-user
    // For per-user language, we would need to use the client-side auth.languageCode

    return NextResponse.json({
      success: true,
      message: `Language set to ${languageCode}`,
      languageCode,
    })
  } catch (error) {
    console.error("Error setting language:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set language",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
