"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddDeviceDialog } from "./add-device-dialog"

export function AddDeviceButton({ children, className }: { children?: React.ReactNode, className?: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button 
        className={className} 
        onClick={() => setOpen(true)}
      >
        {children || (
          <>
            <Plus className="size-4 mr-2" />
            Tambah Akun Sekarang
          </>
        )}
      </Button>
      <AddDeviceDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
