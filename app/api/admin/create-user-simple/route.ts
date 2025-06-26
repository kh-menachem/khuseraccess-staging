import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("Creating user with client SDK:", { email })

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required",
        },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
        },
        { status: 400 },
      )
    }

    // Create user with Firebase client SDK
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    console.log("User created successfully:", user.uid)

    return NextResponse.json({
      success: true,
      message: `User created successfully with email: ${email}`,
      userId: user.uid,
    })
  } catch (error: any) {
    console.error("Error creating user:", error)

    let errorMessage = "Failed to create user"

    if (error.code) {
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Email address is already in use"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/weak-password":
          errorMessage = "Password is too weak"
          break
        case "auth/admin-restricted-operation":
          errorMessage = "Admin operation restricted. User creation disabled for security."
          break
        default:
          errorMessage = `Firebase error: ${error.message}`
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
