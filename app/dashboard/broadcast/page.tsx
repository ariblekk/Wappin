import { getDevices } from "@/app/actions/devices"
import { getBroadcasts } from "@/app/actions/broadcast"
import { getContacts } from "@/app/actions/contacts"
import { BroadcastForm } from "@/components/broadcast/broadcast-form"
import { BroadcastHistory } from "@/components/broadcast/broadcast-history"
import { Separator } from "@/components/ui/separator"


export default async function BroadcastPage() {
  const { devices } = await getDevices()
  const { broadcasts } = await getBroadcasts()
  const { contacts } = await getContacts()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">

      <div className="grid gap-6">
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Kirim pesan ke kontak atau grup secara massal dengan cepat dan aman.</span>
            </div>
          </div>
          <BroadcastForm
            devices={devices as unknown as { $id: string; name: string; status: string; waName?: string }[]}
            contacts={contacts as unknown as { $id: string; name: string; phone: string; tags?: string }[]}
          />
        </section>

        <Separator className="opacity-50" />

        <section className="space-y-4">
          <h3 className="text-xl font-bold">Aktivitas Terakhir</h3>
          <BroadcastHistory broadcasts={broadcasts as unknown as { $id: string; name?: string; message: string; status: string; total: number; sent: number; failed: number; $createdAt: string }[]} />
        </section>
      </div>
    </div>
  )
}
