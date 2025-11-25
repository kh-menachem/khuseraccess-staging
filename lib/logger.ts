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

export interface ErrorContext {
  // Browser/Device info
  userAgent?: string
  platform?: string
  language?: string
  screenSize?: string
  viewport?: string
  deviceMemory?: number
  connectionType?: string
  connectionSpeed?: string

  // Error details
  errorStack?: string
  errorType?: string
  componentStack?: string

  // API/Network details
  apiEndpoint?: string
  apiMethod?: string
  apiStatusCode?: number
  apiResponseTime?: number
  apiRequestBody?: any
  apiResponseHeaders?: Record<string, string>

  // Performance metrics
  pageLoadTime?: number
  memoryUsage?: any
  timeToError?: number

  // Session/State info
  currentPath?: string
  previousPath?: string
  sessionDuration?: number
  localStorageSize?: number

  // User actions breadcrumbs
  breadcrumbs?: Array<{
    timestamp: string
    action: string
    details?: string
  }>

  // Custom metadata
  [key: string]: any
}

// Generate a unique request ID for tracking related logs
let currentRequestId: string | null = null
const sessionStartTime: number = Date.now()
const breadcrumbsQueue: Array<{ timestamp: string; action: string; details?: string }> = []

export function addBreadcrumb(action: string, details?: string): void {
  breadcrumbsQueue.push({
    timestamp: new Date().toISOString(),
    action,
    details,
  })

  // Keep only last 20 breadcrumbs
  if (breadcrumbsQueue.length > 20) {
    breadcrumbsQueue.shift()
  }
}

function getBrowserContext(): Partial<ErrorContext> {
  if (typeof window === "undefined") return {}

  const nav = navigator as any
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection

  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    deviceMemory: nav.deviceMemory,
    connectionType: connection?.effectiveType,
    connectionSpeed: connection?.downlink ? `${connection.downlink}Mbps` : undefined,
    currentPath: window.location.pathname,
    sessionDuration: Math.round((Date.now() - sessionStartTime) / 1000),
  }
}

function getLocalStorageSize(): number {
  if (typeof window === "undefined" || !window.localStorage) return 0

  let total = 0
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
  } catch (e) {
    return 0
  }
  return total
}

function getMemoryUsage(): any {
  if (typeof window === "undefined") return null

  const performance = (window as any).performance
  if (performance && performance.memory) {
    return {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + "MB",
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + "MB",
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + "MB",
    }
  }
  return null
}

function getErrorStack(error: any): string | undefined {
  if (!error) return undefined

  if (error.stack) {
    // Clean up stack trace to be more readable
    return error.stack
      .split("\n")
      .slice(0, 10) // Limit to first 10 lines
      .join("\n")
  }

  return undefined
}

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

export async function logToServer(
  level: LogLevel,
  event: string,
  message: string,
  metadata?: Record<string, any>,
  user?: string,
  errorContext?: ErrorContext,
): Promise<void> {
  try {
    const requestId = getCurrentRequestId()

    // Collect comprehensive context
    const fullContext: ErrorContext = {
      ...getBrowserContext(),
      localStorageSize: getLocalStorageSize(),
      memoryUsage: getMemoryUsage(),
      breadcrumbs: [...breadcrumbsQueue],
      ...metadata,
      ...errorContext,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        level,
        event,
        message,
        metadata: JSON.stringify(fullContext),
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

export const logger = {
  info: (event: string, message: string, metadata?: Record<string, any>, user?: string) => {
    addBreadcrumb("INFO", event)
    return logToServer("INFO", event, message, metadata, user)
  },

  warn: (event: string, message: string, metadata?: Record<string, any>, user?: string) => {
    addBreadcrumb("WARN", event)
    return logToServer("WARN", event, message, metadata, user)
  },

  error: (event: string, message: string, error?: any, metadata?: Record<string, any>, user?: string) => {
    addBreadcrumb("ERROR", event)

    const errorContext: ErrorContext = {
      errorStack: getErrorStack(error),
      errorType: error?.name || typeof error,
      timeToError: Date.now() - sessionStartTime,
      ...metadata,
    }

    return logToServer("ERROR", event, message, metadata, user, errorContext)
  },

  debug: (event: string, message: string, metadata?: Record<string, any>, user?: string) => {
    addBreadcrumb("DEBUG", event)
    return logToServer("DEBUG", event, message, metadata, user)
  },

  apiCall: async (
    endpoint: string,
    method: string,
    requestBody?: any,
    user?: string,
  ): Promise<{
    logResponse: (statusCode: number, responseTime: number, headers?: Headers) => void
    logError: (error: any, responseTime: number) => void
  }> => {
    const startTime = Date.now()
    addBreadcrumb("API_CALL", `${method} ${endpoint}`)

    return {
      logResponse: (statusCode: number, responseTime: number, headers?: Headers) => {
        const headerObj: Record<string, string> = {}
        if (headers) {
          headers.forEach((value, key) => {
            headerObj[key] = value
          })
        }

        logToServer(
          statusCode >= 400 ? "ERROR" : "INFO",
          "API_RESPONSE",
          `${method} ${endpoint} - ${statusCode}`,
          {},
          user,
          {
            apiEndpoint: endpoint,
            apiMethod: method,
            apiStatusCode: statusCode,
            apiResponseTime: responseTime,
            apiRequestBody: requestBody,
            apiResponseHeaders: headerObj,
          },
        )
      },
      logError: (error: any, responseTime: number) => {
        logToServer("ERROR", "API_ERROR", `${method} ${endpoint} failed: ${error.message || error}`, {}, user, {
          apiEndpoint: endpoint,
          apiMethod: method,
          apiResponseTime: responseTime,
          apiRequestBody: requestBody,
          errorStack: getErrorStack(error),
          errorType: error?.name || typeof error,
        })
      },
    }
  },
}

if (typeof window !== "undefined") {
  let lastPath = window.location.pathname

  // Track navigation
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      addBreadcrumb("NAVIGATION", `From ${lastPath} to ${window.location.pathname}`)
      lastPath = window.location.pathname
    }
  }, 1000)

  // Track page load time
  window.addEventListener("load", () => {
    if (window.performance) {
      const loadTime = Math.round(window.performance.now())
      addBreadcrumb("PAGE_LOAD", `Page loaded in ${loadTime}ms`)
    }
  })
}
