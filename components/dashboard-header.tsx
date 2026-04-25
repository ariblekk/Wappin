"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { PageTitle } from "@/components/page-title"
import { HeaderActions } from "@/components/header-actions"

export function DashboardHeader() {
  const pathname = usePathname()
  
  // Hide header for chat page
  if (pathname === "/dashboard/chat") return null

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 sticky top-0 bg-background z-10 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <PageTitle />
      </div>
      <div className="flex-1" />
      <HeaderActions />
    </header>
  )
}
