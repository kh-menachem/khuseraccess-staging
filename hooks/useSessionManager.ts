import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface SessionManagerOptions {
  mode?: "inactivity" | "countdown"
  minutes?: number
  redirectTo?: string
}

export const useSessionManager = ({
  mode = "inactivity",
  minutes = 10,
  redirectTo = "/login",
}: SessionManagerOptions) => {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (mode !== "inactivity") return

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"]
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        router.push(redirectTo)
      }, minutes * 60 * 1000)
    }

    events.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [mode, minutes, redirectTo, router])
}
