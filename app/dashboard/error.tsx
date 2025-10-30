"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] Dashboard error:", error)
  }, [error])

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
            <CardTitle>Dashboard Error</CardTitle>
          </div>
          <CardDescription>We encountered an error loading your dashboard data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">{error.message || "Failed to load dashboard data"}</div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("user")
                window.location.href = "/login"
              }}
              className="flex-1"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
