import { NextResponse } from "next/server"

export async function GET() {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")

    return NextResponse.json({
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      hasPrivateKey: !!serviceAccount.private_key,
      credentialsValid: !!(serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key),
    })
  } catch (error) {
    return NextResponse.json({
      error: "Invalid credentials JSON",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
