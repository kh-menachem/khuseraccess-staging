import type { LogEntry } from "./logger"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import os from "os"

interface QueuedLog {
  logEntry: LogEntry
  resolve: () => void
  reject: (error: any) => void
}

class LogQueue {
  private queue: QueuedLog[] = []
  private isProcessing = false
  private readonly WRITE_DELAY = 300 // 300ms delay between writes

  async add(logEntry: LogEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ logEntry, resolve, reject })
      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) break

      try {
        await this.writeToSheet(item.logEntry)
        item.resolve()
      } catch (error) {
        item.reject(error)
      }

      // Add delay before next write to prevent overwriting
      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.WRITE_DELAY))
      }
    }

    this.isProcessing = false
  }

  private async writeToSheet(logEntry: LogEntry): Promise<void> {
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
  }
}

const logQueue = new LogQueue()

// Server-side direct logging function (to be used in API routes only)
export async function writeLogToSheet(logEntry: LogEntry): Promise<void> {
  try {
    await logQueue.add(logEntry)
  } catch (error) {
    console.error("[Logger] Failed to write to sheet:", error)
  }
}

// Server-side convenience logger for API routes
export const serverLogger = {
  info: (event: string, message: string, metadata?: Record<string, any>, user?: string, requestId?: string) =>
    writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "INFO",
      event,
      message,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      user,
      requestId,
    }),

  warn: (event: string, message: string, metadata?: Record<string, any>, user?: string, requestId?: string) =>
    writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "WARN",
      event,
      message,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      user,
      requestId,
    }),

  error: (event: string, message: string, metadata?: Record<string, any>, user?: string, requestId?: string) =>
    writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      event,
      message,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      user,
      requestId,
    }),

  debug: (event: string, message: string, metadata?: Record<string, any>, user?: string, requestId?: string) =>
    writeLogToSheet({
      timestamp: new Date().toISOString(),
      level: "DEBUG",
      event,
      message,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      user,
      requestId,
    }),
}
