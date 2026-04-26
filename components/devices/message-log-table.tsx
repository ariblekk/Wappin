"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"
import { client } from "@/lib/appwrite-client"

export interface MessageDocument {
  $id: string
  to: string
  body: string
  status: string
  deviceId: string
  sentAt?: string
}

interface MessageLogTableProps {
  initialMessages: MessageDocument[]
  deviceId: string
}

export function MessageLogTable({ initialMessages, deviceId }: MessageLogTableProps) {
  const [messages, setMessages] = React.useState<MessageDocument[]>(initialMessages)

  React.useEffect(() => {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!

    // Subscribe ke perubahan koleksi messages
    const unsubscribe = client.subscribe(
      `databases.${databaseId}.collections.${collectionId}.documents`,
      (response) => {
        const payload = response.payload as MessageDocument

        // Pastikan pesan ini milik device yang sedang dibuka
        // Karena subscription tingkat koleksi akan menerima semua dokumen baru
        if (payload.deviceId !== deviceId) return

        const isCreate = response.events.some((e) => e.includes(".create"))
        const isUpdate = response.events.some((e) => e.includes(".update"))

        if (isCreate) {
          setMessages((prev) => {
            // Hindari duplikasi jika dokumen sudah ada
            if (prev.some((m) => m.$id === payload.$id)) return prev
            // Hapus pesan optimistic yang sesuai (pending, body sama, tujuan sama)
            const filtered = prev.filter(m => !(m.$id.startsWith('temp-') && m.body === payload.body && m.to === payload.to))
            return [payload, ...filtered]
          })
        } else if (isUpdate) {
          setMessages((prev) =>
            prev.map((m) => (m.$id === payload.$id ? payload : m))
          )
        }
      }
    )

    // Listener untuk optimistic message dari UI
    const handleOptimistic = (e: Event) => {
      const customEvent = e as CustomEvent<MessageDocument>
      const payload = customEvent.detail
      if (payload.deviceId !== deviceId) return
      
      setMessages((prev) => [payload, ...prev])
    }
    
    window.addEventListener('optimistic-message', handleOptimistic)

    return () => {
      unsubscribe()
      window.removeEventListener('optimistic-message', handleOptimistic)
    }
  }, [deviceId])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="size-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Belum ada pesan</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Belum ada pesan yang dikirim melalui perangkat ini.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b text-xs font-bold text-muted-foreground bg-muted/30 uppercase tracking-wider">
            <th className="py-3 px-4">Tujuan</th>
            <th className="py-3 px-4">Pesan</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Waktu</th>
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {messages.map((msg) => (
            <tr key={msg.$id} className="hover:bg-muted/10 transition-colors">
              <td className="py-3 px-4 font-mono font-semibold text-foreground/80">+{msg.to}</td>
              <td className="py-3 px-4 max-w-[200px] sm:max-w-xs truncate text-muted-foreground" title={msg.body}>
                {msg.body}
              </td>
              <td className="py-3 px-4">
                <Badge
                  className={`text-[10px] font-bold px-2 py-0 h-5 flex items-center w-fit gap-1 ${msg.status === "sent"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : msg.status === "failed"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}
                >
                  <span
                    className={`size-1 rounded-full ${msg.status === "sent"
                        ? "bg-green-600"
                        : msg.status === "failed"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                  />
                  {msg.status === "sent" ? "Terkirim" : msg.status === "failed" ? "Gagal" : "Pending"}
                </Badge>
              </td>
              <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                {msg.sentAt
                  ? new Date(msg.sentAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
