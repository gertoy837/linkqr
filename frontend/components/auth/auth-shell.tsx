'use client';

import Link from 'next/link';
import { QrCode, Link2, BarChart3, FileSpreadsheet, Braces, ArrowLeft } from 'lucide-react';

/**
 * Kerangka bersama untuk halaman login & register.
 *
 * Sebelumnya kedua halaman hanya menaruh satu kartu sempit di tengah kanvas
 * putih, sehingga di layar lebar terasa kosong dan tidak menjelaskan produknya
 * sama sekali. Sekarang dipakai dua kolom: panel brand di kiri (penjelasan
 * singkat + nilai jual) dan formulir di kanan. Di layar kecil panel brand
 * disembunyikan dan formulir memakai lebar penuh.
 */

const HIGHLIGHTS = [
  {
    icon: Link2,
    title: 'QR dinamis',
    desc: 'Ganti URL tujuan kapan saja — QR yang sudah dicetak tetap berlaku.',
  },
  {
    icon: BarChart3,
    title: 'Analitik real-time',
    desc: 'Negara, kota, perangkat, dan waktu setiap kali QR dipindai.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Ekspor laporan',
    desc: 'Unduh data scan ke CSV & Excel untuk kebutuhan laporan.',
  },
  {
    icon: Braces,
    title: 'API developer',
    desc: 'Buat dan kelola QR otomatis langsung dari sistemmu sendiri.',
  },
];

export function AuthShell({
  children,
  maxWidth = 'max-w-md',
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-white text-neutral-900 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Panel brand (desktop) ---------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* dekorasi latar, konsisten dengan landing page */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(ellipse at 30% 20%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, black 10%, transparent 70%)',
            }}
          />
          <div className="absolute -right-16 -top-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="absolute right-10 top-1/3 h-40 w-40 opacity-[0.07]">
            <QrCode className="h-full w-full text-white" />
          </div>
        </div>

        {/* logo */}
        <Link href="/" className="relative z-10 inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Link<span className="text-indigo-200">QR</span>
          </span>
        </Link>

        {/* isi utama */}
        <div className="relative z-10 max-w-md py-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-50 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Platform QR Code Dinamis
          </div>

          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Satu QR untuk selamanya.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-indigo-100">
            Ubah tujuan kapan saja tanpa cetak ulang, lalu pantau setiap scan
            secara real-time dari satu dashboard.
          </p>

          <ul className="mt-9 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-indigo-100/80">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* footer panel */}
        <div className="relative z-10 flex items-center gap-3 border-t border-white/15 pt-6">
          <p className="text-xs text-indigo-100/70">
            Dibuat oleh{' '}
            <a
              href="https://kovarastudio.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white underline-offset-2 hover:underline"
            >
              Kovara Studio
            </a>
          </p>
        </div>
      </aside>

      {/* ---------- Kolom formulir ---------- */}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          {/* logo hanya terlihat di mobile — di desktop sudah ada di panel kiri */}
          <Link href="/" className="inline-flex items-center gap-2 lg:invisible">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <QrCode className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-neutral-900">
              Link<span className="text-indigo-600">QR</span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke beranda
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-8 sm:px-8 lg:px-10">
          <div className={`w-full ${maxWidth}`}>{children}</div>
        </main>

        <footer className="px-5 pb-7 text-center sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-400">
            <Link href="/privacy" className="transition-colors hover:text-indigo-600">
              Kebijakan Privasi
            </Link>
            <span className="hidden h-3 w-px bg-neutral-200 sm:block" />
            <Link href="/terms" className="transition-colors hover:text-indigo-600">
              Syarat &amp; Ketentuan
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-neutral-400">
            &copy; {new Date().getFullYear()} Kovara Studio. Seluruh hak cipta dilindungi.
          </p>
        </footer>
      </div>
    </div>
  );
}
