"use client";

import type React from "react";
import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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

interface Admin {
  id: number;
  email: string;
  name: string;
}

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [accountNumber, setAccountNumber] = useState("");
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
  const { toast } = useToast();
  const router = useRouter();

  const generateRandomPassword = (length = 10) => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*";

    // Ensure at least one number
    const requiredChars = [
      numbers[Math.floor(Math.random() * numbers.length)],
    ];

    // Fill the rest of the password
    const allChars = letters + numbers + symbols;
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle to randomize the position of the number
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
      } else {
        console.error("Failed to load accounts:", result.error);
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
        setNewUserPassword("");
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
      <Tabs defaultValue="add-access">
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
