"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  UserPlus,
  Mail,
  Shield,
  LogOut,
  Users,
  Trash2,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("add-access");

  const [userEmail, setUserEmail] = useState("");
  const [isAddingAccess, setIsAddingAccess] = useState(false);
  const [addAccessError, setAddAccessError] = useState<string | null>(null);
  const [addAccessSuccess, setAddAccessSuccess] = useState<string | null>(null);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<
    Array<{ accountNumber: string; firstName: string; lastName: string }>
  >([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");

  const { user: firebaseUser, logout } = useAuth();
  const router = useRouter();

  const generateRandomPassword = (length = 10) => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*";
    const requiredChars = [
      numbers[Math.floor(Math.random() * numbers.length)],
    ];
    const allChars = letters + numbers + symbols;
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }
    for (let i = requiredChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
    }
    return requiredChars.join("");
  };

  useEffect(() => {
    if (!newUserPassword) {
      setNewUserPassword(generateRandomPassword());
    }
  }, []);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const response = await fetch("/api/admin/get-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestorEmail: firebaseUser?.email }),
      });
      const result = await response.json();
      if (result.success) {
        setAccounts(result.accounts || []);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!firebaseUser) {
        setIsAuthorized(false);
        return;
      }
      try {
        const response = await fetch("/api/admin/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: firebaseUser.email }),
        });
        const result = await response.json();
        if (result.success && result.isAdmin) {
          setIsAuthorized(true);
          setAdminUser(result.adminUser);
          loadAccounts();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        setIsAuthorized(false);
      }
    };
    checkAdminAccess();
  }, [firebaseUser]);

  const handleAddUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAccess(true);
    setAddAccessError(null);
    setAddAccessSuccess(null);
    try {
      const response = await fetch("/api/admin/add-user-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: selectedAccount,
          userEmail,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setAddAccessSuccess("User access added successfully.");
        setSelectedAccount("");
        setUserEmail("");
        setActiveTab("create-user");
        setNewUserPassword(generateRandomPassword());
      } else {
        setAddAccessError(result.error || "Failed to add user access");
      }
    } catch (error) {
      setAddAccessError("Error adding user access");
    } finally {
      setIsAddingAccess(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (newUserPassword.length < 8 || !/\d/.test(newUserPassword)) {
      setCreateUserError("Password must be at least 8 characters and include a number");
      setIsCreatingUser(false);
      return;
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
      });
      const result = await response.json();
      if (result.success) {
        setCreateUserSuccess("User created successfully");
        setNewUserEmail("");
        setNewUserPassword(generateRandomPassword());
      } else {
        setCreateUserError(result.error || "Failed to create user");
      }
    } catch (error) {
      setCreateUserError("Error creating user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (isAuthorized === null) return <p>Loading...</p>;
  if (!isAuthorized) return <p>Access Denied</p>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        if (val === "create-user") {
          setNewUserPassword(generateRandomPassword());
        }
      }}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="add-access">Add User Access</TabsTrigger>
          <TabsTrigger value="create-user">Create New User</TabsTrigger>
        </TabsList>

        <TabsContent value="add-access">
          <form onSubmit={handleAddUserAccess} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="account">Account Number</Label>
              <Input
                id="account"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isAddingAccess}>
              {isAddingAccess ? "Adding..." : "Add Access"}
            </Button>
            {addAccessError && <p className="text-red-500">{addAccessError}</p>}
            {addAccessSuccess && <p className="text-green-600">{addAccessSuccess}</p>}
          </form>
        </TabsContent>

        <TabsContent value="create-user">
          <form onSubmit={handleCreateNewUser} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="newEmail">User Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="text"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isCreatingUser}>
              {isCreatingUser ? "Creating..." : "Create User"}
            </Button>
            {createUserError && <p className="text-red-500">{createUserError}</p>}
            {createUserSuccess && <p className="text-green-600">{createUserSuccess}</p>}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
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

          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            if (val === "create-user") {
              setNewUserPassword(generateRandomPassword());
            }
          }} className="space-y-6">

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
