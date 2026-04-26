"use client"

import * as React from "react"
import { getProfile, regenerateApiKey } from "@/app/actions/profiles"
import { getLoggedInUser } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Key, Copy, RefreshCw, Shield, User, Zap, Mail } from "lucide-react"

interface ProfileData {
  $id: string;
  user_code: string;
  plan: string;
  apikey: string;
}

interface UserData {
  $id: string;
  name: string;
  email: string;
}

export default function AccountPage() {
  const [profile, setProfile] = React.useState<ProfileData | null>(null)
  const [user, setUser] = React.useState<UserData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [regenLoading, setRegenLoading] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, userRes] = await Promise.all([
          getProfile(),
          getLoggedInUser()
        ])

        if (profileRes.success && profileRes.profile) {
          setProfile(profileRes.profile as unknown as ProfileData)
        }
        if (userRes) {
          setUser(userRes as unknown as UserData)
        }
      } catch {
        toast.error("Gagal memuat data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleRegenerate() {
    if (!confirm("Apakah Anda yakin ingin membuat ulang API Key? API Key lama tidak akan bisa digunakan lagi.")) {
      return
    }
    setRegenLoading(true)
    const res = await regenerateApiKey()
    if (res.success && res.apiKey) {
      setProfile((prev) => prev ? { ...prev, apikey: res.apiKey! } : null)
      toast.success("API Key berhasil diperbarui!")
    } else {
      toast.error("Gagal memperbarui API Key")
    }
    setRegenLoading(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Disalin ke clipboard!")
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Akun & Pengaturan</h1>
        <p className="text-muted-foreground">Kelola informasi profil, paket layanan, dan akses API Anda.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="size-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="api-key" className="flex items-center gap-2">
            <Key className="size-4" />
            API Key
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 border-primary/5 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="size-5 text-primary" />
                  Informasi Akun
                </CardTitle>
                <CardDescription>Detail profil pengguna Anda.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Nama</span>
                  <p className="text-md font-bold">{user?.name || "User"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3" /> Email
                  </span>
                  <p className="text-md font-medium text-muted-foreground">{user?.email || "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/5 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="size-5 text-primary" />
                  Paket Layanan (Plan)
                </CardTitle>
                <CardDescription>Status langganan akun Anda saat ini.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold text-primary uppercase">
                      {profile?.plan || "Free"}
                    </span>
                    <p className="text-xs text-muted-foreground">Hubungi admin untuk melakukan upgrade paket.</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Shield className="size-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-primary/5 shadow-sm">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="size-5 text-primary" />
                Kode Pengguna (User Code)
              </CardTitle>
              <CardDescription>ID unik pengenal akun Anda di sistem.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={profile?.user_code || ""}
                  className="font-mono bg-muted/50 text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(profile?.user_code || "")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-key" className="space-y-6">
          <Card className="border-2 border-primary/5 shadow-sm">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="size-5 text-primary" />
                Akses API Key
              </CardTitle>
              <CardDescription>
                Gunakan key ini untuk mengintegrasikan sistem pengiriman WhatsApp ke aplikasi eksternal Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="password"
                  readOnly
                  value={profile?.apikey || ""}
                  className="font-mono bg-muted/50 flex-1 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(profile?.apikey || "")}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <Copy className="size-4" />
                    Salin
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleRegenerate}
                    disabled={regenLoading}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <RefreshCw className={`size-4 ${regenLoading ? "animate-spin" : ""}`} />
                    Buat Ulang
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-3 font-medium">
                PENTING: Jangan berikan API Key ini kepada siapa pun! Jika bocor, segera lakukan &quot;Buat Ulang&quot;.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
