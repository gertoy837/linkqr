'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  ExternalLink,
  Trash2,
  Eye,
  QrCode as QrIcon,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QrCode {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  color: string;
  created_at: string;
}

interface Usage {
  qr_used: number;
  qr_limit: number | null;
  qr_remaining: number | null;
}

interface CurrentPlan {
  plan_name: string;
  usage: Usage;
}

export default function QrCodesPage() {
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [qrRes, planRes] = await Promise.all([
        api.get('/qr-codes'),
        api.get('/plan'),
      ]);
      setQrCodes(qrRes.data);
      setPlan(planRes.data?.current ?? null);
    } catch (err) {
      toast({ title: 'Gagal memuat QR', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus QR ini?')) return;
    try {
      await api.delete(`/qr-codes/${id}`);
      toast({ title: 'QR berhasil dihapus' });
      fetchData();
    } catch (err) {
      toast({ title: 'Gagal hapus QR', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat...</div>;
  }

  const usage = plan?.usage;
  const atLimit =
    usage && usage.qr_limit !== null && usage.qr_used >= usage.qr_limit;
  const nearLimit =
    usage &&
    usage.qr_limit !== null &&
    !atLimit &&
    usage.qr_used / usage.qr_limit >= 0.8;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">QR Codes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Kelola semua QR code yang kamu buat
            {usage && (
              <>
                {' · '}
                <span className={atLimit ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                  {usage.qr_used}/{usage.qr_limit ?? '∞'} terpakai
                </span>
              </>
            )}
          </p>
        </div>

        {atLimit ? (
          <Link href="/dashboard/billing">
            <Button className="gap-2 shadow-sm bg-amber-500 hover:bg-amber-600 text-white border-0">
              <Crown className="h-4 w-4" /> Upgrade Paket
            </Button>
          </Link>
        ) : (
          <Link href="/dashboard/qr-codes/new">
            <Button className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700">
              <PlusCircle className="h-4 w-4" /> Buat QR
            </Button>
          </Link>
        )}
      </div>

      {/* Quota notice */}
      {usage && usage.qr_limit !== null && (atLimit || nearLimit) && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            atLimit
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 shrink-0 mt-0.5 ${
              atLimit ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <div className="flex-1">
            <p
              className={`text-sm font-bold ${
                atLimit ? 'text-red-900' : 'text-amber-900'
              }`}
            >
              {atLimit
                ? `Kuota QR paket ${plan?.plan_name} sudah penuh`
                : `Kuota QR hampir penuh (${usage.qr_used}/${usage.qr_limit})`}
            </p>
            <p
              className={`text-xs mt-1 ${
                atLimit ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {atLimit
                ? 'Upgrade paket untuk membuat QR code baru. QR yang sudah ada tetap berjalan normal.'
                : `Tersisa ${usage.qr_remaining} QR lagi pada paket ini.`}
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button
              size="sm"
              className={`rounded-xl h-8 text-xs font-semibold border-0 ${
                atLimit
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              Lihat Paket
            </Button>
          </Link>
        </div>
      )}

      {qrCodes.length === 0 ? (
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <QrIcon className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Belum ada QR</h3>
            <p className="text-sm text-neutral-500 mt-1">Buat QR pertamamu sekarang</p>
            <Link href="/dashboard/qr-codes/new">
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                Buat QR Sekarang
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {qrCodes.map((qr) => (
            <Card
              key={qr.id}
              className="border border-neutral-200/80 shadow-xs hover:shadow-md transition-shadow rounded-2xl bg-white"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <QrIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-neutral-900 truncate">{qr.title}</h3>
                    <p className="text-sm text-neutral-500 truncate">{qr.target_url}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                      <span className="font-mono">/s/{qr.short_code}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                      <span>Dibuat: {new Date(qr.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Link href={`/dashboard/qr-codes/${qr.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-indigo-600">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href={`/s/${qr.short_code}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-indigo-600">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-500 hover:text-red-600"
                    onClick={() => handleDelete(qr.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}