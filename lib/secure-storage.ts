// Secure client-side storage utilities
export class SecureStorage {
  private static readonly ENCRYPTION_KEY = "kh-portal-key"

  // Simple encryption for client-side storage (not cryptographically secure, but better than plain text)
  private static encrypt(data: string): string {
    try {
      return btoa(encodeURIComponent(data))
    } catch {
      return data
    }
  }

  private static decrypt(data: string): string {
    try {
      return decodeURIComponent(atob(data))
    } catch {
      return data
    }
  }

  static setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      const encrypted = this.encrypt(serialized)
      localStorage.setItem(`${this.ENCRYPTION_KEY}_${key}`, encrypted)
    } catch (error) {
      console.error("Failed to store data securely:", error)
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(`${this.ENCRYPTION_KEY}_${key}`)
      if (!encrypted) return null

      const decrypted = this.decrypt(encrypted)
      return JSON.parse(decrypted) as T
    } catch (error) {
      console.error("Failed to retrieve data securely:", error)
      return null
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(`${this.ENCRYPTION_KEY}_${key}`)
  }

  static clear(): void {
    // Remove all app-specific items
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(this.ENCRYPTION_KEY)) {
        localStorage.removeItem(key)
      }
    })
  }
}
