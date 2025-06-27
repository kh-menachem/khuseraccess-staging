import type { CustomerData } from "./types"

export async function fetchCustomerData(userEmail: string, userId: string): Promise<CustomerData> {
  try {
    console.log("Fetching customer data for:", { userEmail, userId })

    const response = await fetch("/api/customer-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userEmail, userId }),
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", errorText)
      throw new Error(`Failed to fetch customer data: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log("Received data:", data)

    return data
  } catch (error) {
    console.error("Error fetching customer data:", error)
    throw error
  }
}
