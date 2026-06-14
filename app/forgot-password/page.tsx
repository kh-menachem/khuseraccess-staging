"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

const translations = {
  he: {
    resetPassword: "איפוס סיסמה",
    emailAddress: "כתובת אימייל",
    enterEmail: "הזן כתובת אימייל",
    sendResetLink: "שלח קישור איפוס",
    sending: "שולח...",
    backToLogin: "חזור להתחברות",
    resetInstructions: "הזן את כתובת האימייל שלך כדי לקבל קישור לאיפוס סיסמה",
    english: "English",
    resetEmailSent: "אימייל איפוס סיסמה נשלח",
    checkEmail: "בדוק את תיבת הדואר שלך להוראות איפוס הסיסמה",
    resetFailed: "שליחת אימייל איפוס נכשלה",
    errorSendingEmail: "הייתה שגיאה בשליחת אימייל איפוס הסיסמה",
  },
  en: {
    resetPassword: "Reset Password",
    emailAddress: "Email Address",
    enterEmail: "Enter your email",
    sendResetLink: "Send Reset Link",
    sending: "Sending...",
    backToLogin: "Back to login",
    resetInstructions: "Enter your email address to receive a password reset link",
    english: "עברית",
    resetEmailSent: "Password reset email sent",
    checkEmail: "Check your email for instructions to reset your password",
    resetFailed: "Password reset failed",
    errorSendingEmail: "There was an error sending the password reset email",
  },
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [language, setLanguage] = useState<"en" | "he">("he") // Default to Hebrew
  const { toast } = useToast()
  const { resetPassword } = useAuth()
  const searchParams = useSearchParams()

  // Check if this is admin reset (from admin login page)
  const isAdminReset = searchParams.get("admin") === "true"

  // If admin reset, force English
  const effectiveLanguage = isAdminReset ? "en" : language
  const t = translations[effectiveLanguage]
  const isRTL = effectiveLanguage === "he"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Set Firebase language before sending reset email
      await fetch("/api/auth/set-language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: effectiveLanguage }),
      })

      await resetPassword(email)
      setSuccess(true)
      toast({
        title: t.resetEmailSent,
        description: t.checkEmail,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(t.errorSendingEmail)
      toast({
        variant: "destructive",
        title: t.resetFailed,
        description: t.errorSendingEmail,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const backToLoginUrl = isAdminReset ? "/admin/login" : "/login"
  const gradientStyle = isAdminReset
    ? { background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)" }
    : { background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)" }

  return (
    <div className={`min-h-screen flex ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      {/* Form Side */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 ${isRTL ? "lg:order-last" : ""}`}>
        <div className="w-full max-w-md">
          {/* Language Toggle - Only show for non-admin */}
          {!isAdminReset && (
            <div className={`mb-8 ${isRTL ? "text-right" : "text-left"}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "en" ? "he" : "en")}
                className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-medium"
              >
                {t.english}
              </Button>
            </div>
          )}

          {/* Logo */}
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

          {/* Header */}
          <div className={`mb-8 text-center`}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.resetPassword}</h1>
            <p className="text-gray-600">{t.resetInstructions}</p>
          </div>

          {/* Reset Form */}
          <Card className="border-0 shadow-lg bg-white">
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 p-8">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>שגיאה</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertTitle>{t.resetEmailSent}</AlertTitle>
                    <AlertDescription>{t.checkEmail}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={`text-gray-700 font-medium ${isRTL ? "text-right block" : ""}`}>
                      {t.emailAddress}
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.enterEmail}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={`h-12 border-gray-300 ${isAdminReset ? "focus:border-red-500 focus:ring-red-500" : "focus:border-teal-500 focus:ring-teal-500"} ${isRTL ? "text-right pr-10" : "pl-10"}`}
                        dir={isRTL ? "rtl" : "ltr"}
                      />
                      <div className={`absolute top-1/2 transform -translate-y-1/2 ${isRTL ? "left-3" : "right-3"}`}>
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
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  style={gradientStyle}
                  disabled={isLoading}
                >
                  {isLoading ? t.sending : t.sendResetLink}
                </Button>

                <div className={`text-center`}>
                  <Link
                    href={backToLoginUrl}
                    className={`text-sm hover:underline ${isAdminReset ? "text-red-600 hover:text-red-800" : "text-teal-600 hover:text-teal-800"}`}
                  >
                    {t.backToLogin}
                  </Link>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>

      {/* Illustration Side */}
      <div
        className={`hidden lg:flex lg:w-1/2 items-center justify-center p-8 ${isRTL ? "lg:order-first" : ""}`}
        style={gradientStyle}
      >
        <div className="max-w-lg">
          <Image
            src="/images/login-security-bg.png"
            alt="Secure Login Illustration"
            width={500}
            height={400}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}
