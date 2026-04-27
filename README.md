# Wappin - Kirimi Clone (WhatsApp Gateway)

Wappin adalah solusi WhatsApp Gateway modern yang dibangun menggunakan **Next.js 15**, **Baileys v7**, dan **Appwrite**. Project ini memungkinkan Anda untuk mengelola pesan massal (broadcast), balasan otomatis (auto-reply), dan manajemen perangkat WhatsApp dalam satu dashboard.

---

## 🚀 Fitur Utama

- **Multi-Device Support**: Hubungkan beberapa akun WhatsApp sekaligus.
- **Broadcast Messages**: Kirim pesan massal dengan jeda acak (Anti-Ban).
- **Auto-Reply**: Balasan otomatis berdasarkan kata kunci (Exact/Contains).
- **Contact Management**: Kelola daftar kontak dan integrasikan dengan pengiriman pesan.
- **Real-Time Dashboard**: Pantau status koneksi dan statistik pengiriman secara instan.
- **Modern UI**: Antarmuka responsif menggunakan Shadcn UI dan Radix Primitives.

---

## 🛠 Panduan Instalasi

Ikuti langkah-langkah di bawah ini untuk menjalankan project ini di komputer lokal Anda.

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (Versi 18 atau terbaru)
- [pnpm](https://pnpm.io/installation) (Disarankan)
- Akun [Appwrite](https://appwrite.io/) (Self-hosted atau Cloud)

### 2. Clone Project
```bash
git clone https://github.com/username/Kirimi-clone.git
cd Kirimi-clone
```

### 3. Instal Dependensi
```bash
pnpm install
```

### 4. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan isi variabel yang diperlukan:
```bash
cp .env.example .env
```

Isi variabel berikut:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Endpoint API Appwrite Anda.
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: ID Project Appwrite.
- `APPWRITE_API_KEY`: API Key dengan scope yang cukup (Database, Collections, Buckets).
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID`: ID Database tempat menyimpan data.
- `NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID`: ID Koleksi untuk perangkat.
- `NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID`: ID Koleksi untuk pesan.
- `NEXT_PUBLIC_APPWRITE_BROADCASTS_COLLECTION_ID`: ID Koleksi untuk broadcast.
- `NEXT_PUBLIC_APPWRITE_AUTOREPLIES_COLLECTION_ID`: ID Koleksi untuk auto-reply.

### 5. Setup Appwrite
Anda bisa mengatur database dan koleksi Appwrite secara otomatis menggunakan script yang sudah disediakan:

```bash
node appwrite.mjs
```

Script ini akan otomatis membuat:
- Database utama.
- Semua koleksi yang diperlukan (`devices`, `broadcasts`, `messages`, `auto_replies`, `contacts`, `profiles`).
- Semua atribut/kolom yang dibutuhkan di setiap koleksi.
- Storage Bucket untuk menyimpan sesi WhatsApp (jika dikonfigurasi).

*Catatan: Pastikan Anda sudah mengisi `APPWRITE_API_KEY` dan ID lainnya di file `.env` sebelum menjalankan script ini.*

### 6. Menjalankan Aplikasi
```bash
# Mode Development
pnpm dev

# Mode Produksi
pnpm build
pnpm start
```

---

## 📖 Dokumentasi Teknis

### 1. Struktur Data (Appwrite)
- **Devices**: Menyimpan informasi akun WhatsApp yang terhubung.
- **Broadcasts**: Mengelola antrean dan riwayat pengiriman pesan massal.
- **Auto-Reply**: Aturan untuk memicu balasan otomatis berdasarkan pesan masuk.
- **Contacts**: Daftar pelanggan/kontak yang bisa diimpor ke broadcast.

### 2. Arsitektur Koneksi (Baileys v7)
Aplikasi ini menggunakan **Hybrid Auth State**:
- **Penyimpanan**: Sesi WhatsApp disimpan secara permanen di `storage/whatsapp-sessions`.
- **Performa**: Menggunakan `makeCacheableSignalKeyStore` untuk meminimalkan beban I/O disk dengan caching memori.
- **Anti-Ban**: Pengiriman multi-pesan menggunakan jeda acak antara 2-4 detik untuk mensimulasikan aktivitas manusia.

### 3. API & Server Actions
- `getDevices()`: Mengambil daftar perangkat.
- `createBroadcast()`: Membuat kampanye pesan baru.
- `sendTestMessage()`: Mengirim pesan tunggal untuk pengujian.
- `updateUserName()`: Memperbarui profil pengguna di dashboard.

---

## 🤝 Kontribusi
Silakan buka *issue* atau kirimkan *pull request* jika Anda ingin berkontribusi dalam pengembangan project ini.

## 📄 Lisensi
Project ini dilisensikan di bawah [MIT License](LICENSE).
