# Desain Visual: LinkQR

**Berbasis design system dari skill `ui-ux-pro-max`**  
**Tema:** Vibrant & Block-based — berani, modern, tidak generik.

---

## 1. Filosofi Visual
- **Block-based:** Layout terbagi dalam blok-blok tegas dengan latar warna kontras, bukan grid monoton.
- **Vibrant:** Warna berani (biru royal, ungu, pink) dengan aksen neon, memberi energi dan kesan teknologi.
- **Geometric:** Bentuk sudut tajam, garis horizontal tebal, elemen dekoratif (pattern animasi).
- **Typographic:** Heading menggunakan Fira Code (monospace) untuk kesan teknis & presisi; body Fira Sans untuk keterbacaan.

---

## 2. Design Tokens (dari UI/UX Pro Max)

### Warna
| Token | Hex | Penggunaan |
|-------|-----|------------|
| `--color-primary` | `#2563EB` | Tombol utama, link, header |
| `--color-primary-soft` | `#DBEAFE` | Background badge, hover |
| `--color-secondary` | `#7C3AED` | Elemen sekunder, ikon |
| `--color-accent` | `#EC4899` | CTA utama (tombol "Buat QR"), highlight |
| `--color-background` | `#FFFFFF` | Latar halaman |
| `--color-foreground` | `#0F172A` | Teks utama |
| `--color-muted` | `#F1F5FD` | Card, sidebar |
| `--color-border` | `#E4ECFC` | Garis pemisah |

### Tipografi
- **Heading (h1–h6):** `font-family: 'Fira Code', monospace; font-weight: 600; letter-spacing: -0.02em;`
- **Body:** `font-family: 'Fira Sans', sans-serif; font-weight: 400; line-height: 1.6;`
- **Angka / statistik:** `Fira Code` (monospaced) agar presisi.

### Spasi & Radius
- `--space-1: 4px;` … `--space-8: 64px;` (skala 4px, dengan gap besar antar blok).
- Radius: `border-radius: 8px` (kartu), `12px` (tombol besar), `0` (section divider).

---

## 3. Layout & Komponen

### 3.1. Landing Page (Hero + Testimoni + CTA)
- **Hero:** Full-width background gradien (biru ke ungu) dengan teks besar, tombol CTA pink, dan mockup QR yang berputar.
- **Testimoni Carousel:** Kartu putih dengan border warna aksen, foto profil, nama, role. Navigasi berupa dot/panah.
- **CTA Footer:** Latar gelap dengan teks putih, tombol pink.

### 3.2. Dashboard (Setelah Login)
- **Sidebar:** Warna putih, item aktif dengan indikator warna primary.
- **Statistik:** 4 kartu besar (Total QR, Total Klik, Scan Unik, Device) dengan ikon SVG.
- **Tabel QR:** Responsif, dengan kolom judul, short code, status, klik, aksi (edit, hapus, lihat stat).
- **Grafik:** `recharts` dengan warna primary & accent.

### 3.3. Halaman Buat QR
- Form satu kolom: input URL, judul, warna (color picker), logo upload (opsional).
- Preview QR di sebelah kanan (update real-time).
- Tombol "Simpan" dengan loading state.

### 3.4. Detail QR / Statistik
- Header: judul, status, total scan.
- Tabs: Overview, Grafik Klik, Lokasi, Perangkat.
- Tabel log scan (pagination).

---

## 4. Aksesibilitas & Interaksi
- **Focus ring:** `outline: 2px solid var(--color-primary); outline-offset: 2px;`
- **Hover:** transisi 200ms, warna berubah (misal tombol primary ke #1D4ED8).
- **Motion:** Animasi halus dengan Framer Motion (stagger list, fade-in). `prefers-reduced-motion: reduce` dihormati.
- **Semantic HTML:** `<main>`, `<section>`, `<article>`, `<button>` dengan aria-label jika ikon saja.
- **Ikon:** Gunakan Lucide React (SVG) — **tidak ada emoji sebagai ikon.**

---

## 5. Responsif
- **Mobile (<768px):** Stack semua blok, sidebar menjadi bottom navigation, form satu kolom.
- **Tablet (768–1024px):** Grid 2 kolom, sidebar tetap.
- **Desktop (>1024px):** Grid 3–4 kolom, bento layout.

---

## 6. Anti-pattern (Hindari)
- ❌ Emoji sebagai ikon (gunakan SVG).
- ❌ Warna abu-abu yang membosankan.
- ❌ Teks < 12px.
- ❌ Hanya hover untuk interaksi (harus ada touch feedback).
- ❌ Animasi tanpa `prefers-reduced-motion`.

---

*Dokumen ini menjadi acuan implementasi UI. Setiap komponen harus mengikuti token di atas.*