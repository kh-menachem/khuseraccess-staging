import type { CustomerData } from "./types"
import { logger } from "./logger"

export async function fetchCustomerData(userEmail: string, userId: string): Promise<CustomerData> {
  if (!userEmail || !userId) {
    throw new Error("User email and ID are required")
  }

  const maxRetries = 2
  let lastError: Error | null = null

  const apiLogger = await logger.apiCall("/api/customer-data", "POST", { userEmail, userId }, userEmail)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptStartTime = Date.now()

    try {
      console.log(`[v0] Fetching customer data (attempt ${attempt}/${maxRetries}):`, { userEmail, userId })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)

      const response = await fetch("/api/customer-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": crypto.randomUUID(),
        },
        body: JSON.stringify({
          userEmail,
          userId,
          language: "en",
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - attemptStartTime

      console.log("[v0] API response status:", response.status)

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[v0] Non-JSON response received:", text.substring(0, 200))

        await logger.error(
          "DATA_SERVICE_INVALID_CONTENT_TYPE",
          "Server returned non-JSON response",
          null,
          {
            contentType,
            responsePreview: text.substring(0, 200),
            statusCode: response.status,
            attempt,
          },
          userEmail,
        )

        throw new Error("Server returned invalid response format (not JSON)")
      }

      if (!response.ok) {
        let errorMessage = "Failed to fetch customer data"

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage

          apiLogger.logError(new Error(errorMessage), responseTime)

          if (response.status >= 400 && response.status < 500) {
            throw new Error(errorMessage)
          }
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
          apiLogger.logError(new Error(errorMessage), responseTime)
        }

        console.error("[v0] API error response:", errorMessage)

        if (attempt < maxRetries && response.status >= 500) {
          lastError = new Error(errorMessage)
          console.log(`[v0] Retrying after error... (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          continue
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      apiLogger.logResponse(response.status, responseTime, response.headers)

      if (!data || typeof data !== "object") {
        await logger.error(
          "DATA_SERVICE_INVALID_DATA",
          "Invalid data structure received from server",
          null,
          { dataType: typeof data },
          userEmail,
        )
        throw new Error("Invalid data structure received from server")
      }

      console.log("[v0] Successfully received customer data:", {
        id: data.id,
        currentTransactions: data.currentTransactions?.length || 0,
        transactions2024: data.transactions2024?.length || 0,
        oldTransactions: data.oldTransactions?.length || 0,
        donations: data.donations?.length || 0,
      })

      return data
    } catch (error) {
      const responseTime = Date.now() - attemptStartTime
      console.error(`[v0] Error in fetchCustomerData (attempt ${attempt}/${maxRetries}):`, error)
      lastError = error as Error

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          await logger.error(
            "DATA_SERVICE_TIMEOUT",
            `Request timed out after ${responseTime}ms`,
            error,
            { attempt, maxRetries, responseTime },
            userEmail,
          )

          if (attempt < maxRetries) {
            console.log(`[v0] Request timed out, retrying... (attempt ${attempt + 1}/${maxRetries})`)
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
            continue
          }
          throw new Error(
            "Request timed out after multiple attempts. The server may be overloaded. Please try again in a few moments.",
          )
        }
        if (error.message.includes("fetch") || error.message.includes("network")) {
          await logger.error(
            "DATA_SERVICE_NETWORK_ERROR",
            "Network error occurred",
            error,
            { attempt, maxRetries },
            userEmail,
          )

          if (attempt < maxRetries) {
            console.log(`[v0] Network error, retrying... (attempt ${attempt + 1}/${maxRetries})`)
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
            continue
          }
          throw new Error("Network error. Please check your internet connection and try again.")
        }
      }

      await logger.error(
        "DATA_SERVICE_UNEXPECTED_ERROR",
        "Unexpected error in fetchCustomerData",
        error,
        { attempt, maxRetries },
        userEmail,
      )

      throw lastError
    }
  }

  throw lastError || new Error("Failed to fetch customer data after multiple attempts")
}
