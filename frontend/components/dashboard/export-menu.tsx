'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  FileText,
  Sheet,
  Loader2,
  Lock,
  Crown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const RANGES = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
  { days: 365, label: '1 tahun' },
];

export function ExportMenu({
  open,
  onOpenChange,
  featureEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureEnabled: boolean;
}) {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (format: 'pdf' | 'csv', scope: 'analytics' | 'qr-codes') => {
    const label = `${scope}-${format}`;
    setBusy(label);

    try {
      const res = await api.get(`/export/${scope}`, {
        params: { days, format },
        responseType: 'blob',
      });

      // Nama file diambil dari header Content-Disposition supaya konsisten
      // dengan yang dibuat server; fallback ke nama manual kalau header absen.
      const disposition = res.headers['content-disposition'] || '';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `linkqr-${scope}-${days}h.${format}`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Export siap', description: `${filename} sedang diunduh.` });
      onOpenChange(false);
    } catch (err: any) {
      // responseType blob membuat pesan error JSON ikut jadi blob — harus
      // dibaca ulang supaya pesannya bisa ditampilkan, bukan "[object Blob]".
      let message = 'Gagal mengekspor laporan.';
      const blob = err?.response?.data;
      if (blob instanceof Blob) {
        try {
          const parsed = JSON.parse(await blob.text());
          message = parsed?.message || message;
        } catch {
          /* biarkan pesan default */
        }
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }

      toast({ title: 'Export gagal', description: message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-600" />
            Ekspor Laporan
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Unduh data analitik atau daftar QR untuk arsip dan laporan klien.
          </DialogDescription>
        </DialogHeader>

        {!featureEnabled ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Fitur ini bagian dari Business Pro
                </p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Paket Starter belum termasuk ekspor laporan. Upgrade untuk membuka
                  unduhan PDF & Excel tanpa batas.
                </p>
              </div>
            </div>

            <Link href="/dashboard/billing" className="block">
              <Button className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 border-0 shadow-sm shadow-indigo-500/20">
                <Crown className="h-4 w-4" />
                Upgrade ke Business Pro
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Rentang waktu
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {RANGES.map((r) => (
                  <button
                    key={r.days}
                    onClick={() => setDays(r.days)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      days === r.days
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Laporan Analitik
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => download('pdf', 'analytics')}
                  className="h-11 rounded-xl text-xs font-semibold gap-2 border-neutral-300 hover:border-indigo-300 hover:text-indigo-600"
                >
                  {busy === 'analytics-pdf' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => download('csv', 'analytics')}
                  className="h-11 rounded-xl text-xs font-semibold gap-2 border-neutral-300 hover:border-emerald-300 hover:text-emerald-600"
                >
                  {busy === 'analytics-csv' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sheet className="h-3.5 w-3.5" />
                  )}
                  Excel (CSV)
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Daftar QR Code
              </p>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => download('csv', 'qr-codes')}
                className="w-full h-11 rounded-xl text-xs font-semibold gap-2 border-neutral-300 hover:border-emerald-300 hover:text-emerald-600"
              >
                {busy === 'qr-codes-csv' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sheet className="h-3.5 w-3.5" />
                )}
                Excel (CSV)
              </Button>
            </div>

            <p className="text-[10px] text-neutral-400 leading-relaxed">
              CSV bisa dibuka langsung di Excel dan Google Sheets. PDF siap dikirim
              ke klien atau dicetak.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}