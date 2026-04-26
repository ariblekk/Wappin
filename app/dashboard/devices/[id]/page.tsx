import { notFound } from "next/navigation"
import { getDevice, getDeviceMessages } from "@/app/actions/devices"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Info,
  MessageSquare,
  Copy,
  Smartphone,
  Phone,
  User,
  Zap,
} from "lucide-react"
import { DeviceActionButton } from "@/components/devices/device-action-button"
import { MessageLogTable, type MessageDocument } from "@/components/devices/message-log-table"

interface Device {
  $id: string
  name: string
  status: string
  phone?: string
  waName?: string
  waImage?: string
  userId: string
  $createdAt: string
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const [res, msgRes] = await Promise.all([
    getDevice(id),
    getDeviceMessages(id)
  ])

  if (!res.success || !res.device) {
    notFound()
  }

  const device = res.device as unknown as Device
  const messages = msgRes.success ? msgRes.messages : []

  const statusConfig = {
    connected: { label: "Terhubung", className: "bg-green-50 text-green-700 border-green-200" },
    connecting: { label: "Menunggu Scan", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    disconnected: { label: "Terputus", className: "bg-red-50 text-red-700 border-red-200" },
  }
  const statusInfo = statusConfig[device.status as keyof typeof statusConfig] ?? statusConfig.disconnected

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-8 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarImage src={device.waImage || `https://api.dicebear.com/7.x/initials/svg?seed=${device.name}`} />
            <AvatarFallback className="text-lg rounded-xl">{device.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold leading-tight">{device.waName || device.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`${statusInfo.className} border text-xs font-medium px-2 py-0 h-5 flex items-center gap-1`}>
                <span className={`size-1.5 rounded-full ${device.status === "connected" ? "bg-green-600 animate-pulse" : device.status === "connecting" ? "bg-yellow-500" : "bg-red-500"}`} />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs h-5 px-2">{device.phone}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex-1 px-8 py-6">
        <Tabs defaultValue="info">
          <TabsList className="mb-6 h-9">
            <TabsTrigger value="info" className="gap-2 text-xs">
              <Info className="size-3.5" />
              Info
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 text-xs">
              <MessageSquare className="size-3.5" />
              Message Log
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Info ──────────────────────────────────── */}
          <TabsContent value="info" className="mt-0">

            <Card className=" mx-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  Informasi Device
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Device ID */}
                  <InfoRow
                    label="Device ID"
                    value={
                      <span className="flex items-center gap-1.5 font-mono text-sm">
                        {device.$id}
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
                          <Copy className="size-3" />
                        </Button>
                      </span>
                    }
                  />
                  <InfoRow
                    label="Nama Device (Label User)"
                    value={device.name}
                    icon={<User className="size-3.5" />}
                  />
                  <InfoRow
                    label="Nama Profil WhatsApp"
                    value={device.waName || "—"}
                    icon={<User className="size-3.5" />}
                  />
                  <InfoRow
                    label="Nomor WhatsApp"
                    value={device.phone ? `+${device.phone}` : "—"}
                    icon={<Phone className="size-3.5" />}
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <Badge className={`${statusInfo.className} border text-xs font-medium`}>
                        <span className={`size-1.5 rounded-full mr-1 ${device.status === "connected" ? "bg-green-600 animate-pulse" : device.status === "connecting" ? "bg-yellow-500" : "bg-red-500"}`} />
                        {statusInfo.label}
                      </Badge>
                    }
                  />
                  <InfoRow
                    label="Kuota"
                    value={
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                        <Zap className="size-3.5" />
                        Unlimited
                      </span>
                    }
                  />
                  <InfoRow label="Expired" value="—" />
                  <InfoRow label="Tipe" value="—" />
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <DeviceActionButton
                    deviceId={device.$id}
                    deviceName={device.name}
                    status={device.status}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Message Log ───────────────────────────── */}
          <TabsContent value="messages" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  Message Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MessageLogTable initialMessages={messages as unknown as MessageDocument[]} deviceId={device.$id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ── Helper component ─────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="py-4 pr-6 border-b last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0">
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}
