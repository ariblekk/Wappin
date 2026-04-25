"use client"

import * as React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { id as localeID } from "date-fns/locale"
import { Clock, CheckCircle2, XCircle, PlayCircle, History } from "lucide-react"
import { client } from "@/lib/appwrite-client"

interface Broadcast {
  $id: string
  name?: string
  message: string
  status: string
  total: number
  sent: number
  failed: number
  $createdAt: string
}

interface BroadcastHistoryProps {
  broadcasts: Broadcast[]
}

export function BroadcastHistory({ broadcasts: initialBroadcasts }: BroadcastHistoryProps) {
  const [broadcasts, setBroadcasts] = React.useState(initialBroadcasts)


  React.useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID}.documents`,
      (response) => {
        const payload = response.payload as Broadcast
        
        if (response.events.some(e => e.includes("create"))) {
          setBroadcasts(prev => [payload, ...prev])
        } else if (response.events.some(e => e.includes("update"))) {
          setBroadcasts(prev => prev.map(b => b.$id === payload.$id ? payload : b))
        } else if (response.events.some(e => e.includes("delete"))) {
          setBroadcasts(prev => prev.filter(b => b.$id !== payload.$id))
        }
      }
    )

    return () => unsubscribe()
  }, [])

  return (
    <Card className="border-2 border-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5 text-primary" />
            Riwayat Broadcast
          </CardTitle>
          <Badge variant="outline" className="font-mono">{broadcasts.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead className="w-[200px]">Nama Broadcast</TableHead>
              <TableHead className="w-[250px]">Pesan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {broadcasts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Belum ada riwayat broadcast.
                </TableCell>
              </TableRow>
            ) : (
              broadcasts.map((item) => (
                <TableRow key={item.$id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-bold">
                    {item.name || "Broadcast"}
                  </TableCell>
                  <TableCell className="font-medium max-w-[250px]">
                    <p className="truncate text-xs text-muted-foreground">{item.message}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">{item.$id}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`
                      ${item.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                        item.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' :
                        'bg-red-50 text-red-600 border-red-200'} 
                      px-2 py-0 h-6 flex w-fit items-center gap-1.5 font-medium
                    `}>
                      {item.status === 'completed' ? <CheckCircle2 className="size-3" /> : 
                       item.status === 'processing' ? <PlayCircle className="size-3" /> : 
                       <XCircle className="size-3" />}
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold">{item.sent}</span>
                        <span className="text-muted-foreground text-[10px]">berhasil</span>
                      </div>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${(item.sent / item.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">dari {item.total} total</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(item.$createdAt), { addSuffix: true, locale: localeID })}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
