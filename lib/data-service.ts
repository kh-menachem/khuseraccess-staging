import type { CustomerData } from "./types"

export async function fetchCustomerData(userEmail: string, userId: string, language = "en"): Promise<CustomerData> {
  try {
    console.log("Fetching customer data for:", userEmail, userId)

    const response = await fetch("/api/customer-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userEmail,
        userId,
        language,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("API error response:", errorData)
      throw new Error(`API Error: ${errorData.error || "Unknown error"}`)
    }

    const data = await response.json()
    console.log("Successfully received customer data")

    return data
  } catch (error) {
    console.error("Error in fetchCustomerData:", error)
    throw error
  }
}
