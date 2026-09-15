'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, QrCode as QrIcon, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeCanvas } from 'qrcode.react';
import Link from 'next/link';

export default function NewQrPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/qr-codes', { title, target_url: targetUrl, color });
      toast({ title: 'QR Code berhasil dibuat!' });
      router.push(`/dashboard/qr-codes/${res.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal membuat QR Code';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = targetUrl ? `${window.location.origin}/s/preview-123` : '';

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-neutral-600 hover:text-neutral-900 h-9">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <Link href="/dashboard/qr-codes">
          <Button variant="ghost" className="gap-2 text-neutral-600 hover:text-neutral-900 h-9">
            <QrIcon className="h-4 w-4" /> Daftar QR
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Form */}
        <Card className="md:col-span-2 border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold text-neutral-900">Buat QR Code Baru</CardTitle>
            </div>
            <p className="text-xs text-neutral-500">Isi form di bawah untuk membuat QR code dinamis yang bisa diubah target URL-nya kapan saja.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-neutral-900">
                  Nama QR Code <span className="text-indigo-600">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Kampulan Lebaran 2024"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-11"
                />
                <p className="text-xs text-neutral-500">Nama internal untuk memudahkan pengelolaan</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_url" className="text-sm font-semibold text-neutral-900">
                  Target URL <span className="text-indigo-600">*</span>
                </Label>
                <Input
                  id="target_url"
                  type="url"
                  placeholder="https://example.com/halaman-tujuan"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  className="h-11"
                />
                <p className="text-xs text-neutral-500">URL tujuan saat QR discan (bisa diubah nanti)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-semibold text-neutral-900">
                  Warna Tema
                </Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-neutral-200 cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 font-mono text-sm h-10"
                  />
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    <span>{color}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-500/20 gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Buat QR Code
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white h-fit sticky top-24" style={{ top: '96px' }}>
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <QrIcon className="h-4 w-4 text-indigo-600" />
              Pratinjau
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            <div className="flex flex-col items-center justify-center py-6 bg-neutral-50/50 rounded-xl border border-neutral-100">
              <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                <QRCodeCanvas
                  value={previewUrl || `${window.location.origin}/s/preview-123`}
                  size={180}
                  bgColor="#ffffff"
                  fgColor={color}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="mt-3 text-xs text-neutral-500 text-center">QR akan ter-generate setelah disimpan</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <Zap className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">Dinamis & Editabile</p>
                  <p className="text-xs text-neutral-500">Ubah URL target tanpa cetak ulang</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">Analitik Real-time</p>
                  <p className="text-xs text-neutral-500">Tracking lokasi, device, browser</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">Custom Branding</p>
                  <p className="text-xs text-neutral-500">Warna custom + logo (coming soon)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}