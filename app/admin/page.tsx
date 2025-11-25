"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  UserPlus,
  Mail,
  Shield,
  LogOut,
  Users,
  Trash2,
  MessageSquare,
  Calendar,
  Eye,
  AlertTriangle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState("add-access")

  // Add User Access states
  const [userEmail, setUserEmail] = useState("")
  const [isAddingAccess, setIsAddingAccess] = useState(false)
  const [addAccessError, setAddAccessError] = useState<string | null>(null)
  const [addAccessSuccess, setAddAccessSuccess] = useState<string | null>(null)

  // Create User states
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [createUserError, setCreateUserError] = useState<string | null>(null)
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null)

  // Admin management states
  const [adminEmail, setAdminEmail] = useState("")
  const [adminName, setAdminName] = useState("")
  const [adminRole, setAdminRole] = useState<"user" | "superadmin">("user")
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [admins, setAdmins] = useState<Array<{ id: number; email: string; name: string; role: string }>>([])
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)

  // Account selection states
  const [accounts, setAccounts] = useState<Array<{ accountNumber: string; firstName: string; lastName: string }>>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState("")

  const [systemMessageEnabled, setSystemMessageEnabled] = useState(false)
  const [systemMessage, setSystemMessage] = useState("")
  const [showOnDashboard, setShowOnDashboard] = useState(true)
  const [showOnLogin, setShowOnLogin] = useState(true)
  const [isSavingMessage, setIsSavingMessage] = useState(false)
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)

  const [transactionLimitEnabled, setTransactionLimitEnabled] = useState(false)
  const [limitType, setLimitType] = useState<"years" | "date">("years")
  const [limitValue, setLimitValue] = useState("1")
  const [isSavingLimit, setIsSavingLimit] = useState(false)
  const [limitSuccess, setLimitSuccess] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)

  const [simulationAccount, setSimulationAccount] = useState("")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationError, setSimulationError] = useState<string | null>(null)

  const { user: firebaseUser, logout } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const generateRandomPassword = (length = 10) => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    const numbers = "23456789"
    const symbols = "!@#$%&*"
    const requiredChars = [numbers[Math.floor(Math.random() * numbers.length)]]
    const allChars = letters + numbers + symbols
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(allChars[Math.floor(Math.random() * allChars.length)])
    }
    for (let i = requiredChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]]
    }
    return requiredChars.join("")
  }

  useEffect(() => {
    if (!newUserPassword) {
      setNewUserPassword(generateRandomPassword())
    }
  }, [newUserPassword])

  const loadAccounts = async () => {
    setIsLoadingAccounts(true)
    try {
      const response = await fetch("/api/admin/get-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestorEmail: firebaseUser?.email }),
      })
      const result = await response.json()
      if (result.success) {
        // Map accounts to the format expected by Input with list
        const formattedAccounts = result.accounts.map(
          (acc: { accountNumber: string; firstName: string; lastName: string }) => ({
            value: acc.accountNumber,
            label: `${acc.accountNumber} - ${acc.firstName} ${acc.lastName}`,
          }),
        )
        setAccounts(formattedAccounts || [])
      }
    } catch (error) {
      console.error("Error loading accounts:", error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const loadAdmins = async () => {
    setIsLoadingAdmins(true)
    try {
      const response = await fetch("/api/admin/list-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestorEmail: firebaseUser?.email }),
      })
      const result = await response.json()
      if (result.success) {
        setAdmins(result.admins || [])
      }
    } catch (error) {
      console.error("Error loading admins:", error)
    } finally {
      setIsLoadingAdmins(false)
    }
  }

  const loadSystemMessage = async () => {
    try {
      const response = await fetch("/api/admin/system-message")
      const result = await response.json()
      if (result.success) {
        setSystemMessageEnabled(result.data.enabled)
        setSystemMessage(result.data.message)
        setShowOnDashboard(result.data.showOnDashboard)
        setShowOnLogin(result.data.showOnLogin)
      }
    } catch (error) {
      console.error("Error loading system message:", error)
    }
  }

  const loadTransactionLimit = async () => {
    try {
      const response = await fetch("/api/admin/transaction-limit")
      const result = await response.json()
      if (result.success) {
        setTransactionLimitEnabled(result.data.enabled)
        setLimitType(result.data.limitType)
        setLimitValue(result.data.limitValue)
      }
    } catch (error) {
      console.error("Error loading transaction limit:", error)
    }
  }

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!firebaseUser) {
        setIsAuthorized(false)
        return
      }
      try {
        const response = await fetch("/api/admin/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: firebaseUser.email }),
        })
        const result = await response.json()
        if (result.success && result.isAdmin) {
          setIsAuthorized(true)
          setAdminUser(result.adminUser)
          setIsSuperAdmin(result.role === "superadmin")
          loadAccounts()
          loadAdmins()
          loadSystemMessage() // Load system message on mount
          loadTransactionLimit() // Load transaction limit settings
        } else {
          setIsAuthorized(false)
        }
      } catch (error) {
        console.error("Error checking admin access:", error)
        setIsAuthorized(false)
      }
    }
    checkAdminAccess()
  }, [firebaseUser])

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(
        () => {
          logout()
          router.push("/admin/login")
        },
        10 * 60 * 1000,
      ) // 10 minutes
    }

    const activityEvents = ["mousemove", "keydown", "scroll", "click"]

    activityEvents.forEach((event) => window.addEventListener(event, resetTimer))

    resetTimer() // Start initial timer

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [logout, router])

  const handleAddUserAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAccess(true)
    setAddAccessError(null)
    setAddAccessSuccess(null)

    try {
      // Extract just the account number from the input string
      const accountOnly = selectedAccount.split(" - ")[0].trim()

      const response = await fetch("/api/admin/add-user-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: accountOnly, // clean account number
          userEmail,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAddAccessSuccess("User access added successfully.")

        const tempPassword = generateRandomPassword()

        setNewUserEmail(userEmail)
        setNewUserPassword(tempPassword)

        setActiveTab("create-user")

        setTimeout(() => {
          handleCreateNewUser(undefined, userEmail, tempPassword)
        }, 300)

        setTimeout(() => {
          setSelectedAccount("")
          setUserEmail("")
        }, 600)
      } else {
        setAddAccessError(result.error || "Failed to add user access")
      }
    } catch (error) {
      setAddAccessError("Error adding user access")
    } finally {
      setIsAddingAccess(false)
    }
  }

  const handleCreateNewUser = async (e?: React.FormEvent, emailOverride?: string, passwordOverride?: string) => {
    if (e) e.preventDefault()

    const email = emailOverride ?? newUserEmail
    const password = passwordOverride ?? newUserPassword

    setIsCreatingUser(true)
    setCreateUserError(null)
    setCreateUserSuccess(null)

    if (password.length < 8 || !/\d/.test(password)) {
      setCreateUserError("Password must be at least 8 characters and include a number")
      setIsCreatingUser(false)
      return
    }

    try {
      const response = await fetch("/api/admin/create-user-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCreateUserSuccess("User created successfully")

        // Send welcome email with login instructions
        try {
          await fetch("/api/send-welcome-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              temporaryPassword: password,
              accountNumber: selectedAccount.split(" - ")[0],
              name: selectedAccount.split(" - ")[1],
            }),
          })
        } catch (error) {
          console.error("Failed to send welcome email:", error)
        }

        setNewUserEmail("")
        setNewUserPassword(generateRandomPassword())
        setActiveTab("add-access")
      } else {
        setCreateUserError(result.error || "Failed to create user")
      }
    } catch (error) {
      setCreateUserError("Error creating user")
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAdmin(true)
    setAddAdminError(null)

    try {
      const response = await fetch("/api/admin/add-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail,
          adminName,
          adminRole,
          requestorEmail: firebaseUser?.email,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setAdminEmail("")
        setAdminName("")
        setAdminRole("user")
        loadAdmins() // Reload the admins list
      } else {
        setAddAdminError(result.error || "Failed to add admin")
      }
    } catch (error) {
      setAddAdminError("Error adding admin")
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (admin: { id: number; email: string; name: string }) => {
    try {
      const response = await fetch("/api/admin/remove-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail: admin.email,
          requestorEmail: firebaseUser?.email,
        }),
      })
      const result = await response.json()
      if (result.success) {
        loadAdmins() // Reload the admins list
      } else {
        console.error("Failed to remove admin:", result.error)
      }
    } catch (error) {
      console.error("Error removing admin:", error)
    }
  }

  const handleSaveSystemMessage = async () => {
    setIsSavingMessage(true)
    setMessageSuccess(null)
    setMessageError(null)

    try {
      const response = await fetch("/api/admin/system-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestorEmail: firebaseUser?.email,
          enabled: systemMessageEnabled,
          message: systemMessage,
          showOnDashboard,
          showOnLogin,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessageSuccess("System message updated successfully")
        setTimeout(() => setMessageSuccess(null), 3000)
      } else {
        setMessageError(result.error || "Failed to update system message")
      }
    } catch (error) {
      setMessageError("Error updating system message")
    } finally {
      setIsSavingMessage(false)
    }
  }

  const handleSaveTransactionLimit = async () => {
    setIsSavingLimit(true)
    setLimitSuccess(null)
    setLimitError(null)

    try {
      const response = await fetch("/api/admin/transaction-limit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestorEmail: firebaseUser?.email,
          enabled: transactionLimitEnabled,
          limitType,
          limitValue,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setLimitSuccess("Transaction limit updated successfully")
        setTimeout(() => setLimitSuccess(null), 3000)
      } else {
        setLimitError(result.error || "Failed to update transaction limit")
      }
    } catch (error) {
      setLimitError("Error updating transaction limit")
    } finally {
      setIsSavingLimit(false)
    }
  }

  const handleSimulateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSimulating(true)
    setSimulationError(null)

    try {
      const response = await fetch("/api/admin/simulate-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail: firebaseUser?.email,
          accountNumber: simulationAccount,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setSimulationError(result.error || "Failed to simulate user")
        return
      }

      // Store simulation data in localStorage
      localStorage.setItem("user", JSON.stringify(result.user))
      localStorage.setItem("simulationMode", "true")

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error simulating user:", error)
      setSimulationError("Failed to simulate user. Please try again.")
    } finally {
      setIsSimulating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      // Clear simulation data if present
      localStorage.removeItem("user")
      localStorage.removeItem("simulationMode")
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  // Loading state
  if (isAuthorized === null) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white font-medium">Checking admin access...</p>
        </div>
      </div>
    )
  }

  // Access denied
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            <CardDescription>Admin access required to view this page</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/admin/login")} className="w-full bg-red-600 hover:bg-red-700">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <header
        className="border-b shadow-sm"
        style={{
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
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
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-white text-white hover:text-red-600 hover:bg-white transition-colors min-w-[90px] h-10 bg-red-400 hover:bg-white"
            >
              <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap font-medium">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="shadow-xl border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
              <CardTitle className="text-3xl font-bold">Admin Panel</CardTitle>
              <CardDescription className="text-red-100">
                Welcome, {adminUser?.name || firebaseUser?.email}. Manage users, settings, and more.
              </CardDescription>
            </CardHeader>

            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val)
                if (val === "create-user") {
                  setNewUserPassword(generateRandomPassword())
                }
              }}
              className="p-6"
            >
              <TabsList className={`grid w-full ${isSuperAdmin ? "grid-cols-6" : "grid-cols-3"} bg-red-50`}>
                <TabsTrigger
                  value="add-access"
                  className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User Access
                </TabsTrigger>
                <TabsTrigger
                  value="create-user"
                  className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Mail className="h-4 w-4" />
                  Create New User
                </TabsTrigger>
                {isSuperAdmin && (
                  <>
                    <TabsTrigger
                      value="simulate-user"
                      className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                    >
                      <Eye className="h-4 w-4" />
                      View as User
                    </TabsTrigger>
                    <TabsTrigger
                      value="system-message"
                      className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                    >
                      <MessageSquare className="h-4 w-4" />
                      System Message
                    </TabsTrigger>
                    <TabsTrigger
                      value="transaction-limit"
                      className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                    >
                      <Calendar className="h-4 w-4" />
                      Transaction Limit
                    </TabsTrigger>
                    <TabsTrigger
                      value="manage-admins"
                      className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                    >
                      <Users className="h-4 w-4" />
                      Manage Admins
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="add-access">
                <Card className="border-red-200">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <UserPlus className="h-5 w-5" />
                      Add User Access
                    </CardTitle>
                    <CardDescription>Grant existing account access to a user by adding their email</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleAddUserAccess} className="space-y-4">
                      {addAccessError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{addAccessError}</AlertDescription>
                        </Alert>
                      )}

                      {addAccessSuccess && (
                        <Alert className="border-green-200 bg-green-50">
                          <AlertCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">Success</AlertTitle>
                          <AlertDescription className="text-green-700">{addAccessSuccess}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="accountSelect">Select Account</Label>
                        {isLoadingAccounts ? (
                          <div className="flex items-center justify-center p-4 border rounded-md">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                            <span className="ml-2 text-gray-600">Loading accounts...</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              id="accountSelect"
                              type="text"
                              placeholder="Type account number or select from dropdown..."
                              value={selectedAccount}
                              onChange={(e) => setSelectedAccount(e.target.value)}
                              required
                              className="border-red-200 focus:border-red-500 focus:ring-red-500"
                              list="accounts-list"
                            />
                            <datalist id="accounts-list">
                              {accounts.map((account) => (
                                <option key={account.value} value={account.label} />
                              ))}
                            </datalist>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userEmail">User Email</Label>
                        <Input
                          id="userEmail"
                          type="email"
                          placeholder="Enter user email address"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          required
                          className="border-red-200 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>

                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isAddingAccess}>
                        {isAddingAccess ? "Adding..." : "Add Access"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="create-user">
                <Card className="border-red-200">
                  <CardHeader className="bg-red-50">
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <Mail className="h-5 w-5" />
                      Create New User Account
                    </CardTitle>
                    <CardDescription>Create a new user account with email and password</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleCreateNewUser} className="space-y-4">
                      {createUserError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{createUserError}</AlertDescription>
                        </Alert>
                      )}

                      {createUserSuccess && (
                        <Alert className="border-green-200 bg-green-50">
                          <AlertCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">Success</AlertTitle>
                          <AlertDescription className="text-green-700">{createUserSuccess}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="newUserEmail">User Email</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          placeholder="Enter user email address"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                          className="border-red-200 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newUserPassword">Password</Label>
                        <Input
                          id="newUserPassword"
                          type="password"
                          placeholder="Enter password (minimum 8 characters)"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          required
                          minLength={8}
                          className="border-red-200 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          className="border-red-200 focus:border-red-500 focus:ring-red-500"
                        />
                      </div>

                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          User will be able to login immediately with the provided email and password
                        </AlertDescription>
                      </Alert>

                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isCreatingUser}>
                        {isCreatingUser ? "Creating..." : "Create User Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {isSuperAdmin && (
                <TabsContent value="simulate-user">
                  <Card className="border-red-200">
                    <CardHeader className="bg-red-50">
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <Eye className="h-5 w-5" />
                        View as User (Simulation Mode)
                      </CardTitle>
                      <CardDescription>
                        View any customer account as they would see it. Perfect for troubleshooting and support.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSimulateUser} className="space-y-4">
                        {simulationError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{simulationError}</AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="simulationAccount">Account Number</Label>
                          {isLoadingAccounts ? (
                            <div className="flex items-center justify-center p-4 border rounded-md">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                              <span className="ml-2 text-gray-600">Loading accounts...</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <Input
                                id="simulationAccount"
                                type="text"
                                placeholder="Type account number or select from dropdown..."
                                value={simulationAccount}
                                onChange={(e) => setSimulationAccount(e.target.value)}
                                required
                                className="border-red-200 focus:border-red-500 focus:ring-red-500"
                                list="simulation-accounts-list"
                              />
                              <datalist id="simulation-accounts-list">
                                {accounts.map((account) => (
                                  <option key={account.value} value={account.label} />
                                ))}
                              </datalist>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Enter the account number of the user you want to view as. You will see their dashboard
                            exactly as they see it.
                          </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">Simulation Mode Features:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>View all transactions and data as the user sees it</li>
                                <li>Test filters, sorting, and date ranges</li>
                                <li>Identify issues with their specific account</li>
                                <li>A banner will indicate you are in simulation mode</li>
                                <li>Click "Exit Simulation" to return to the admin panel</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-red-600 hover:bg-red-700"
                          disabled={isSimulating || !simulationAccount}
                        >
                          {isSimulating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Starting Simulation...
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View as User
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {isSuperAdmin && (
                <TabsContent value="system-message">
                  <Card className="border-red-200">
                    <CardHeader className="bg-red-50">
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <MessageSquare className="h-5 w-5" />
                        System Message Banner
                      </CardTitle>
                      <CardDescription>
                        Display a custom message banner on the customer dashboard and/or login page
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {messageSuccess && (
                          <Alert className="border-green-200 bg-green-50">
                            <AlertCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Success</AlertTitle>
                            <AlertDescription className="text-green-700">{messageSuccess}</AlertDescription>
                          </Alert>
                        )}

                        {messageError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{messageError}</AlertDescription>
                          </Alert>
                        )}

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                          <div className="space-y-0.5">
                            <Label htmlFor="message-enabled" className="text-base font-medium">
                              Enable System Message
                            </Label>
                            <p className="text-sm text-gray-600">Show the message banner to users</p>
                          </div>
                          <Switch
                            id="message-enabled"
                            checked={systemMessageEnabled}
                            onCheckedChange={setSystemMessageEnabled}
                          />
                        </div>

                        {/* Message Text */}
                        <div className="space-y-2">
                          <Label htmlFor="system-message">Message Text</Label>
                          <Textarea
                            id="system-message"
                            placeholder="Enter the message to display to users..."
                            value={systemMessage}
                            onChange={(e) => setSystemMessage(e.target.value)}
                            rows={4}
                            className="border-red-200 focus:border-red-500 focus:ring-red-500"
                          />
                          <p className="text-xs text-gray-500">
                            This message will appear as a yellow banner at the top of the selected pages
                          </p>
                        </div>

                        {/* Display Location Options */}
                        <div className="space-y-4">
                          <Label className="text-base font-medium">Display On</Label>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                              <Label htmlFor="show-dashboard" className="font-normal">
                                Customer Dashboard
                              </Label>
                              <p className="text-xs text-gray-500">Show banner on the customer dashboard page</p>
                            </div>
                            <Switch
                              id="show-dashboard"
                              checked={showOnDashboard}
                              onCheckedChange={setShowOnDashboard}
                              disabled={!systemMessageEnabled}
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-0.5">
                              <Label htmlFor="show-login" className="font-normal">
                                Login Page
                              </Label>
                              <p className="text-xs text-gray-500">Show banner on the login page</p>
                            </div>
                            <Switch
                              id="show-login"
                              checked={showOnLogin}
                              onCheckedChange={setShowOnLogin}
                              disabled={!systemMessageEnabled}
                            />
                          </div>
                        </div>

                        {/* Preview */}
                        {systemMessageEnabled && systemMessage && (
                          <div className="space-y-2">
                            <Label className="text-base font-medium">Preview</Label>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-yellow-400 border-b-2 border-yellow-500 p-3">
                                <p className="text-sm md:text-base font-medium text-gray-900 text-center">
                                  {systemMessage}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Save Button */}
                        <Button
                          onClick={handleSaveSystemMessage}
                          className="w-full bg-red-600 hover:bg-red-700"
                          disabled={isSavingMessage}
                        >
                          {isSavingMessage ? "Saving..." : "Save System Message"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {isSuperAdmin && (
                <TabsContent value="transaction-limit">
                  <Card className="border-red-200">
                    <CardHeader className="bg-red-50">
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <Calendar className="h-5 w-5" />
                        Transaction Date Limit
                      </CardTitle>
                      <CardDescription>Limit how far back customers can view their transaction history</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {limitSuccess && (
                          <Alert className="border-green-200 bg-green-50">
                            <AlertCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Success</AlertTitle>
                            <AlertDescription className="text-green-700">{limitSuccess}</AlertDescription>
                          </Alert>
                        )}

                        {limitError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{limitError}</AlertDescription>
                          </Alert>
                        )}

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                          <div className="space-y-0.5">
                            <Label htmlFor="limit-enabled" className="text-base font-medium">
                              Enable Transaction Limit
                            </Label>
                            <p className="text-sm text-gray-600">Restrict customer transaction history visibility</p>
                          </div>
                          <Switch
                            id="limit-enabled"
                            checked={transactionLimitEnabled}
                            onCheckedChange={setTransactionLimitEnabled}
                          />
                        </div>

                        {/* Limit Type Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="limit-type">Limit Type</Label>
                          <Select
                            value={limitType}
                            onValueChange={(value: "years" | "date") => setLimitType(value)}
                            disabled={!transactionLimitEnabled}
                          >
                            <SelectTrigger id="limit-type" className="border-red-200 focus:border-red-500">
                              <SelectValue placeholder="Select limit type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="years">Years Back</SelectItem>
                              <SelectItem value="date">Not Earlier Than Year</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Choose whether to limit by number of years back or a specific year
                          </p>
                        </div>

                        {/* Limit Value Input */}
                        <div className="space-y-2">
                          <Label htmlFor="limit-value">
                            {limitType === "years" ? "Number of Years" : "Earliest Year"}
                          </Label>
                          <Input
                            id="limit-value"
                            type="number"
                            min={limitType === "years" ? "1" : "2000"}
                            max={limitType === "years" ? "10" : new Date().getFullYear().toString()}
                            placeholder={limitType === "years" ? "e.g., 1" : "e.g., 2024"}
                            value={limitValue}
                            onChange={(e) => setLimitValue(e.target.value)}
                            disabled={!transactionLimitEnabled}
                            className="border-red-200 focus:border-red-500 focus:ring-red-500"
                          />
                          <p className="text-xs text-gray-500">
                            {limitType === "years"
                              ? "Customers can view transactions from the last X years"
                              : "Customers cannot view transactions earlier than this year"}
                          </p>
                        </div>

                        {/* Preview */}
                        {transactionLimitEnabled && limitValue && (
                          <div className="space-y-2">
                            <Label className="text-base font-medium">Preview</Label>
                            <div className="border rounded-lg p-4 bg-gray-50">
                              <p className="text-sm text-gray-700">
                                {limitType === "years" ? (
                                  <>
                                    Customers will only see transactions from the last{" "}
                                    <span className="font-semibold">{limitValue}</span>{" "}
                                    {Number.parseInt(limitValue) === 1 ? "year" : "years"}.
                                  </>
                                ) : (
                                  <>
                                    Customers will not see any transactions earlier than{" "}
                                    <span className="font-semibold">January 1, {limitValue}</span>.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Save Button */}
                        <Button
                          onClick={handleSaveTransactionLimit}
                          className="w-full bg-red-600 hover:bg-red-700"
                          disabled={isSavingLimit || (transactionLimitEnabled && !limitValue)}
                        >
                          {isSavingLimit ? "Saving..." : "Save Transaction Limit"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {isSuperAdmin && (
                <TabsContent value="manage-admins">
                  <div className="space-y-6">
                    <Card className="border-red-200">
                      <CardHeader className="bg-red-50">
                        <CardTitle className="flex items-center gap-2 text-red-800">
                          <UserPlus className="h-5 w-5" />
                          Add Admin
                        </CardTitle>
                        <CardDescription>Add or remove admin users who can access this admin panel</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <form onSubmit={handleAddAdmin} className="space-y-4">
                          {addAdminError && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{addAdminError}</AlertDescription>
                            </Alert>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="adminEmail">Admin Email</Label>
                            <Input
                              id="adminEmail"
                              type="email"
                              placeholder="Enter admin email address"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              required
                              className="border-red-200 focus:border-red-500 focus:ring-red-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="adminName">Admin Name</Label>
                            <Input
                              id="adminName"
                              type="text"
                              placeholder="Enter admin full name"
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              required
                              className="border-red-200 focus:border-red-500 focus:ring-red-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="adminRole">Role</Label>
                            <Select
                              value={adminRole}
                              onValueChange={(value: "user" | "superadmin") => setAdminRole(value)}
                            >
                              <SelectTrigger id="adminRole" className="border-red-200 focus:border-red-500">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="superadmin">Superadmin</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                              Superadmins have access to system settings and can manage other admins
                            </p>
                          </div>

                          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isAddingAdmin}>
                            {isAddingAdmin ? "Adding Admin..." : "Add Admin"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200">
                      <CardHeader className="bg-red-50">
                        <CardTitle className="flex items-center gap-2 text-red-800">
                          <Users className="h-5 w-5" />
                          Current Admins
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {isLoadingAdmins ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                          </div>
                        ) : admins.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No admins found</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {admins.map((admin) => (
                                <TableRow key={admin.id}>
                                  <TableCell className="font-medium">{admin.name}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {admin.email}
                                      {admin.email.toLowerCase() === firebaseUser?.email?.toLowerCase() && (
                                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                                          You
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={admin.role === "superadmin" ? "default" : "secondary"}
                                      className={admin.role === "superadmin" ? "bg-purple-600 text-white" : ""}
                                    >
                                      {admin.role === "superadmin" ? "Superadmin" : "User"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveAdmin(admin)}
                                      disabled={admin.email.toLowerCase() === firebaseUser?.email?.toLowerCase()}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Remove
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>
      </main>

      <footer
        className="py-6"
        style={{
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
        }}
      >
        <div className="container mx-auto px-4 text-center text-sm text-white">
          &copy; {new Date().getFullYear()} Keren Hatzedakah. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
