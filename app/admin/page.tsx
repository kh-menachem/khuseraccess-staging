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
      const response = await fetch("/api/admin/get-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestorEmail: firebaseUser?.email }),
      })
      const result = await response.json()
      if (result.success) {
        const formattedAccounts = result.accounts.map((account: any) => ({
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
      setIsAddingAccess(false) // Corrected variable name
    }
  }

  const handleCreateNewUser = async (e?: React.FormEvent, emailOverride?: string, passwordOverride?: string) => {
    if (e) e.preventDefault()

    const email = emailOverride || newUserEmail
    const password = passwordOverride || newUserPassword

    if (password !== confirmPassword && !passwordOverride) {
      setCreateUserError("Passwords do not match")
      return
    }

    setIsCreatingUser(true)
    setCreateUserError(null)
    setCreateUserSuccess(null)

    try {
      const response = await fetch("/api/admin/create-user-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          requestorEmail: firebaseUser?.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCreateUserSuccess(`User created successfully! Email: ${email}, Password: ${password}`)
        setNewUserEmail("")
        setNewUserPassword(generateRandomPassword())
        setConfirmPassword("")
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
          email: adminEmail,
          name: adminName,
          requestorEmail: firebaseUser?.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAdminEmail("")
        setAdminName("")
        loadAdmins() // Reload the admin list
      } else {
        setAddAdminError(result.error || "Failed to add admin")
      }
    } catch (error) {
      setAddAdminError("Error adding admin")
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (adminId: number) => {
    if (!confirm("Are you sure you want to remove this admin?")) return

    try {
      const response = await fetch("/api/admin/remove-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId,
          requestorEmail: firebaseUser?.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        loadAdmins() // Reload the admin list
      } else {
        alert(result.error || "Failed to remove admin")
      }
    } catch (error) {
      alert("Error removing admin")
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/admin/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <Image src="/images/kh-hand-logo.png" alt="Keren Hatzedakah Logo" fill className="object-contain" />
            </div>
            <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
            <CardDescription>You are not authorized to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/images/kh-hand-logo.png" alt="Keren Hatzedakah Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">Keren Hatzedakah</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-medium">{adminUser?.name || firebaseUser?.email}</span>
              {isSuperAdmin && <Badge className="ml-2 bg-purple-100 text-purple-800">Super Admin</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="add-access">Add User Access</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="manage-admins">Manage Admins</TabsTrigger>}
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="add-access">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add User Access to Account
                </CardTitle>
                <CardDescription>Grant a user access to a specific account in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUserAccess} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-select">Select Account</Label>
                    <select
                      id="account-select"
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                      disabled={isLoadingAccounts}
                    >
                      <option value="">{isLoadingAccounts ? "Loading accounts..." : "Select an account..."}</option>
                      {accounts.map((account) => (
                        <option key={account.value} value={account.value}>
                          {account.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-email">User Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>

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

                  <Button type="submit" disabled={isAddingAccess} className="w-full">
                    {isAddingAccess ? "Adding Access..." : "Add User Access"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-user">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Create New User
                </CardTitle>
                <CardDescription>Create a new Firebase user account with email and password.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateNewUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-user-email">Email</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-user-password">Password</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-user-password"
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Password"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewUserPassword(generateRandomPassword())}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                    />
                  </div>

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
                      <AlertDescription className="text-green-700 whitespace-pre-line">
                        {createUserSuccess}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={isCreatingUser} className="w-full">
                    {isCreatingUser ? "Creating User..." : "Create User"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="manage-admins">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Add New Admin
                    </CardTitle>
                    <CardDescription>Add a new admin to the system.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin-email">Admin Email</Label>
                          <Input
                            id="admin-email"
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin-name">Admin Name</Label>
                          <Input
                            id="admin-name"
                            type="text"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="Admin Name"
                            required
                          />
                        </div>
                      </div>

                      {addAdminError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{addAdminError}</AlertDescription>
                        </Alert>
                      )}

                      <Button type="submit" disabled={isAddingAdmin}>
                        {isAddingAdmin ? "Adding Admin..." : "Add Admin"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Current Admins
                    </CardTitle>
                    <CardDescription>Manage existing admin accounts.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAdmins ? (
                      <div className="text-center py-4">Loading admins...</div>
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
                              <TableCell>{admin.name}</TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>
                                <Button variant="destructive" size="sm" onClick={() => handleRemoveAdmin(admin.id)}>
                                  <Trash2 className="h-4 w-4" />
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

          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
                <CardDescription>System information and debugging tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current User</Label>
                    <p className="text-sm text-gray-600">{firebaseUser?.email}</p>
                  </div>
                  <div>
                    <Label>Admin Status</Label>
                    <p className="text-sm text-gray-600">{isAuthorized ? "Authorized" : "Not Authorized"}</p>
                  </div>
                  <div>
                    <Label>Super Admin</Label>
                    <p className="text-sm text-gray-600">{isSuperAdmin ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label>Total Accounts</Label>
                    <p className="text-sm text-gray-600">{accounts.length}</p>
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
