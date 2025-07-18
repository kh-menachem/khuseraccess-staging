"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

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
      setIsAdding
