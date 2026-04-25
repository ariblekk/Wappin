import { getAutoReplies } from "@/app/actions/auto-reply"
import { getDevices } from "@/app/actions/devices"
import { AutoReplyList } from "@/components/auto-reply/auto-reply-list"




export const dynamic = 'force-dynamic'

export default async function AutoReplyPage() {
  const { replies } = await getAutoReplies()
  const { devices } = await getDevices()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Atur balasan otomatis untuk merespon pesan WhatsApp pelanggan secara instan.</span>
          </div>
        </div>
      </div>



      <AutoReplyList 
        replies={replies as unknown as { $id: string; keyword: string; response: string; type: "exact" | "contains"; deviceId: string; $createdAt: string }[]} 
        devices={devices as unknown as { $id: string; name: string; waName?: string }[]} 
      />
    </div>
  )
}
