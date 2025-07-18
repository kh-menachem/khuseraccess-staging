import { auth } from "./firebase"

export class ApiClient {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("No authenticated user")
      }

      const token = await user.getIdToken(true) // Force refresh
      return token
    } catch (error) {
      console.error("Failed to get auth token:", error)
      return null
    }
  }

  static async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken()

    if (!token) {
      throw new Error("Authentication required")
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  static async post<T>(url: string, data: any): Promise<T> {
    return this.request<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async get<T>(url: string): Promise<T> {
    return this.request<T>(url, {
      method: "GET",
    })
  }
}
