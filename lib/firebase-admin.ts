import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")
    console.log("🔥 Firebase Project ID:", serviceAccount.project_id)
    console.log("👤 Client Email:", serviceAccount.client_email)
    console.log("🔐 Private Key ID:", serviceAccount.private_key_id)


    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
  }
}

export const adminAuth = getAuth()
