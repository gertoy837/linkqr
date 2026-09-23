# Alur Staging → Produksi

Dokumen ini menjelaskan cara mengerjakan perubahan LinkQR tanpa membahayakan
data klien.

## Ringkasnya

| | Produksi (klien) | Staging (uji coba) |
|---|---|---|
| Domain web | `qr.kovarastudio.id` | `qr.gertoy.biz.id` |
| Domain API | `qr-api.kovarastudio.id` | `qr-api.gertoy.biz.id` |
| Branch git | `main` | `staging` |
| Folder | `/root/qr-analytics` | `/root/qr-analytics-staging` |
| Port | 3006 (web), 3011 (api) | 3016 (web), 3017 (api) |
| Database | data klien asli | data uji saja |
| Email | terkirim sungguhan | hanya masuk log |
| Mesin pencari | diindeks | **noindex** |

Proses PM2: `linkqr-*` (produksi) dan `linkqr-staging-*` (staging).

## Aturan utama

1. **Semua perubahan dikerjakan di branch `staging`.** Jangan pernah menyunting
   langsung di folder produksi.
2. Uji di `qr.gertoy.biz.id`. Data di sana data uji, jadi aman dirusak.
3. Kalau sudah terbukti bagus, **baru** digabung ke `main` supaya muncul di
   `qr.kovarastudio.id`.
4. Database staging **tidak pernah** diisi data klien asli.

## Alur kerja

```bash
# 1. Kerjakan di staging
cd /root/qr-analytics-staging
git checkout staging
# ...ubah kode...

# 2. Uji di gertoy
#    - Backend  : cd backend && php8.4 artisan config:clear && pm2 restart linkqr-staging-backend
#    - Frontend : cd frontend && npm run build && pm2 restart linkqr-staging-frontend
#    Buka https://qr.gertoy.biz.id

# 3. Kalau sudah oke, commit di staging
git add -A && git commit -m "..." && git push origin staging

# 4. Gabungkan ke produksi
cd /root/qr-analytics
git checkout main
git merge staging
git push origin main
#    - Backend  : cd backend && php8.4 artisan config:clear && pm2 restart linkqr-backend
#    - Frontend : cd frontend && npm run build && pm2 restart linkqr-frontend
```

## Kenapa email staging masuk log saja

`MAIL_MAILER=log` di staging. Tanpa itu, menguji fitur pengingat paket akan
mengirim email sungguhan ke alamat orang. Di staging, isi email bisa diperiksa
di `backend/storage/logs/laravel.log`.

## Data uji

Dibuat oleh `StagingSeeder` (menolak berjalan kalau `APP_ENV=production`):

```bash
cd /root/qr-analytics-staging/backend
php8.4 artisan db:seed --class=StagingSeeder --force
```

| Akun | Paket | Kegunaan |
|---|---|---|
| `admin@linkqr.test` | business_pro | menguji tampilan admin |
| `pro@linkqr.test` | business_pro | menguji logo & warna kustom |
| `starter@linkqr.test` | starter | menguji gating fitur berbayar |
| `expiring@linkqr.test` | business_pro | berakhir 3 hari lagi, menguji pengingat |

Kata sandi semuanya: `password123`.

## QR yang sudah tercetak

QR lama menunjuk ke `qr.gertoy.biz.id/s/<kode>`. Karena gertoy sekarang
melayani staging, kode itu tidak ada di database staging.

**Jaring pengaman sementara:** lima kode yang sudah beredar
(`r51dtc`, `PjvZFS`, `5XPY94`, `BxNpFe`, `jFssO6`, `4Q5gHg`) tetap diarahkan ke
produksi lewat aturan tunnel berbasis path, supaya pelanggan yang scan tidak
mendapat halaman error.

**Setelah kamu selesai mencetak ulang QR dengan domain `qr.kovarastudio.id`,
hapus aturan itu** — lihat `/tmp/staging/tunnel.py` (daftar `KODE_LAMA`).
QR baru yang dibuat di produksi otomatis memakai domain `qr.kovarastudio.id`.

## Catatan teknis

- Dependensi (`vendor/`, `node_modules/`) di staging disalin dari produksi saat
  commit-nya masih sama. Kalau `composer.json` atau `package.json` berubah,
  jalankan `composer install` / `npm install` di folder staging.
- `APP_KEY` staging berbeda dari produksi — kunci enkripsi tidak dibagi.
- Noindex aktif hanya kalau `NEXT_PUBLIC_ROBOTS_NOINDEX=true`. Produksi tidak
  menyetelnya, jadi perilakunya tidak berubah.

### Dua file yang tidak ikut `git clone`

Keduanya bukan rahasia, hanya tidak dilacak git:

```bash
# phpunit.xml di-gitignore (backend/.gitignore)
cp /root/qr-analytics/backend/phpunit.xml /root/qr-analytics-staging/backend/

# tests/Unit kosong, dan git tidak melacak folder kosong
mkdir -p /root/qr-analytics-staging/backend/tests/Unit
```

`phpunit.xml` memakai `DB_DATABASE=:memory:` dan `MAIL_MAILER=array`, jadi
menjalankan test **tidak akan pernah** menyentuh database asli atau mengirim
email.

Menjalankan test:

```bash
cd /root/qr-analytics-staging/backend && php8.4 vendor/bin/phpunit
```
