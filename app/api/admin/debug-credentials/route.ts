import { NextResponse } from "next/server"
import { google } from "googleapis"

export const dynamic = "force-dynamic"

async function checkSpreadsheetAccess(credentials: string, spreadsheetId: string) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const sheets = google.sheets({ version: "v4", auth })

  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId })
    return {
      ok: true,
      title: response.data.properties?.title || null,
      sheetCount: response.data.sheets?.length || 0,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      title: null,
      sheetCount: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET() {
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || ""
    const serviceAccount = JSON.parse(credentials || "{}")
    const spreadsheetId = process.env.SPREADSHEET_ID || ""
    const trimmedSpreadsheetId = spreadsheetId.trim().replace(/^["']|["']$/g, "")
    const urlMatch = trimmedSpreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/)
    const normalizedSpreadsheetId = urlMatch?.[1] || trimmedSpreadsheetId
    const shouldCheckAccess = !!credentials && !!spreadsheetId
    const rawAccess = shouldCheckAccess ? await checkSpreadsheetAccess(credentials, spreadsheetId) : null
    const normalizedAccess =
      shouldCheckAccess && normalizedSpreadsheetId !== spreadsheetId
        ? await checkSpreadsheetAccess(credentials, normalizedSpreadsheetId)
        : null

    return NextResponse.json({
      hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      hasPrivateKey: !!serviceAccount.private_key,
      credentialsValid: !!(serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key),
      spreadsheetIdPresent: !!spreadsheetId,
      spreadsheetIdLength: spreadsheetId.length,
      spreadsheetIdTrimmedLength: spreadsheetId.trim().length,
      spreadsheetIdHasWhitespace: spreadsheetId !== spreadsheetId.trim(),
      spreadsheetIdHasQuotes: /^["']|["']$/.test(spreadsheetId.trim()),
      spreadsheetIdLooksLikeUrl: spreadsheetId.includes("docs.google.com") || spreadsheetId.includes("/d/"),
      spreadsheetIdContainsSlash: spreadsheetId.includes("/"),
      normalizedSpreadsheetIdDifferent: normalizedSpreadsheetId !== spreadsheetId,
      rawSpreadsheetAccess: rawAccess,
      normalizedSpreadsheetAccess: normalizedAccess,
    })
  } catch (error) {
    return NextResponse.json({
      error: "Invalid credentials JSON",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
