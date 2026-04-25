import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

import { getLoggedInUser } from "@/app/actions/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getLoggedInUser()

  if (!user) {
    redirect("/login")
  }

  // Transform Appwrite user to the format expected by AppSidebar
  const userData = {
    name: user.name || "User",
    email: user.email,
    avatar: (user.name || user.email).charAt(0).toUpperCase(),
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={userData} />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
