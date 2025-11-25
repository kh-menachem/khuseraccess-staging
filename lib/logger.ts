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

// Client-side logging function - sends logs to API route
export async function logToServer(
  level: LogLevel,
  event: string,
  message: string,
  metadata?: Record<string, any>,
  user?: string,
): Promise<void> {
  try {
    const requestId = getCurrentRequestId()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch("/api/logs", {
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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[Logger] Failed to send log: ${response.status} ${response.statusText}`)
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[Logger] Log request timed out:", event)
    } else {
      console.error("[Logger] Failed to send log:", error.message || error)
    }
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
