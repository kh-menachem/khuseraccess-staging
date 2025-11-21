import { v4 as uuidv4 } from "uuid"

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG"

export interface LogEntry {
  timestamp: string
  level: LogLevel
  event: string
  message: string
  metadata?: string
  user?: string
  requestId?: string
}

// Generate a unique request ID for tracking related logs
let currentRequestId: string | null = null

export function generateRequestId(): string {
  currentRequestId = uuidv4()
  return currentRequestId
}

export function getCurrentRequestId(): string {
  if (!currentRequestId) {
    currentRequestId = generateRequestId()
  }
  return currentRequestId
}

// Client-side logging function
export async function logToServer(
  level: LogLevel,
  event: string,
  message: string,
  metadata?: Record<string, any>,
  user?: string,
): Promise<void> {
  try {
    const requestId = getCurrentRequestId()

    await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        event,
        message,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        user,
        requestId,
      }),
    })
  } catch (error) {
    // Silently fail to avoid infinite loops
    console.error("[Logger] Failed to send log:", error)
  }
}

// Convenience functions for different log levels
export const logger = {
  info: (event: string, message: string, metadata?: Record<string, any>, user?: string) =>
    logToServer("INFO", event, message, metadata, user),

  warn: (event: string, message: string, metadata?: Record<string, any>, user?: string) =>
    logToServer("WARN", event, message, metadata, user),

  error: (event: string, message: string, metadata?: Record<string, any>, user?: string) =>
    logToServer("ERROR", event, message, metadata, user),

  debug: (event: string, message: string, metadata?: Record<string, any>, user?: string) =>
    logToServer("DEBUG", event, message, metadata, user),
}

// Server-side direct logging function (to be used in API routes)
export async function writeLogToSheet(logEntry: LogEntry): Promise<void> {
  const { google } = require("googleapis")
  const { writeFileSync } = require("fs")
  const { join } = require("path")
  const os = require("os")

  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const spreadsheetId = process.env.SPREADSHEET_ID

    if (!credentials || !spreadsheetId) {
      console.error("[Logger] Missing credentials or spreadsheet ID")
      return
    }

    const tempFilePath = join(os.tmpdir(), "google-credentials.json")
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    // Append row to Logs sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Logs!A:G",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          [
            logEntry.timestamp,
            logEntry.level,
            logEntry.event,
            logEntry.message,
            logEntry.metadata || "",
            logEntry.user || "",
            logEntry.requestId || "",
          ],
        ],
      },
    })
  } catch (error) {
    console.error("[Logger] Failed to write to sheet:", error)
  }
}
