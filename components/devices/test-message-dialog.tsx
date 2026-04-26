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
import { Smartphone, Send, Loader2, ShieldCheck, Info } from "lucide-react"
import { sendTestMessage } from "@/app/actions/whatsapp"
import { getContacts } from "@/app/actions/contacts"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Models } from "node-appwrite"

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
  const [contacts, setContacts] = React.useState<Models.Document[]>([])

  React.useEffect(() => {
    if (open) {
      const fetchContacts = async () => {
        const res = await getContacts()
        if (res.success) {
          setContacts(res.contacts)
        }
      }
      fetchContacts()
    }
  }, [open])

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
        
        // Jeda acak antar pesan (2-4 detik) agar lebih menyerupai manusia
        if (count > 1 && i < count - 1) {
          const randomDelay = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000
          await new Promise((resolve) => setTimeout(resolve, randomDelay))
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
              <div className="flex items-center justify-between">
                <Label htmlFor="to" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Nomor Tujuan
                </Label>
                {contacts.length > 0 && (
                  <Select 
                    value={to} 
                    onValueChange={(value) => setTo(value)}
                  >
                    <SelectTrigger className="h-7 w-auto border-none bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg px-2 text-[10px] font-bold uppercase tracking-tight">
                      <SelectValue placeholder="Kontak" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end" sideOffset={4} className="w-[250px]">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.$id} value={contact.phone}>
                          <span className="text-xs">{contact.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">({contact.phone})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="count" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Jumlah yang Dikirim
                </Label>
                {count > 1 && (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    <ShieldCheck className="size-3" />
                    <span>Anti-Ban: Jeda Acak (2-4s)</span>
                  </div>
                )}
              </div>
              <Input
                id="count"
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-11 rounded-xl"
              />
              {count > 1 && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
                  <Info className="size-3 shrink-0" />
                  Sistem akan memberikan jeda acak antara 2-4 detik per pesan untuk mensimulasikan aktivitas manusia.
                </p>
              )}
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
