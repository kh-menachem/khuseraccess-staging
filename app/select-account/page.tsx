"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { User, ArrowRight, Languages } from "lucide-react"
import Image from "next/image"

interface Account {
  userId: string
  accountNumber: string
  name: string
  firstName: string
  lastName: string
}

interface StoredUser {
  email: string
  accounts: Account[]
  language?: "en" | "he"
  needsAccountSelection: boolean
}

const translations = {
  he: {
    selectAccount: "בחר חשבון",
    multipleAccountsFound: "נמצאו מספר חשבונות",
    selectAccountToContinue: "בחר חשבון כדי להמשיך לדשבורד שלך",
    accountNumber: "מס' חשבון",
    continue: "המשך",
    english: "English",
    backToLogin: "חזור להתחברות",
  },
  en: {
    selectAccount: "Select Account",
    multipleAccountsFound: "Multiple Accounts Found",
    selectAccountToContinue: "Select an account to continue to your dashboard",
    accountNumber: "Account #",
    continue: "Continue",
    english: "עברית",
    backToLogin: "Back to Login",
  },
}

export default function SelectAccountPage() {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [language, setLanguage] = useState<"en" | "he">("en")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const t = translations[language]
  const isRTL = language === "he"

  useEffect(() => {
    // Check if we have user data with multiple accounts
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser) as StoredUser

      if (!parsedUser.needsAccountSelection || !parsedUser.accounts || parsedUser.accounts.length <= 1) {
        router.push("/login")
        return
      }

      setUser(parsedUser)

      // Set language from stored user preference
      if (parsedUser.language) {
        setLanguage(parsedUser.language)
      }
    } catch (error) {
      console.error("Error parsing stored user:", error)
      router.push("/login")
    }
  }, [router])

  const handleAccountSelect = async (account: Account) => {
    setIsLoading(true)
    try {
      // Store selected account info
      const selectedUser = {
        id: account.userId,
        name: account.name,
        firstName: account.firstName,
        lastName: account.lastName,
        accountNumber: account.accountNumber,
        email: user!.email,
        accounts: user!.accounts, // Keep all accounts for switching later
        language: language,
      }

      localStorage.setItem("user", JSON.stringify(selectedUser))

      toast({
        title: "Account selected",
        description: "Redirecting to your dashboard...",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error selecting account:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to select account. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageChange = (newLanguage: "en" | "he") => {
    setLanguage(newLanguage)

    // Update localStorage with new language preference
    if (user) {
      const updatedUser = { ...user, language: newLanguage }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
    }
  }

  const handleBackToLogin = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
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

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.selectAccount}</h1>
            <p className="text-gray-600">{t.selectAccountToContinue}</p>
            <p className="text-sm text-gray-500 mt-2">{user.email}</p>
          </div>

          {/* Account Selection */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-gray-800">{t.multipleAccountsFound}</CardTitle>
              <CardDescription>
                {user.accounts.length} accounts found for {user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.accounts.map((account, index) => (
                <Card
                  key={account.userId}
                  className="border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => handleAccountSelect(account)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                          <p className="text-sm text-gray-600">
                            {t.accountNumber} {account.accountNumber}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-teal-300 text-teal-700 hover:bg-teal-50 bg-transparent"
                        disabled={isLoading}
                      >
                        {t.continue}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="pt-4 text-center">
                <Button variant="ghost" onClick={handleBackToLogin} className="text-gray-600 hover:text-gray-800">
                  {t.backToLogin}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
