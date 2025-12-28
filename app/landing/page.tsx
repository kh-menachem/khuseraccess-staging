"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export default function MaintenanceLanding() {
  const [language, setLanguage] = useState<"en" | "he">("en")
  const [isRTL, setIsRTL] = useState(false)

  useEffect(() => {
    setIsRTL(language === "he")
  }, [language])

  const messages = {
    en: {
      title: "Site Under Maintenance",
      description: "We're currently performing updates to improve your experience.",
      backOnline: "The site will be back online shortly.",
      status: "Status: Maintenance in progress",
      contact: "For urgent issues, contact us at:",
      email: "6301926@gmail.com",
      switchLanguage: "עברית",
    },
    he: {
      title: "האתר בתחזוקה",
      description: "אנו מבצעים כעת עדכונים לשיפור חווית המשתמש.",
      backOnline: "האתר יחזור לפעילות השלמה בקרוב.",
      status: "סטטוס: תחזוקה פעילה",
      contact: "לשאלות דחופות, אנא פנו אלינו:",
      email: "6301926@gmail.com",
      switchLanguage: "English",
    },
  }

  const t = messages[language]

  return (
    <div className={`min-h-screen flex flex-col ${isRTL ? "rtl" : "ltr"}`} style={{ backgroundColor: "#f8fafc" }}>
      <div className="flex flex-1">
        {/* Left Illustration Side */}
        <div
          className={`hidden lg:flex lg:w-1/2 items-center justify-center p-8 ${isRTL ? "lg:order-last" : ""}`}
          style={{
            background: "linear-gradient(135deg, #20B2AA 0%, #48D1CC 100%)",
          }}
        >
          <div className="max-w-lg">
            <Image
              src="/images/login-security-bg.png"
              alt="Maintenance Illustration"
              width={500}
              height={400}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right Content Side */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center px-6 py-4 ${isRTL ? "lg:order-first" : ""}`}>
          <div className="w-full max-w-sm">
            {/* Language Toggle */}
            <div className={`mb-8 ${isRTL ? "text-right" : "text-left"}`}>
              <button
                onClick={() => setLanguage(language === "en" ? "he" : "en")}
                className="px-4 py-2 border border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 font-medium rounded text-sm transition-colors"
              >
                {t.switchLanguage}
              </button>
            </div>

            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 relative">
                <Image
                  src="/images/kh-hand-logo.png"
                  alt="Keren Hatzedakah Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Maintenance Message Card */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 space-y-6">
              {/* Title */}
              <div className={`text-center ${isRTL ? "text-right" : "text-left"}`}>
                <h1 className="text-3xl font-bold text-teal-600 mb-4">{t.title}</h1>
              </div>

              {/* Messages */}
              <div className={`space-y-4 text-gray-700 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="leading-relaxed">{t.description}</p>
                <p className="leading-relaxed">{t.backOnline}</p>
              </div>

              {/* Status */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-teal-500 p-4 rounded">
                <p className={`text-sm font-semibold text-teal-700 ${isRTL ? "text-right" : "text-left"}`}>
                  {t.status}
                </p>
              </div>

              {/* Contact Info */}
              <div className={`pt-4 border-t border-gray-200 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="text-sm text-gray-600 mb-2">{t.contact}</p>
                <a
                  href={`mailto:${t.email}`}
                  className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors"
                >
                  {t.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
