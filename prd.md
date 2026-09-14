# PRD: LinkQR — Dynamic QR & Link Management with Analytics

**Versi:** 1.0  
**Target pasar:** UMKM, marketer, kreator, agensi digital  
**Model bisnis:** One-time purchase (CodeCanyon) + subscription (Gumroad)

---

## 1. Latar Belakang & Problem
Bisnis kecil dan individu sering perlu membuat QR code untuk menu, link promosi, absensi, atau kontak. Namun:
- QR statis tidak bisa di-update tanpa cetak ulang.
- Tidak ada analitik siapa yang scan, dari mana, kapan.
- Link pendek terpisah dari QR, manajemennya berantakan.

**Solusi:** LinkQR — satu dashboard untuk buat QR dinamis & link pendek, dengan pelacakan real-time.

---

## 2. Target Pengguna
- **UMKM:** menu digital, promo, daftar hadir.
- **Kreator:** link bio, portofolio.
- **Agen digital:** kelola banyak klien dalam satu akun (multi-tenant opsional).
- **Event organizer:** check-in peserta.

---

## 3. Fitur Utama (MVP)

### 3.1. Otentikasi & Multi-Akun
- Register/login dengan email + password.
- Setiap akun punya workspace sendiri (multi-tenant sederhana via tenant_id).
- Role: Admin (bisa kelola semua), Member (hanya lihat).

### 3.2. Dashboard Overview
- Statistik: total QR, total klik, scan unik, perangkat (mobile/desktop), lokasi (kota/negara berdasarkan IP).
- Grafik klik per hari (7/30/90 hari).
- Daftar QR terbaru dengan status aktif/nonaktif.

### 3.3. Manajemen QR Dinamis
- Buat QR dari URL (input manual) atau dari link pendek.
- Edit URL tujuan tanpa mengubah gambar QR.
- Atur status aktif/nonaktif (QR mati sementara).
- QR dalam format SVG/PNG (download).
- Customisasi warna QR & logo di tengah (opsional).

### 3.4. Link Pendek Terintegrasi
- Generate short link (domain custom: `linkqr.id/abc123`).
- Setiap short link otomatis punya QR sendiri.
- Redirect ke URL tujuan dengan tracking.

### 3.5. Analitik per QR/Link
- Total scan/klik.
- Timeline klik.
- Perangkat, OS, browser.
- Lokasi geografis (negara, kota).
- Waktu scan (jam favorit).

### 3.6. Export & Integrasi
- Export data QR ke CSV (scan logs).
- Embed QR code di website via `<img>` atau iframe.

---

## 4. Non-Fungsi
- **Responsif:** mobile-first, 320px–1440px.
- **Aksesibilitas:** WCAG 2.1 AA (kontras 4.5:1, keyboard nav, focus visible).
- **Kecepatan:** halaman <2 detik (Next.js static + caching).
- **Keamanan:** CSRF, XSS protection, rate limiting.
- **Skalabilitas:** siap pakai di VPS dengan 1GB RAM.

---

## 5. Roadmap (Post-MVP)
- Integrasi dengan WhatsApp API (kirim QR via WA).
- Custom domain untuk link pendek (tenant domain).
- Webhook: notifikasi setiap scan.
- Team collaboration (multiple users per workspace).

---

## 6. Metrik Keberhasilan
- 100+ pengguna dalam 3 bulan pertama.
- Rating ≥4.5/5 di CodeCanyon.
- Revenue ≥$500/mo dari subscription.

---

*Dokumen ini akan direvisi setelah feedback pengguna awal.*