import { type NextRequest, NextResponse } from "next/server"
import { writeLogToSheet } from "@/lib/server-logger"
import type { LogEntry } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, event, message, metadata, user, requestId } = body

    if (!level || !event || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      metadata,
      user,
      requestId,
    }

    try {
      await writeLogToSheet(logEntry)
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("[Logs API] Failed to write log:", error)
      return NextResponse.json({ success: true, warning: "Log queued but write failed" })
    }
  } catch (error) {
    console.error("[Logs API] Error processing log:", error)
    return NextResponse.json({ error: "Failed to process log" }, { status: 500 })
  }
}
