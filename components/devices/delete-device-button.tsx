"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { deleteDevice } from "@/app/actions/devices"

export function DeleteDeviceButton({ deviceId, deviceName }: { deviceId: string, deviceName: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const res = await deleteDevice(deviceId)
    if (res.success) {
      setOpen(false)
      router.refresh()
    } else {
      alert("Gagal menghapus perangkat: " + res.error)
    }
    setLoading(false)
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="h-9 px-3 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Hapus Perangkat
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Perangkat?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus perangkat <span className="font-bold text-foreground">{deviceName}</span> dan memutuskan koneksi WhatsApp yang aktif. Data pesan tidak akan terhapus dari WhatsApp Anda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
