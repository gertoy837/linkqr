# SDD: LinkQR — System Architecture & Design

**Versi:** 1.0  
**Tech Stack:** Laravel 13 (backend API) + Next.js 16 (frontend) + SQLite (development) / PostgreSQL (production) + PM2

---

## 1. Arsitektur Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js App   │─────▶│  Laravel API    │─────▶│   Database      │
│  (Frontend)     │      │  (Backend)      │      │  (SQLite/Pg)    │
│  Port 3010      │      │  Port 3011      │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │
         ▼                        ▼
   Static Pages           RESTful API
   (landing, login,       (auth, QR, links,
    dashboard)            analytics)
```

- **Frontend:** Next.js App Router, Tailwind CSS, shadcn/ui, Framer Motion (animasi halus).
- **Backend:** Laravel 13, Sanctum (authentication), SQLite (dev), Eloquent ORM.
- **Deployment:** PM2 (dua proses) + Cloudflare Tunnel (subdomain: `qr.gertoy.biz.id`).

---

## 2. Database Schema (Entity Relationship)

### 2.1. Users
- `id`, `name`, `email`, `password`, `tenant_id` (default 1), `created_at`, `updated_at`
- `tenant_id` → future multi-tenant.

### 2.2. Tenants
- `id`, `name`, `slug`, `domain` (opsional), `is_active`, `created_at`

### 2.3. QrCodes
- `id`, `user_id`, `tenant_id`, `title`, `target_url` (URL asli), `short_code` (unique), `is_active`, `color` (hex), `logo` (path), `scan_count`, `last_scanned_at`, `created_at`, `updated_at`

### 2.4. QrScanLogs
- `id`, `qr_code_id`, `ip_address`, `user_agent`, `referer`, `country`, `city`, `device_type`, `os`, `browser`, `scanned_at` (timestamp)

### 2.5. ShortLinks (opsional, terintegrasi dengan QR)
- `id`, `qr_code_id`, `slug` (unique), `redirect_url` (sama dengan target_url), `created_at`

*Relasi:* QrCode → hasMany QrScanLogs. ShortLink → belongsTo QrCode.

---

## 3. API Endpoints (Laravel)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/register` | Register user |
| POST | `/api/login` | Login, return token |
| GET  | `/api/user` | Profile user |
| GET  | `/api/qr-codes` | List QR milik user |
| POST | `/api/qr-codes` | Buat QR baru |
| GET  | `/api/qr-codes/{id}` | Detail QR |
| PUT  | `/api/qr-codes/{id}` | Update QR (target_url, active, color) |
| DELETE | `/api/qr-codes/{id}` | Hapus QR (soft delete) |
| GET  | `/api/qr-codes/{id}/stats` | Statistik scan (per hari, total, device) |
| GET  | `/api/short-links/{slug}` | Redirect ke target_url (public) |

*Semua endpoint kecuali redirect membutuhkan autentikasi via Sanctum (Bearer token).*

---

## 4. Frontend Structure (Next.js)

```
src/
  app/
    (auth)/login/page.tsx, register/page.tsx
    (dashboard)/dashboard/page.tsx, qr-codes/page.tsx, stats/[id]/page.tsx
    (landing)/page.tsx (home)
    api/ (proxy ke Laravel)
  components/
    ui/ (shadcn components)
    qr/ (QR generator, QR card, stats chart)
  lib/
    api.ts (fetch wrapper)
    utils/
  hooks/
  types/
```

---

## 5. Integrasi & Library Eksternal

- **QR Generation:** `endroid/qr-code` (PHP) untuk backend; frontend pakai `qrcode.react` atau `html5-qrcode`.
- **Charts:** `recharts` atau `chart.js` (frontend).
- **Short Code:** `hashids` atau `nanoid` (generate string unik 6–8 karakter).
- **Geolocation:** `ip-api.com` (free) untuk mapping IP ke lokasi.

---

## 6. Alur Kerja Utama

### 6.1. Buat QR Dinamis
1. User login.
2. Input URL target, judul, warna (opsional).
3. Backend generate `short_code` (misal `abc123`), simpan QR.
4. Kembalikan data QR termasuk URL gambar: `https://qr.gertoy.biz.id/qr/abc123.png`.
5. Frontend tampilkan QR + short link.

### 6.2. Redirect & Tracking
1. User scan QR atau klik short link → request ke `/s/{slug}`.
2. Middleware catat `ip`, `user_agent`, `referer`.
3. Redirect ke `target_url` (301).
4. Asinkron: simpan log scan ke database (atau via queue).

### 6.3. Statistik
- Endpoint `/api/qr-codes/{id}/stats` aggregate:
  - Total scan.
  - Scan per day (last 30 days).
  - Device breakdown (mobile/desktop/tablet).
  - Top locations (city, country).
- Frontend render chart & table.

---

## 7. Deploy & Monitoring
- **PM2:** `linkqr-frontend` (port 3010), `linkqr-backend` (port 3011).
- **Cloudflare Tunnel:** subdomain `qr.gertoy.biz.id` → `http://172.17.0.3:3010` (frontend), API via `/api` proxy.
- **Logging:** Laravel log, Next.js console.

---

## 8. Keamanan & Performa
- Rate limiting: 60 requests/min per user.
- CSRF token di Laravel (Sanctum).
- Input validation (URL, color hex).
- Cache statistik (Redis opsional, default: 5 menit cache di memory).
- Database index: `qr_codes.user_id`, `qr_codes.short_code`, `qr_scan_logs.qr_code_id`.

---

*Dokumen ini akan diperbarui seiring iterasi pengembangan.*