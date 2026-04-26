"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Send, ArrowLeft } from "lucide-react"
import { AddDeviceDialog } from "./devices/add-device-dialog"
import { TestMessageDialog } from "./devices/test-message-dialog"
import { getDevice, getDevices } from "@/app/actions/devices"
import { ContactForm } from "@/components/contacts/contact-form"
import { AutoReplyForm } from "@/components/auto-reply/auto-reply-form"

export function HeaderActions() {


  const pathname = usePathname()
  const [isAddDeviceOpen, setIsAddDeviceOpen] = React.useState(false)
  const [isTestOpen, setIsTestOpen] = React.useState(false)
  const [deviceData, setDeviceData] = React.useState<{ id: string, name: string } | null>(null)
  const [devices, setDevices] = React.useState<{ $id: string; name: string; waName?: string }[]>([])


  React.useEffect(() => {
    if (pathname === "/dashboard/auto-reply") {
      getDevices().then(res => {
        if (res.success && res.devices) {
          setDevices(res.devices as unknown as { $id: string; name: string; waName?: string }[])
        }
      })
    }


  }, [pathname])


  // Detect detail page: /dashboard/devices/[id]
  const detailMatch = pathname.match(/\/dashboard\/devices\/([^\/]+)$/)
  const isDetailPage = !!detailMatch && detailMatch[1] !== "new"
  const currentDeviceId = detailMatch ? detailMatch[1] : null

  // Adjust state during render to avoid cascading useEffect renders
  if (!isDetailPage && deviceData !== null) {
    setDeviceData(null)
  }

  React.useEffect(() => {
    if (isDetailPage && currentDeviceId) {
      getDevice(currentDeviceId).then(res => {
        if (res.success && res.device) {
          setDeviceData({ id: res.device.$id, name: res.device.name })
        }
      })
    }
  }, [isDetailPage, currentDeviceId])

  // ── Render: Detail Page Actions ───────────────────────────
  if (isDetailPage && currentDeviceId) {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          className="h-9 gap-2"
          onClick={() => setIsTestOpen(true)}
        >
          <Send className="size-4" />
          Test Kirim
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
          <Link href="/dashboard/devices">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>

        {deviceData && (
          <TestMessageDialog
            open={isTestOpen}
            onOpenChange={setIsTestOpen}
            deviceId={deviceData.id}
            deviceName={deviceData.name}
          />
        )}
      </div>
    )
  }

  // ── Render: Devices List Actions ──────────────────────────
  if (pathname === "/dashboard/devices") {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          className="gap-2 shadow-sm"
          onClick={() => setIsAddDeviceOpen(true)}
        >
          <Plus className="size-4" />
          Tambah Akun
        </Button>

        <AddDeviceDialog
          open={isAddDeviceOpen}
          onOpenChange={setIsAddDeviceOpen}
        />
      </div>
    )
  }

  // ── Render: Contacts List Actions ──────────────────────────
  if (pathname === "/dashboard/contacts") {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <ContactForm />
      </div>
    )
  }

  // ── Render: Auto Reply Actions ───────────────────────────
  if (pathname === "/dashboard/auto-reply") {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <AutoReplyForm devices={devices} />
      </div>
    )
  }

  return null
}


