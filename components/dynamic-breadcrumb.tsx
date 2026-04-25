"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

const routeMap: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/devices": "Akun WhatsApp",
  "/dashboard/broadcasts": "Broadcast",
  "/dashboard/chat": "Chat",
  "/dashboard/settings": "Pengaturan",
  "/dashboard/billing": "Langganan",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const pageTitle = routeMap[pathname] || "Dashboard"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
