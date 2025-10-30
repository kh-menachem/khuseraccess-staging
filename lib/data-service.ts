import type { CustomerData } from "./types"

export async function fetchCustomerData(userEmail: string, userId: string): Promise<CustomerData> {
  if (!userEmail || !userId) {
    throw new Error("User email and ID are required")
  }

  try {
    console.log("[v0] Fetching customer data for:", { userEmail, userId })

    const response = await fetch("/api/customer-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userEmail,
        userId,
        language: "en", // Default language, can be made dynamic
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    console.log("[v0] API response status:", response.status)

    if (!response.ok) {
      let errorMessage = "Failed to fetch customer data"

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (parseError) {
        // If we can't parse the error response, use status text
        errorMessage = `Server error: ${response.status} ${response.statusText}`
      }

      console.error("[v0] API error response:", errorMessage)
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response format from server")
    }

    const data = await response.json()

    if (!data || typeof data !== "object") {
      throw new Error("Invalid data received from server")
    }

    console.log("[v0] Successfully received customer data:", {
      id: data.id,
      currentTransactions: data.currentTransactions?.length || 0,
      transactions2024: data.transactions2024?.length || 0,
      oldTransactions: data.oldTransactions?.length || 0,
      donations: data.donations?.length || 0,
      machineRentals: data.machineRentals?.length || 0,
    })

    return data
  } catch (error) {
    console.error("[v0] Error in fetchCustomerData:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection and try again.")
      }
      if (error.message.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection.")
      }
      throw error
    }

    throw new Error("An unexpected error occurred while fetching data")
  }
}
