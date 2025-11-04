"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SystemMessageBannerProps {
  location: "dashboard" | "login"
}

export function SystemMessageBanner({ location }: SystemMessageBannerProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const fetchSystemMessage = async () => {
      try {
        const response = await fetch("/api/admin/system-message")
        const result = await response.json()

        if (result.success && result.data.enabled) {
          const { message, showOnDashboard, showOnLogin } = result.data

          // Check if message should be shown on this page
          const shouldShow = (location === "dashboard" && showOnDashboard) || (location === "login" && showOnLogin)

          if (shouldShow && message) {
            setMessage(message)
            setIsVisible(true)
          }
        }
      } catch (error) {
        console.error("Error fetching system message:", error)
      }
    }

    fetchSystemMessage()
  }, [location])

  if (!isVisible || !message || isDismissed) {
    return null
  }

  return (
    <div className="w-full bg-yellow-400 border-b-2 border-yellow-500 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="text-sm md:text-base font-medium text-gray-900">{message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 h-8 w-8 p-0 hover:bg-yellow-500/20"
        >
          <X className="h-4 w-4 text-gray-900" />
        </Button>
      </div>
    </div>
  )
}
