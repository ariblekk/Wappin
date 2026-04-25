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
import { Plus, Loader2, Pencil } from "lucide-react"
import { createContact, updateContact } from "@/app/actions/contacts"
import { toast } from "sonner"

interface ContactFormProps {
  mode?: "create" | "edit"
  initialData?: {
    $id: string
    name: string
    phone: string
    tags?: string
  }
}

export function ContactForm({ mode = "create", initialData }: ContactFormProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const isEdit = mode === "edit"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string
    const tags = formData.get("tags") as string

    const res = isEdit && initialData
      ? await updateContact(initialData.$id, { name, phone, tags })
      : await createContact({ name, phone, tags })

    setLoading(false)
    if (res.success) {
      toast.success(isEdit ? "Kontak diperbarui" : "Kontak ditambahkan")
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
            Tambah Kontak
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Kontak" : "Tambah Kontak Baru"}</DialogTitle>
            <DialogDescription>
              {isEdit 
                ? "Perbarui informasi kontak WhatsApp terpilih." 
                : "Masukkan informasi kontak WhatsApp untuk mempermudah pengiriman pesan."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" name="name" defaultValue={initialData?.name} placeholder="Budi Santoso" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Nomor WhatsApp</Label>
              <Input id="phone" name="phone" defaultValue={initialData?.phone} placeholder="6281234567890" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Label / Grup (Opsional)</Label>
              <Input id="tags" name="tags" defaultValue={initialData?.tags} placeholder="Customer, VIP, dll" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Simpan Perubahan" : "Simpan Kontak"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
