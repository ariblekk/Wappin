"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Send,
  Users,
  MessageSquare,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createBroadcast } from "@/app/actions/broadcast"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Contact2 } from "lucide-react"

interface Device {
  $id: string
  name: string
  waName?: string
  status: string
}

interface Contact {
  $id: string
  name: string
  phone: string
  tags?: string
}

interface BroadcastFormProps {
  devices: Device[]
  contacts: Contact[]
}

export function BroadcastForm({ devices, contacts }: BroadcastFormProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    deviceId: devices[0]?.$id || "",
    name: "",
    recipients: "",
    message: ""
  })
  const [search, setSearch] = React.useState("")
  const [selectedContacts, setSelectedContacts] = React.useState<string[]>([])

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const handleAddSelected = () => {
    const selectedPhones = contacts
      .filter(c => selectedContacts.includes(c.$id))
      .map(c => c.phone)
      .join("\n")

    if (selectedPhones) {
      const current = formData.recipients.trim()
      const newVal = current ? `${current}\n${selectedPhones}` : selectedPhones
      setFormData({ ...formData, recipients: newVal })
      toast.success(`${selectedContacts.length} kontak ditambahkan`)
      setSelectedContacts([])
      setSearch("")
    }
  }

  const connectedDevices = devices.filter(d => d.status === "connected")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.deviceId) {
      toast.error("Silakan pilih perangkat WhatsApp")
      return
    }
    if (!formData.name.trim()) {
      toast.error("Silakan isi nama broadcast")
      return
    }
    if (!formData.recipients.trim()) {
      toast.error("Silakan isi daftar penerima")
      return
    }
    if (!formData.message.trim()) {
      toast.error("Silakan isi pesan broadcast")
      return
    }

    setLoading(true)
    try {
      const res = await createBroadcast(formData)
      if (res.success) {
        toast.success("Broadcast telah dimulai!")
        setFormData({ ...formData, name: "", recipients: "", message: "" })
        router.refresh()
      } else {
        toast.error(res.error || "Gagal membuat broadcast")
      }
    } catch {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-primary/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="size-5 text-primary" />
                Penerima
              </CardTitle>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
                    <Contact2 className="size-3.5" />
                    Pilih Kontak
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Pilih dari Kontak</DialogTitle>
                    <DialogDescription>
                      Pilih kontak yang ingin Anda tambahkan ke daftar penerima.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau nomor..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border p-2">
                      <div className="space-y-1">
                        {filteredContacts.length === 0 ? (
                          <p className="text-center py-8 text-sm text-muted-foreground italic">
                            Kontak tidak ditemukan
                          </p>
                        ) : (
                          filteredContacts.map((contact) => (
                            <div
                              key={contact.$id}
                              className="flex items-center space-x-3 space-y-0 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={contact.$id}
                                checked={selectedContacts.includes(contact.$id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedContacts(prev => [...prev, contact.$id])
                                  } else {
                                    setSelectedContacts(prev => prev.filter(id => id !== contact.$id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={contact.$id}
                                className="flex-1 grid gap-0.5 cursor-pointer"
                              >
                                <span className="text-sm font-medium leading-none">
                                  {contact.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {contact.phone}
                                </span>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <DialogFooter>
                    <div className="flex items-center justify-between w-full">
                      <p className="text-xs text-muted-foreground">
                        {selectedContacts.length} terpilih
                      </p>
                      <DialogTrigger asChild>
                        <Button onClick={handleAddSelected} disabled={selectedContacts.length === 0}>
                          Tambahkan Ke Daftar
                        </Button>
                      </DialogTrigger>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Masukkan nomor WhatsApp (satu per baris atau pisahkan dengan koma).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipients">Daftar Nomor</Label>
              <Textarea
                id="recipients"
                placeholder="628123456789&#10;628987654321"
                className="min-h-[200px] font-mono text-sm resize-none focus-visible:ring-primary/20"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="size-3" />
                Pastikan nomor menyertakan kode negara (contoh: 62812...)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="size-5 text-primary" />
              Pesan & Perangkat
            </CardTitle>
            <CardDescription>
              Pilih pengirim dan tulis pesan yang ingin disebarkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Broadcast</Label>
              <Input
                id="name"
                placeholder="Contoh: Promo Lebaran 2024"
                className="h-11 focus-visible:ring-primary/20"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device">Pengirim (WhatsApp)</Label>
              <Select
                value={formData.deviceId}
                onValueChange={(val) => setFormData({ ...formData, deviceId: val })}
              >
                <SelectTrigger id="device" className="h-11">
                  <SelectValue placeholder="Pilih akun WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDevices.length > 0 ? (
                    connectedDevices.map((device) => (
                      <SelectItem key={device.$id} value={device.$id}>
                        {device.waName || device.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Tidak ada perangkat terhubung</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Isi Pesan</Label>
              <Textarea
                id="message"
                placeholder="Halo, ada penawaran menarik buat kamu..."
                className="min-h-[150px] resize-none focus-visible:ring-primary/20"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full text-md font-bold"
              disabled={loading || connectedDevices.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Kirim Broadcast Sekarang
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
