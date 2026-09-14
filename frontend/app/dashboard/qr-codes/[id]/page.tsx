'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, ExternalLink, QrCode as QrIcon, MousePointerClick } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { QRCodeCanvas } from 'qrcode.react';

interface QrDetail {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  color: string;
  created_at: string;
}

interface Stats {
  total_scans: number;
  per_day: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
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
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const copyLink = () => {
    const link = `${window.location.origin}/s/${qr?.short_code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link disalin!' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat...</div>;
  }

  if (!qr) {
    return <div>QR tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-slate-600 dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">{qr.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <QRCodeCanvas
                value={`${window.location.origin}/s/${qr.short_code}`}
                size={200}
                bgColor="#ffffff"
                fgColor={qr.color || '#4f46e5'}
                level="H"
                includeMargin
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-500 dark:text-slate-400 min-w-20">Target:</span>
                <a href={qr.target_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                  {qr.target_url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-500 dark:text-slate-400 min-w-20">Kode pendek:</span>
                <span className="font-mono text-slate-900 dark:text-white">{qr.short_code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-500 dark:text-slate-400 min-w-20">Dibuat:</span>
                <span className="text-slate-700 dark:text-slate-300">{new Date(qr.created_at).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={copyLink} variant="outline" className="gap-2">
                <Copy className="h-4 w-4" /> Salin Link
              </Button>
              <a href={`/s/${qr.short_code}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Buka
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">Statistik Scan</CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                    <MousePointerClick className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_scans}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total scan</p>
                  </div>
                </div>

                {Object.keys(stats.devices || {}).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Perangkat</h4>
                    <ul className="space-y-1.5">
                      {Object.entries(stats.devices || {}).map(([device, count]) => (
                        <li key={device} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                          <span>{device}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Object.keys(stats.browsers || {}).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Browser</h4>
                    <ul className="space-y-1.5">
                      {Object.entries(stats.browsers || {}).map(([browser, count]) => (
                        <li key={browser} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                          <span>{browser}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Object.keys(stats.devices || {}).length === 0 && Object.keys(stats.browsers || {}).length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data scan.</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <QrIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data scan.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}