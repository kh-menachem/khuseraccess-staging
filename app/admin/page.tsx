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
import { AlertCircle, UserPlus, Mail, Shield, LogOut, Users, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { ApiClient } from "@/lib/api-client"

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [adminUser, setAdminUser] = useState<any>(null)
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
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [admins, setAdmins] = useState<Array<{ id: number; email: string; name: string }>>([])
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)

  // Account selection states
  const [accounts, setAccounts] = useState<Array<{ value: string; label: string }>>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState("")

  const { user: firebaseUser, logout } = useAuth()
  const isSuperAdmin = firebaseUser?.email === "kh.menachem@gmail.com"
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
      const result = await ApiClient.post<{
        success: boolean
        accounts: Array<{ accountNumber: string; firstName: string; lastName: string }>
      }>("/api/admin/get-accounts", {
        requestorEmail: firebaseUser?.email,
      })

      if (result.success) {
        const formattedAccounts = result.accounts.map((account) => ({
          value: `${account.accountNumber} - ${account.firstName} ${account.lastName}`,
          label: `${account.accountNumber} - ${account.firstName} ${account.lastName}`,
        }))
        setAccounts(formattedAccounts)
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
      const result = await ApiClient.post<{
        success: boolean
        admins: Array<{ id: number; email: string; name: string }>
      }>("/api/admin/list-admins", {
        requestorEmail: firebaseUser?.email,
      })

      if (result.success) {
        setAdmins(result.admins || [])
      }
    } catch (error) {
      console.error("Error loading admins:", error)
    } finally {
      setIsLoadingAdmins(false)
    }
  }

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!firebaseUser) {
        setIsAuthorized(false)
        return
      }

      try {
        console.log("Checking admin access for:", firebaseUser.email)

        const result = await ApiClient.post<{ success: boolean; isAdmin: boolean; adminUser?: any }>(
          "/api/admin/verify",
          {
            email: firebaseUser.email,
          },
        )

        console.log("Admin verification result:", result)

        if (result.success && result.isAdmin) {
          setIsAuthorized(true)
          setAdminUser(result.adminUser)
          loadAccounts()
          loadAdmins()
        } else {
          setIsAuthorized(false)
        }
      } catch (error) {
        console.error("Error checking admin access:", error)
        setIsAuthorized(false)
      }
    }

    // Add a small delay to ensure Firebase user is fully loaded
    if (firebaseUser) {
      setTimeout(checkAdminAccess, 1000)
    }
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

      const result = await ApiClient.post<{ success: boolean; error?: string }>("/api/admin/add-user-access", {
        accountNumber: accountOnly,
        userEmail,
      })

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
      setAddAccessError(error instanceof Error ? error.message : "Error adding user access")
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
      const result = await ApiClient.post<{ success: boolean; error?: string }>("/api/admin/create-user-simple", {
        email,
        password,
      })

      if (result.success) {
        setCreateUserSuccess("User created successfully")
        setNewUserEmail("")
        setNewUserPassword(generateRandomPassword())
        setActiveTab("add-access")
      } else {
        setCreateUserError(result.error || "Failed to create user")
      }
    } catch (error) {
      setCreateUserError(error instanceof Error ? error.message : "Error creating user")
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAdmin(true)
    setAddAdminError(null)

    try {
      const result = await ApiClient.post<{ success: boolean; error?: string }>("/api/admin/add-admin", {
        adminEmail,
        adminName,
        requestorEmail: firebaseUser?.email,
      })

      if (result.success) {
        setAdminEmail("")
        setAdminName("")
        loadAdmins() // Reload the admins list
      } else {
        setAddAdminError(result.error || "Failed to add admin")
      }
    } catch (error) {
      setAddAdminError(error instanceof Error ? error.message : "Error adding admin")
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (admin: { id: number; email: string; name: string }) => {
    try {
      const result = await ApiClient.post<{ success: boolean; error?: string }>("/api/admin/remove-admin", {
        adminEmail: admin.email,
        requestorEmail: firebaseUser?.email,
      })

      if (result.success) {
        loadAdmins() // Reload the admins list
      } else {
        console.error("Failed to remove admin:", result.error)
      }
    } catch (error) {
      console.error("Error removing admin:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
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
    <div className="flex min-h-screen flex-col">
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

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-800 mb-2">Admin Panel</h2>
            <p className="text-gray-600">Welcome, {adminUser?.name || firebaseUser?.email}</p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val)
              if (val === "create-user") {
                setNewUserPassword(generateRandomPassword())
              }
            }}
            className="space-y-6"
          >
            <TabsList className={`grid w-full ${isSuperAdmin ? "grid-cols-3" : "grid-cols-2"} bg-red-50`}>
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
                <TabsTrigger
                  value="manage-admins"
                  className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  <Users className="h-4 w-4" />
                  Manage Admins
                </TabsTrigger>
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
