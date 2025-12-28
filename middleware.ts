import { type NextRequest, NextResponse } from "next/server"

// Store maintenance status in memory with a short TTL
const maintenanceStatus = {
  enabled: false,
  lastChecked: 0,
}

async function checkMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  // Cache for 10 seconds
  if (now - maintenanceStatus.lastChecked < 10000) {
    return maintenanceStatus.enabled
  }

  try {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
    const host = process.env.VERCEL_URL || "localhost:3000"
    const apiUrl = `${protocol}://${host}/api/admin/maintenance-mode`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()
      maintenanceStatus.enabled = data.data?.enabled ?? false
      maintenanceStatus.lastChecked = now
      return maintenanceStatus.enabled
    }
  } catch (error) {
    console.error("[Middleware] Error checking maintenance mode:", error)
  }

  return maintenanceStatus.enabled
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/admin/") || pathname === "/admin") {
    return NextResponse.next()
  }

  // Check maintenance mode only for customer-facing paths
  if (pathname === "/" || pathname === "/login") {
    const isMaintenanceEnabled = await checkMaintenanceMode()

    if (isMaintenanceEnabled) {
      // Rewrite to /landing without changing the URL visible to the user
      const newUrl = new URL("/landing", request.url)
      return NextResponse.rewrite(newUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - landing (landing page itself)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|landing).*)",
  ],
}
