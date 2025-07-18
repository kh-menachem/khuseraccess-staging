"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Languages } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const translations = {
  he: {
    signIn: "התחבר",
    signInToAccount: "התחבר לחשבון שלך",
    enterCredentials: "הזן את פרטי ההתחברות שלך כדי לגשת לחשבון שלך",
    email: "אימייל",
    password: "סיסמה",
    forgotPassword: "שכחת סיסמה?",
    signInButton: "התחבר",
    signingIn: "מתחבר...",
    english: "English",
    showPassword: "הצג סיסמה",
    hidePassword: "הסתר סיסמה",
  },
  en: {
    signIn: "Sign In",
    signInToAccount: "Sign in to your account",
    enterCredentials: "Enter your credentials to access your account",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot your password?",
    signInButton: "Sign In",
    signingIn: "Signing in...",
    english: "עברית",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<"en" | "he">("en")
  const { user, login } = useAuth()
  const router = useRouter()

  const t = translations[language]
  const isRTL = language === "he"

  useEffect(() => {
    if (user) {
      // User is already logged in, redirect to dashboard
      router.push("/dashboard")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // First, authenticate with Firebase
      await login(email, password)

      // Then check if user exists in Google Sheets
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, language }),
      })

      const result = await response.json()

      if (result.success) {
        // Store user data in localStorage
        const userData = {
          ...result.user,
          language: language,
        }
        localStorage.setItem("user", JSON.stringify(userData))

        // Check if user needs to select an account
        if (result.user.needsAccountSelection) {
          router.push("/select-account")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(result.error || "Login failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.")
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password.")
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address.")
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.")
      } else {
        setError("Login failed. Please check your credentials and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageChange = (newLanguage: "en" | "he") => {
    setLanguage(newLanguage)
  }

  return (
    <div className={`min-h-screen flex ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Language Toggle */}
          <div className={`mb-8 ${isRTL ? "text-right" : "text-left"}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLanguageChange(language === "en" ? "he" : "en")}
              className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-medium"
            >
              <Languages className="h-4 w-4 mr-2" />
              {t.english}
            </Button>
          </div>

          {/* KH Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 relative">
              <Image
                src="/images/kh-hand-logo.png"
                alt="Keren Hatzedakah Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">{t.signIn}</CardTitle>
              <CardDescription className="text-gray-600">{t.enterCredentials}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    {t.email}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    {t.password}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-gray-300 focus:border-teal-500 focus:ring-teal-500 pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5"
                  disabled={isLoading}
                >
                  {isLoading ? t.signingIn : t.signInButton}
                </Button>

                <div className="text-center">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium"
                  >
                    {t.forgotPassword}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Background Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image src="/images/login-security-bg.png" alt="Security Background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-teal-800/40" />
      </div>
    </div>
  )
}
