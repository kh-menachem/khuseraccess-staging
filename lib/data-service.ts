import type { CustomerData } from "./types"

export async function fetchCustomerData(userEmail: string, userId: string): Promise<CustomerData> {
  try {
    const response = await fetch("/api/customer-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userEmail, userId }),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch customer data")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching customer data:", error)
    throw error
  }
}
