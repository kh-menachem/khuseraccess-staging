import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    // Simple token validation (you can make this more secure)
    const expectedToken = Buffer.from(`${process.env.CRON_SECRET || "secret"}-logs`).toString("base64")

    if (token !== expectedToken) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!startDate || !endDate) {
      return new NextResponse("Missing date parameters", { status: 400 })
    }

    // Get Google Sheets client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

    // Read logs from the Logs sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Logs!A:G",
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return new NextResponse(generateEmptyHTML(), {
        headers: { "Content-Type": "text/html" },
      })
    }

    const headers = rows[0]
    const logData = rows.slice(1)

    // Filter logs by date range and level
    const start = new Date(startDate)
    const end = new Date(endDate)

    const filteredLogs = logData.filter((row) => {
      const timestamp = new Date(row[0])
      const level = row[1]
      return timestamp >= start && timestamp <= end && (level === "ERROR" || level === "WARN")
    })

    // Generate HTML
    const html = generateLogsHTML(filteredLogs, startDate, endDate)

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return new NextResponse("Error loading logs", { status: 500 })
  }
}

function generateEmptyHTML() {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error & Warning Logs</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .empty { text-align: center; color: #666; padding: 60px; }
        </style>
      </head>
      <body>
        <div class="empty">
          <h2>No logs found</h2>
          <p>There are no error or warning logs for the specified time period.</p>
        </div>
      </body>
    </html>
  `
}

function generateLogsHTML(logs: any[][], startDate: string, endDate: string) {
  const errorCount = logs.filter((log) => log[1] === "ERROR").length
  const warnCount = logs.filter((log) => log[1] === "WARN").length

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error & Warning Logs - ${startDate} to ${endDate}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .container { max-width: 1400px; margin: 0 auto; }
          .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .header h1 { 
            font-size: 28px; 
            margin-bottom: 10px;
            color: #1a1a1a;
          }
          .header .date-range {
            color: #666;
            font-size: 14px;
            margin-bottom: 15px;
          }
          .summary {
            display: flex;
            gap: 15px;
            margin-top: 20px;
          }
          .summary-card {
            flex: 1;
            padding: 20px;
            border-radius: 6px;
            color: white;
          }
          .summary-card.error { background: #dc2626; }
          .summary-card.warn { background: #f59e0b; }
          .summary-card .count { font-size: 36px; font-weight: bold; }
          .summary-card .label { font-size: 14px; opacity: 0.9; margin-top: 5px; }
          .logs-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #f9fafb;
            padding: 15px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 15px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
          }
          tr:hover {
            background: #f9fafb;
          }
          .level {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .level.ERROR {
            background: #fee2e2;
            color: #dc2626;
          }
          .level.WARN {
            background: #fef3c7;
            color: #f59e0b;
          }
          .timestamp {
            color: #6b7280;
            font-family: 'Monaco', monospace;
            font-size: 12px;
          }
          .message {
            color: #1f2937;
            max-width: 400px;
            word-wrap: break-word;
          }
          .metadata {
            color: #6b7280;
            font-size: 12px;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .user {
            color: #3b82f6;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ðŸš¨ Error & Warning Logs</h1>
            <div class="date-range">
              ${new Date(startDate).toLocaleString()} - ${new Date(endDate).toLocaleString()}
            </div>
            <div class="summary">
              <div class="summary-card error">
                <div class="count">${errorCount}</div>
                <div class="label">Errors</div>
              </div>
              <div class="summary-card warn">
                <div class="count">${warnCount}</div>
                <div class="label">Warnings</div>
              </div>
            </div>
          </div>
          
          <div class="logs-table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Event</th>
                  <th>Message</th>
                  <th>User</th>
                  <th>Request ID</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${logs
                  .map(
                    (log) => `
                  <tr>
                    <td class="timestamp">${new Date(log[0]).toLocaleString()}</td>
                    <td><span class="level ${log[1]}">${log[1]}</span></td>
                    <td>${log[2] || "-"}</td>
                    <td class="message">${log[3] || "-"}</td>
                    <td class="user">${log[5] || "-"}</td>
                    <td class="metadata">${log[6] || "-"}</td>
                    <td class="metadata">${log[4] || "-"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `
}
