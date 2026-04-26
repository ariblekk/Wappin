"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookOpen, Key, Smartphone, Send, Users, Code, Copy, Check, Zap, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';

// ─── Reusable Components ─────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-sky-500/10 text-sky-500 border-sky-500/20',
  POST:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  PUT:    'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`px-2.5 py-1 text-xs font-bold font-mono border ${METHOD_COLORS[method] ?? 'bg-muted text-muted-foreground'}`}>
      {method}
    </span>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-3 bg-muted/50 border p-3 font-mono text-sm">
      <MethodBadge method={method} />
      <code className="text-foreground/80">{path}</code>
    </div>
  );
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_2fr] gap-4 py-2.5 border-b last:border-0 text-sm items-start">
      <div className="flex items-center gap-2 font-mono font-bold">
        {name}
        {required && <span className="text-[10px] text-red-500">*</span>}
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 font-mono">{type}</span>
      <span className="text-muted-foreground text-xs leading-relaxed">{desc}</span>
    </div>
  );
}

function CodeBlock({ id, lang = 'json', children }: { id: string; lang?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const el = document.getElementById(`code-${id}`);
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Split children string into lines for line numbers
  const raw = typeof children === 'string' ? children : '';
  const lines = raw.split('\n');

  return (
    <div className="overflow-hidden border border-border bg-card text-sm font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground font-medium">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied
            ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied</span></>
            : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
          }
        </button>
      </div>
      {/* Code area with line numbers */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" id={`code-${id}`}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group leading-6">
                <td className="select-none pl-4 pr-3 py-0 text-right text-xs text-muted-foreground/40 w-8 min-w-[2.5rem]">
                  {i + 1}
                </td>
                <td className="py-0 pr-4 whitespace-pre text-foreground/85 text-xs">
                  {line || '\u00A0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Section({ id, icon: Icon, title, method, children }: {
  id: string; icon: React.ElementType; title: string; method?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-card border overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {method && <MethodBadge method={method} />}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </section>
  );
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '#auth',            icon: Key,          label: 'Autentikasi' },
  { href: '#get-devices',     icon: Smartphone,   label: 'GET Devices' },
  { href: '#post-send',       icon: Send,         label: 'POST Send Message' },
  { href: '#post-broadcast',  icon: Users,        label: 'POST Broadcast' },
  { href: '#get-broadcasts',  icon: RefreshCw,    label: 'GET Broadcasts' },
  { href: '#post-autoreply',  icon: MessageSquare,label: 'POST Auto-Reply' },
  { href: '#delete-autoreply',icon: Trash2,       label: 'DELETE Auto-Reply' },
  { href: '#code-sample',     icon: Code,         label: 'Contoh Kode JS' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <main className="flex-1 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Hero */}
          <div className="text-center mb-16 space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              <BookOpen className="w-4 h-4" /> API Reference v1.0
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Dokumentasi <span className="text-primary">Wappin API</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Integrasikan aplikasi Anda dengan Wappin untuk mengirim pesan WhatsApp secara otomatis, mengatur balasan, dan memantau broadcast secara realtime.
            </p>
            <div className="flex justify-center gap-3 flex-wrap text-xs font-bold">
              <span className="px-3 py-1 bg-green-500/10 text-green-600 border border-green-500/20">✓ REST API</span>
              <span className="px-3 py-1 bg-sky-500/10 text-sky-600 border border-sky-500/20">✓ JSON Response</span>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20">✓ API Key Auth</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Sticky Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 bg-card border p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-3">Navigasi</p>
                <nav className="space-y-0.5">
                  {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
                    <a key={href} href={href}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors group">
                      <Icon className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                      <span className="font-medium">{label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3 space-y-8">

              {/* ── AUTHENTICATION ── */}
              <Section id="auth" icon={Key} title="Autentikasi">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Semua endpoint memerlukan <strong>API Key</strong> yang dikirimkan melalui HTTP header.
                  Generate API Key Anda di <Link href="/dashboard/account" className="text-primary underline underline-offset-2">Dashboard → Akun & API</Link>.
                </p>
                <div className="bg-slate-900 text-white p-4 border">
                  <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Base URL</p>
                  <code className="text-primary font-mono">https://yourdomain.com/api/v1</code>
                </div>
                <div className="bg-muted p-4 border space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Headers</p>
                  {[
                    { key: 'x-api-key',    val: 'YOUR_API_KEY' },
                    { key: 'Content-Type', val: 'application/json' },
                  ].map(({ key, val }) => (
                    <div key={key} className="flex justify-between items-center text-sm font-mono">
                      <code className="text-primary font-bold">{key}</code>
                      <code className="text-muted-foreground bg-background px-2 py-0.5 border">{val}</code>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 flex gap-3">
                  <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Jangan pernah menyimpan API Key di sisi klien. Selalu gunakan environment variable atau server-side proxy.
                  </p>
                </div>
              </Section>

              {/* ── GET DEVICES ── */}
              <Section id="get-devices" icon={Smartphone} title="Get Devices" method="GET">
                <p className="text-muted-foreground text-sm">Mengambil daftar seluruh perangkat WhatsApp yang terdaftar beserta status koneksinya.</p>
                <Endpoint method="GET" path="/devices" />
                <CodeBlock id="res-devices">
{`{
  "success": true,
  "devices": [
    {
      "$id": "69ed6856001fe0c999bf",
      "name": "Admin CS",
      "waName": "Budi Santoso",
      "status": "connected",
      "$createdAt": "2026-04-26T02:31:36.000Z"
    }
  ]
}`}
                </CodeBlock>
              </Section>

              {/* ── POST SEND MESSAGE ── */}
              <Section id="post-send" icon={Send} title="Send Message" method="POST">
                <p className="text-muted-foreground text-sm">Mengirim pesan teks ke satu nomor tujuan menggunakan perangkat yang terdaftar.</p>
                <Endpoint method="POST" path="/send" />
                <div className="bg-muted p-4 border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Request Body</p>
                  <ParamRow name="deviceId" type="string"  required desc="ID perangkat WhatsApp pengirim" />
                  <ParamRow name="phone"    type="string"  required desc="Nomor tujuan (format internasional, misal: 6281234567890)" />
                  <ParamRow name="message"  type="string"  required desc="Isi pesan teks" />
                </div>
                <CodeBlock id="res-send">
{`{ "success": true, "message": "Pesan berhasil dikirim" }`}
                </CodeBlock>
              </Section>

              {/* ── POST BROADCAST ── */}
              <Section id="post-broadcast" icon={Users} title="Send Broadcast" method="POST">
                <p className="text-muted-foreground text-sm">Mengirim pesan massal ke banyak nomor. Sistem menambahkan jeda otomatis antar pesan untuk menghindari pemblokiran.</p>
                <Endpoint method="POST" path="/broadcast" />
                <div className="bg-muted p-4 border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Request Body</p>
                  <ParamRow name="deviceId"     type="string"   required desc="ID perangkat pengirim" />
                  <ParamRow name="name"         type="string"   required desc="Nama label kampanye" />
                  <ParamRow name="message"      type="string"   required desc="Isi pesan untuk semua penerima" />
                  <ParamRow name="recipients"   type="string[]" required desc="Array nomor telepon penerima" />
                  <ParamRow name="scheduleTime" type="string"            desc="(Opsional) Jadwal pengiriman ISO 8601" />
                </div>
                <CodeBlock id="res-broadcast">
{`{
  "success": true,
  "broadcastId": "69edbba300065efd4756"
}`}
                </CodeBlock>
              </Section>

              {/* ── GET BROADCASTS ── */}
              <Section id="get-broadcasts" icon={RefreshCw} title="Get Broadcast History" method="GET">
                <p className="text-muted-foreground text-sm">Mengambil riwayat broadcast beserta progres pengiriman realtime.</p>
                <Endpoint method="GET" path="/broadcasts" />
                <CodeBlock id="res-broadcasts">
{`{
  "success": true,
  "broadcasts": [
    {
      "$id": "69edbba300065efd4756",
      "name": "Promo Lebaran",
      "status": "completed",
      "total": 150,
      "sent": 148,
      "failed": 2
    }
  ]
}`}
                </CodeBlock>
              </Section>

              {/* ── POST AUTO-REPLY ── */}
              <Section id="post-autoreply" icon={MessageSquare} title="Create Auto-Reply" method="POST">
                <p className="text-muted-foreground text-sm">Membuat aturan balasan otomatis berdasarkan kata kunci. Sistem merespon pesan masuk yang cocok secara instan.</p>
                <Endpoint method="POST" path="/auto-reply" />
                <div className="bg-muted p-4 border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Request Body</p>
                  <ParamRow name="deviceId" type="string"          required desc="ID perangkat yang menerapkan aturan" />
                  <ParamRow name="keyword"  type="string"          required desc="Kata kunci pemicu balasan" />
                  <ParamRow name="response" type="string"          required desc="Isi pesan balasan" />
                  <ParamRow name="type"     type="exact|contains"  required desc="'exact' = cocok penuh, 'contains' = mengandung kata" />
                </div>
                <CodeBlock id="res-autoreply">
{`{
  "success": true,
  "reply": {
    "$id": "autoreply_abc123",
    "keyword": "harga",
    "type": "contains"
  }
}`}
                </CodeBlock>
              </Section>

              {/* ── DELETE AUTO-REPLY ── */}
              <Section id="delete-autoreply" icon={Trash2} title="Delete Auto-Reply" method="DELETE">
                <p className="text-muted-foreground text-sm">Menghapus aturan balasan otomatis berdasarkan ID.</p>
                <Endpoint method="DELETE" path="/auto-reply/:id" />
                <CodeBlock id="res-delete">
{`{ "success": true, "message": "Auto-reply berhasil dihapus" }`}
                </CodeBlock>
              </Section>

              {/* ── CODE SAMPLE ── */}
              <Section id="code-sample" icon={Code} title="Contoh Integrasi JavaScript">
                <p className="text-muted-foreground text-sm">Contoh lengkap penggunaan semua endpoint menggunakan JavaScript Fetch API.</p>
                <CodeBlock id="js-sample" lang="javascript">
{`const BASE = 'https://yourdomain.com/api/v1';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_API_KEY',
};

// GET: Daftar Perangkat
const devices = await fetch(\`\${BASE}/devices\`, { headers: HEADERS }).then(r => r.json());

// POST: Kirim Pesan
await fetch(\`\${BASE}/send\`, {
  method: 'POST', headers: HEADERS,
  body: JSON.stringify({ deviceId: '...', phone: '6281234567890', message: 'Halo!' }),
});

// POST: Kirim Broadcast
await fetch(\`\${BASE}/broadcast\`, {
  method: 'POST', headers: HEADERS,
  body: JSON.stringify({
    deviceId: '...', name: 'Promo', message: 'Halo semua!',
    recipients: ['628111', '628222'],
  }),
});

// POST: Buat Auto-Reply
await fetch(\`\${BASE}/auto-reply\`, {
  method: 'POST', headers: HEADERS,
  body: JSON.stringify({ deviceId: '...', keyword: 'harga', response: 'Cek di website kami!', type: 'contains' }),
});

// DELETE: Hapus Auto-Reply
await fetch(\`\${BASE}/auto-reply/autoreply_abc123\`, { method: 'DELETE', headers: HEADERS });`}
                </CodeBlock>
              </Section>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
