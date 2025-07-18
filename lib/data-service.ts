import type { CustomerData } from "./types"
import { ApiClient } from "./api-client"

export async function fetchCustomerData(userEmail: string, userId: string): Promise<CustomerData> {
  try {
    console.log("Fetching customer data for:", { userEmail, userId })

    // 🔒 SECURITY: Use secure API client with authentication
    const response = await ApiClient.post("/api/customer-data", {
      userEmail,
      userId,
      language: "en", // Default language, can be made dynamic
    })

    console.log("API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API error response:", errorData)
      throw new Error(`API Error: ${errorData.error || "Unknown error"}`)
    }

    const data = await response.json()
    console.log("Successfully received customer data:", {
      id: data.id,
      currentTransactions: data.currentTransactions?.length || 0,
      transactions2024: data.transactions2024?.length || 0,
      oldTransactions: data.oldTransactions?.length || 0,
      donations: data.donations?.length || 0,
      machineRentals: data.machineRentals?.length || 0,
    })

    return data
  } catch (error) {
    console.error("Error in fetchCustomerData:", error)
    throw error
  }
}
