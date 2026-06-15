"use client"

import { useEffect } from "react"
import { logClientError } from "@/lib/logger"

declare global {
  interface Window {
    __khClientErrorLoggerInstalled?: boolean
  }
}

export function ClientErrorLogger() {
  useEffect(() => {
    if (window.__khClientErrorLoggerInstalled) return
    window.__khClientErrorLoggerInstalled = true

    const handleError = (event: ErrorEvent) => {
      logClientError("CLIENT_UNHANDLED_ERROR", "Unhandled browser error", event.error || event.message, {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logClientError("CLIENT_UNHANDLED_REJECTION", "Unhandled browser promise rejection", event.reason)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
