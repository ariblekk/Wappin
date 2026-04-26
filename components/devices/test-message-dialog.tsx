"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Smartphone, Send, Paperclip, Loader2 } from "lucide-react"
import { sendTestMessage } from "@/app/actions/whatsapp"
import { toast } from "sonner"

interface TestMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deviceId: string
  deviceName: string
}

export function TestMessageDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
}: TestMessageDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [to, setTo] = React.useState("")
  const [message, setMessage] = React.useState("Halo, ini pesan test dari Wapping! 👋")
  const [count, setCount] = React.useState(1)

  const handleSend = async () => {
    if (!to) {
      toast.error("Nomor Tujuan Kosong", {
        description: "Silakan masukkan nomor WhatsApp tujuan.",
      })
      return
    }

    setLoading(true)
    let successCount = 0
    let failCount = 0

    try {
      for (let i = 0; i < count; i++) {
        // Dispatch optimistic message event
        const tempId = `temp-${Date.now()}-${i}`
        const optimisticMsg = {
          detail: {
            $id: tempId,
            to: to.replace(/[^0-9]/g, ''),
            body: message,
            status: 'pending',
            deviceId: deviceId,
            sentAt: new Date().toISOString()
          }
        }
        window.dispatchEvent(new CustomEvent('optimistic-message', optimisticMsg))

        const res = await sendTestMessage(deviceId, to, message)
        if (res.success) {
          successCount++
        } else {
          failCount++
        }
        
        // Jeda 1 detik antar pesan jika jumlahnya lebih dari 1
        if (count > 1 && i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error("Error sending test messages:", error)
    }

    setLoading(false)

    if (successCount > 0) {
      toast.success("Pesan Terkirim", {
        description: `${successCount} pesan berhasil dikirim ke ${to}.${failCount > 0 ? ` (${failCount} gagal)` : ""}`,
      })
      onOpenChange(false)
      setTo("")
      setCount(1) // Reset
    } else {
      toast.error("Gagal Mengirim Pesan", {
        description: "Terjadi kesalahan saat mengirim pesan.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 space-y-6">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle className="text-xl font-bold">Test Kirim Pesan</DialogTitle>
            <DialogDescription className="sr-only">
              Kirim pesan percobaan untuk memastikan koneksi WhatsApp berjalan dengan lancar.
            </DialogDescription>
          </DialogHeader>

          {/* Device Card */}
          <div className="bg-muted/30 border rounded-xl p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
              <Smartphone className="size-5 text-green-600" />
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-sm leading-none">{deviceName}</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">{deviceId}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Target Number */}
            <div className="space-y-2">
              <Label htmlFor="to" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Nomor Tujuan
              </Label>
              <Input
                id="to"
                placeholder="628xxxxxxxxxx"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Jumlah Dikirim */}
            <div className="space-y-2">
              <Label htmlFor="count" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Jumlah yang Dikirim
              </Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pesan
              </Label>
              <Textarea
                id="message"
                placeholder="Tulis pesan kamu di sini..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] rounded-xl resize-none py-3"
              />
            </div>

            {/* Media Placeholder */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                Media <span className="lowercase font-normal opacity-50">(opsional)</span>
              </Label>
              <div className="border-2 border-dashed rounded-xl p-3 flex items-center gap-3 text-muted-foreground cursor-not-allowed bg-muted/10 opacity-60">
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                  <Paperclip className="size-4" />
                </div>
                <span className="text-xs font-medium">Pilih media...</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-4 border-t flex flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {loading ? "Mengirim..." : "Kirim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
