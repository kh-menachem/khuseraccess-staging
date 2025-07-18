import type { CustomerData } from "./types"
import { ApiClient } from "./api-client"

export async function fetchCustomerData(userEmail: string, userId: string, language = "en"): Promise<CustomerData> {
  try {
    console.log("Fetching customer data for:", userEmail, userId)

    const data = await ApiClient.post<CustomerData>("/api/customer-data", {
      userEmail,
      userId,
      language,
    })

    return data
  } catch (error) {
    console.error("Error in fetchCustomerData:", error)
    throw error
  }
}
