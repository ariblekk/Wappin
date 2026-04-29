import * as React from "react"
import { getDevices } from "@/app/actions/devices"
import { getBroadcasts } from "@/app/actions/broadcast"
import { getContacts } from "@/app/actions/contacts"
import { getLoggedInUser } from "@/app/actions/auth"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
  Smartphone, 
  Send, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp
} from "lucide-react"

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [devicesRes, broadcastsRes, contactsRes, user] = await Promise.all([
    getDevices(),
    getBroadcasts(),
    getContacts(),
    getLoggedInUser()
  ])

  const userName = user?.name || "User"
  const devices = devicesRes.success ? devicesRes.devices : []
  const broadcasts = broadcastsRes.success ? broadcastsRes.broadcasts : []
  const contacts = contactsRes.success ? contactsRes.contacts : []

  const connectedDevices = devices.filter(d => d.status === 'connected').length
  const totalBroadcasts = broadcasts.length
  const totalSent = broadcasts.reduce((acc, b) => acc + (b.sent || 0), 0)
  const totalContacts = contacts.length

  const stats = [
    {
      title: "Perangkat Terhubung",
      value: `${connectedDevices}/${devices.length}`,
      icon: Smartphone,
      description: "WhatsApp yang aktif saat ini",
      color: "text-blue-600"
    },
    {
      title: "Total Broadcast",
      value: totalBroadcasts.toString(),
      icon: Send,
      description: "Kampanye yang telah dibuat",
      color: "text-purple-600"
    },
    {
      title: "Pesan Terkirim",
      value: totalSent.toLocaleString(),
      icon: CheckCircle2,
      description: "Total pesan berhasil dikirim",
      color: "text-green-600"
    },
    {
      title: "Total Kontak",
      value: totalContacts.toString(),
      icon: Users,
      description: "Kontak tersimpan di database",
      color: "text-orange-600"
    }
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Hi, {userName} 👋</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Aktivitas Broadcast Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {broadcasts.length > 0 ? (
                broadcasts.slice(0, 5).map((broadcast) => (
                  <div key={broadcast.$id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                    <div className={`p-2 rounded-full ${
                      broadcast.status === 'completed' ? 'bg-green-100 text-green-600' : 
                      broadcast.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {broadcast.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : 
                       broadcast.status === 'failed' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{broadcast.name || "Broadcast Tanpa Nama"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(broadcast.$createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{broadcast.sent}/{broadcast.total}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{broadcast.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Belum ada aktivitas broadcast
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Status Perangkat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {devices.length > 0 ? (
                devices.map((device) => (
                  <div key={device.$id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${device.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">{device.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      device.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Belum ada perangkat terdaftar
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

