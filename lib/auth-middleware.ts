import type { NextRequest } from "next/server"
import { adminAuth } from "./firebase-admin"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string
    email: string
    emailVerified: boolean
  }
}

export async function verifyFirebaseToken(request: NextRequest): Promise<{
  success: boolean
  user?: { uid: string; email: string; emailVerified: boolean }
  error?: string
}> {
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "No valid authorization header" }
    }

    const token = authHeader.split("Bearer ")[1]

    if (!token) {
      return { success: false, error: "No token provided" }
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token)

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        emailVerified: decodedToken.email_verified || false,
      },
    }
  } catch (error) {
    console.error("Token verification error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token verification failed",
    }
  }
}

export async function requireAuth(request: NextRequest) {
  const authResult = await verifyFirebaseToken(request)

  if (!authResult.success) {
    return {
      error: authResult.error,
      status: 401,
    }
  }

  return {
    user: authResult.user!,
  }
}

export async function requireAdmin(request: NextRequest) {
  // First verify Firebase authentication
  const authResult = await requireAuth(request)

  if ("error" in authResult) {
    return authResult
  }

  // Then verify admin status in Google Sheets
  try {
    const adminCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: authResult.user.email }),
    })

    const adminResult = await adminCheckResponse.json()

    if (!adminResult.success || !adminResult.isAdmin) {
      return {
        error: "Admin privileges required",
        status: 403,
      }
    }

    return {
      user: authResult.user,
      isAdmin: true,
    }
  } catch (error) {
    return {
      error: "Failed to verify admin status",
      status: 500,
    }
  }
}
