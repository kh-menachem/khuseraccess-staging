import { auth } from "./firebase"

export class ApiClient {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser
      if (!user) return null

      return await user.getIdToken()
    } catch (error) {
      console.error("Failed to get auth token:", error)
      return null
    }
  }

  static async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken()

    if (!token) {
      throw new Error("Authentication required")
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  static async post(url: string, data: any): Promise<Response> {
    return this.secureRequest(url, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async get(url: string): Promise<Response> {
    return this.secureRequest(url, {
      method: "GET",
    })
  }
}
