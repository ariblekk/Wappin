"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { QRCodeSVG } from "qrcode.react"
import { Loader2, QrCode, Smartphone, CheckCircle2, ArrowRight } from "lucide-react"
import { createDevice, getDevice } from "@/app/actions/devices"
import { initiateWhatsApp } from "@/app/actions/whatsapp"
import { client } from "@/lib/appwrite-client"
import { Models } from "appwrite"

interface Device extends Models.Document {
  name: string
  status: string
  qr?: string
  phone?: string
  waName?: string
  waImage?: string
  userId: string
}

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddDeviceDialog({ open, onOpenChange }: AddDeviceDialogProps) {
  const router = useRouter()
  const [step, setStep] = React.useState<"input" | "qr" | "success">("input")
  const [name, setName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [qrCode, setQrCode] = React.useState<string | null>(null)
  const [deviceId, setDeviceId] = React.useState<string | null>(null)
  const [connectedDevice, setConnectedDevice] = React.useState<Device | null>(null)
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleConnected = React.useCallback(async (id: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    // Ambil data terbaru untuk ditampilkan di success screen
    const res = await getDevice(id)
    if (res.success && res.device) {
      setConnectedDevice(res.device as unknown as Device)
    }
    setStep("success")
    router.refresh()
  }, [router])


  // Realtime listener
  React.useEffect(() => {
    if (!deviceId || step !== "qr") return

    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID}.documents.${deviceId}`,
      (response) => {
        const payload = response.payload as Device
        if (payload.qr) setQrCode(payload.qr)
        if (payload.status === "connected") handleConnected(deviceId)
      }
    )

    return () => unsubscribe()
  }, [deviceId, step, handleConnected])

  const handleCreate = async () => {
    if (!name) return
    setLoading(true)
    
    const res = await createDevice(name)
    if (res.success && res.deviceId) {
      const newDeviceId = res.deviceId
      setDeviceId(newDeviceId)
      setStep("qr")
      
      pollIntervalRef.current = setInterval(async () => {


        try {
          const res = await getDevice(newDeviceId)
          if (res.success && res.device) {
            const device = res.device as unknown as Device
            if (device.qr) setQrCode(device.qr)
            if (device.status === "connected") handleConnected(newDeviceId)
          }
        } catch (e) {
          console.error("Polling failed:", e)
        }
      }, 2000)

      await initiateWhatsApp(newDeviceId)
      
      setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      }, 5 * 60 * 1000)
    } else {
      alert("Gagal membuat perangkat: " + res.error)
    }
    setLoading(false)
  }

  const reset = () => {
    setStep("input")
    setName("")
    setQrCode(null)
    setDeviceId(null)
    setConnectedDevice(null)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
  }

  const handleClose = () => {
    onOpenChange(false)
    router.refresh()
    reset()
  }

  React.useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) { 
        onOpenChange(false); 
        router.refresh();
        reset(); 
      }
      else onOpenChange(val)
    }}>

      <DialogContent className="sm:max-w-[425px]">

        {/* ── Step: Input ─────────────────────────────── */}
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="size-5 text-primary" />
                Tambah Akun WhatsApp
              </DialogTitle>
              <DialogDescription>
                Beri nama untuk perangkat kamu agar mudah dikenali.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Perangkat</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Admin CS, Marketing, dll"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreate} 
                disabled={loading || !name}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat & Lanjut ke Scan QR
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step: QR ────────────────────────────────── */}
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

        {/* ── Step: Success ───────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8 text-center space-y-5">
            {/* Animated checkmark ring around avatar */}
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

            {/* Profile card */}
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
              {deviceId && (
                <Button className="flex-1 gap-1.5" asChild onClick={handleClose}>
                  <Link href={`/dashboard/devices/${deviceId}`}>
                    Lihat Detail
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
