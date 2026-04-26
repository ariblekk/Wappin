import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Smartphone } from "lucide-react"
import Link from "next/link"
import { getDevices } from "@/app/actions/devices"
import { AddDeviceButton } from "@/components/devices/add-device-button"
import { DeleteDeviceButton } from "@/components/devices/delete-device-button"
import { DeviceActionButton } from "@/components/devices/device-action-button"
import { Models } from "node-appwrite"

interface Device extends Models.Document {
  name: string
  status: string
  qr?: string
  phone?: string
  waName?: string
  waImage?: string
  userId: string
}

export default async function DevicesPage() {
  const { devices } = (await getDevices()) as unknown as { devices: Device[] };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Hubungkan dan kelola akun WhatsApp Anda untuk otomatisasi pesan.</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground/80 font-medium">{devices.length} akun terdaftar</span>
              <Badge variant="secondary" className="font-medium text-[10px] px-1.5 h-5 bg-primary/5 text-primary border-primary/10">
                {devices.length} / 5 perangkat
              </Badge>
            </div>
          </div>
        </div>
      </div>


      {devices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-muted/20">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Smartphone className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Belum ada akun WhatsApp</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-2 mb-6">
            Hubungkan akun WhatsApp kamu untuk mulai mengirim pesan dan broadcast secara otomatis.
          </p>
          <AddDeviceButton className="shadow-lg" />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device: Device) => (
            <Card key={device.$id} className="overflow-hidden border-2 border-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={device.waImage || `https://api.dicebear.com/7.x/initials/svg?seed=${device.name}`} />
                      <AvatarFallback>{device.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{device.name}</h3>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase">{device.status}</Badge>
                          {device.phone && <Badge variant="outline" className="text-[10px] h-4 px-1">{device.phone}</Badge>}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{device.$id}</p>
                    </div>
                  </div>
                  <Badge className={`
                    ${device.status === 'connected' ? 'bg-green-50 text-green-600 border-green-200' :
                      device.status === 'connecting' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        'bg-red-50 text-red-600 border-red-200'} 
                    px-2 py-0 h-6 flex items-center gap-1.5 font-medium shrink-0
                  `}>
                    <span className={`size-1.5 rounded-full ${device.status === 'connected' ? 'bg-green-600 animate-pulse' : device.status === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'}`} />
                    {device.status === 'connected' ? 'Terhubung' : device.status === 'connecting' ? 'Menunggu Scan' : 'Terputus'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-6 py-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nama WA</p>
                  <p className="text-sm font-semibold">{device.waName || "-"}</p>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-4 flex gap-2">
                <DeviceActionButton
                  deviceId={device.$id}
                  deviceName={device.name}
                  status={device.status}
                />
                <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5" asChild>
                  <Link href={`/dashboard/devices/${device.$id}`}>Detail</Link>
                </Button>
                <DeleteDeviceButton deviceId={device.$id} deviceName={device.name} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
