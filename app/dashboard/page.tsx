"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useSessionManager } from "@/hooks/useSessionManager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, LogOut, Search, Languages, AlertTriangle, Calendar, ChevronDown } from "lucide-react"
import { fetchCustomerData } from "@/lib/data-service"
import type { CustomerData } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"

// Function to format numbers with commas
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Define a combined transaction type for unified view
interface CombinedTransaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  net: number
  type: string
  source: string
  donorName?: string
  purpose?: string
  machineId?: string
  status?: string
  notCleared?: string
  cardknox?: string
}

interface Account {
  userId: string
  accountNumber: string
  name: string
  firstName: string
  lastName: string
}

// Translation object
const translations = {
  en: {
    dashboard: "Dashboard",
    welcomeBack: "Welcome Back",
    logout: "Logout",
    accountNumber: "Account #",
    availableBalance: "Available Balance",
    notClearedTotal: "Not Cleared Total",
    totalTransactions: "total transactions",
    allTransactions: "All Transactions",
    viewAllTransactions: "View all your money transactions and donations",
    searchTransactions: "Search transactions...",
    dateRange: "Date Range",
    type: "Type",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",
    last6Months: "Last 6 Months",
    thisYear: "This Year",
    customRange: "Custom Range",
    allTime: "All Time",
    allTypes: "All Types",
    search: "Search",
    dateTime: "Date/Time",
    notes: "Notes",
    amount: "Amount",
    net: "Net",
    status: "Status",
    cardknox: "Cardknox",
    noTransactionsFound: "No transactions found matching your filters",
    showingRecords: "Showing",
    ofRecords: "of",
    records: "records",
    clickToViewNotCleared: "Click to view all not cleared transactions",
    showingNotClearedOnly: "Showing only not cleared transactions",
    clearNotClearedFilter: "Clear filter",
    fromDate: "From Date",
    toDate: "To Date",
    applyDateRange: "Apply",
    clearDateRange: "Clear",
    switchAccount: "Switch Account",
    types: {
      check: "Check",
      "credit card": "Credit Card",
      "donor fund": "Vouchers",
      cash: "Cash",
      links: "Links/Phone Donations",
      wires: "Wires",
      "remote checks": "Checks",
      "post dated": "Post Dated",
      "machine rental": "Machine Rental",
      payout: "Payout",
      fees: "Fees",
      ramp: "Ramp",
      "bounced check fee": "Bounced Check Fee",
      "coins 0%": "Coins 0%",
      "phone rental": "Phone Rental",
      "transfer from +": "Transfer From +",
      "transfer to -": "Transfer To -",
      "0": "0",
      coins: "Coins",
      donation: "Donation",
    },
    notClearedStatuses: {
      true: "Not Cleared",
      yes: "Not Cleared",
      "1": "Not Cleared",
      false: "Cleared",
      no: "Cleared",
      "0": "Cleared",
    },
  },
  he: {
    dashboard: "לוח בקרה",
    welcomeBack: "ברוך הבא",
    logout: "התנתק",
    accountNumber: "מס' חשבון",
    availableBalance: "יתרה זמינה",
    notClearedTotal: "סך לא זמין",
    totalTransactions: "סך עסקאות",
    allTransactions: "כל העסקאות",
    viewAllTransactions: "צפה בכל עסקאות הכסף והתרומות שלך",
    searchTransactions: "חפש עסקאות...",
    dateRange: "טווח תאריכים",
    type: "סוג",
    last30Days: "30 הימים האחרונים",
    last90Days: "90 הימים האחרונים",
    last6Months: "6 החודשים האחרונים",
    thisYear: "השנה הנוכחית",
    customRange: "טווח מותאם",
    allTime: "כל הזמן",
    allTypes: "כל הסוגים",
    search: "חיפוש",
    dateTime: "תאריך/שעה",
    notes: "הערות",
    amount: "סכום",
    net: "נטו",
    status: "מצב",
    cardknox: "Cardknox",
    noTransactionsFound: "לא נמצאו עסקאות התואמות למסננים שלך",
    showingRecords: "מציג",
    ofRecords: "מתוך",
    records: "רשומות",
    clickToViewNotCleared: "לחץ לצפייה בכל העסקאות שלא זמינים",
    showingNotClearedOnly: "מציג רק עסקאות שלא זמינים",
    clearNotClearedFilter: "נקה מסנן",
    fromDate: "מתאריך",
    toDate: "עד תאריך",
    applyDateRange: "החל",
    clearDateRange: "נקה",
    switchAccount: "החלף חשבון",
    types: {
      check: "צ'ק",
      "credit card": "כרטיס אשראי",
      "donor fund": "וואצרים",
      cash: "מזומן",
      links: "קישורים",
      wires: "העברות נכנסות",
      "remote checks": "צ'קים",
      "post dated": "צ'קים דחויים",
      "machine rental": "השכרת מכונה",
      payout: "תשלום",
      fees: "עמלות",
      ramp: "כרטיס RAMP",
      "bounced check fee": "עמלת צ'ק חוזר",
      "coins 0%": "מטבעות 0%",
      "phone rental": "השכרת טלפון",
      "transfer from +": "העברה מ +",
      "transfer to -": "העברה ל -",
      "0": "0",
      coins: "מטבעות",
      donation: "תרומה",
    },
    notClearedStatuses: {
      true: "לא זמין",
      yes: "לא זמין",
      "1": "לא זמין",
      false: "זמין",
      no: "זמין",
      "0": "זמין",
    },
  },
}

// Function to translate type names
const translateType = (type: string, t: any) => {
  const lowerType = type.toLowerCase()
  return t.types[lowerType] || type
}


// Function to check if donation should be hidden or have restricted info
const shouldHideDonationInfo = (donorName: string, field: "date" | "amount" | "all") => {
  const lowerDonorName = donorName?.toLowerCase().trim() || ""

  // Anonymous donations - hide all info
  if (lowerDonorName.includes("anonymous") && lowerDonorName.includes("do not share")) {
    return field === "all" || field === "date" || field === "amount"
  }

  // Paskesz donations - hide amount only
  if (lowerDonorName.includes("paskesz")) {
    return field === "amount"
  }

  return false
}

export default function Dashboard() {
  const [user, setUser] = useState<{
    id: string
    name: string
    firstName?: string
    lastName?: string
    accountNumber?: string
    email: string
    accounts?: Account[]
    language?: "en" | "he"
  } | null>(null)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("30") // Default to last 30 days
  const [typeFilter, setTypeFilter] = useState("all") // Default to all transaction types
  const [notClearedFilter, setNotClearedFilter] = useState(false) // New filter for not cleared
  const [sortColumn, setSortColumn] = useState("date") // Default sort by date
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc") // Default newest first
  const [language, setLanguage] = useState<"en" | "he">("en") // Default to English
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const { user: firebaseUser, logout } = useAuth()
  const router = useRouter()
  
  useSessionManager({
    mode: "inactivity",
    minutes: 10,
    redirectTo: "/login", // or your actual login route
  })


  const t = translations[language]

  useEffect(() => {
    // Check if user is logged in with Firebase
    if (!firebaseUser) {
      router.push("/login")
      return
    }

    // Check if we have the user data in localStorage
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)

      // Check if user needs to select an account first
      if (parsedUser.needsAccountSelection) {
        router.push("/select-account")
        return
      }

      // Check if user has a selected account
      if (!parsedUser.id) {
        router.push("/select-account")
        return
      }

      // Fetch customer data
      const loadData = async () => {
        try {
          setIsLoading(true)
          setUser(parsedUser)

          // Set language from stored user preference
          if (parsedUser.language) {
            setLanguage(parsedUser.language)
          }

          // Pass both email and userId to fetchCustomerData
          const data = await fetchCustomerData(parsedUser.email, parsedUser.id)
          setCustomerData(data)
        } catch (error) {
          console.error("Error loading customer data:", error)
        } finally {
          setIsLoading(false)
        }
      }

      loadData()
    } catch (error) {
      console.error("Error parsing stored user:", error)
      router.push("/login")
    }
  }, [router, firebaseUser])

  const handleLogout = async () => {
    try {
      await logout() // This will clear localStorage automatically
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleAccountSwitch = async (account: Account) => {
    setIsLoading(true)
    try {
      // Update user info with selected account
      const updatedUser = {
        ...user!,
        id: account.userId,
        name: account.name,
        firstName: account.firstName,
        lastName: account.lastName,
        accountNumber: account.accountNumber,
      }

      setUser(updatedUser)

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser))

      // Fetch data for the new account
      const data = await fetchCustomerData(user!.email, account.userId)
      setCustomerData(data)
    } catch (error) {
      console.error("Error switching account:", error)
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

  // Combine all money transactions (including donations) into a single array
  const allMoneyTransactions = useMemo(() => {
    if (!customerData) return []

    const combined: CombinedTransaction[] = [
      // Current transactions
      ...customerData.currentTransactions.map((tx) => ({
        ...tx,
        net: tx.net,
        source: "Current",
      })),
      // 2024 transactions
      ...customerData.transactions2024.map((tx) => ({
        ...tx,
        net: tx.net,
        source: "2024",
      })),
      // Old transactions
      ...customerData.oldTransactions.map((tx) => ({
        ...tx,
        net: tx.net,
        source: "Historical",
      })),
      // Donations (amount is net, show donor name in notes)
      ...customerData.donations.map((donation) => ({
        id: donation.id,
        date: donation.date,
        description: donation.donorName, // Show donor name in notes column
        reference: donation.donorId,
        amount: donation.amount,
        net: donation.net,
        type: donation.type,
        source: "Donations",
        donorName: donation.donorName,
        purpose: donation.purpose,
        notCleared: "", // Donations don't have not cleared status
        cardknox: "", // Donations don't have cardknox
      })),
    ]

    return combined
  }, [customerData])

  // Calculate not cleared total
  const notClearedTotal = useMemo(() => {
    return allMoneyTransactions
      .filter((tx) => {
        const notCleared = tx.notCleared?.toLowerCase().trim()
        return notCleared === "true" || notCleared === "yes" || notCleared === "1"
      })
      .reduce((sum, tx) => sum + tx.net, 0)
  }, [allMoneyTransactions])

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    if (!allMoneyTransactions.length) return []

    let filtered = [...allMoneyTransactions]

    // Apply not cleared filter first
    if (notClearedFilter) {
      filtered = filtered.filter((tx) => {
        const notCleared = tx.notCleared?.toLowerCase().trim()
        return notCleared === "true" || notCleared === "yes" || notCleared === "1"
      })
    }

    // Apply date filter
    if (dateFilter !== "all") {
      if (dateFilter === "thisYear") {
        const currentYear = new Date().getFullYear()
        const startOfYear = new Date(currentYear, 0, 1)
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

        filtered = filtered.filter((tx) => {
          const txDate = new Date(tx.date)
          return txDate >= startOfYear && txDate <= endOfYear
        })
      } else if (dateFilter === "custom" && customDateFrom && customDateTo) {
        const fromDate = new Date(customDateFrom)
        const toDate = new Date(customDateTo)
        toDate.setHours(23, 59, 59) // Include the entire end date

        filtered = filtered.filter((tx) => {
          const txDate = new Date(tx.date)
          return txDate >= fromDate && txDate <= toDate
        })
      } else if (dateFilter !== "custom") {
        const daysAgo = Number.parseInt(dateFilter)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

        filtered = filtered.filter((tx) => {
          const txDate = new Date(tx.date)
          return txDate >= cutoffDate
        })
      }
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) => tx.type.toLowerCase() === typeFilter.toLowerCase())
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (tx) =>
          (tx.description && tx.description.toLowerCase().includes(search)) ||
          (tx.reference && tx.reference.toLowerCase().includes(search)) ||
          (tx.source && tx.source.toLowerCase().includes(search)) ||
          (tx.type && tx.type.toLowerCase().includes(search)) ||
          (tx.donorName && tx.donorName.toLowerCase().includes(search)) ||
          (tx.purpose && tx.purpose.toLowerCase().includes(search)) ||
          (tx.notCleared && tx.notCleared.toLowerCase().includes(search)) ||
          (tx.cardknox && tx.cardknox.toLowerCase().includes(search)),
      )
    }

    // Sort the transactions
    return filtered.sort((a, b) => {
      if (sortColumn === "date") {
        const dateA = new Date(a.date || "").getTime()
        const dateB = new Date(b.date || "").getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortColumn === "amount") {
        return sortDirection === "asc" ? a.net - b.net : b.net - a.net
      } else if (sortColumn === "type") {
        const typeA = a.type || ""
        const typeB = b.type || ""
        return sortDirection === "asc" ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA)
      } else if (sortColumn === "net") {
        return sortDirection === "asc" ? a.net - b.net : b.net - a.net
      } else {
        // Default to date sorting if column not recognized
        const dateA = new Date(a.date || "").getTime()
        const dateB = new Date(b.date || "").getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      }
    })
  }, [
    allMoneyTransactions,
    dateFilter,
    typeFilter,
    searchTerm,
    sortColumn,
    sortDirection,
    notClearedFilter,
    customDateFrom,
    customDateTo,
  ])

  // Get unique transaction types for filter dropdown
  const transactionTypes = useMemo(() => {
    const types = new Set<string>()
    allMoneyTransactions.forEach((tx) => {
      if (tx.type) types.add(tx.type)
    })
    return Array.from(types).sort()
  }, [allMoneyTransactions])

  // Calculate available balance (all money transactions including donations)
  const availableBalance = useMemo(() => {
    return allMoneyTransactions
      .filter((tx) => {
        const notCleared = tx.notCleared?.toLowerCase().trim()
        // Exclude transactions where notCleared is "true", "yes", or "1"
        return !(notCleared === "true" || notCleared === "yes" || notCleared === "1")
      })
      .reduce((sum, tx) => sum + tx.net, 0)
  }, [allMoneyTransactions])

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 50%, #40E0D0 100%)",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Handle sort change
  const handleSortChange = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to descending
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  // Handle not cleared filter toggle
  const handleNotClearedClick = () => {
    setNotClearedFilter(!notClearedFilter)
  }

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    if (value === "custom") {
      setShowCustomDatePicker(true)
    } else {
      setShowCustomDatePicker(false)
      setCustomDateFrom("")
      setCustomDateTo("")
    }
  }

  // Apply custom date range
  const applyCustomDateRange = () => {
    setShowCustomDatePicker(false)
  }

  // Clear custom date range
  const clearCustomDateRange = () => {
    setCustomDateFrom("")
    setCustomDateTo("")
    setDateFilter("30")
    setShowCustomDatePicker(false)
  }

  return (
    <div className={`flex min-h-screen flex-col ${language === "he" ? "rtl" : "ltr"}`}>
      <header
        className="border-b shadow-sm"
        style={{
          background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)",
        }}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/images/kh-hand-logo.png"
                alt="Keren Hatzedakah Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-bold text-white">Keren Hatzedakah</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLanguageChange(language === "en" ? "he" : "en")}
              className="border-white text-white hover:text-black transition-colors min-w-[100px] h-10"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                borderColor: "#FFD700",
              }}
            >
              <Languages className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap font-medium">{language === "en" ? "עברית" : "English"}</span>
            </Button>

            {user && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarFallback className="bg-white text-teal-600 font-semibold">
                    {user.firstName && user.lastName
                      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                      : user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-medium text-white min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                    </span>
                    {user.accounts && user.accounts.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white/20">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <div className="px-2 py-1.5 text-sm font-medium text-gray-700">{t.switchAccount}</div>
                          {user.accounts.map((account) => (
                            <DropdownMenuItem
                              key={account.userId}
                              onClick={() => handleAccountSwitch(account)}
                              className={`flex flex-col items-start p-3 ${
                                account.userId === user.id ? "bg-teal-50" : ""
                              }`}
                            >
                              <div className="font-medium">{account.name}</div>
                              <div className="text-sm text-gray-500">Account #{account.accountNumber}</div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="text-xs opacity-90 truncate">
                    {t.accountNumber} {user.accountNumber || user.id}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-white text-white hover:text-black transition-colors min-w-[90px] h-10 bg-transparent"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                borderColor: "#FFD700",
              }}
            >
              <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap font-medium">{t.logout}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-800">{t.dashboard}</h2>
              <p className="text-gray-600">
                {t.welcomeBack}, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name}{" "}
                ({user?.email})
              </p>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{t.availableBalance}</CardTitle>
                <DollarSign className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${availableBalance < 0 ? "text-red-600" : "text-green-600"}`}>
                  ${formatNumber(availableBalance)}
                </div>
                <p className="text-xs text-gray-500">
                  {allMoneyTransactions.length} {t.totalTransactions}
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-xl transition-all duration-200 shadow-lg border-0"
              onClick={handleNotClearedClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{t.notClearedTotal}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${notClearedTotal < 0 ? "text-red-600" : "text-orange-600"}`}>
                  ${formatNumber(notClearedTotal)}
                </div>
                <p className="text-xs text-gray-500">{t.clickToViewNotCleared}</p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions View */}
          <Card className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-gray-800">{t.allTransactions}</CardTitle>
                <CardDescription className="text-gray-600">
                  {notClearedFilter ? t.showingNotClearedOnly : t.viewAllTransactions}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {notClearedFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotClearedFilter(false)}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    {t.clearNotClearedFilter}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder={t.searchTransactions}
                    className="pl-8 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-40">
                    <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                      <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue placeholder={t.dateRange} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{t.last30Days}</SelectItem>
                        <SelectItem value="90">{t.last90Days}</SelectItem>
                        <SelectItem value="180">{t.last6Months}</SelectItem>
                        <SelectItem value="thisYear">{t.thisYear}</SelectItem>
                        <SelectItem value="custom">{t.customRange}</SelectItem>
                        <SelectItem value="all">{t.allTime}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dateFilter === "custom" && (
                    <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
                          <Calendar className="h-4 w-4 mr-2" />
                          {customDateFrom && customDateTo ? `${customDateFrom} - ${customDateTo}` : t.customRange}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t.fromDate}</label>
                            <Input
                              type="date"
                              value={customDateFrom}
                              onChange={(e) => setCustomDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t.toDate}</label>
                            <Input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={applyCustomDateRange}
                              disabled={!customDateFrom || !customDateTo}
                            >
                              {t.applyDateRange}
                            </Button>
                            <Button size="sm" variant="outline" onClick={clearCustomDateRange}>
                              {t.clearDateRange}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <div className="w-40">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue placeholder={t.type} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allTypes}</SelectItem>
                        {transactionTypes.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {t.types[type.toLowerCase()] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active filters display */}
              <div className="flex flex-wrap gap-2">
                {notClearedFilter && (
                  <Badge variant="destructive" className="cursor-pointer" onClick={() => setNotClearedFilter(false)}>
                    Not Cleared ✕
                  </Badge>
                )}
                {dateFilter !== "all" && (
                  <Badge variant="secondary">
                    {dateFilter === "30"
                      ? t.last30Days
                      : dateFilter === "90"
                        ? t.last90Days
                        : dateFilter === "180"
                          ? t.last6Months
                          : dateFilter === "thisYear"
                            ? t.thisYear
                            : dateFilter === "custom" && customDateFrom && customDateTo
                              ? `${customDateFrom} - ${customDateTo}`
                              : t.customRange}
                  </Badge>
                )}
                {typeFilter !== "all" && (
                  <Badge variant="secondary">
                    {t.type}: {t.types[typeFilter] || typeFilter}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary">
                    {t.search}: {searchTerm}
                  </Badge>
                )}
              </div>

              {/* Transactions Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange("date")}>
                        {t.dateTime} {sortColumn === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange("type")}>
                        {t.type} {sortColumn === "type" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead>{t.notes}</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange("amount")}>
                        {t.amount} {sortColumn === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSortChange("net")}>
                        {t.net} {sortColumn === "net" && (sortDirection === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.cardknox}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {t.noTransactionsFound}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <TableRow key={`${tx.source}-${tx.id}`}>
                          <TableCell>{shouldHideDonationInfo(tx.donorName || "", "date") ? "***" : tx.date}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${tx.net >= 0 ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-red-50 text-red-800 border-red-200"}`}
                            >
                              {translateType(tx.type, t)}
                            </Badge>
                          </TableCell>
                          <TableCell>{translateNotes(tx.description, language)}</TableCell>
                          <TableCell className="font-medium text-black">
                            {shouldHideDonationInfo(tx.donorName || "", "amount")
                              ? "***"
                              : `$${formatNumber(tx.amount)}`}
                          </TableCell>
                          <TableCell className={`font-medium ${tx.net < 0 ? "text-red-600" : "text-green-600"}`}>
                            {shouldHideDonationInfo(tx.donorName || "", "amount") ? "***" : `$${formatNumber(tx.net)}`}
                          </TableCell>
                          <TableCell>
                            {tx.notCleared && (
                              <Badge
                                variant={
                                  tx.notCleared.toLowerCase().trim() === "true" ||
                                  tx.notCleared.toLowerCase().trim() === "yes" ||
                                  tx.notCleared.toLowerCase().trim() === "1"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {t.notClearedStatuses[tx.notCleared.toLowerCase().trim()] || tx.notCleared}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{tx.cardknox}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-sm text-gray-500">
                {t.showingRecords} {filteredTransactions.length} {t.ofRecords} {allMoneyTransactions.length} {t.records}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer
        className="py-6"
        style={{
          background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)",
        }}
      >
        <div className="container mx-auto px-4 text-center text-sm text-white">
          &copy; {new Date().getFullYear()} Keren Hatzedakah. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
