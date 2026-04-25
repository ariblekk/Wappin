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

  const handleSend = async () => {
    if (!to) {
      toast.error("Nomor Tujuan Kosong", {
        description: "Silakan masukkan nomor WhatsApp tujuan.",
      })
      return
    }

    setLoading(true)
    const res = await sendTestMessage(deviceId, to, message)
    setLoading(false)

    if (res.success) {
      toast.success("Pesan Terkirim", {
        description: `Pesan berhasil dikirim ke ${to}`,
      })
      onOpenChange(false)
      setTo("")
    } else {
      toast.error("Gagal Mengirim Pesan", {
        description: res.error || "Terjadi kesalahan saat mengirim pesan.",
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

            {/* Message */}
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
