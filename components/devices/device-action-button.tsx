"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Unlink, QrCode } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { disconnectDevice } from "@/app/actions/devices"
import { initiateWhatsApp } from "@/app/actions/whatsapp"

interface DeviceActionButtonProps {
  deviceId: string
  deviceName: string
  status: string
}

export function DeviceActionButton({ deviceId, deviceName, status }: DeviceActionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [reconnectOpen, setReconnectOpen] = React.useState(false)

  // ─── Putuskan ─────────────────────────────────────────────
  const handleDisconnect = async () => {
    setLoading(true)
    const res = await disconnectDevice(deviceId)
    if (res.success) {
      setConfirmOpen(false)
      router.refresh()
    } else {
      alert("Gagal memutuskan koneksi: " + res.error)
    }
    setLoading(false)
  }

  // ─── Generate QR (reconnect) ──────────────────────────────
  const handleReconnect = async () => {
    setLoading(true)
    await initiateWhatsApp(deviceId)
    setLoading(false)
    setReconnectOpen(true)
  }

  // ─── Render berdasarkan status ────────────────────────────
  if (status === "connected") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 gap-2"
          onClick={() => setConfirmOpen(true)}
        >
          <Unlink className="size-4" />
          Putuskan
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Putuskan Koneksi?</DialogTitle>
              <DialogDescription>
                Perangkat <span className="font-bold text-foreground">{deviceName}</span> akan
                diputuskan dari WhatsApp. Kamu bisa menghubungkan ulang kapan saja.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Putuskan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Status: disconnected / connecting
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 h-9 gap-2"
        onClick={handleReconnect}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <QrCode className="size-4" />
        )}
        {loading ? "Memuat..." : "Generate QR"}
      </Button>

      {/* Reuse dialog scan QR yang sudah ada — tapi kita perlu open state */}
      <ReconnectQRDialog
        open={reconnectOpen}
        onOpenChange={setReconnectOpen}
        deviceId={deviceId}
      />
    </>
  )
}

// ─── Dialog QR khusus untuk reconnect (device sudah ada) ──────────────────────

import { getDevice } from "@/app/actions/devices"
import { QRCodeSVG } from "qrcode.react"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Models } from "appwrite"
import { client } from "@/lib/appwrite-client"

interface ReconnectQRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
}

interface Device extends Models.Document {
  status: string
  name: string
  qr?: string
  phone?: string
  waName?: string
  waImage?: string
}

function ReconnectQRDialog({ open, onOpenChange, deviceId }: ReconnectQRDialogProps) {
  const router = useRouter()
  const [qrCode, setQrCode] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<"qr" | "success">("qr")
  const [connectedDevice, setConnectedDevice] = React.useState<Device | null>(null)
  const pollRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleConnected = React.useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current)
    const res = await getDevice(deviceId)
    if (res.success && res.device) {
      setConnectedDevice(res.device as unknown as Device)
    }
    setStep("success")
  }, [deviceId])

  const handleClose = React.useCallback(() => {
    onOpenChange(false)
    router.refresh()
  }, [onOpenChange, router])

  // Adjust state during render to avoid cascading useEffect renders
  if (!open && (qrCode !== null || step !== "qr" || connectedDevice !== null)) {
    setQrCode(null)
    setStep("qr")
    setConnectedDevice(null)
  }

  React.useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    // Polling setiap 2 detik
    pollRef.current = setInterval(async () => {
      const res = await getDevice(deviceId)
      if (res.success && res.device) {
        const device = res.device as unknown as Device
        if (device.qr) setQrCode(device.qr)
        if (device.status === "connected") handleConnected()
      }
    }, 2000)

    // Realtime sebagai jalur cepat
    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID}.documents.${deviceId}`,
      (response) => {
        const payload = response.payload as Device
        if (payload.qr) setQrCode(payload.qr)
        if (payload.status === "connected") handleConnected()
      }
    )

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      unsubscribe()
    }
  }, [open, deviceId, handleConnected])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">

        {/* ── Step: QR ──────────────────────────────── */}
        {step === "qr" && (
          <div className="flex flex-col items-center py-6 text-center space-y-6">
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Buka WhatsApp di ponsel kamu, ketuk Menu atau Setelan dan pilih Perangkat Tertaut.
              </DialogDescription>
            </DialogHeader>
            <div className="relative flex items-center justify-center p-4 bg-white rounded-xl border-2 border-border shadow-inner size-[240px]">
              {qrCode ? (
                <QRCodeSVG value={qrCode} size={200} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-xs">Menyiapkan QR...</p>
                </div>
              )}
            </div>
            <div className="bg-muted p-4 rounded-lg text-xs text-muted-foreground flex gap-3 items-start text-left">
              <QrCode className="size-5 shrink-0" />
              <p>Arahkan kamera ponsel kamu ke kode di atas. Jangan tutup jendela ini sampai proses scan selesai.</p>
            </div>
          </div>
        )}

        {/* ── Step: Success ──────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8 text-center space-y-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
              <div className="relative size-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                <CheckCircle2 className="size-10 text-green-600" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold">Berhasil Terhubung!</h2>
              <p className="text-sm text-muted-foreground">Akun WhatsApp kamu sudah siap digunakan.</p>
            </div>

            {connectedDevice && (
              <div className="w-full bg-muted/50 border rounded-xl p-4 flex items-center gap-4 text-left">
                <Avatar className="size-12 rounded-xl border-2 border-background shadow-sm shrink-0">
                  <AvatarImage src={connectedDevice.waImage || `https://api.dicebear.com/7.x/initials/svg?seed=${connectedDevice.name}`} />
                  <AvatarFallback className="rounded-xl">{connectedDevice.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{connectedDevice.waName || connectedDevice.name}</p>
                  {connectedDevice.phone && (
                    <p className="text-xs text-muted-foreground font-mono">+{connectedDevice.phone}</p>
                  )}
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-1 text-green-700 border-green-200 bg-green-50">
                    {connectedDevice.name}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex gap-2 w-full pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Tutup
              </Button>
              <Button className="flex-1 gap-1.5" asChild onClick={handleClose}>
                <Link href={`/dashboard/devices/${deviceId}`}>
                  Lihat Detail
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
