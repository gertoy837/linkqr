'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  QrCode as QrIcon,
  Sparkles,
  Zap,
  CheckCircle2,
  Palette,
  Link2,
  Type,
  Info,
  BarChart3,
  Globe,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeCanvas } from 'qrcode.react';

const PRESET_COLORS = [
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#0f172a', name: 'Slate' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#7c3aed', name: 'Violet' },
];

export default function NewQrPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [loading, setLoading] = useState(false);

  // window is not available during SSR — resolve the origin after mount so the
  // preview never causes a hydration mismatch.
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // A short, readable placeholder slug derived from the QR name.
  const slugPreview = useMemo(() => {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20);
    return base || 'preview';
  }, [title]);

  const previewValue = `${origin}/s/${slugPreview}`;
  const urlLooksValid = /^https?:\/\/.+\..+/i.test(targetUrl.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlLooksValid) {
      toast({
        title: 'URL tidak valid',
        description: 'Target URL harus diawali http:// atau https://',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/qr-codes', {
        title: title.trim(),
        target_url: targetUrl.trim(),
        color,
      });
      toast({ title: 'QR Code berhasil dibuat!' });
      router.push(`/dashboard/qr-codes/${res.data.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()?.[0] ||
        'Gagal membuat QR Code';
      toast({ title: 'Gagal', description: String(msg), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb / Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl text-neutral-600 hover:text-neutral-900"
            title="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Buat QR Code Baru
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              QR dinamis — target URL bisa diubah kapan saja tanpa cetak ulang.
            </p>
          </div>
        </div>

        <Link href="/dashboard/qr-codes" className="hidden sm:block">
          <Button
            variant="outline"
            className="gap-2 h-9 rounded-xl text-xs font-semibold border-neutral-200"
          >
            <QrIcon className="h-3.5 w-3.5" />
            Daftar QR
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── Left: Form ─────────────────────────────────────────── */}
        <Card className="lg:col-span-3 border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-neutral-900">
                  Detail QR Code
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Isi dua kolom wajib, sisanya opsional.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900"
                >
                  <Type className="h-3.5 w-3.5 text-neutral-400" />
                  Nama QR Code <span className="text-indigo-600">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Menu Resto Cabang Kemang"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  required
                  className="h-11 rounded-xl"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">
                    Nama internal untuk memudahkan pencarian di dashboard.
                  </span>
                  <span className="text-neutral-400 tabular-nums">
                    {title.length}/80
                  </span>
                </div>
              </div>

              {/* Target URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="target_url"
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900"
                >
                  <Link2 className="h-3.5 w-3.5 text-neutral-400" />
                  Target URL <span className="text-indigo-600">*</span>
                </Label>
                <Input
                  id="target_url"
                  type="url"
                  placeholder="https://example.com/halaman-tujuan"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  className={`h-11 rounded-xl font-mono text-sm ${
                    targetUrl && !urlLooksValid
                      ? 'border-red-300 focus-visible:ring-red-200'
                      : ''
                  }`}
                />
                {targetUrl && !urlLooksValid ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    URL harus diawali <code className="font-mono">https://</code>
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Halaman yang dibuka saat QR discan — bisa diubah nanti.
                  </p>
                )}
              </div>

              {/* Color */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <Palette className="h-3.5 w-3.5 text-neutral-400" />
                  Warna QR
                </Label>

                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      aria-label={`Pilih warna ${c.name}`}
                      className={`relative w-9 h-9 rounded-xl border-2 transition-all ${
                        color.toLowerCase() === c.hex
                          ? 'border-neutral-900 scale-105 shadow-sm'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {color.toLowerCase() === c.hex && (
                        <CheckCircle2 className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}

                  <label
                    className="relative w-9 h-9 rounded-xl border-2 border-dashed border-neutral-300 cursor-pointer overflow-hidden flex items-center justify-center hover:border-indigo-400 transition-colors"
                    title="Warna kustom"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </label>

                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-28 h-9 font-mono text-xs rounded-xl ml-1"
                    aria-label="Kode warna hex"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="submit"
                  disabled={loading || !title.trim() || !urlLooksValid}
                  className="w-full sm:w-auto sm:min-w-[190px] h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-500/25 gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <QrIcon className="h-4 w-4" />
                      Buat QR Code
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto h-11 rounded-xl text-neutral-600 hover:text-neutral-900"
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Right: Live preview ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-24 h-fit">
          <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-neutral-100">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <QrIcon className="h-4 w-4 text-indigo-600" />
                Pratinjau Langsung
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm">
                  {origin ? (
                    <QRCodeCanvas
                      value={previewValue}
                      size={176}
                      bgColor="#ffffff"
                      fgColor={color}
                      level="H"
                      includeMargin
                    />
                  ) : (
                    <div className="w-[176px] h-[176px] flex items-center justify-center bg-neutral-50 rounded-lg">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="mt-4 w-full rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Link pendek
                  </p>
                  <p className="text-xs font-mono text-neutral-700 break-all leading-relaxed">
                    {origin ? previewValue.replace(/^https?:\/\//, '') : '—'}
                  </p>
                </div>

                <p className="mt-3 text-[11px] text-neutral-400 text-center leading-relaxed">
                  Tampilan ilustrasi. Link pendek asli dibuat otomatis saat kamu
                  menyimpan.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature highlights */}
          <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
            <CardContent className="p-5 space-y-3">
              {[
                {
                  icon: Zap,
                  tone: 'bg-indigo-50 border-indigo-100 text-indigo-600',
                  title: 'Dinamis & bisa diedit',
                  desc: 'Ganti URL target tanpa cetak ulang QR-nya.',
                },
                {
                  icon: BarChart3,
                  tone: 'bg-emerald-50 border-emerald-100 text-emerald-600',
                  title: 'Analitik real-time',
                  desc: 'Perangkat, OS, browser, dan negara tiap scan.',
                },
                {
                  icon: Globe,
                  tone: 'bg-amber-50 border-amber-100 text-amber-600',
                  title: 'Link pendek otomatis',
                  desc: 'Domain kamu sendiri, siap dibagikan.',
                },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg border ${f.tone} flex items-center justify-center shrink-0`}
                  >
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-900">{f.title}</p>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
