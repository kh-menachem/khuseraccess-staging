import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import nodemailer from "nodemailer"
import { writeFileSync } from "fs"
import { join } from "path"
import os from "os"

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "your-secret-key"

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting daily error summary...")

    // Fetch error logs from the last 24 hours
    const errorLogs = await fetchErrorLogs()

    if (errorLogs.length === 0) {
      console.log("[Cron] No errors found in the last 24 hours")
      return NextResponse.json({
        success: true,
        message: "No errors to report",
        errorCount: 0,
      })
    }

    // Send email with error summary
    await sendErrorSummaryEmail(errorLogs)

    console.log(`[Cron] Successfully sent error summary with ${errorLogs.length} errors`)

    return NextResponse.json({
      success: true,
      message: "Error summary sent",
      errorCount: errorLogs.length,
    })
  } catch (error) {
    console.error("[Cron] Failed to send error summary:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function fetchErrorLogs() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const spreadsheetId = process.env.SPREADSHEET_ID

  if (!credentials || !spreadsheetId) {
    throw new Error("Missing credentials or spreadsheet ID")
  }

  const tempFilePath = join(os.tmpdir(), "google-credentials-cron.json")
  writeFileSync(tempFilePath, credentials)

  const auth = new google.auth.GoogleAuth({
    keyFile: tempFilePath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })

  // Fetch all logs from the Logs sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Logs!A:G",
  })

  const rows = response.data.values || []

  if (rows.length === 0) {
    return []
  }

  // Skip header row
  const dataRows = rows.slice(1)

  // Calculate 24 hours ago
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  // Filter for ERROR level logs from last 24 hours
  const errorLogs = dataRows
    .filter((row) => {
      const timestamp = row[0]
      const level = row[1]

      if (level !== "ERROR") return false

      try {
        const logDate = new Date(timestamp)
        return logDate >= twentyFourHoursAgo
      } catch {
        return false
      }
    })
    .map((row) => ({
      timestamp: row[0] || "",
      level: row[1] || "",
      event: row[2] || "",
      message: row[3] || "",
      metadata: row[4] || "",
      user: row[5] || "",
      requestId: row[6] || "",
    }))

  return errorLogs
}

async function sendErrorSummaryEmail(errorLogs: any[]) {
  const smtpConfig = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }

  if (!smtpConfig.user || !smtpConfig.pass) {
    throw new Error("Missing SMTP configuration")
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  // Group errors by event type
  const errorsByEvent = errorLogs.reduce(
    (acc, log) => {
      if (!acc[log.event]) {
        acc[log.event] = []
      }
      acc[log.event].push(log)
      return acc
    },
    {} as Record<string, any[]>,
  )

  // Generate HTML email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨🚨 Daily Error Report</h1>
        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Account: 6301926</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #333;">Summary</h2>
          <p style="margin: 0; font-size: 16px;">
            <strong>Total Errors:</strong> ${errorLogs.length}<br>
            <strong>Error Types:</strong> ${Object.keys(errorsByEvent).length}<br>
            <strong>Period:</strong> Last 24 hours<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        ${Object.entries(errorsByEvent)
          .map(
            ([event, logs]) => `
          <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #dc3545;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #dc3545;">
              ${event} 
              <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
                ${logs.length}
              </span>
            </h3>
            
            ${logs
              .slice(0, 5)
              .map(
                (log: any) => `
              <div style="border-top: 1px solid #e9ecef; padding: 10px 0; font-size: 13px;">
                <div style="color: #6c757d; margin-bottom: 5px;">
                  <strong>Time:</strong> ${new Date(log.timestamp).toLocaleString()}<br>
                  ${log.user ? `<strong>User:</strong> ${log.user}<br>` : ""}
                  ${log.requestId ? `<strong>Request ID:</strong> ${log.requestId}<br>` : ""}
                </div>
                <div style="color: #333;">
                  <strong>Message:</strong> ${log.message}
                </div>
                ${
                  log.metadata && log.metadata !== "{}"
                    ? `
                  <div style="background: #f8f9fa; padding: 8px; margin-top: 5px; border-radius: 4px; font-family: monospace; font-size: 11px; overflow-x: auto;">
                    ${log.metadata}
                  </div>
                `
                    : ""
                }
              </div>
            `,
              )
              .join("")}
            
            ${
              logs.length > 5
                ? `
              <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 12px; color: #856404;">
                <strong>Note:</strong> Showing first 5 of ${logs.length} errors. Check the Logs sheet for full details.
              </div>
            `
                : ""
            }
          </div>
        `,
          )
          .join("")}

        <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 20px; text-align: center;">
          <p style="margin: 0; color: #6c757d; font-size: 13px;">
            This is an automated daily error summary.<br>
            Review the <strong>Logs</strong> sheet in Google Sheets for complete details.
          </p>
        </div>
      </div>
    </div>
  `

  const text = `
Daily Error Report - Account 6301926

SUMMARY:
Total Errors: ${errorLogs.length}
Error Types: ${Object.keys(errorsByEvent).length}
Period: Last 24 hours
Date: ${new Date().toLocaleDateString()}

ERRORS BY TYPE:
${Object.entries(errorsByEvent)
  .map(
    ([event, logs]) => `
${event} (${logs.length} occurrences)
${logs
  .slice(0, 3)
  .map(
    (log: any) => `
  - ${new Date(log.timestamp).toLocaleString()}
    ${log.user ? `User: ${log.user}` : ""}
    Message: ${log.message}
`,
  )
  .join("\n")}
${logs.length > 3 ? `  ... and ${logs.length - 3} more\n` : ""}
`,
  )
  .join("\n")}

Check the Logs sheet in Google Sheets for complete details.
  `

  await transporter.sendMail({
    from: `"Keren Hatzedakah System" <${smtpConfig.user}>`,
    to: "kh.menachem@gmail.com",
    subject: "🚨🚨6301926 ERROR LOGS",
    html: html,
    text: text,
  })
}
