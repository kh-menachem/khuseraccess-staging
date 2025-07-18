// Simple secure storage implementation for browser
export class SecureStorage {
  private static readonly PREFIX = "kh_secure_"
  private static readonly KEY = "kh_app_key_2024" // Simple key for basic encryption

  // Simple XOR encryption (for basic obfuscation)
  private static encrypt(text: string): string {
    const key = this.KEY
    let result = ""
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result) // Base64 encode
  }

  private static decrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText) // Base64 decode
      const key = this.KEY
      let result = ""
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return result
    } catch (error) {
      console.error("Decryption failed:", error)
      return ""
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value)
      const encrypted = this.encrypt(serialized)
      localStorage.setItem(this.PREFIX + key, encrypted)
    } catch (error) {
      console.error("SecureStorage setItem failed:", error)
      // Fallback to regular localStorage
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value))
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(this.PREFIX + key)
      if (!encrypted) return null

      // Try to decrypt first
      const decrypted = this.decrypt(encrypted)
      if (decrypted) {
        return JSON.parse(decrypted) as T
      }

      // Fallback: try to parse as regular JSON (for backward compatibility)
      return JSON.parse(encrypted) as T
    } catch (error) {
      console.error("SecureStorage getItem failed:", error)
      return null
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(this.PREFIX + key)
  }

  static clear(): void {
    // Remove all items with our prefix
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  }

  static hasItem(key: string): boolean {
    return localStorage.getItem(this.PREFIX + key) !== null
  }
}
