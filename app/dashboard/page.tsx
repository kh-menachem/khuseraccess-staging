"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Heart,
  Languages,
  LogOut,
  PieChart,
  User,
  Users,
} from "lucide-react"
import Image from "next/image"
import { exportToExcel, exportToPDF } from "@/lib/export-utils"
import type { CustomerData } from "@/lib/types"

interface Account {
  userId: string
  accountNumber: string
  name: string
  firstName: string
  lastName: string
}

interface StoredUser {
  id: string
  name: string
  firstName: string
  lastName: string
  accountNumber: string
  email: string
  accounts?: Account[]
  language?: "en" | "he"
}

const translations = {
  he: {
    dashboard: "דשבורד",
    welcome: "ברוך הבא",
    accountOverview: "סקירת חשבון",
    donationHistory: "היסטוריית תרומות",
    reports: "דוחות",
    settings: "הגדרות",
    totalDonations: "סך תרומות",
    thisYear: "השנה",
    lastDonation: "תרומה אחרונה",
    accountNumber: "מס' חשבון",
    exportData: "ייצוא נתונים",
    exportExcel: "ייצוא לאקסל",
    exportPDF: "ייצוא ל-PDF",
    logout: "התנתק",
    english: "English",
    loading: "טוען...",
    error: "שגיאה",
    noData: "אין נתונים זמינים",
    date: "תאריך",
    amount: "סכום",
    description: "תיאור",
    category: "קטגוריה",
    switchAccount: "החלף חשבון",
  },
  en: {
    dashboard: "Dashboard",
    welcome: "Welcome",
    accountOverview: "Account Overview",
    donationHistory: "Donation History",
    reports: "Reports",
    settings: "Settings",
    totalDonations: "Total Donations",
    thisYear: "This Year",
    lastDonation: "Last Donation",
    accountNumber: "Account #",
    exportData: "Export Data",
    exportExcel: "Export to Excel",
    exportPDF: "Export to PDF",
    logout: "Logout",
    english: "עברית",
    loading: "Loading...",
    error: "Error",
    noData: "No data available",
    date: "Date",
    amount: "Amount",
    description: "Description",
    category: "Category",
    switchAccount: "Switch Account",
  },
}

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [language, setLanguage] = useState<"en" | "he">("en")
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const t = translations[language]
  const isRTL = language === "he"

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser) as StoredUser

      // Check if user needs to select an account
      if (parsedUser.needsAccountSelection) {
        router.push("/select-account")
        return
      }

      setUser(parsedUser)

      // Set language from stored user preference
      if (parsedUser.language) {
        setLanguage(parsedUser.language)
      }

      // Fetch customer data
      fetchCustomerData(parsedUser.id)
    } catch (error) {
      console.error("Error parsing stored user:", error)
      router.push("/login")
    }
  }, [router])

  const fetchCustomerData = async (userId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/customer-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch customer data")
      }

      const data = await response.json()
      if (data.success) {
        setCustomerData(data.data)
      } else {
        setError(data.error || "Failed to load customer data")
      }
    } catch (error) {
      console.error("Error fetching customer data:", error)
      setError("Failed to load customer data")
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

  const handleLogout = () => {
    localStorage.removeItem("user")
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
    router.push("/login")
  }

  const handleSwitchAccount = () => {
    if (user && user.accounts && user.accounts.length > 1) {
      // Set flag to show account selection
      const updatedUser = { ...user, needsAccountSelection: true }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      router.push("/select-account")
    }
  }

  const handleExportExcel = () => {
    if (customerData && user) {
      exportToExcel(customerData, user.name, user.accountNumber)
      toast({
        title: "Export successful",
        description: "Data exported to Excel successfully.",
      })
    }
  }

  const handleExportPDF = () => {
    if (customerData && user) {
      exportToPDF(customerData, user.name, user.accountNumber)
      toast({
        title: "Export successful",
        description: "Data exported to PDF successfully.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error || t.error}</p>
            <Button onClick={() => router.push("/login")} variant="outline">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 relative">
                <Image
                  src="/images/kh-hand-logo.png"
                  alt="Keren Hatzedakah Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{t.dashboard}</h1>
                <p className="text-sm text-gray-600">
                  {t.welcome}, {user.firstName || user.name}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Switch Account Button (if multiple accounts) */}
              {user.accounts && user.accounts.length > 1 && (
                <Button variant="outline" size="sm" onClick={handleSwitchAccount}>
                  <Users className="h-4 w-4 mr-2" />
                  {t.switchAccount}
                </Button>
              )}

              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLanguageChange(language === "en" ? "he" : "en")}
                className="border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                <Languages className="h-4 w-4 mr-2" />
                {t.english}
              </Button>

              {/* Logout */}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Info */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                    <p className="text-sm text-gray-600">
                      {t.accountNumber} {user.accountNumber}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="mr-2 bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    {t.exportExcel}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t.exportPDF}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t.accountOverview}</TabsTrigger>
            <TabsTrigger value="donations">{t.donationHistory}</TabsTrigger>
            <TabsTrigger value="reports">{t.reports}</TabsTrigger>
            <TabsTrigger value="settings">{t.settings}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {customerData ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t.totalDonations}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${customerData.donations.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-teal-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t.thisYear}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {
                              customerData.donations.filter(
                                (d) => new Date(d.date).getFullYear() === new Date().getFullYear(),
                              ).length
                            }
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-teal-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t.lastDonation}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {customerData.donations.length > 0
                              ? new Date(customerData.donations[0].date).toLocaleDateString()
                              : t.noData}
                          </p>
                        </div>
                        <Heart className="h-8 w-8 text-teal-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Donations */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t.donationHistory}</CardTitle>
                    <CardDescription>Your recent donation activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerData.donations.length > 0 ? (
                      <div className="space-y-4">
                        {customerData.donations.slice(0, 5).map((donation, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">${donation.amount.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{new Date(donation.date).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="secondary">{donation.category || "General"}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-8">{t.noData}</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">{t.noData}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Donations Tab */}
          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle>{t.donationHistory}</CardTitle>
                <CardDescription>Complete history of your donations</CardDescription>
              </CardHeader>
              <CardContent>
                {customerData && customerData.donations.length > 0 ? (
                  <div className="space-y-4">
                    {customerData.donations.map((donation, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">${donation.amount.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{new Date(donation.date).toLocaleDateString()}</p>
                          </div>
                          {donation.description && <p className="text-sm text-gray-600 mt-1">{donation.description}</p>}
                        </div>
                        <Badge variant="secondary" className="ml-4">
                          {donation.category || "General"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">{t.noData}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    {t.reports}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Detailed reports and analytics coming soon...</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Visual analytics and insights coming soon...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings}</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Language Preference</h3>
                  <div className="flex space-x-4">
                    <Button
                      variant={language === "en" ? "default" : "outline"}
                      onClick={() => handleLanguageChange("en")}
                    >
                      English
                    </Button>
                    <Button
                      variant={language === "he" ? "default" : "outline"}
                      onClick={() => handleLanguageChange("he")}
                    >
                      עברית
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Export Options</h3>
                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handleExportExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      {t.exportExcel}
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t.exportPDF}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
