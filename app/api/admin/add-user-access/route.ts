"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy } from "lucide-react"

export default function UserAccessForm() {
  const [accountNumber, setAccountNumber] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function generateRandomPassword(length = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  useEffect(() => {
    const newPassword = generateRandomPassword()
    setPassword(newPassword)
  }, [])

  const regeneratePassword = () => {
    const newPassword = generateRandomPassword()
    setPassword(newPassword)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setMessage("🔑 Password copied to clipboard")
    } catch (err) {
      setMessage("❌ Failed to copy password")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const response = await fetch("/api/admin/add-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountNumber, userEmail, password }),
    })

    const result = await response.json()
    if (result.success) {
      setMessage("✅ Access granted and user created successfully.")
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-md space-y-4">
      <div>
        <Label htmlFor="accountNumber">Account Number</Label>
        <Input
          id="accountNumber"
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="userEmail">User Email</Label>
        <Input
          id="userEmail"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Generated Password</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="button" variant="outline" onClick={regeneratePassword}>↻</Button>
          <Button type="button" variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Grant Access"}
      </Button>

      {message && <p className="text-sm text-center mt-2">{message}</p>}
    </form>
  )
}
