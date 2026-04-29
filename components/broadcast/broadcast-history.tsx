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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDistanceToNow, format } from "date-fns"
import { id as localeID } from "date-fns/locale"
import {
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  History,
  Eye,
  Smartphone,
  Info,
  Calendar,
  MessageSquare,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { client } from "@/lib/appwrite-client"
import { getAppwriteJWT } from "@/app/actions/auth"
import { getBroadcasts } from "@/app/actions/broadcast"
import { RefreshCw } from "lucide-react"

export interface Broadcast {
  $id: string
  name?: string
  message: string
  status: string
  total: number
  sent: number
  failed: number
  deviceId: string
  recipients?: string
  timestamp?: number
  $createdAt: string
}

export interface Device {
  $id: string
  name: string
  waName?: string
}

export interface BroadcastHistoryProps {
  broadcasts: Broadcast[]
  devices: Device[]
}

export function BroadcastHistory({ broadcasts: initialBroadcasts, devices }: BroadcastHistoryProps) {
  const [broadcasts, setBroadcasts] = React.useState(initialBroadcasts)
  const [selectedBroadcast, setSelectedBroadcast] = React.useState<Broadcast | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const unsubscribeRef = React.useRef<(() => void) | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await getBroadcasts()
      if (res.success) {
        setBroadcasts(res.broadcasts as unknown as Broadcast[])
      }
    } catch (error) {
      console.error("Failed to refresh broadcasts:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  React.useEffect(() => {
    async function initRealtime() {
      // Set JWT agar realtime subscription bisa autentikasi
      const res = await getAppwriteJWT()
      if (res.success && res.jwt) {
        client.setJWT(res.jwt)
      }

      // Bersihkan subscription lama jika ada
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }

      unsubscribeRef.current = client.subscribe(
        `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID}.documents`,
        (response) => {
          const payload = response.payload as Broadcast

          if (response.events.some(e => e.includes("create"))) {
            setBroadcasts(prev => {
              if (prev.some(b => b.$id === payload.$id)) return prev
              const filtered = prev.filter(b => !(b.$id.startsWith('temp-') && b.name === payload.name && b.message === payload.message))
              return [payload, ...filtered]
            })
          } else if (response.events.some(e => e.includes("update"))) {
            setBroadcasts(prev => prev.map(b => b.$id === payload.$id ? payload : b))
            // Update selected broadcast if open
            setSelectedBroadcast(prev => prev?.$id === payload.$id ? payload : prev)
          } else if (response.events.some(e => e.includes("delete"))) {
            setBroadcasts(prev => prev.filter(b => b.$id !== payload.$id))
          }
        }
      )
    }

    initRealtime()

    // Refresh JWT dan re-subscribe setiap 14 menit (JWT Appwrite expire 15 menit)
    const jwtInterval = setInterval(initRealtime, 14 * 60 * 1000)

    // Listener optimistic UI dari BroadcastForm
    const handleOptimistic = (e: Event) => {
      const customEvent = e as CustomEvent<Broadcast>
      setBroadcasts(prev => [customEvent.detail, ...prev])
    }
    window.addEventListener('optimistic-broadcast', handleOptimistic)

    return () => {
      clearInterval(jwtInterval)
      if (unsubscribeRef.current) unsubscribeRef.current()
      window.removeEventListener('optimistic-broadcast', handleOptimistic)
    }
  }, [])

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.$id === deviceId)
    return device ? (device.waName || device.name) : "Device Terhapus"
  }

  const parseRecipients = (recipientsJson?: string): { phone: string, status?: string }[] => {
    if (!recipientsJson) return []
    try {
      const parsed = JSON.parse(recipientsJson)
      if (Array.isArray(parsed)) {
        return parsed.map(item => typeof item === 'string' ? { phone: item } : item)
      }
      return []
    } catch {
      return []
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-5 text-primary animate-in fade-in zoom-in duration-500" />
            Riwayat Broadcast
            <Badge variant="outline" className="font-mono bg-background/50 backdrop-blur-sm border-primary/10">
              {broadcasts.length} total
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-2 bg-background/50 backdrop-blur-sm"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="font-bold">Informasi</TableHead>
                <TableHead className="font-bold">Perangkat</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Progres</TableHead>
                <TableHead className="font-bold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    Belum ada riwayat broadcast.
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((item) => (
                  <TableRow key={item.$id} className="group hover:bg-muted/5 transition-all duration-300 border-primary/5">
                    <TableCell className="max-w-[220px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm truncate">{item.name || "Broadcast Tanpa Nama"}</span>
                        <p className="text-xs text-muted-foreground truncate italic">&quot;{item.message}&quot;</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 bg-muted/30 w-fit px-1.5 py-0.5 rounded">
                          <Clock className="size-3" />
                          {formatDistanceToNow(new Date(item.$createdAt), { addSuffix: true, locale: localeID })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                          <Smartphone className="size-3.5" />
                        </div>
                        <span className="text-xs font-medium">{getDeviceName(item.deviceId)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`
                        ${item.status === 'completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          item.status === 'processing' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse' :
                            item.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-red-500/10 text-red-600 border-red-500/20'} 
                        px-2 py-0.5 h-6 flex w-fit items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider
                      `} variant="outline">
                        {item.status === 'completed' ? <CheckCircle2 className="size-3" /> :
                          item.status === 'processing' ? <PlayCircle className="size-3" /> :
                            item.status === 'pending' ? <Clock className="size-3" /> :
                              <XCircle className="size-3" />}
                        {item.status === 'pending' ? 'Scheduled' : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-green-600">{item.sent}</span>
                            <span className="text-muted-foreground opacity-70">sukses</span>
                            {item.failed > 0 && (
                              <>
                                <span className="mx-1 text-muted-foreground">/</span>
                                <span className="font-bold text-red-500">{item.failed}</span>
                                <span className="text-muted-foreground opacity-70">gagal</span>
                              </>
                            )}
                          </div>
                          <span className="text-muted-foreground font-medium">{Math.round((item.sent / (item.total || 1)) * 100)}%</span>
                        </div>
                        <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden flex border border-background">
                          {item.total > 0 ? (
                            <>
                              <div
                                className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] transition-all duration-700 ease-out"
                                style={{ width: `${(item.sent / item.total) * 100}%` }}
                              />
                              <div
                                className="h-full bg-red-400 transition-all duration-700 ease-out"
                                style={{ width: `${(item.failed / item.total) * 100}%` }}
                              />
                            </>
                          ) : (
                            <div className="h-full w-full bg-muted/50 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 font-medium">dari {item.total} nomor</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all group-hover:scale-105"
                        onClick={() => setSelectedBroadcast(item)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedBroadcast} onOpenChange={(open) => !open && setSelectedBroadcast(null)}>
        <DialogContent className="sm:max-w-[550px] border-primary/10 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-4 border-b border-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Info className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Detail Broadcast</DialogTitle>
                <DialogDescription className="text-xs">
                  ID: <span className="font-mono text-primary/80 uppercase">{selectedBroadcast?.$id}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedBroadcast && (
            <div className="space-y-6 pt-4">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-xl border border-primary/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Calendar className="size-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Waktu</span>
                  </div>
                  <p className="text-sm font-bold">
                    {format(new Date(selectedBroadcast.$createdAt), "PPP", { locale: localeID })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(selectedBroadcast.$createdAt), "HH:mm:ss")}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded-xl border border-primary/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Smartphone className="size-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Perangkat</span>
                  </div>
                  <p className="text-sm font-bold">{getDeviceName(selectedBroadcast.deviceId)}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {selectedBroadcast.deviceId?.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Isi Pesan</span>
                </div>
                <div className="bg-muted/20 p-4 rounded-xl border border-primary/5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap italic text-foreground/90">
                    &quot;{selectedBroadcast.message}&quot;
                  </p>
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Penerima ({selectedBroadcast.total})</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">
                    {selectedBroadcast.sent} Terkirim · {selectedBroadcast.failed} Gagal
                  </Badge>
                </div>
                <ScrollArea className="h-[120px] rounded-xl border border-primary/5 bg-muted/10 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {parseRecipients(selectedBroadcast.recipients).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-background/50 p-1.5 rounded-lg border border-primary/5">
                        <div className={`size-1.5 rounded-full ${
                          item.status === 'sent' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                          item.status === 'failed' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                          'bg-primary/40'
                        }`} />
                        <span className="text-xs font-mono">{item.phone}</span>
                        {item.status === 'failed' && <span className="text-[8px] text-red-500 font-bold ml-auto">GAGAL</span>}
                        {item.status === 'sent' && <span className="text-[8px] text-green-500 font-bold ml-auto">OK</span>}
                      </div>
                    ))}
                    {parseRecipients(selectedBroadcast.recipients).length === 0 && (
                      <p className="col-span-2 text-center py-4 text-xs text-muted-foreground italic">
                        Data penerima tidak tersedia
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

