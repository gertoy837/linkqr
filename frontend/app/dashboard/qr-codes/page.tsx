'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ExternalLink, Trash2, Eye, QrCode as QrIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QrCode {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  color: string;
  created_at: string;
}

export default function QrCodesPage() {
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQrCodes = async () => {
    try {
      const res = await api.get('/qr-codes');
      setQrCodes(res.data);
    } catch (err) {
      toast({ title: 'Gagal memuat QR', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCodes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus QR ini?')) return;
    try {
      await api.delete(`/qr-codes/${id}`);
      toast({ title: 'QR berhasil dihapus' });
      fetchQrCodes();
    } catch (err) {
      toast({ title: 'Gagal hapus QR', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">QR Codes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola semua QR code yang kamu buat</p>
        </div>
        <Link href="/dashboard/qr-codes/new">
          <Button className="gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" /> Buat QR
          </Button>
        </Link>
      </div>

      {qrCodes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <QrIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Belum ada QR</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Buat QR pertamamu sekarang</p>
            <Link href="/dashboard/qr-codes/new">
              <Button className="mt-6">Buat QR Sekarang</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
                    <QrIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white truncate">{qr.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{qr.target_url}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Kode: {qr.short_code}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                      <span>Dibuat: {new Date(qr.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Link href={`/dashboard/qr-codes/${qr.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href={`/s/${qr.short_code}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600" onClick={() => handleDelete(qr.id)}>
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