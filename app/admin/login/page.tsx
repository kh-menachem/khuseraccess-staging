"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Sign in with Firebase
      await signIn(email, password)

      // Check if user is admin
      const adminCheckResponse = await fetch("/api/admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const adminResult = await adminCheckResponse.json()

      if (adminResult.success && adminResult.isAdmin) {
        // Redirect to admin panel
        toast({
          title: "Admin login successful",
          description: "Redirecting to admin panel...",
        })
        router.push("/admin")
      } else {
        setError("Access denied. Admin privileges required.")
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Admin privileges required to access this system.",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Login failed: ${errorMessage}`)
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid email or password.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8fafc" }}>
      {/* Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Admin Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 relative flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600">Login to Management System</p>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-lg bg-white">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 p-8">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 pl-10"
                      />
                      <div className="absolute top-1/2 transform -translate-y-1/2 right-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500 pl-10 pr-10"
                      />
                      <div className="absolute top-1/2 transform -translate-y-1/2 left-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 transform -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="text-center space-y-3">
                  <Link href="/forgot-password?admin=true" className="text-sm text-red-600 hover:text-red-800 block">
                    Forgot password?
                  </Link>

                  <div className="border-t pt-3">
                    <Link href="/login" className="text-sm text-gray-600 hover:text-gray-800">
                      Back to User Login
                    </Link>
                  </div>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>

      {/* Illustration Side */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-8"
        style={{
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
        }}
      >
        <div className="max-w-lg text-center">
          <Shield className="w-32 h-32 text-white mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white mb-4">Admin Access</h2>
          <p className="text-white/90 text-lg">Login to Management System</p>
        </div>
      </div>
    </div>
  )
}
