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

type ErrorLike = {
  name?: string
  message?: string
  stack?: string
  digest?: string
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

function serializeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    const errorWithDigest = error as ErrorLike
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: errorWithDigest.digest,
    }
  }

  if (typeof error === "object" && error !== null) {
    const errorLike = error as ErrorLike
    return {
      name: errorLike.name,
      message: errorLike.message || String(error),
      stack: errorLike.stack,
      digest: errorLike.digest,
    }
  }

  return { message: String(error) }
}

function getStoredUserMetadata(): Record<string, any> {
  if (typeof window === "undefined") return {}

  try {
    const storedUser = window.localStorage.getItem("user")
    if (!storedUser) return {}

    const parsedUser = JSON.parse(storedUser)
    return {
      storedUserId: parsedUser?.id,
      storedUserEmail: parsedUser?.email,
      storedUserName: parsedUser?.name,
      storedUserLanguage: parsedUser?.language,
    }
  } catch {
    return { storedUserParseFailed: true }
  }
}

export function getClientDiagnostics(extra?: Record<string, any>): Record<string, any> {
  if (typeof window === "undefined") {
    return extra || {}
  }

  const connection = (window.navigator as Navigator & { connection?: any }).connection

  return {
    ...extra,
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    userAgent: window.navigator.userAgent,
    browserLanguage: window.navigator.language,
    browserLanguages: window.navigator.languages?.join(","),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    online: window.navigator.onLine,
    connectionEffectiveType: connection?.effectiveType,
    documentLanguage: document.documentElement.lang,
    documentTranslate: document.documentElement.getAttribute("translate"),
    htmlClassName: document.documentElement.className,
    bodyClassName: document.body?.className,
    visibilityState: document.visibilityState,
    ...getStoredUserMetadata(),
  }
}

export function logClientError(
  event: string,
  message: string,
  error: unknown,
  metadata?: Record<string, any>,
  user?: string,
): Promise<void> {
  return logToServer(
    "ERROR",
    event,
    message,
    getClientDiagnostics({
      ...metadata,
      error: serializeError(error),
    }),
    user,
  )
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
