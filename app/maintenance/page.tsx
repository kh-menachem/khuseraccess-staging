"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

interface MaintenanceData {
  message: string
  estimatedTime?: string
}

export default function MaintenancePage() {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/maintenance-mode")
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            setMaintenanceData(result.data)
          }
        }
      } catch (error) {
        console.error("Error fetching maintenance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6">
      <div className="text-center max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 relative">
            <Image
              src="/images/kh-hand-logo.png"
              alt="Keren Hatzedakah Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Maintenance Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">System Maintenance</h1>

        {/* Message */}
        <p className="text-lg text-gray-600 mb-6">
          {loading ? "Loading..." : maintenanceData?.message || "We're currently performing system maintenance."}
        </p>

        {/* Estimated Time */}
        {maintenanceData?.estimatedTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Estimated completion time:</span> {maintenanceData.estimatedTime}
            </p>
          </div>
        )}

        {/* Additional Info */}
        <p className="text-gray-500 text-sm">Thank you for your patience. We'll be back online soon!</p>
      </div>
    </div>
  )
}
