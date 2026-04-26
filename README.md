# Dokumentasi Teknis Wappin - Kirimi Clone

Dokumentasi ini menjelaskan data apa saja yang dapat diambil (fetch) dan dikelola dalam sistem Wappin.

## 1. Perangkat (Devices)
Data ini disimpan di koleksi Appwrite `devices`.
- **Informasi yang dapat di-fetch:**
  - `id`: ID unik perangkat (ID dokumen Appwrite).
  - `name`: Nama label perangkat yang diberikan user.
  - `waName`: Nama profil WhatsApp (Pushname) yang diambil otomatis saat terkoneksi.
  - `phone`: Nomor telepon yang terhubung.
  - `status`: Status koneksi (`connected`, `connecting`, `disconnected`).
  - `qr`: Kode QR terbaru (string base64) jika status sedang `connecting`.

## 2. Broadcast (Pesan Massal)
Data ini disimpan di koleksi Appwrite `broadcasts`.
- **Informasi yang dapat di-fetch:**
  - `name / title`: Nama kampanye broadcast.
  - `message / body`: Isi pesan yang dikirim.
  - `status`: Status progres (`pending`, `processing`, `completed`, `failed`).
  - `total`: Jumlah total target penerima.
  - `sent`: Jumlah pesan yang berhasil terkirim.
  - `failed`: Jumlah pesan yang gagal terkirim.
  - `recipients`: Daftar nomor telepon penerima (disimpan sebagai string JSON).
  - `timestamp`: Waktu penjadwalan (Unix timestamp).
  - `deviceId`: ID perangkat yang digunakan untuk mengirim.

## 3. Auto-Reply (Balasan Otomatis)
Data ini disimpan di koleksi Appwrite `auto_replies`.
- **Informasi yang dapat di-fetch:**
  - `keyword`: Kata kunci yang memicu balasan.
  - `response`: Isi pesan balasan otomatis.
  - `type`: Tipe pencocokan kata kunci (`exact` untuk sama persis, `contains` untuk mengandung kata).
  - `deviceId`: ID perangkat spesifik yang menerapkan aturan ini.

## 4. Kontak (Contacts)
Data kontak diambil langsung dari memori session WhatsApp (Baileys) atau dari koleksi Appwrite `contacts`.
- **Informasi yang dapat di-fetch:**
  - `name`: Nama kontak.
  - `phone`: Nomor WhatsApp kontak.
  - `tags`: Label/Kategori kontak.

## 5. Sinkronisasi Realtime
Sistem menggunakan **Appwrite Realtime** untuk memantau perubahan data secara instan:
- **Event yang bisa dipantau:**
  - `create`: Muncul saat ada broadcast baru atau pesan masuk.
  - `update`: Muncul saat progres broadcast bertambah (`sent`/`failed`) atau status perangkat berubah.
  - `delete`: Muncul saat riwayat dihapus.

## 6. API Server Actions (GET/POST)

Aplikasi ini menggunakan Next.js Server Actions sebagai jembatan antara Frontend dan Backend (Appwrite/WhatsApp).

### A. Perangkat (Devices)
- **GET** `getDevices()`: Mengambil semua daftar akun WhatsApp user.
- **GET** `getDevice(id)`: Mengambil detail satu perangkat spesifik.
- **POST** `createDevice(name)`: Menambahkan akun WhatsApp baru ke sistem.
- **DELETE** `deleteDevice(id)`: Menghapus akun dan memutuskan sesi WhatsApp.

### B. Broadcast & Pesan
- **GET** `getBroadcasts()`: Mengambil riwayat pengiriman pesan massal.
- **POST** `createBroadcast(data)`: Membuat antrean broadcast baru (instan atau terjadwal).
- **POST** `sendTestMessage(deviceId, phone, message)`: Mengirim pesan uji coba ke satu nomor.

### C. Auto-Reply
- **GET** `getAutoReplies()`: Mengambil semua aturan balasan otomatis.
- **POST** `createAutoReply(data)`: Menambahkan keyword dan respons baru.
- **DELETE** `deleteAutoReply(id)`: Menghapus aturan balasan otomatis.

### D. Kontak (Contacts)
- **GET** `getContacts()`: Mengambil daftar semua kontak/pelanggan.
- **POST** `createContact(data)`: Menambahkan kontak baru.
- **POST** `updateContact(id, data)`: Memperbarui informasi kontak yang ada.
- **DELETE** `deleteContact(id)`: Menghapus data kontak.

### E. Autentikasi & Sesi
- **GET** `getLoggedInUser()`: Validasi sesi user yang sedang login.
- **GET** `getAppwriteJWT()`: Mengambil token JWT untuk koneksi Realtime Appwrite.
- **POST** `login / logout`: Manajemen sesi akun Wappin.

---
*Catatan: Semua pengambilan data (fetch) dari sisi klien (frontend) harus melalui proteksi JWT Appwrite yang diperbarui setiap 14 menit untuk menjaga keamanan sesi.*
