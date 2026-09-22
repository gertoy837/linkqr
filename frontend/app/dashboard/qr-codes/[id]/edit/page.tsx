'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  QrCode as QrIcon,
  Save,
  CheckCircle2,
  Palette,
  Link2,
  Type,
  Info,
  ImagePlus,
  Lock,
  X,
  Power,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { canUseFeature } from '@/lib/auth';
import { isScannableColor } from '@/lib/utils';
import { QRCodeCanvas } from 'qrcode.react';

const PRESET_COLORS = [
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#0f172a', name: 'Slate' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#7c3aed', name: 'Violet' },
];

/** Warna bawaan paket gratis — harus sama dengan QrCode::DEFAULT_COLOR. */
const DEFAULT_COLOR = '#2563EB';

const MAX_LOGO_BYTES = 200 * 1024;
const MAX_LOGO_DIMENSION = 1024;

interface QrDetail {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  color: string;
  logo: string | null;
  is_active: boolean;
}

export default function EditQrPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const id = params.id as string;

  const [qr, setQr] = useState<QrDetail | null>(null);
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bisaKustom = canUseFeature(user, 'logo_branding');

  // Warna asli saat halaman dibuka. Dipakai untuk tahu apakah pemilih warna
  // benar-benar disentuh — paket Starter boleh MENYIMPAN warna lamanya, tapi
  // tidak boleh berpindah ke warna lain.
  const [warnaAsli, setWarnaAsli] = useState(DEFAULT_COLOR);
  const [logoAsli, setLogoAsli] = useState<string | null>(null);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const res = await api.get<QrDetail>(`/qr-codes/${id}`);
        setQr(res.data);
        setTitle(res.data.title);
        setTargetUrl(res.data.target_url);
        setColor(res.data.color || DEFAULT_COLOR);
        setWarnaAsli(res.data.color || DEFAULT_COLOR);
        setLogo(res.data.logo);
        setLogoAsli(res.data.logo);
        setIsActive(res.data.is_active);
      } catch {
        toast({ title: 'Gagal memuat QR Code', variant: 'destructive' });
        router.push('/dashboard/qr-codes');
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, [id, router, toast]);

  const urlLooksValid = /^https?:\/\/.+\..+/i.test(targetUrl.trim());

  const handleLogoPick = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast({
        title: 'Format tidak didukung',
        description: 'Gunakan gambar PNG, JPG, atau WEBP.',
        variant: 'destructive',
      });
      return;
    }

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) {
      toast({ title: 'Gagal membaca file', variant: 'destructive' });
      return;
    }

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = dataUrl;
    });

    if (!img) {
      toast({ title: 'Gambar tidak bisa dibaca', variant: 'destructive' });
      return;
    }

    const skala = Math.min(
      1,
      MAX_LOGO_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
    );

    let hasil = dataUrl;

    if (skala < 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * skala);
      canvas.height = Math.round(img.naturalHeight * skala);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasil = canvas.toDataURL('image/png');
      }
    }

    if (hasil.length > MAX_LOGO_BYTES * 1.4) {
      toast({
        title: 'Logo terlalu besar',
        description: 'Coba gambar yang lebih sederhana, maksimal 200 KB.',
        variant: 'destructive',
      });
      return;
    }

    setLogo(hasil);
    setLogoName(file.name);
  };

  const hapusLogo = () => {
    setLogo(null);
    setLogoName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

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

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        target_url: targetUrl.trim(),
        is_active: isActive,
      };

      // Hanya kirim warna kalau berubah. Paket Starter yang tidak menyentuh
      // pemilih warna tidak boleh ikut mengirim nilai — server akan
      // membacanya sebagai percobaan memakai fitur Pro.
      if (color.toUpperCase() !== warnaAsli.toUpperCase()) {
        payload.color = color;
      }

      // Logo: kirim hanya kalau berubah. Menghapus (null) selalu boleh.
      if (logo !== logoAsli) {
        payload.logo = logo;
      }

      await api.patch(`/qr-codes/${id}`, payload);
      toast({ title: 'Perubahan disimpan!' });
      router.push(`/dashboard/qr-codes/${id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()?.[0] ||
        'Gagal menyimpan perubahan';
      toast({ title: 'Gagal', description: String(msg), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat QR Code...
        </div>
      </div>
    );
  }

  if (!qr) return null;

  const shortUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/s/${qr.short_code}`
    : '';

  const warnaBerubah = color.toUpperCase() !== warnaAsli.toUpperCase();
  const kunciWarna = !bisaKustom && warnaBerubah;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
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
              Edit QR Code
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Link pendek <span className="font-mono">{qr.short_code}</span> tidak
              berubah — QR yang sudah dicetak tetap berlaku.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <Card className="lg:col-span-3 border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-4 border-b border-neutral-100">
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <QrIcon className="h-4 w-4 text-indigo-600" />
              Detail QR Code
            </CardTitle>
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
                  Nama QR Code
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Target URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="target_url"
                  className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900"
                >
                  <Link2 className="h-3.5 w-3.5 text-neutral-400" />
                  Target URL
                </Label>
                <Input
                  id="target_url"
                  type="url"
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
                    Halaman yang dibuka saat QR discan. QR tercetak tidak perlu
                    diganti.
                  </p>
                )}
              </div>

              {/* Status aktif */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4">
                <div className="flex items-start gap-3">
                  <Power className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      QR aktif
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      Kalau dimatikan, QR berhenti mengarahkan ke target (halaman
                      akan menampilkan 404).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                    isActive ? 'bg-indigo-600' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      isActive ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Kustomisasi */}
              <div className="space-y-3 rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                    <Palette className="h-3.5 w-3.5 text-neutral-400" />
                    Kustomisasi Tampilan
                  </Label>

                  {!bisaKustom && (
                    <Link
                      href="/dashboard/billing"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Lock className="h-3 w-3" />
                      Fitur Pro
                    </Link>
                  )}
                </div>

                {!bisaKustom && (
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Paket Starter memakai warna bawaan dan tanpa logo. Upgrade ke
                    Business Pro untuk kustomisasi penuh.
                  </p>
                )}

                {/* Warna */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-700">Warna QR</p>

                  <div
                    className={
                      bisaKustom
                        ? 'flex flex-wrap items-center gap-2'
                        : 'flex flex-wrap items-center gap-2 opacity-50 pointer-events-none select-none'
                    }
                  >
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

                    <label className="relative w-9 h-9 rounded-xl border-2 border-dashed border-neutral-300 cursor-pointer overflow-hidden flex items-center justify-center hover:border-indigo-400 transition-colors">
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

                  {kunciWarna && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Mengganti warna perlu paket Business Pro.
                    </p>
                  )}

                  {!isScannableColor(color) && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Warna ini terlalu muda — QR-nya sulit discan. Pilih warna
                      yang lebih gelap.
                    </p>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-2 border-t border-neutral-100 pt-3">
                  <p className="text-xs font-semibold text-neutral-700">
                    Logo di tengah QR
                  </p>

                  {!bisaKustom ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5">
                      <Lock className="h-4 w-4 text-neutral-400 shrink-0" />
                      <span className="text-xs text-neutral-500">
                        Upgrade ke Business Pro untuk menambahkan logo.
                      </span>
                    </div>
                  ) : logo ? (
                    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo}
                        alt="Pratinjau logo"
                        className="w-10 h-10 rounded-lg object-contain bg-white border border-neutral-100"
                      />
                      <span className="flex-1 min-w-0 text-xs text-neutral-600 truncate">
                        {logoName || 'Logo tersimpan'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={hapusLogo}
                        className="h-8 w-8 text-neutral-500 hover:text-red-600"
                        title="Hapus logo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileRef}
                        id="logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleLogoPick(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                        className="w-full h-10 gap-2 rounded-xl border-dashed text-xs font-semibold"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Pilih gambar logo
                      </Button>
                      <p className="mt-1.5 text-[11px] text-neutral-400">
                        PNG, JPG, atau WEBP. Maksimal 200 KB.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="submit"
                  disabled={saving || !title.trim() || !urlLooksValid}
                  className="w-full sm:w-auto sm:min-w-[190px] h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-500/25 gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/qr-codes/${id}`)}
                  className="w-full sm:w-auto h-11 rounded-xl text-neutral-600 hover:text-neutral-900"
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-24 h-fit">
          <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-neutral-100">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <QrIcon className="h-4 w-4 text-indigo-600" />
                Pratinjau
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className={`p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm ${isActive ? '' : 'opacity-40'}`}>
                  <QRCodeCanvas
                    value={shortUrl}
                    size={176}
                    bgColor="#ffffff"
                    fgColor={color}
                    level="H"
                    includeMargin
                    imageSettings={
                      logo
                        ? {
                            src: logo,
                            height: 40,
                            width: 40,
                            excavate: true,
                          }
                        : undefined
                    }
                  />
                </div>

                {!isActive && (
                  <p className="mt-3 text-[11px] font-semibold text-amber-700">
                    QR sedang nonaktif
                  </p>
                )}

                <div className="mt-4 w-full rounded-xl bg-neutral-50 border border-neutral-100 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Link pendek
                  </p>
                  <p className="text-xs font-mono text-neutral-700 break-all leading-relaxed">
                    {shortUrl.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
