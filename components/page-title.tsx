"use client"

import { usePathname } from "next/navigation"

const routeMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/devices": "Akun WhatsApp",
  "/dashboard/contacts": "Kontak",
  "/dashboard/chat": "Chat",
  "/dashboard/broadcast": "Broadcast",
  "/dashboard/wa-story": "WA Story",
  "/dashboard/auto-reply": "Auto Reply",
  "/dashboard/ai-agent": "AI Agent",
  "/dashboard/reminder": "Reminder",
  "/dashboard/otp-service": "OTP Service",
  "/dashboard/tools": "Tools",
}

export function PageTitle() {
  const pathname = usePathname()

  // Handle dynamic routes like /dashboard/devices/[id]
  if (pathname.startsWith("/dashboard/devices/")) {
    return <h1 className="text-sm font-semibold">Detail Perangkat</h1>
  }

  const title = routeMap[pathname] || "Wappin"

  return (
    <h1 className="text-sm font-semibold">{title}</h1>
  )
}
