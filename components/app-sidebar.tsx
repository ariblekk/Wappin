"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInput,
} from "@/components/ui/sidebar"
import {
  LayoutGrid,
  MessageSquare,
  Radio,
  Undo2,
  Clock,
  Fingerprint,
  Wrench,
  Crown,
  Settings,
  Search,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const data = {
  navMain: [
    {
      title: "Utama",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutGrid,
        },
        {
          title: "Akun WhatsApp",
          url: "/dashboard/devices",
          icon: MessageSquare,
        },
        {
          title: "Kontak",
          url: "/dashboard/contacts",
          icon: Users,
        },
      ],
    },
    {
      title: "Pesan",
      items: [
        {
          title: "Broadcast",
          url: "/dashboard/broadcast",
          icon: Radio,
        },
      ],
    },
    {
      title: "Otomasi",
      items: [
        {
          title: "Auto Reply",
          url: "/dashboard/auto-reply",
          icon: Undo2,
        },
        {
          title: "Reminder",
          url: "/dashboard/reminder",
          icon: Clock,
        },
        {
          title: "OTP Service",
          url: "/dashboard/otp",
          icon: Fingerprint,
        },
      ],
    },
    {
      title: "Lainnya",
      items: [
        {
          title: "Tools",
          url: "/dashboard/tools",
          icon: Wrench,
        },
      ],
    },
    {
      title: "Pengaturan",
      items: [
        {
          title: "Langganan",
          url: "/dashboard/billing",
          icon: Crown,
        },
        {
          title: "Pengaturan",
          url: "/dashboard/settings",
          icon: Settings,
        },
      ],
    },
  ],
}

import { NavUser } from "@/components/nav-user"

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string, email: string, avatar: string } }) {
  const pathname = usePathname()

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-lg text-primary">Wappin</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <SidebarInput placeholder="Cari..." className="pl-8 h-9" />
            <div className="absolute right-2 top-2.5 text-[10px] text-muted-foreground border rounded px-1 hidden md:block">
              Ctrl K
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <a href={item.url} className="flex items-center gap-3">
                        {item.icon && <item.icon className={cn("size-4", isActive ? "opacity-100" : "opacity-70")} />}
                        <span className={cn("font-medium", isActive && "text-primary")}>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
