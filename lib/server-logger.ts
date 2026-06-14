import type { LogEntry } from "./logger"
import { google } from "googleapis"
import { writeFileSync } from "fs"
import { join } from "path"
import os from "os"

interface QueuedLog {
  logEntry: LogEntry
  resolve: () => void
  reject: (error: any) => void
  retries: number
}

class LogQueue {
  private queue: QueuedLog[] = []
  private isProcessing = false
  private readonly WRITE_DELAY = 500 // Increased delay to 500ms for better reliability
  private readonly MAX_RETRIES = 3 // Added retry mechanism

  async add(logEntry: LogEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ logEntry, resolve, reject, retries: 0 })
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
        console.log(`[Logger] Successfully wrote log: ${item.logEntry.event}`)
        item.resolve()
      } catch (error) {
        console.error(`[Logger] Failed to write log (attempt ${item.retries + 1}/${this.MAX_RETRIES}):`, error)

        if (item.retries < this.MAX_RETRIES - 1) {
          // Retry by putting back in queue
          item.retries++
          this.queue.push(item)
        } else {
          // Max retries reached, log to console and reject
          console.error(`[Logger] Max retries reached for log: ${item.logEntry.event}`, item.logEntry)
          item.reject(error)
        }
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
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim()

    if (!credentials || !spreadsheetId) {
      throw new Error("Missing credentials or spreadsheet ID")
    }

    const tempFilePath = join(os.tmpdir(), "google-credentials.json")
    writeFileSync(tempFilePath, credentials)

    const auth = new google.auth.GoogleAuth({
      keyFile: tempFilePath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    try {
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Logs!A:G",
        valueInputOption: "USER_ENTERED",
        requestBody: {
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

      if (!result.data.updates?.updatedRows || result.data.updates.updatedRows < 1) {
        throw new Error("Failed to append row to sheet")
      }
    } catch (error: any) {
      console.error("[Logger] Google Sheets API error:", error.message)
      throw error
    }
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
