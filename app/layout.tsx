import type React from "react"
import { AuthProvider } from "@/lib/auth-context"
import { ClientErrorLogger } from "@/components/client-error-logger"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <body translate="no" className="notranslate">
        <ClientErrorLogger />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Keren Hatzedaka - Customer Portal",
  description: "Customer Portal for Keren Hatzedaka",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}
