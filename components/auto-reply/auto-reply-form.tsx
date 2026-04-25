"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Pencil } from "lucide-react"
import { createAutoReply, updateAutoReply } from "@/app/actions/auto-reply"
import { toast } from "sonner"

interface Device {
  $id: string
  name: string
  waName?: string
}

interface AutoReplyFormProps {
  devices: Device[]
  mode?: "create" | "edit"
  initialData?: {
    $id: string
    keyword: string
    response: string
    type: string
    deviceId: string
  }
}

export function AutoReplyForm({ devices, mode = "create", initialData }: AutoReplyFormProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const isEdit = mode === "edit"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const keyword = formData.get("keyword") as string
    const response = formData.get("response") as string
    const type = formData.get("type") as "exact" | "contains"
    const deviceId = formData.get("deviceId") as string

    const res = isEdit && initialData
      ? await updateAutoReply(initialData.$id, { keyword, response, type, deviceId })
      : await createAutoReply({ keyword, response, type, deviceId })

    setLoading(false)
    if (res.success) {
      toast.success(isEdit ? "Auto Reply diperbarui" : "Auto Reply ditambahkan")
      setOpen(false)
    } else {
      toast.error(res.error || "Terjadi kesalahan")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            Tambah Auto Reply
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Auto Reply" : "Tambah Auto Reply Baru"}</DialogTitle>
            <DialogDescription>
              Atur balasan otomatis berdasarkan kata kunci yang diterima.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="deviceId">Pilih Perangkat</Label>
              <Select name="deviceId" defaultValue={initialData?.deviceId || (devices[0]?.$id)}>
                <SelectTrigger id="deviceId">
                  <SelectValue placeholder="Pilih perangkat WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.$id} value={device.$id}>
                      {device.waName || device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="keyword">Kata Kunci (Keyword)</Label>
              <Input id="keyword" name="keyword" defaultValue={initialData?.keyword} placeholder="Contoh: halo, info, price" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipe Pencocokan</Label>
              <Select name="type" defaultValue={initialData?.type || "exact"}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Persis Sama (Exact)</SelectItem>
                  <SelectItem value="contains">Mengandung Kata (Contains)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="response">Pesan Balasan</Label>
              <Textarea 
                id="response" 
                name="response" 
                defaultValue={initialData?.response} 
                placeholder="Tulis pesan balasan otomatis di sini..." 
                className="min-h-[100px]"
                required 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Simpan Perubahan" : "Simpan Aturan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
