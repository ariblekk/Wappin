# Wappin - Kirimi Clone (WhatsApp Gateway)

Wappin adalah solusi WhatsApp Gateway modern yang dibangun menggunakan **Next.js 16**, **Baileys v7**, dan **Prisma (PostgreSQL)**. Project ini memungkinkan Anda untuk mengelola pesan massal (broadcast), balasan otomatis (auto-reply), dan manajemen perangkat WhatsApp dalam satu dashboard.

---

## 🚀 Fitur Utama

- **Multi-Device Support**: Hubungkan beberapa akun WhatsApp sekaligus.
- **Broadcast Messages**: Kirim pesan massal dengan jeda acak (Anti-Ban).
- **Auto-Reply**: Balasan otomatis berdasarkan kata kunci (Exact/Contains).
- **Contact Management**: Kelola daftar kontak dan integrasikan dengan pengiriman pesan.
- **API Integration**: Integrasikan pengiriman pesan WhatsApp ke aplikasi Anda menggunakan API Key.
- **Real-Time Dashboard**: Pantau status koneksi dan statistik pengiriman secara instan.
- **Modern UI**: Antarmuka responsif menggunakan Shadcn UI dan Radix Primitives.

---

## 🛠 Panduan Instalasi

Ikuti langkah-langkah di bawah ini untuk menjalankan project ini di komputer lokal Anda.

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (Versi 18 atau terbaru)
- [npm](https://www.npmjs.com/) atau [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/) atau database lain yang didukung Prisma.

### 2. Clone Project
```bash
git clone https://github.com/username/Kirimi-clone.git
cd Kirimi-clone
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan isi variabel yang diperlukan:
```bash
cp .env.example .env
```

Isi variabel berikut:
- `DATABASE_URL`: URL koneksi database PostgreSQL Anda.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Key publik Clerk.
- `CLERK_SECRET_KEY`: Key rahasia Clerk.

### 5. Setup Database
Jalankan migrasi Prisma untuk menyiapkan tabel di database:

```bash
npx prisma db push
```

### 6. Menjalankan Aplikasi
```bash
# Mode Development
npm run dev

# Mode Produksi
npm run build
npm run start
```

---

## 📖 Dokumentasi Teknis

### 1. Struktur Data (Prisma)
- **Device**: Menyimpan informasi akun WhatsApp yang terhubung.
- **Broadcast**: Mengelola antrean dan riwayat pengiriman pesan massal.
- **Message**: Log pesan masuk dan keluar.
- **AutoReply**: Aturan untuk memicu balasan otomatis berdasarkan pesan masuk.
- **Contact**: Daftar pelanggan/kontak.
- **Profile**: Informasi profil pengguna dan API Key.

### 2. Arsitektur Koneksi (Baileys v7)
Aplikasi ini menggunakan **Hybrid Auth State**:
- **Penyimpanan**: Sesi WhatsApp disimpan secara permanen di `storage/whatsapp-sessions`.
- **Performa**: Menggunakan `makeCacheableSignalKeyStore` untuk meminimalkan beban I/O disk dengan caching memori.
- **Anti-Ban**: Pengiriman multi-pesan menggunakan jeda acak antara 2-4 detik untuk mensimulasikan aktivitas manusia.

### 3. API V1
Gunakan Header `x-api-key` untuk otentikasi API.
- `POST /api/v1/send`: Kirim pesan WhatsApp tunggal.
- `GET /api/v1/devices`: Ambil daftar perangkat yang terhubung.
- `POST /api/v1/broadcast`: Buat kampanye broadcast baru.

---

## 🤝 Kontribusi
Silakan buka *issue* atau kirimkan *pull request* jika Anda ingin berkontribusi dalam pengembangan project ini.

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).
