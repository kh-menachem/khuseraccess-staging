"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] Application error:", error)
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
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>An error occurred while loading the application. Please try again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">{error.message || "An unexpected error occurred"}</div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/login")} className="flex-1">
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
