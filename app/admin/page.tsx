"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, UserPlus, Mail, Shield, LogOut, Users, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface Admin {
  id: number
  email: string
  name: string
}

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [adminUser, setAdminUser] = useState<any>(null)

  // Add User Access form state
  const [accountNumber, setAccountNumber] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [isAddingAccess, setIsAddingAccess] = useState(false)
  const [addAccessError, setAddAccessError] = useState<string | null>(null)
  
  useEffect(() => {
  const generateRandomPassword = (length = 10) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  setUserPassword(generateRandomPassword())
}, [])


  // Create New User form state
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [createUserError, setCreateUserError] = useState<string | null>(null)

  // Manage Admins form state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminName, setAdminName] = useState("")
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)

  // Add these new state variables after the existing state declarations
  const [accounts, setAccounts] = useState<Array<{ accountNumber: string; firstName: string; lastName: string }>>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState("")
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null)
  const [addAccessSuccess, setAddAccessSuccess] = useState<string | null>(null)

  const { user: firebaseUser, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Add this function after the loadAdmins function
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
        setAccounts(result.accounts || [])
      } else {
        console.error("Failed to load accounts:", result.error)
      }
    } catch (error) {
      console.error("Error loading accounts:", error)
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  // Update the existing useEffect to also load accounts
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!firebaseUser) {
        setIsAuthorized(false)
        return
      }

      try {
        // Check if user has admin access
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
          // Load admins list and accounts
          loadAdmins()
          loadAccounts()
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

  const loadAdmins = async () => {
    if (!firebaseUser?.email) return

    setIsLoadingAdmins(true)
    try {
      const response = await fetch("/api/admin/list-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestorEmail: firebaseUser.email }),
      })

      const result = await response.json()

      if (result.success) {
        setAdmins(result.admins || [])
      } else {
        console.error("Failed to load admins:", result.error)
      }
    } catch (error) {
      console.error("Error loading admins:", error)
    } finally {
      setIsLoadingAdmins(false)
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

  // Replace the existing handleAddUserAccess function
  const handleAddUserAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAccess(true)
    setAddAccessError(null)
    setAddAccessSuccess(null)

    console.log("Adding user access:", { selectedAccount, userEmail })

    // Validate account selection
    if (!selectedAccount) {
      setAddAccessError("Please select an account")
      setIsAddingAccess(false)
      return
    }

    try {
      const response = await fetch("/api/admin/add-user-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: selectedAccount,
          userEmail: userEmail,
          password: userPassword,
        }),

      })

      const result = await response.json()
      console.log("Add user access result:", result)

      if (result.success) {
        const selectedAccountInfo = accounts.find((acc) => acc.accountNumber === selectedAccount)
        const accountName = selectedAccountInfo
          ? `${selectedAccountInfo.firstName} ${selectedAccountInfo.lastName}`
          : selectedAccount

        setAddAccessSuccess(`User access added successfully for account ${selectedAccount} (${accountName})`)
        toast({
          title: "Success",
          description: `User access added successfully for account ${selectedAccount}`,
        })
        setSelectedAccount("")
        setUserEmail("")
      } else {
        setAddAccessError(result.error || "Failed to add user access")
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to add user access",
        })
      }
    } catch (error) {
      console.error("Error adding user access:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setAddAccessError(`Failed to add user access: ${errorMessage}`)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add user access",
      })
    } finally {
      setIsAddingAccess(false)
    }
  }

  // Replace the existing handleCreateNewUser function
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingUser(true)
    setCreateUserError(null)
    setCreateUserSuccess(null)

    console.log("Creating new user:", { newUserEmail })

    // Validate passwords match
    if (newUserPassword !== confirmPassword) {
      setCreateUserError("Passwords do not match")
      setIsCreatingUser(false)
      return
    }

    // Validate password length
    if (newUserPassword.length < 6) {
      setCreateUserError("Password must be at least 6 characters")
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
          email: newUserEmail,
          password: newUserPassword,
        }),
      })

      const result = await response.json()
      console.log("Create user result:", result)

      if (result.success) {
        setCreateUserSuccess(
          `User account created successfully for ${newUserEmail}. User can now login with their email and password.`,
        )
        toast({
          title: "Success",
          description: `User account created successfully for ${newUserEmail}`,
        })
        setNewUserEmail("")
        setNewUserPassword("")
        setConfirmPassword("")
      } else {
        setCreateUserError(result.error || "Failed to create user")
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to create user",
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setCreateUserError(`Failed to create user: ${errorMessage}`)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAdmin(true)
    setAddAdminError(null)

    console.log("Adding admin:", { adminEmail, adminName })

    try {
      const response = await fetch("/api/admin/add-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail: adminEmail,
          adminName: adminName,
          requestorEmail: firebaseUser?.email,
        }),
      })

      const result = await response.json()
      console.log("Add admin result:", result)

      if (result.success) {
        toast({
          title: "Success",
          description: `Admin ${adminName} added successfully`,
        })
        setAdminEmail("")
        setAdminName("")
        // Reload admins list
        loadAdmins()
      } else {
        setAddAdminError(result.error || "Failed to add admin")
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to add admin",
        })
      }
    } catch (error) {
      console.error("Error adding admin:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setAddAdminError(`Failed to add admin: ${errorMessage}`)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add admin",
      })
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (adminToRemove: Admin) => {
    if (adminToRemove.email.toLowerCase() === firebaseUser?.email?.toLowerCase()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot remove yourself",
      })
      return
    }

    if (!confirm("Are you sure you want to remove this admin?")) {
      return
    }

    try {
      const response = await fetch("/api/admin/remove-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail: adminToRemove.email,
          requestorEmail: firebaseUser?.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: `Admin ${adminToRemove.name} removed successfully`,
        })
        // Reload admins list
        loadAdmins()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to remove admin",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove admin",
      })
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

          <Tabs defaultValue="add-access" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-red-50">
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
              <TabsTrigger
                value="manage-admins"
                className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4" />
                Manage Admins
              </TabsTrigger>
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
                              <option key={account.accountNumber} value={account.accountNumber}>
                                {account.accountNumber} - {account.firstName} {account.lastName}
                              </option>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="userPassword">Generated Password</Label>
                      <Input
                        id="userPassword"
                        type="text"
                        placeholder="Auto-generated password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
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
                        placeholder="Enter password (minimum 6 characters)"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required
                        minLength={6}
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
                        minLength={6}
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
