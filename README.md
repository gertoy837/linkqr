<div align="center">

# ⚡ LinkQR — Dynamic QR Code & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel)](https://laravel.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**LinkQR** adalah platform *product-led micro-SaaS* untuk membuat **QR Code Dinamis**, **Short Links**, dan **Analitik Scan Real-Time**.  
Solusi hemat biaya promosi untuk UMKM, Restoran, Event Organizer, dan Agency tanpa perlu mencetak ulang media promosi saat target URL berubah.

[Live Demo App](https://qr.gertoy.biz.id) • [API Endpoint](https://qr-api.gertoy.biz.id/api/health)

</div>

---

## ✨ Fitur Utama

- 🔄 **Dynamic QR Codes**: Ubah target URL kapan saja tanpa perlu mencetak ulang gambar QR Code.
- 📊 **Real-time Scan Analytics**: Pantau total scan, lokasi unik, jenis perangkat (Mobile/Desktop), OS (iOS/Android), dan timestamp real-time.
- 🔗 **Built-in Short Links**: Setiap QR Code otomatis memiliki link pendek kustom yang siap dibagikan di Bio Social Media / WhatsApp.
- 🎨 **Brand Customization**: Kustomisasi warna titik QR, latar belakang, dan logo bisnis di tengah QR Code.
- 📱 **Progressive Web App (PWA)**: Dilengkapi `manifest.json`, `favicon.ico`, dan `apple-icon.png` siap diinstall ke Home Screen.
- ⚡ **Interactive Playground**: Widget uji coba langsung di landing page tanpa perlu login.
- 💳 **Paket Berbayar yang Benar-Benar Ditegakkan**: 3 tier (Starter / Business Pro / Enterprise) dengan kuota QR & scan yang dicek di server, bukan cuma tampilan.
- 🧾 **Pembayaran QRIS Statis**: Invoice dengan nominal unik, upload bukti transfer, verifikasi admin. Bisa terima uang **tanpa approval payment gateway**.
- 🛡️ **Console Admin**: Verifikasi pembayaran, kelola workspace (ubah paket, perpanjang, suspend), pantau MRR/ARR.
- 📤 **Ekspor Laporan**: PDF siap kirim ke klien & CSV untuk Excel (Business Pro ke atas).
- 🔑 **API Developer**: REST API `/api/v1/*` dengan kunci API untuk integrasi sistem lain (Enterprise).
- ⏰ **Auto-Downgrade Terjadwal**: Paket yang lewat masa aktif turun otomatis — tapi QR yang sudah dicetak tetap jalan.
- 📜 **Halaman Legal & SEO**: Syarat & Ketentuan, Kebijakan Privasi, sitemap, robots, dan JSON-LD.

---

## 🛠️ Tech Stack

### **Frontend (`/frontend`)**
- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v3, Shadcn UI primitives, Lucide Icons
- **Animation**: Framer Motion (Fade-up, Stagger, Hover Springs)
- **Toast & UI Components**: Sonner, Radix UI primitives
- **Language**: TypeScript

### **Backend (`/backend`)**
- **Framework**: Laravel 13 REST API
- **Database**: SQLite / MySQL / PostgreSQL
- **Authentication**: Laravel Sanctum (Token-based API Authentication)
- **Architecture**: Multi-tenant architecture support

---

## 📁 Struktur Monorepo

```
linkqr/
├── frontend/             # Next.js 16 App Router Frontend
│   ├── app/              # Pages & Routes (Landing, Dashboard, Auth)
│   ├── components/       # Shadcn UI & Custom Components
│   ├── lib/              # API Client & Helpers
│   └── public/           # Static Assets (Favicon, Logos, PWA Manifest)
├── backend/              # Laravel 13 REST API Backend
│   ├── app/              # Controllers, Models, Policies
│   ├── database/         # Migrations & Seeders
│   └── routes/           # API Routes (`routes/api.php`)
├── design-system/        # Design Tokens & Master Styling
├── prd.md                # Product Requirements Document
├── sdd.md                # System Architecture & Design Document
└── README.md             # Dokumentasi Utama
```

---

## 🚀 Panduan Instalasi Lokal (Quick Start)

### **Prasyarat System**
- Node.js >= 18.x
- PHP >= 8.2 & Composer
- SQLite / MySQL

---

### **1. Clone Repository**
```bash
git clone https://github.com/gertoy837/linkqr.git
cd linkqr
```

---

### **2. Setup Backend (Laravel API)**
```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate Application Key
php artisan key:generate

# Jalankan Database Migration
php artisan migrate --seed

# Jalankan server API lokal
php artisan serve --port=8000
```
API Backend akan berjalan di `http://localhost:8000`.

---

### **3. Setup Frontend (Next.js)**
```bash
cd ../frontend

# Install Node dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Jalankan server Next.js lokal
npm run dev
```
Frontend akan berjalan di `http://localhost:3000`.

> **Panduan lengkap untuk server produksi** (PM2, Cloudflare Tunnel, konfigurasi QRIS,
> cara membuat akun admin pertama, troubleshooting) ada di **[INSTALL.md](INSTALL.md)**.

---

## ⚙️ PM2 Process Deployment

Layanan dikelola menggunakan **PM2**:

```bash
# Start Frontend
cd /root/qr-analytics/frontend
pm2 start npm --name "linkqr-frontend" -- start -- --port 3006

# Start Backend
cd /root/qr-analytics/backend
pm2 start "php artisan serve --host=172.17.0.3 --port=3005" --name "linkqr-backend"
```

---

## 📄 Lisensi

Proyek ini berada di bawah lisensi **MIT License** — Bebas dikembangkan dan dikomersialkan.

---

<div align="center">
Dibuat dengan ❤️ oleh <b>Kovara Studio</b> (Mochammad Mahardika)
</div>
