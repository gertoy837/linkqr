'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  QrCode,
  BarChart3,
  Link2,
  Zap,
  Sparkles,
  MousePointerClick,
  Globe,
  ShieldCheck,
  Star,
  Check,
  Smartphone,
  Copy,
  ChevronDown,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

export default function HomePage() {
  const [previewUrl, setPreviewUrl] = useState('https://linkqr.id/demo');
  const [copied, setCopied] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCopy = () => {
    navigator.clipboard.writeText('https://qr.gertoy.biz.id/s/demo-123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const faqs = [
    {
      q: 'Apa bedanya QR Dinamis dan QR Statis biasa?',
      a: 'QR Statis mengunci URL langsung di gambar QR. Kalau URL berubah, QR harus dicetak ulang. QR Dinamis mengarahkan ke short link LinkQR, sehingga kamu bisa mengubah URL tujuan kapan saja tanpa perlu mengganti gambar QR yang sudah dicetak.',
    },
    {
      q: 'Data analitik apa saja yang direkam setiap kali QR discan?',
      a: 'LinkQR mencatat jumlah scan unik & total, lokasi geografis (negara & kota), jenis perangkat (Mobile, Desktop, Tablet), Sistem Operasi (iOS, Android, Windows), Browser, serta timestamp waktu scan real-time.',
    },
    {
      q: 'Apakah bisa menambahkan logo sendiri di tengah QR Code?',
      a: 'Bisa banget! Kamu bisa mengunggah logo bisnis, mengubah warna titik QR, mengubah warna latar belakang, dan mengatur bentuk sudut QR sesuai brand identity kamu.',
    },
    {
      q: 'Apakah ada batasan jumlah scan untuk akun gratis?',
      a: 'Akun gratis mendapatkan 1.000 scan per bulan per QR Code. Untuk kebutuhan tanpa batas dan fitur analitik ekspor PDF/CSV, kamu bisa upgrade ke paket Pro kapan saja.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="border-b border-neutral-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">
              Link<span className="text-indigo-600">QR</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <Link href="#fitur" className="hover:text-indigo-600 transition-colors">Fitur</Link>
            <Link href="#cara-kerja" className="hover:text-indigo-600 transition-colors">Cara Kerja</Link>
            <Link href="#pricing" className="hover:text-indigo-600 transition-colors">Harga</Link>
            <Link href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="shadow-md bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-medium"
              >
                Daftar Gratis
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern mask-radial-fade opacity-100" />
            <div className="absolute -top-12 -right-12 w-[600px] h-[600px] opacity-[0.035] text-indigo-900 pointer-events-none select-none">
              <QrCode className="w-full h-full" />
            </div>
            <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] opacity-[0.025] text-indigo-900 pointer-events-none select-none">
              <QrCode className="w-full h-full" />
            </div>
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
            <div className="absolute top-32 right-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl relative z-10">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100 mb-6"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>QR dinamis + analitik dalam satu tempat</span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
                >
                  Satu QR, bisa{' '}
                  <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                    berubah kapan saja
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="mt-6 max-w-xl text-lg text-neutral-600"
                >
                  Buat QR code, ubah targetnya tanpa cetak ulang, dan pantau setiap scan —
                  lokasi, perangkat, dan waktunya. Semua dari satu dashboard.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="mt-9 flex flex-wrap gap-3"
                >
                  <Link href="/register">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button
                        size="lg"
                        className="gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-semibold h-12 px-6 text-base"
                      >
                        Mulai Gratis <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="#fitur">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-neutral-300 text-neutral-700 hover:bg-neutral-50 h-12 px-6 text-base"
                      >
                        Lihat Fitur
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="mt-9 flex items-center gap-4"
                >
                  <div className="flex -space-x-2">
                    {['R', 'B', 'D', 'A'].map((i, idx) => (
                      <div
                        key={idx}
                        className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-indigo-400 text-white text-xs font-semibold flex items-center justify-center shadow-sm"
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-neutral-500">
                      Dipakai UMKM, EO, dan agency
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
                className="relative mx-auto w-full max-w-sm lg:max-w-md"
              >
                <div className="absolute inset-0 -m-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-100 via-white to-emerald-50" />
                <img
                  src="/qr-hero.png"
                  alt="Contoh QR code LinkQR"
                  width={400}
                  height={400}
                  className="relative w-full rounded-3xl shadow-xl border border-neutral-100 bg-white p-4"
                />

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -left-4 top-10 rounded-2xl bg-white/95 backdrop-blur border border-neutral-200 px-4 py-3 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <MousePointerClick className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-500">Scan hari ini</p>
                      <p className="text-sm font-semibold text-neutral-900">1.284</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-3 bottom-12 rounded-2xl bg-white/95 backdrop-blur border border-neutral-200 px-4 py-3 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    </span>
                    <p className="text-xs font-medium text-neutral-700">Analitik live</p>
                  </div>
                  <div className="mt-2 flex items-end gap-1 h-8">
                    {[40, 65, 45, 80, 55, 95, 70].map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-2 rounded-sm bg-indigo-500/80 inline-block"
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* DEMO PLAYGROUND */}
        <section id="live-demo" className="py-12 border-y border-neutral-200 bg-neutral-50/70 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-80 h-80 opacity-[0.03] text-indigo-900 pointer-events-none select-none">
            <QrCode className="w-full h-full" />
          </div>

          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="p-8 rounded-3xl border border-neutral-200 bg-white/90 backdrop-blur-sm shadow-xl relative overflow-hidden">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 uppercase tracking-wider">
                  Uji Coba Langsung
                </span>
                <h2 className="text-2xl font-bold text-neutral-900 mt-3">Tes Kemudahan LinkQR Sekarang</h2>
                <p className="text-neutral-500 text-sm mt-1">Masukkan URL bisnismu dan lihat short link serta QR Code yang dihasilkan!</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">1. URL Tujuan Kamu:</label>
                    <input
                      type="url"
                      value={previewUrl}
                      onChange={(e) => setPreviewUrl(e.target.value)}
                      placeholder="https://instagram.com/toko_kamu_promo"
                      className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:border-indigo-600 transition-colors"
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-500">Short Link Yang Dihasilkan:</p>
                      <p className="text-sm font-mono font-semibold text-indigo-600 mt-0.5 truncate max-w-[280px]">
                        https://qr.gertoy.biz.id/s/demo-123
                      </p>
                    </div>
                    <Button
                      onClick={handleCopy}
                      size="sm"
                      variant="outline"
                      className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 gap-1.5"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      <span>{copied ? 'Tercopy!' : 'Copy'}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
                  <div className="p-3 bg-white rounded-xl shadow-md border border-neutral-100">
                    <img src="/qr-demo.png" alt="Preview QR Generated" className="w-28 h-28 object-contain" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 mt-3">Siap Dicetak & Bagikan!</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FITUR BENTO GRID */}
        <section id="fitur" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern mask-radial-fade opacity-70 pointer-events-none" />
          <div className="absolute top-1/4 -left-16 w-[450px] h-[450px] opacity-[0.03] text-indigo-900 pointer-events-none select-none">
            <QrCode className="w-full h-full" />
          </div>

          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Fitur Unggulan</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mt-2">
                Semua yang Kamu Butuhkan untuk Promosi Pintar
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-3xl border border-neutral-200/90 bg-white/90 backdrop-blur-xs p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">QR Code Dinamis Tanpa Batas Cetak</h3>
                <p className="text-neutral-600 mt-2 leading-relaxed">
                  Ubah target URL brosur, menu resto, atau kemasan produkmu kapan saja tanpa perlu cetak ulang. Lebih hemat biaya operasional.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200/90 bg-white/90 backdrop-blur-xs p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">Analitik Real-Time Detail</h3>
                <p className="text-neutral-600 text-sm mt-2">
                  Pantau jumlah scan, statistik kota, jam ramai, hingga jenis HP pengunjungmu secara akurat.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200/90 bg-white/90 backdrop-blur-xs p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">Short Link Kustom</h3>
                <p className="text-neutral-600 text-sm mt-2">
                  Otomatis mendapatkan short link yang rapi untuk dipasang di Bio Instagram atau dikirim via WhatsApp.
                </p>
              </div>

              <div className="md:col-span-2 rounded-3xl border border-neutral-200/90 bg-white/90 backdrop-blur-xs p-8 shadow-sm hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900">Kustomisasi Logo & Warna Brand</h3>
                <p className="text-neutral-600 mt-2">
                  Tambahkan logo bisnismu di tengah QR Code dan ganti warna agar serasi dengan desain brand toko.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING TABLE */}
        <section id="pricing" className="py-24 border-t border-neutral-200 bg-neutral-50/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-[0.03] text-indigo-900 pointer-events-none select-none">
            <QrCode className="w-full h-full" />
          </div>

          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-extrabold text-neutral-900">Pilih Paket Sesuai Kebutuhan</h2>
              <p className="text-neutral-500 text-sm mt-2">Mulai gratis, upgrade kapan saja saat bisnismu berkembang.</p>

              <div className="mt-6 inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Bayar Bulanan
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span>Bayar Tahunan</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Hemat 20%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              <div className="rounded-3xl border border-neutral-200 bg-white/95 p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Starter</h3>
                  <p className="text-xs text-neutral-500 mt-1">Untuk coba-coba & penggunaan pribadi</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-neutral-900">Rp 0</span>
                    <span className="text-xs text-neutral-500"> / selamanya</span>
                  </div>
                  <ul className="space-y-3 text-sm text-neutral-600">
                    {['5 QR Code Dinamis', '1,000 Scan per bulan', 'Analitik Dasar', 'Short Link Standar'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/register?plan=starter" className="mt-8 block">
                  <Button variant="outline" className="w-full border-neutral-300 text-neutral-800 hover:bg-neutral-50">
                    Mulai Gratis
                  </Button>
                </Link>
              </div>

              <div className="rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-xl relative flex flex-col justify-between">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md">
                  Paling Populer 🔥
                </span>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Business Pro</h3>
                  <p className="text-xs text-indigo-600 mt-1">Untuk UMKM & Restoran</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-neutral-900">
                      {/* Angka di landing memang hardcoded (halaman ini dirender
                          tanpa memanggil API paket). Sumber kebenarannya adalah
                          backend/config/plans.php + App\Support\PlanPricing:
                          monthly 59000; yearly 47200 (= 20% lebih murah);
                          tagihan setahun = 47200 x 12 = 566400. Ubah di sini
                          kalau harga di backend berubah. */}
                      {billingCycle === 'yearly' ? 'Rp 47.200' : 'Rp 59.000'}
                    </span>
                    <span className="text-xs text-neutral-500"> / bulan</span>
                    {billingCycle === 'yearly' && (
                      // Dua hal yang harus terlihat saat siklus tahunan:
                      // (1) harga normal dicoret, supaya diskon 20% bisa
                      //     diverifikasi sendiri oleh pengunjung;
                      // (2) total setahun yang benar-benar ditagih, supaya
                      //     "Rp 47.200/bulan" tidak disangka nominal tagihan.
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-xs text-neutral-400">
                          <span className="line-through">Rp 59.000</span>{' '}
                          <span className="font-semibold text-emerald-600">
                            hemat 20%
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500">
                          Ditagih tahunan Rp 566.400
                        </p>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-3 text-sm text-neutral-700">
                    {[
                      'Unlimited QR Code Dinamis',
                      'Unlimited Scan Tanpa Batas',
                      'Analitik Lengkap & Lokasi',
                      'Kustomisasi Logo & Warna',
                      'Ekspor Laporan PDF & Excel',
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/register?plan=business_pro&cycle=${billingCycle}`}
                  className="mt-8 block"
                >
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold border-0 shadow-md">
                    Pilih Paket Pro
                  </Button>
                </Link>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-white/95 p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Enterprise</h3>
                  <p className="text-xs text-neutral-500 mt-1">Custom Domain & Brand Besar</p>
                  <div className="my-6">
                    <span className="text-3xl font-extrabold text-neutral-900">Hubungi Kami</span>
                  </div>
                  <ul className="space-y-3 text-sm text-neutral-600">
                    {[
                      'Semua Fitur Pro',
                      'Custom Domain Sendiri',
                      'Akses API Developer',
                      'Support Prioritas 24/7',
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/register?plan=enterprise" className="mt-8 block">
                  <Button variant="outline" className="w-full border-neutral-300 text-neutral-800 hover:bg-neutral-50">
                    Hubungi Tim
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-[400px] h-[400px] opacity-[0.03] text-indigo-900 pointer-events-none select-none">
            <QrCode className="w-full h-full" />
          </div>

          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <div className="text-center max-w-xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-neutral-900">Pertanyaan Sering Diajukan (FAQ)</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-xs shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-6 text-left font-semibold text-neutral-900 flex items-center justify-between gap-4 hover:bg-neutral-50/80 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 text-neutral-500 transition-transform ${openFaq === idx ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 text-sm text-neutral-600 leading-relaxed border-t border-neutral-200/60 pt-4 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 bg-indigo-600 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Mulai Buat QR Code Dinamis Pertamamu</h2>
            <p className="mt-3 text-indigo-100 max-w-xl mx-auto text-base">
              Gratis tanpa kartu kredit. Cukup 2 menit untuk siap dicetak dan dipakai.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 h-12 shadow-lg border-0">
                  Daftar Sekarang (Gratis)
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white py-10 text-sm text-neutral-500">
        <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <QrCode className="h-4 w-4" />
            </div>
            <span className="font-bold text-neutral-900">LinkQR</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <Link href="/terms" className="hover:text-neutral-900 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
              Kebijakan Privasi
            </Link>
            <a
              href="mailto:support@kovarastudio.id"
              className="hover:text-neutral-900 transition-colors"
            >
              Kontak
            </a>
          </nav>
          <p className="text-xs">&copy; {new Date().getFullYear()} LinkQR — Dibuat dengan ❤️ oleh Kovara Studio</p>
        </div>
      </footer>
    </div>
  );
}