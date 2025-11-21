"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useSessionManager } from "@/hooks/useSessionManager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, LogOut, Search, Languages, AlertTriangle, Calendar, ChevronDown, Mail, Send } from "lucide-react"
import { fetchCustomerData } from "@/lib/data-service"
import type { CustomerData } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image"
import React from "react"
import { SystemMessageBanner } from "@/components/system-message-banner"
import { logger, generateRequestId } from "@/lib/logger"

const roundToTwo = (num: number): number => {
  return Math.round(num * 100) / 100
}

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
    sendDonationInstructions: "Send Donation Instructions",
    sendingEmail: "Sending Email...",
    confirmSendEmail: "Send Donation Instructions?",
    confirmSendEmailDescription:
      "This will send donation instructions with QR code and payment methods to your email address.",
    cancel: "Cancel",
    send: "Send",
    emailSentSuccess: "Email sent successfully!",
    emailSentError: "Failed to send email. Please try again.",
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
    sendDonationInstructions: "שלח הוראות תרומה",
    sendingEmail: "שולח אימייל...",
    confirmSendEmail: "?לשלוח הוראות תרומה",
    confirmSendEmailDescription: "זה ישלח הוראות תרומה עם QR קוד ושיטות תשלום לכתובת האימייל שלך.",
    cancel: "ביטול",
    send: "שלח",
    emailSentSuccess: "!האימייל נשלח בהצלחה",
    emailSentError: "שליחת האימייל נכשלה. אנא נסה שוב.",
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
  const [error, setError] = useState<string | null>(null)
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
  const [showEmailConfirmDialog, setShowEmailConfirmDialog] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const { user: firebaseUser, logout } = useAuth()
  const router = useRouter()

  useSessionManager({
    mode: "inactivity",
    minutes: 10,
    redirectTo: "/login",
  })

  const t = translations[language]

  useEffect(() => {
    const initializeDashboard = async () => {
      const requestId = generateRequestId()

      try {
        // Check if user is logged in with Firebase
        if (!firebaseUser) {
          console.log("[v0] No Firebase user, redirecting to login")
          await logger.warn(
            "DASHBOARD_NO_AUTH",
            "User attempted to access dashboard without Firebase authentication",
            {},
          )
          router.push("/login")
          return
        }

        // Check if we have the user data in localStorage
        const storedUser = localStorage.getItem("user")
        if (!storedUser) {
          console.log("[v0] No stored user data, redirecting to login")
          await logger.warn("DASHBOARD_NO_USER_DATA", "User attempted to access dashboard without stored user data", {})
          router.push("/login")
          return
        }

        let parsedUser
        try {
          parsedUser = JSON.parse(storedUser)
        } catch (parseError) {
          console.error("[v0] Failed to parse stored user data:", parseError)
          await logger.error("DASHBOARD_PARSE_ERROR", "Failed to parse stored user data", { error: String(parseError) })
          localStorage.removeItem("user")
          router.push("/login")
          return
        }

        await logger.info(
          "DASHBOARD_PAGE_LOAD",
          `Dashboard page loaded for user: ${parsedUser.email}`,
          { userId: parsedUser.id, accountNumber: parsedUser.accountNumber },
          parsedUser.email,
        )

        // Check if user needs to select an account first
        if (parsedUser.needsAccountSelection) {
          console.log("[v0] User needs account selection")
          router.push("/select-account")
          return
        }

        // Check if user has a selected account
        if (!parsedUser.id) {
          console.log("[v0] No user ID found, redirecting to account selection")
          router.push("/select-account")
          return
        }

        // Fetch customer data
        try {
          setIsLoading(true)
          setError(null) // Clear any previous errors
          setUser(parsedUser)

          // Set language from stored user preference
          if (parsedUser.language) {
            setLanguage(parsedUser.language)
          }

          console.log("[v0] Fetching customer data for:", parsedUser.email, parsedUser.id)
          await logger.info(
            "DASHBOARD_FETCH_START",
            `Fetching customer data for user: ${parsedUser.email}`,
            { userId: parsedUser.id },
            parsedUser.email,
          )

          // Pass both email and userId to fetchCustomerData
          const data = await fetchCustomerData(parsedUser.email, parsedUser.id)

          if (!data) {
            throw new Error("No data received from server")
          }

          console.log("[v0] Successfully loaded customer data")
          await logger.info(
            "DASHBOARD_FETCH_SUCCESS",
            `Customer data loaded successfully for user: ${parsedUser.email}`,
            { userId: parsedUser.id },
            parsedUser.email,
          )

          setCustomerData(data)
        } catch (fetchError) {
          console.error("[v0] Error loading customer data:", fetchError)
          const errorMessage = fetchError instanceof Error ? fetchError.message : "Failed to load customer data"

          await logger.error(
            "DASHBOARD_FETCH_ERROR",
            `Failed to load customer data for user: ${parsedUser.email}`,
            { userId: parsedUser.id, error: errorMessage },
            parsedUser.email,
          )

          setError(errorMessage)

          // User can retry without losing their session
        }
      } catch (error) {
        console.error("[v0] Error in dashboard initialization:", error)
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"

        await logger.error("DASHBOARD_INIT_ERROR", "Dashboard initialization failed", { error: errorMessage })

        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDashboard()
  }, [firebaseUser, router]) // Removed setUser from dependencies as it's stable

  const handleLogout = async () => {
    try {
      console.log("[v0] Logging out user")
      await logger.info("DASHBOARD_LOGOUT", "User logged out", {})
      await logout() // This will clear localStorage automatically
      router.push("/")
    } catch (error) {
      console.error("[v0] Error logging out:", error)
      await logger.error("DASHBOARD_LOGOUT_ERROR", "Error during user logout", { error: String(error) })
      localStorage.removeItem("user")
      router.push("/")
    }
  }

  const handleAccountSwitch = async (account: Account) => {
    setIsLoading(true)
    setError(null) // Clear errors when switching accounts
    try {
      console.log("[v0] Switching to account:", account.userId)
      await logger.info(
        "DASHBOARD_ACCOUNT_SWITCH",
        `Switching to account: ${account.name}`,
        { newAccountId: account.userId, currentUserId: user?.id },
        user?.email,
      )

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

      if (!data) {
        throw new Error("No data received for selected account")
      }

      setCustomerData(data)
      console.log("[v0] Successfully switched accounts")
      await logger.info(
        "DASHBOARD_ACCOUNT_SWITCH_SUCCESS",
        `Successfully switched to account: ${account.name}`,
        { userId: account.userId },
        user?.email,
      )
    } catch (error) {
      console.error("[v0] Error switching account:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to switch accounts"
      setError(errorMessage)
      await logger.error(
        "DASHBOARD_ACCOUNT_SWITCH_ERROR",
        `Failed to switch accounts`,
        { error: errorMessage, newAccountId: account.userId, currentUserId: user?.id },
        user?.email,
      )
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
      logger.info("DASHBOARD_LANGUAGE_CHANGE", `Language changed to ${newLanguage}`, { userId: user.id }, user.email)
    }
  }

  const handleSendDonationInstructions = async () => {
    if (!user) return

    setIsSendingEmail(true)
    setEmailStatus(null)

    try {
      console.log("[v0] Sending donation instructions email")
      await logger.info(
        "DASHBOARD_SEND_DONATION_EMAIL_START",
        `Attempting to send donation instructions to ${user.email}`,
        { userId: user.id },
        user.email,
      )

      const response = await fetch("/api/send-donation-instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name,
          accountNumber: user.accountNumber || user.id,
          email: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setEmailStatus({ type: "success", message: t.emailSentSuccess })
        console.log("[v0] Email sent successfully")
        await logger.info(
          "DASHBOARD_SEND_DONATION_EMAIL_SUCCESS",
          "Donation instructions email sent successfully",
          { userId: user.id },
          user.email,
        )
      } else {
        setEmailStatus({ type: "error", message: t.emailSentError })
        console.error("[v0] Email send failed:", result.error)
        await logger.error(
          "DASHBOARD_SEND_DONATION_EMAIL_FAILED",
          "Failed to send donation instructions email",
          { userId: user.id, error: result.error },
          user.email,
        )
      }
    } catch (error) {
      console.error("[v0] Error sending email:", error)
      setEmailStatus({ type: "error", message: t.emailSentError })
      await logger.error(
        "DASHBOARD_SEND_DONATION_EMAIL_ERROR",
        "Error sending donation instructions email",
        { userId: user.id, error: String(error) },
        user.email,
      )
    } finally {
      setIsSendingEmail(false)
      setShowEmailConfirmDialog(false)

      // Clear status after 5 seconds
      setTimeout(() => {
        setEmailStatus(null)
      }, 5000)
    }
  }

  // Combine all money transactions (including donations) into a single array
  const allMoneyTransactions = useMemo(() => {
    if (!customerData) return []

    try {
      const combined: CombinedTransaction[] = [
        // Current transactions - use display data if available
        ...(customerData.displayCurrentTransactions || customerData.currentTransactions || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "Current",
        })),
        // 2024 transactions - use display data if available
        ...(customerData.displayTransactions2024 || customerData.transactions2024 || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "2024",
        })),
        // Old transactions - use display data if available
        ...(customerData.displayOldTransactions || customerData.oldTransactions || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "Historical",
        })),
        // Donations - use display data if available
        ...(customerData.displayDonations || customerData.donations || []).map((donation) => ({
          id: donation.id,
          date: donation.date,
          description: donation.donorName, // Show donor name in notes column
          reference: donation.donorId,
          amount: donation.amount,
          net: roundToTwo(donation.net), // Round net to 2 decimals
          type: donation.type,
          source: "Donations",
          donorName: donation.donorName,
          purpose: donation.purpose,
          notCleared: "", // Donations don't have not cleared status
          cardknox: "", // Donations don't have cardknox
        })),
        // Add LinksandPhone transactions if they exist
        ...(customerData.linksAndPhoneTransactions || []).map((tx) => ({
          id: tx.id || `LINK-${Math.random()}`,
          date: tx.date,
          description: `${tx.name || ""}${tx.description ? " - " + tx.description : ""} - ${tx.source || "N/A"}`,
          reference: tx.name,
          amount: tx.amount,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          type: "Links/Phone",
          source: tx.source || "LinksandPhone",
          notCleared: "",
          cardknox: "",
        })),
      ]

      return combined
    } catch (error) {
      console.error("[v0] Error processing transactions:", error)
      logger.error("DASHBOARD_TRANSACTION_PROCESSING_ERROR", "Error processing transactions", { error: String(error) })
      return []
    }
  }, [customerData])

  const allMoneyTransactionsForTotals = useMemo(() => {
    if (!customerData) return []

    try {
      const combined: CombinedTransaction[] = [
        // Use full data for totals
        ...(customerData.currentTransactions || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "Current",
        })),
        ...(customerData.transactions2024 || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "2024",
        })),
        ...(customerData.oldTransactions || []).map((tx) => ({
          ...tx,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          source: "Historical",
        })),
        ...(customerData.donations || []).map((donation) => ({
          id: donation.id,
          date: donation.date,
          description: donation.donorName,
          reference: donation.donorId,
          amount: donation.amount,
          net: roundToTwo(donation.net), // Round net to 2 decimals
          type: donation.type,
          source: "Donations",
          donorName: donation.donorName,
          purpose: donation.purpose,
          notCleared: "",
          cardknox: "",
        })),
        ...(customerData.linksAndPhoneTransactions || []).map((tx) => ({
          id: tx.id || `LINK-${Math.random()}`,
          date: tx.date,
          description: `${tx.name || ""}${tx.description ? " - " + tx.description : ""} - ${tx.source || "N/A"}`,
          reference: tx.name,
          amount: tx.amount,
          net: roundToTwo(tx.net), // Round net to 2 decimals
          type: "Links/Phone",
          source: tx.source || "LinksandPhone",
          notCleared: "",
          cardknox: "",
        })),
      ]

      return combined
    } catch (error) {
      console.error("[v0] Error processing transactions for totals:", error)
      logger.error("DASHBOARD_TOTAL_TRANSACTION_PROCESSING_ERROR", "Error processing transactions for totals", {
        error: String(error),
      })
      return []
    }
  }, [customerData])

  // Calculate not cleared total from FULL data
  const notClearedTotal = useMemo(() => {
    const total = allMoneyTransactionsForTotals
      .filter((tx) => {
        const notCleared = tx.notCleared?.toLowerCase().trim()
        return notCleared === "true" || notCleared === "yes" || notCleared === "1"
      })
      .reduce((sum, tx) => sum + tx.net, 0)
    return roundToTwo(total)
  }, [allMoneyTransactionsForTotals])

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

  // Calculate available balance from FULL data (all money transactions including donations)
  const availableBalance = useMemo(() => {
    const total = allMoneyTransactionsForTotals
      .filter((tx) => {
        const notCleared = tx.notCleared?.toLowerCase().trim()
        // Exclude transactions where notCleared is "true", "yes", or "1"
        return !(notCleared === "true" || notCleared === "yes" || notCleared === "1")
      })
      .reduce((sum, tx) => sum + tx.net, 0)
    return roundToTwo(total)
  }, [allMoneyTransactionsForTotals])

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

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{
          background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 50%, #40E0D0 100%)",
        }}
      >
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <CardTitle>Error Loading Dashboard</CardTitle>
            </div>
            <CardDescription>We encountered an error while loading your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setError(null)
                  window.location.reload()
                }}
                className="flex-1"
              >
                Retry
              </Button>
              <Button variant="outline" onClick={handleLogout} className="flex-1 bg-transparent">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
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
    if (user) {
      logger.info(
        "DASHBOARD_SORT_CHANGE",
        `Sorted by ${column} ${sortDirection}`,
        { userId: user.id, column: column, direction: sortDirection },
        user.email,
      )
    }
  }

  // Handle not cleared filter toggle
  const handleNotClearedClick = () => {
    setNotClearedFilter(!notClearedFilter)
    if (user) {
      logger.info(
        "DASHBOARD_NOT_CLEARED_FILTER",
        `Not cleared filter toggled to ${!notClearedFilter}`,
        { userId: user.id, enabled: !notClearedFilter },
        user.email,
      )
    }
  }

  // Handle date filter change
  const handleDateFilterChange = async (value: string) => {
    setDateFilter(value)
    if (user) {
      await logger.info(
        "DASHBOARD_FILTER_CHANGE",
        `User changed date filter to: ${value}`,
        { filter: value, userId: user.id },
        user.email,
      )
    }
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
    if (user) {
      logger.info(
        "DASHBOARD_CUSTOM_DATE_APPLIED",
        `Custom date range applied: ${customDateFrom} - ${customDateTo}`,
        { userId: user.id, from: customDateFrom, to: customDateTo },
        user.email,
      )
    }
  }

  // Clear custom date range
  const clearCustomDateRange = () => {
    setCustomDateFrom("")
    setCustomDateTo("")
    setDateFilter("30")
    setShowCustomDatePicker(false)
    if (user) {
      logger.info("DASHBOARD_CUSTOM_DATE_CLEARED", `Custom date range cleared`, { userId: user.id }, user.email)
    }
  }

  return (
    <div className={`flex min-h-screen flex-col ${language === "he" ? "rtl" : "ltr"}`}>
      <SystemMessageBanner location="dashboard" />

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
            {/* Title + Welcome */}
            <div
              className={`w-full ${language === "he" ? "text-right" : "text-left"}`}
              dir={language === "he" ? "rtl" : "ltr"}
            >
              <h2 className="text-3xl font-bold tracking-tight text-gray-800">{t.dashboard}</h2>
              <p className="text-gray-600">
                {t.welcomeBack}, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.name}{" "}
                ({user?.email})
              </p>
            </div>

            {/* Send Donation Instructions Button */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowEmailConfirmDialog(true)}
                disabled={isSendingEmail}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
              >
                {isSendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t.sendingEmail}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t.sendDonationInstructions}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Email Status Message */}
          {emailStatus && (
            <div
              className={`p-4 rounded-md ${emailStatus.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {emailStatus.message}
            </div>
          )}

          {/* Yellow Box */}
          <div className="w-full flex justify-center">
            <div
              className={`max-w-2xl w-full p-3 rounded-md bg-yellow-100 text-yellow-800 text-sm font-medium ${
                language === "he" ? "text-right" : "text-center"
              }`}
              dir={language === "he" ? "rtl" : "ltr"}
            >
              {language === "he"
                ? "זה מה שמעודכן כרגע במערכת שלנו. ייתכנו תרומות שיעודכנו במועד מאוחר יותר. תודה על ההבנה."
                : "This is what is currently updated in our system. There may be donations that will be updated at a later time. Thank you for understanding."}
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
                  {allMoneyTransactionsForTotals.length} {t.totalTransactions}
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
                      Object.entries(
                        filteredTransactions.reduce(
                          (groups, tx) => {
                            const date = new Date(tx.date)
                            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                            if (!groups[yearMonth]) groups[yearMonth] = []
                            groups[yearMonth].push(tx)
                            return groups
                          },
                          {} as Record<string, CombinedTransaction[]>,
                        ),
                      ).map(([yearMonth, txs]) => {
                        const [year, month] = yearMonth.split("-")
                        const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleString(
                          language === "he" ? "he-IL" : "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          },
                        )

                        return (
                          <React.Fragment key={yearMonth}>
                            <TableRow>
                              <TableCell colSpan={7} className="bg-gray-100 font-bold text-gray-700 text-lg">
                                {monthLabel}
                              </TableCell>
                            </TableRow>
                            {txs.map((tx) => (
                              <TableRow key={`${tx.source}-${tx.id}`}>
                                <TableCell>
                                  {shouldHideDonationInfo(tx.donorName || "", "date") ? "***" : tx.date}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      tx.net >= 0
                                        ? "bg-blue-50 text-blue-800 border-blue-200"
                                        : "bg-red-50 text-red-800 border-red-200"
                                    }`}
                                  >
                                    {translateType(tx.type, t)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell className="font-medium text-black">
                                  {shouldHideDonationInfo(tx.donorName || "", "amount")
                                    ? "***"
                                    : `$${formatNumber(tx.amount)}`}
                                </TableCell>
                                <TableCell className={`font-medium ${tx.net < 0 ? "text-red-600" : "text-green-600"}`}>
                                  {shouldHideDonationInfo(tx.donorName || "", "amount")
                                    ? "***"
                                    : `$${formatNumber(tx.net)}`}
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
                            ))}
                          </React.Fragment>
                        )
                      })
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

      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailConfirmDialog} onOpenChange={setShowEmailConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmSendEmail}</DialogTitle>
            <DialogDescription dir="rtl">{t.confirmSendEmailDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailConfirmDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSendDonationInstructions} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t.sendingEmail}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t.send}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
