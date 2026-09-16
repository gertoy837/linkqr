# Panduan Instalasi LinkQR

Dokumen ini untuk memasang LinkQR di server kamu sendiri, dari nol sampai jalan.
Ditulis untuk **VPS Linux** (Debian/Ubuntu), tapi langkahnya sama untuk hosting lain.

Arsitektur: **Next.js 16** (frontend) + **Laravel 13** (API backend). Keduanya jalan
terpisah, jadi kamu butuh dua domain/subdomain:

| Bagian | Contoh domain | Port internal |
|---|---|---|
| Frontend (UI) | `qr.domainmu.com` | 3006 |
| Backend (API) | `qr-api.domainmu.com` | 3011 |

---

## 1. Prasyarat

```bash
# Cek versi — LinkQR butuh minimal ini
node -v      # >= 18
php -v       # >= 8.2 (disarankan 8.3)
composer -V
```

Extension PHP wajib (dipakai untuk ekspor PDF & upload bukti bayar):

```bash
php -m | grep -E "^(dom|gd|mbstring|xml|zip|fileinfo)$"
```

Kalau ada yang kurang, install dulu:

```bash
sudo apt install php8.3-dom php8.3-gd php8.3-mbstring php8.3-xml php8.3-zip
```

Install PM2 (proses manager, dipakai untuk menjalankan aplikasi):

```bash
sudo npm install -g pm2
```

---

## 2. Ambil Kode

```bash
git clone https://github.com/gertoy837/linkqr.git
cd linkqr
```

---

## 3. Setup Backend (Laravel API)

```bash
cd backend

composer install

cp .env.example .env
php artisan key:generate
```

### Isi `.env`

Minimal yang **wajib** diubah:

```env
APP_NAME=LinkQR
APP_ENV=production
APP_DEBUG=false
APP_URL=https://qr-api.domainmu.com

# Database. SQLite paling gampang untuk mulai:
DB_CONNECTION=sqlite
# (kalau pakai MySQL, isi DB_HOST/DB_DATABASE/DB_USERNAME/DB_PASSWORD)
```

Bagian pembayaran (QRIS statis — tidak butuh approval payment gateway):

```env
PAYMENT_DRIVER=manual_qris
PAYMENT_QRIS_MERCHANT="Nama Usahamu"
PAYMENT_QRIS_NMID=ID1234567890123
PAYMENT_QRIS_IMAGE="https://qr-api.domainmu.com/storage/qris/qris.png"
PAYMENT_INVOICE_EXPIRY_HOURS=24
PAYMENT_UNIQUE_CODE=true

# Opsional: rekening bank sebagai alternatif
PAYMENT_BANK_NAME=BCA
PAYMENT_BANK_ACCOUNT=1234567890
PAYMENT_BANK_HOLDER="Nama Pemilik Rekening"
```

> **Cara dapat QRIS statis:** buka aplikasi GoPay Bisnis / m-banking, minta
> "QRIS" untuk merchant-mu, lalu simpan gambarnya. NMID tertera di gambar itu.
> Upload gambarnya ke `backend/storage/app/public/qris/` setelah storage:link.

Wajib: atur disk penyimpanan ke `public` supaya bukti transfer & QRIS bisa diakses:

```env
FILESYSTEM_DISK=public
```

### Migrasi & storage

```bash
php artisan migrate --force
php artisan storage:link
```

### Jalankan API

```bash
php artisan serve --host=0.0.0.0 --port=3011
```

Cek: `curl http://localhost:3011/api/health` harus balas `200`.

---

## 4. Setup Frontend (Next.js)

```bash
cd ../frontend

npm install

cp .env.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://qr-api.domainmu.com/api
NEXT_PUBLIC_APP_NAME=LinkQR
```

Build & jalankan:

```bash
npm run build
npm start -- --port 3006
```

Cek: `curl -I http://localhost:3006` harus balas `200`.

---

## 5. Jalankan Permanen dengan PM2

LinkQR butuh **tiga** proses: frontend, backend, dan scheduler (penegak masa
aktif paket + pembersih invoice basi).

```bash
cd /path/ke/linkqr/backend

# Backend API
pm2 start php --name linkqr-backend -- artisan serve --host=0.0.0.0 --port=3011

# Scheduler — WAJIB, kalau tidak paket berbayar tidak pernah kedaluwarsa
pm2 start php --name linkqr-scheduler -- artisan schedule:work

# Frontend
cd ../frontend
pm2 start npm --name linkqr-frontend -- start -- --port 3006

pm2 save
pm2 startup    # ikuti perintah yang muncul supaya hidup lagi setelah reboot
```

> **Kenapa scheduler penting:** tanpa proses ini, user yang bayar 1 bulan dapat
> fitur Pro selamanya. Scheduler menurunkan paket yang lewat masa aktif tiap jam.

---

## 6. Bikin Akun Admin Pertama

Semua user yang mendaftar lewat halaman register adalah **user biasa**. Admin
harus diaktifkan manual dari server:

```bash
cd backend
php artisan tinker --execute="
\$u = App\Models\User::where('email','emailkamu@gmail.com')->first();
\$u->is_admin = true;
\$u->save();
echo 'Admin aktif: ' . \$u->email;
"
```

Setelah itu login lewat UI — akun admin otomatis diarahkan ke **Console Admin**
(`/admin`), bukan dashboard klien.

> Pastikan emailnya **sudah terdaftar** lewat halaman register dulu. Kalau belum,
> `first()` akan mengembalikan `null`.

---

## 7. Domain & HTTPS

Cara paling cepat tanpa buka port: **Cloudflare Tunnel**.

```bash
cloudflared tunnel login
cloudflared tunnel create linkqr

# Arahkan subdomain ke port lokal
cloudflared tunnel route dns linkqr qr.domainmu.com
cloudflared tunnel route dns linkqr qr-api.domainmu.com
```

Konfigurasi tunnel (`~/.cloudflared/config.yml`):

```yaml
tunnel: linkqr
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json
ingress:
  - hostname: qr-api.domainmu.com
    service: http://localhost:3011
  - hostname: qr.domainmu.com
    service: http://localhost:3006
  - service: http_status:404
```

> Urutan penting: **API dulu, baru frontend**, dan `http_status:404` harus paling
> bawah sebagai catch-all.

Alternatif kalau pakai Nginx biasa: buat reverse proxy ke `localhost:3006` dan
`localhost:3011`, lalu pasang sertifikat dengan certbot.

---

## 8. Verifikasi Setelah Deploy

```bash
# Frontend
curl -sI https://qr.domainmu.com | head -1                    # 200
curl -sI https://qr.domainmu.com/sitemap.xml | head -1        # 200
curl -sI https://qr.domainmu.com/terms | head -1              # 200

# Backend
curl -s https://qr-api.domainmu.com/api/health                # {"status":"ok"}

# Redirect QR (ganti xxxxxx dengan kode QR yang sudah kamu buat)
curl -sI https://qr.domainmu.com/s/xxxxxx | head -1           # 302
```

Terakhir, tes end-to-end: daftar akun → buat QR → scan pakai HP → buka
**Analitik** dan pastikan scan-nya tercatat.

---

## 9. Ganti ke Payment Gateway Otomatis (Opsional)

LinkQR dikirim dengan **QRIS statis + verifikasi admin manual** supaya kamu bisa
terima uang **tanpa menunggu approval** payment gateway.

Kalau nanti sudah punya akun Midtrans/Xendit/Tripay, kamu **tidak perlu mengubah
halaman billing** — cukup:

1. Buat class baru yang implements `App\Payments\PaymentGateway`
   (contoh: `App\Payments\MidtransGateway`)
2. Daftarkan di `App\Payments\PaymentManager`
3. Ubah `PAYMENT_DRIVER` di `.env`

Titik aktivasi paket sudah dipisah di `Invoice::markPaid()`, jadi webhook
tinggal memanggil method itu.

---

## 10. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Route [api/login] not found` | Route API belum teregistrasi. Pastikan `bootstrap/app.php` memuat `api: __DIR__.'/../routes/api.php'`, lalu `php artisan route:clear`. |
| Login sukses tapi tetap di halaman login | Middleware Next.js baca cookie, bukan localStorage. Cek `lib/auth.ts` — `setAuth()` harus menulis cookie `token`. |
| Scan QR malah 404 | Route `/s/[code]` di frontend meneruskan ke API. Pastikan `NEXT_PUBLIC_API_URL` benar dan backend hidup. |
| Analitik device selalu `desktop` | UA tidak terkirim. Pastikan proxy `/s/[code]` meneruskan header `User-Agent`. |
| Negara selalu kosong | Cloudflare tidak meneruskan `CF-IPCountry`. Backend akan fallback ke `ip-api.com` — butuh akses internet keluar. |
| Ekspor PDF error | Extension `dom`/`gd` belum terpasang, atau `composer install` belum dijalankan ulang. |
| Paket berbayar tidak pernah turun | Proses `linkqr-scheduler` mati. Jalankan `pm2 restart linkqr-scheduler`. |
| Upload bukti bayar gagal dibuka | `php artisan storage:link` belum dijalankan, atau `FILESYSTEM_DISK` bukan `public`. |

Kalau ada masalah lain, cek log:

```bash
pm2 logs linkqr-backend --lines 50
pm2 logs linkqr-frontend --lines 50
tail -f backend/storage/logs/laravel.log
```

---

## Struktur Singkat

```
linkqr/
├── frontend/          # Next.js 16 — UI, landing, dashboard, admin console
│   ├── app/           # halaman (App Router)
│   ├── components/    # komponen UI
│   └── lib/           # API client, auth helper
├── backend/           # Laravel 13 — REST API
│   ├── app/
│   │   ├── Http/Controllers/   # endpoint
│   │   ├── Models/             # Tenant, User, QrCode, Invoice, ApiKey
│   │   ├── Payments/           # layer pembayaran (provider-agnostic)
│   │   └── Console/Commands/   # job terjadwal
│   ├── config/plans.php        # definisi paket & limit
│   └── routes/api.php          # semua endpoint
└── README.md
```

---

Dibuat oleh **Kovara Studio** — Mochammad Mahardika.
Ada pertanyaan? support@kovarastudio.id