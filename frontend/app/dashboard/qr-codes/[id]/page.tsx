'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, ExternalLink, QrCode as QrIcon, MousePointerClick, Globe, Smartphone, BarChart3, Eye, Trash2, Edit2, Download, CheckCircle2, Clock, Zap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeCanvas } from 'qrcode.react';
import Link from 'next/link';

interface QrDetail {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  color: string;
  logo: string | null;
  is_active: boolean;
  created_at: string;
  scan_count: number;
}

interface Stats {
  total_scans: number;
  last_30_days: Record<string, number>;
  devices: Record<string, number>;
  countries: Record<string, number>;
  recent_logs: any[];
}

export default function QrDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const [qr, setQr] = useState<QrDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qrRes, statsRes] = await Promise.all([
          api.get(`/qr-codes/${id}`),
          api.get(`/qr-codes/${id}/stats`),
        ]);
        setQr(qrRes.data);
        setStats(statsRes.data);
      } catch (err) {
        toast({ title: 'Gagal memuat data', variant: 'destructive' });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router, toast]);

  const copyLink = () => {
    const link = `${window.location.origin}/s/${qr?.short_code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link disalin!' });
  };

  const downloadQR = () => {
    // Trigger download via canvas
    const canvas = document.querySelector('#qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `qr-${qr?.short_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'QR Code didownload!' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat detail QR Code...
        </div>
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <QrIcon className="h-14 w-14 text-neutral-300 mb-3" />
        <p className="text-sm font-semibold text-neutral-800">QR Tidak Ditemukan</p>
        <p className="text-xs text-neutral-500 mt-1">Kode QR ini mungkin sudah dihapus</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  const shortUrl = `${window.location.origin}/s/${qr.short_code}`;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-neutral-600 hover:text-neutral-900 h-9">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadQR} className="gap-2 h-9">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
            qr.is_active 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
          }`}>
            {qr.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: QR Preview & Info */}
        <Card className="md:col-span-2 border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <CardTitle className="text-lg font-bold text-neutral-900">{qr.title}</CardTitle>
              <p className="text-xs text-neutral-500 mt-0.5">ID: {qr.id} • Dibuat {new Date(qr.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            {/* QR Preview */}
            <div className="flex flex-col items-center justify-center py-6 bg-neutral-50/50 rounded-xl border border-neutral-100">
              <div className="p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                <QRCodeCanvas
                  id="qr-canvas"
                  value={shortUrl}
                  size={220}
                  bgColor="#ffffff"
                  fgColor={qr.color || '#4f46e5'}
                  level="H"
                  includeMargin
                  imageSettings={
                    qr.logo
                      ? {
                          src: qr.logo,
                          height: 50,
                          width: 50,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-neutral-900 text-center">Scan untuk menguji</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target URL</span>
                <a href={qr.target_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline break-all group">
                  <span className="truncate max-w-xs">{qr.target_url}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                </a>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Link Pendek</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-neutral-900 flex-1 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">{shortUrl}</span>
                  <Button variant="outline" size="icon" onClick={copyLink} className="h-8 w-8 text-neutral-500 hover:text-indigo-600 hover:border-indigo-200">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Kode Unik</span>
                <span className="font-mono text-lg font-bold text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100 inline-block">{qr.short_code}</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Warna Tema</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-neutral-200" style={{ backgroundColor: qr.color }} />
                  <span className="font-mono text-sm text-neutral-700">{qr.color}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-100">
              <Button onClick={copyLink} variant="outline" className="gap-2 rounded-xl h-10 px-4">
                <Copy className="h-4 w-4" /> Salin Link
              </Button>
              <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 rounded-xl h-10 px-4">
                  <ExternalLink className="h-4 w-4" /> Buka Link
                </Button>
              </a>
              <Link href={`/dashboard/qr-codes/${qr.id}/edit`}>
                <Button variant="ghost" className="gap-2 rounded-xl h-10 px-4">
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Right: Stats */}
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white h-fit sticky top-24" style={{ top: '96px' }}>
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-indigo-600" />
              Statistik Scan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            <div className="flex items-center gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <MousePointerClick className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-neutral-900">{stats?.total_scans ?? 0}</p>
                <p className="text-xs text-neutral-500">Total Scan</p>
              </div>
            </div>

            {(stats?.last_30_days && Object.keys(stats.last_30_days).length > 0) && (
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Scan 30 Hari Terakhir</h4>
                <div className="h-32 flex items-end justify-around gap-1">
                  {Object.entries(stats.last_30_days).slice(-7).map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-indigo-500/20 rounded-t transition-all hover:bg-indigo-500" style={{ height: `${Math.max(1, (count / (Math.max(...Object.values(stats.last_30_days)) || 1)) * 80)}px` }} />
                      <span className="text-[9px] text-neutral-400">{date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(stats?.devices && Object.keys(stats.devices).length > 0) && (
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> Perangkat
                </h4>
                <ul className="space-y-2">
                  {Object.entries(stats.devices).map(([device, count]) => (
                    <li key={device} className="flex justify-between text-sm">
                      <span className="text-neutral-600 capitalize">{device}</span>
                      <span className="font-bold text-neutral-900">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(stats?.countries && Object.keys(stats.countries).length > 0) && (
              <div className="border-t border-neutral-100 pt-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Negara
                </h4>
                <ul className="space-y-2">
                  {Object.entries(stats.countries).slice(0, 5).map(([country, count]) => (
                    <li key={country} className="flex justify-between text-sm">
                      <span className="text-neutral-600">{country}</span>
                      <span className="font-bold text-neutral-900">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* devices/countries/last_30_days semuanya OBJEK, bukan array, jadi
                .length selalu undefined dan syarat lama selalu benar — blok
                "Belum ada data scan" ini muncul bahkan ketika datanya ada. */}
            {Object.keys(stats?.devices ?? {}).length === 0 &&
              Object.keys(stats?.countries ?? {}).length === 0 &&
              Object.keys(stats?.last_30_days ?? {}).length === 0 && (
              <div className="text-center py-8 border-t border-neutral-100">
                <QrIcon className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500">Belum ada data scan</p>
                <p className="text-xs text-neutral-400 mt-1">Bagikan link QR untuk mulai tracking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}