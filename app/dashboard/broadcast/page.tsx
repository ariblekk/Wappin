import { getDevices } from "@/app/actions/devices"
import { getBroadcasts } from "@/app/actions/broadcast"
import { getContacts } from "@/app/actions/contacts"
import { BroadcastForm } from "@/components/broadcast/broadcast-form"
import { BroadcastHistory, Broadcast as BroadcastType, Device as DeviceType } from "@/components/broadcast/broadcast-history"
import { Models } from "node-appwrite"

interface Device extends Models.Document {
  name: string;
  status: string;
  waName?: string;
}

interface Broadcast extends Models.Document {
  name?: string;
  message: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  deviceId: string;
  recipients?: string;
  timestamp?: number;
}

interface Contact extends Models.Document {
  name: string;
  phone: string;
  tags?: string;
}

export const dynamic = 'force-dynamic';

export default async function BroadcastPage() {
  const { devices } = await getDevices() as unknown as { devices: Device[] }
  const { broadcasts } = await getBroadcasts() as unknown as { broadcasts: Broadcast[] }
  const { contacts } = await getContacts() as unknown as { contacts: Contact[] }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 pt-6">

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

      <section className="space-y-4">
        <BroadcastHistory
          broadcasts={broadcasts as unknown as BroadcastType[]}
          devices={devices as unknown as DeviceType[]}
        />
      </section>
    </div>
  )
}
