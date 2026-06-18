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
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { SystemMessageBanner } from "@/components/system-message-banner"
import { logger, generateRequestId } from "@/lib/logger"

const translations = {
  he: {
    welcome: "ברוך הבא",
    emailAddress: "כתובת אימייל",
    enterEmail: "הזן כתובת אימייל",
    password: "סיסמה",
    enterPassword: "הזן סיסמה",
    signIn: "היכנס",
    signingIn: "מתחבר...",
    forgotPassword: "הגדרת או איפוס סיסמה",
    rememberMe: "זכור אותי",
    english: "English",
    noAccount: "אין לך חשבון?",
    contactAdmin: "לרישום גישה לחשבון יש לפנות למשרד במייל",
    showPassword: "הצג סיסמה",
    hidePassword: "הסתר סיסמה",
    accountNotSetup: "צור קשר עם מנהל המערכת כדי לסיים את הגדרת החשבון שלך",
    accountNotFound: "החשבון לא נמצא במערכת",
    firstTimeLine1: ",אם זו הפעם הראשונה שאתה נכנס לחשבון שלך",
    firstTimeBeforeLink: "לחץ",
    forgotPassword2: "כאן",
    firstTimeAfterLink: "כדי להגדיר סיסמה",
    firstTimeLine3: ".אנא בדוק את תיקיית הספאם שלך עבור האימייל",
  },
  en: {
    welcome: "Welcome",
    emailAddress: "Email Address",
    enterEmail: "Enter your email",
    password: "Password",
    enterPassword: "Enter your password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    forgotPassword: "Reset/Forgot Password?",
    rememberMe: "Remember me",
    english: "עברית",
    noAccount: "Don't have an account?",
    contactAdmin: "To register access to an account, please contact the office by email",
    showPassword: "Show password",
    hidePassword: "Hide password",
    accountNotSetup: "Contact the system administrator to finish setting up your account",
    accountNotFound: "Account not found in system",
    firstTimeLine1: "If this is your first time signing in to your account,",
    firstTimeBeforeLink: "Click",
    forgotPassword2: "Here",
    firstTimeAfterLink: "to set your password.",
    firstTimeLine3: "Please check your spam folder for the email.",
  },
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<"en" | "he">("he") // Default to Hebrew
  const router = useRouter()
  const { toast } = useToast()
  const { signIn } = useAuth()

  const t = translations[language]
  const isRTL = language === "he"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const requestId = generateRequestId()

    try {
      await logger.info(
        "LOGIN_ATTEMPT",
        `User attempting to login: ${email}`,
        { email, path: window.location.pathname },
        email,
      )

      const path = typeof window !== "undefined" ? window.location.pathname : ""
      const isAdminLogin = path.includes("/admin")

      const authPromise = signIn(email, password)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Authentication timeout")), 15000),
      )

      await Promise.race([authPromise, timeoutPromise])

      await logger.info("AUTH_SUCCESS", "Firebase authentication successful", { email }, email)

      if (isAdminLogin) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const adminCheckResponse = await fetch("/api/admin/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const contentType = adminCheckResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response from server")
        }

        const adminResult = await adminCheckResponse.json()

        if (adminResult.success && adminResult.isAdmin) {
          await logger.info(
            "ADMIN_LOGIN_SUCCESS",
            `Admin login successful: ${email}`,
            { email, role: adminResult.role },
            email,
          )

          toast({
            title: "Admin login successful",
            description: "Redirecting to admin panel...",
          })
          router.push("/admin")
        } else {
          await logger.warn("ADMIN_ACCESS_DENIED", `Non-admin user attempted admin login: ${email}`, { email }, email)

          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "This email is not authorized for admin access.",
          })
        }

        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[v0] Non-JSON response:", text.substring(0, 200))
        throw new Error("Server returned an invalid response. Please try again.")
      }

      const result = await response.json()

      if (result.success && result.user && result.user.accounts && result.user.accounts.length > 0) {
        const accounts = result.user.accounts

        if (accounts.length === 1) {
          // Single account
          const account = accounts[0]
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: account.userId,
              name: account.name,
              firstName: account.firstName,
              lastName: account.lastName,
              accountNumber: account.accountNumber,
              email: email,
              language: language,
            }),
          )

          await logger.info(
            "LOGIN_SUCCESS",
            `User logged in successfully: ${email}`,
            { email, accountNumber: account.accountNumber },
            email,
          )

          toast({
            title: "Login successful",
            description: "Redirecting to your dashboard...",
          })

          router.push("/dashboard")
        } else {
          await logger.info(
            "LOGIN_MULTI_ACCOUNT",
            `Multiple accounts found for user: ${email}`,
            { email, accountCount: accounts.length },
            email,
          )

          localStorage.setItem(
            "user",
            JSON.stringify({
              email: email,
              accounts: accounts,
              language: language,
              needsAccountSelection: true,
            }),
          )

          toast({
            title: "Multiple accounts found",
            description: "Please select an account to continue...",
          })

          router.push("/select-account")
        }
      } else {
        await logger.warn("LOGIN_ACCOUNT_NOT_FOUND", `Account not found in People sheet: ${email}`, { email }, email)

        setError("ACCOUNT_NOT_SETUP")
        toast({
          variant: "destructive",
          title: language === "he" ? "החשבון לא נמצא" : "Account Not Found",
          description: language === "he" ? t.accountNotSetup : t.accountNotSetup,
        })
      }
    } catch (error) {
      let errorMessage = "Invalid email or password."

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = language === "he" ? "הבקשה פגה. אנא נסה שוב." : "Request timed out. Please try again."
        } else if (error.message.includes("auth/invalid-credential")) {
          errorMessage = language === "he" ? "האימייל או הסיסמה אינם נכונים." : "Invalid email or password."
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage =
            language === "he" ? "שגיאת רשת. אנא בדוק את החיבור שלך." : "Network error. Please check your connection."
        } else if (error.message.includes("timeout")) {
          errorMessage =
            language === "he"
              ? "הבקשה פגה. השרת עשוי להיות עמוס. אנא נסה שוב."
              : "Request timed out. Server may be busy. Please try again."
        } else {
          errorMessage = error.message
        }
      }

      await logger.error("LOGIN_FAILED", `Login failed for user: ${email}`, { email, error: errorMessage }, email)

      setError(errorMessage)

      toast({
        variant: "destructive",
        title: language === "he" ? "התחברות נכשלה" : "Login failed",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`h-screen overflow-hidden flex flex-col ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      <SystemMessageBanner location="login" />

      <div className="flex min-h-0 flex-1">
        {/* Login Form Side */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center px-4 py-3 ${isRTL ? "lg:order-last" : ""}`}>
          <div className="w-full max-w-sm">
            {/* Language Toggle */}
            <div className={`mb-3 ${isRTL ? "text-right" : "text-left"}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "en" ? "he" : "en")}
                className="border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-medium"
              >
                {t.english}
              </Button>
            </div>
            {/* KH Logo on top of login box */}
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 relative">
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
            <div className="mb-3 text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t.welcome}</h1>

              <div className="border-2 border-red-500 rounded-lg p-3 max-w-md mx-auto bg-white shadow-sm">
                <div className="flex items-center justify-center text-red-600 text-base font-bold mb-2">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                    />
                  </svg>
                  {language === "he" ? "!שים לב" : "Notice!"}
                </div>

                <p className="text-xs leading-5 text-gray-700">{t.firstTimeLine1}</p>
                <p className="text-xs leading-5 text-gray-700">
                  {t.firstTimeBeforeLink}{" "}
                  <Link href={{ pathname: "/forgot-password", query: { lang: language } }}>
                    <strong className="text-teal-700 hover:underline">{t.forgotPassword2}</strong>
                  </Link>{" "}
                  {t.firstTimeAfterLink}
                </p>
                <p className="text-xs leading-5 text-gray-700">{t.firstTimeLine3}</p>
              </div>
            </div>{" "}
            {/* closes .mb-3.text-center */}
            {/* Login Form */}
            <Card className="border-0 shadow-lg bg-white">
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 p-5">
                  {error && (
                    <Alert
                      variant={error === "ACCOUNT_NOT_SETUP" ? "default" : "destructive"}
                      className={`${
                        error === "ACCOUNT_NOT_SETUP" ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"
                      } ${language === "he" ? "text-right" : ""}`}
                      dir={language === "he" ? "rtl" : "ltr"}
                    >
                      <div className={`flex items-start gap-2 ${language === "he" ? "flex-row-reverse" : ""}`}>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <AlertTitle className={error === "ACCOUNT_NOT_SETUP" ? "text-orange-800" : ""}>
                        {error === "ACCOUNT_NOT_SETUP" ? t.accountNotFound : language === "he" ? "שגיאה" : "Error"}
                      </AlertTitle>
                      <AlertDescription
                        className={error === "ACCOUNT_NOT_SETUP" ? "text-orange-700 text-lg font-medium" : ""}
                      >
                        {error === "ACCOUNT_NOT_SETUP" ? t.accountNotSetup : error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1.5">
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
                          className={`h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500 ${isRTL ? "text-right pr-10" : "pl-10"}`}
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

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="password"
                        className={`text-gray-700 font-medium ${isRTL ? "text-right block" : ""}`}
                      >
                        {t.password}
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t.enterPassword}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className={`h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500 ${isRTL ? "text-right pr-20" : "pl-10 pr-10"}`}
                          dir={isRTL ? "rtl" : "ltr"}
                        />
                        <div className={`absolute top-1/2 transform -translate-y-1/2 ${isRTL ? "right-3" : "left-3"}`}>
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
                          className={`absolute top-1/2 transform -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-gray-400 hover:text-gray-600`}
                          title={showPassword ? t.hidePassword : t.showPassword}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className={`flex items-center ${isRTL ? "justify-end" : "justify-start"}`}>
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="remember-me"
                          className={`${isRTL ? "mr-2" : "ml-2"} block text-sm text-gray-700`}
                        >
                          {t.rememberMe}
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)",
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? t.signingIn : t.signIn}
                  </Button>

                  <div className="text-center space-y-3">
                    <Link
                      href={{ pathname: "/forgot-password", query: { lang: language } }}
                      className="block rounded-md border-2 border-teal-500 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 shadow-sm transition-colors hover:bg-teal-100 hover:text-teal-900"
                    >
                      {t.forgotPassword}
                    </Link>

                    <div className="border-t pt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">{t.noAccount}</p>
                      <p className="text-xs text-gray-600">{t.contactAdmin}</p>
                    </div>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        </div>

        {/* Illustration Side */}
        <div
          className={`hidden lg:flex lg:w-1/2 items-center justify-center p-4 ${isRTL ? "lg:order-first" : ""}`}
          style={{
            background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)",
          }}
        >
          <div className="max-w-lg">
            <Image
              src="/images/login-security-bg.png"
              alt="Secure Login Illustration"
              width={440}
              height={340}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  )
}
