import { google } from "googleapis"
import { redirect, notFound } from "next/navigation"

export default async function RedirectSlug({ params }: { params: { slug: string } }) {
  const slug = params.slug

  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}")
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  const sheetId = process.env.SPREADSHEET_ID?.trim()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "People!A:AQ",
  })

  const [headers, ...rows] = response.data.values ?? []
  const people = rows.map((row) => {
    const person: Record<string, string> = {}
    headers.forEach((header, i) => {
      person[header] = row[i] ?? ""
    })
    return person
  })

  const match = people.find((p) => p.UniqueNumber === slug)

  if (!match || !match["Cardknox Link"]) return notFound()

  redirect(match["Cardknox Link"])
}
