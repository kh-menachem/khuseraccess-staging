"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch("/api/admin/maintenance-mode")
        if (response.ok) {
          const result = await response.json()
          if (result.data?.enabled) {
            router.push("/maintenance")
            return
          }
        }
      } catch (error) {
        console.error("Error checking maintenance mode:", error)
      }

      // If not in maintenance mode, redirect to login
      router.push("/login")
      setChecking(false)
    }

    checkMaintenanceMode()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  )
}
