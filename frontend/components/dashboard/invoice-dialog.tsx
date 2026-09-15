'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  QrCode as QrIcon,
  Copy,
  Check,
  Clock,
  Upload,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Building2,
  Smartphone,
  FileImage,
  X,
} from 'lucide-react';

export interface InvoiceInstructions {
  driver: string;
  driver_label: string;
  merchant: string | null;
  nmid: string | null;
  qris_image: string | null;
  amount: number;
  unique_code: number;
  amount_to_pay: number;
  steps: string[];
  bank: { name?: string; account?: string; holder?: string };
  expires_at: string | null;
  configured: boolean;
}

export interface Invoice {
  id: number;
  number: string;
  plan: string;
  billing_cycle: string;
  amount: number;
  unique_code: number;
  total_amount: number;
  status: string;
  status_label: string;
  proof_path: string | null;
  admin_note: string | null;
  payer_note: string | null;
  expires_at: string | null;
}

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function useCountdown(expiresAt: string | null) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (left === null) return null;

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  return {
    expired: left <= 0,
    label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

export function InvoiceDialog({
  open,
  onOpenChange,
  invoice,
  instructions,
  onProofUploaded,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  instructions: InvoiceInstructions | null;
  onProofUploaded: () => void;
  onCancelled: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const countdown = useCountdown(invoice?.expires_at ?? null);

  // Reset transient form state whenever a different invoice is opened.
  useEffect(() => {
    if (open) {
      setNote('');
      setFile(null);
      setPreview(null);
      setCopied(false);
    }
  }, [open, invoice?.id]);

  const amountToPay = instructions?.amount_to_pay ?? invoice?.total_amount ?? 0;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(amountToPay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Gagal menyalin', variant: 'destructive' });
    }
  }, [amountToPay, toast]);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleUpload = async () => {
    if (!invoice || !file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('proof', file);
      if (note.trim()) fd.append('payer_note', note.trim());

      await api.post(`/invoices/${invoice.id}/proof`, fd);
      toast({
        title: 'Bukti terkirim',
        description: 'Menunggu verifikasi admin. Biasanya selesai dalam beberapa menit.',
      });
      onProofUploaded();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Gagal mengunggah',
        description: err?.response?.data?.message || 'Coba lagi sebentar.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    if (!confirm('Batalkan invoice ini? Kamu bisa membuat yang baru kapan saja.')) return;
    setCancelling(true);
    try {
      await api.post(`/invoices/${invoice.id}/cancel`);
      toast({ title: 'Invoice dibatalkan' });
      onCancelled();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Gagal membatalkan',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!invoice || !instructions) return null;

  const awaiting = invoice.status === 'awaiting_verification';
  const rejected = invoice.status === 'rejected';
  const expired = countdown?.expired || invoice.status === 'expired';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <QrIcon className="h-5 w-5 text-indigo-600" />
            Pembayaran {invoice.number}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {instructions.driver_label} · Paket {invoice.plan} ({invoice.billing_cycle === 'yearly' ? 'tahunan' : 'bulanan'})
          </DialogDescription>
        </DialogHeader>

        {/* Status strips */}
        {expired && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs">
              <p className="font-bold text-red-900">Invoice sudah kedaluwarsa</p>
              <p className="text-red-700 mt-0.5">Tutup dialog ini dan buat invoice baru dari daftar paket.</p>
            </div>
          </div>
        )}

        {awaiting && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs">
              <p className="font-bold text-amber-900">Menunggu verifikasi admin</p>
              <p className="text-amber-700 mt-0.5">
                Bukti sudah diterima. Paket aktif otomatis begitu admin konfirmasi.
              </p>
            </div>
          </div>
        )}

        {rejected && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <X className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs">
              <p className="font-bold text-red-900">Bukti sebelumnya ditolak</p>
              {invoice.admin_note && <p className="text-red-700 mt-0.5">{invoice.admin_note}</p>}
              <p className="text-red-700 mt-0.5">Unggah ulang bukti yang benar di bawah.</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* ── Left: QRIS ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
              {instructions.qris_image ? (
                <img
                  src={instructions.qris_image}
                  alt={`QRIS ${instructions.merchant ?? ''}`}
                  className="w-full max-w-[280px] mx-auto rounded-xl border border-neutral-100"
                />
              ) : (
                <div className="py-12 text-xs text-neutral-500">
                  Gambar QRIS belum dikonfigurasi.
                  <br />
                  Hubungi admin untuk menyelesaikan pembayaran.
                </div>
              )}

              <div className="mt-4 space-y-1">
                {instructions.merchant && (
                  <p className="text-xs font-bold text-neutral-900">{instructions.merchant}</p>
                )}
                {instructions.nmid && (
                  <p className="text-[10px] font-mono text-neutral-400">NMID {instructions.nmid}</p>
                )}
              </div>
            </div>

            {Object.keys(instructions.bank).length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Atau transfer bank
                </p>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-neutral-900">{instructions.bank.name}</p>
                  <p className="font-mono text-neutral-700">{instructions.bank.account}</p>
                  <p className="text-neutral-500">a.n. {instructions.bank.holder}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: amount + upload ── */}
          <div className="space-y-5">
            {/* Amount */}
            <Card className="border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl shadow-none">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                  Nominal yang harus dibayar
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-2xl font-extrabold text-neutral-900 tracking-tight tabular-nums">
                    {rupiah(amountToPay)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-8 rounded-lg text-[11px] font-semibold gap-1.5 border-indigo-200 bg-white hover:bg-indigo-50 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Tercopy
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-600">
                  <span>Harga paket</span>
                  <span className="tabular-nums">{rupiah(instructions.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-600">
                  <span>Kode unik</span>
                  <span className="tabular-nums">+{instructions.unique_code}</span>
                </div>

                <p className="mt-3 text-[10px] text-indigo-700 bg-indigo-100/70 rounded-lg px-2.5 py-1.5 leading-relaxed">
                  <strong>Penting:</strong> transfer dengan nominal PERSIS. 3 digit terakhir itu penanda
                  agar admin bisa mencocokkan pembayaranmu.
                </p>
              </CardContent>
            </Card>

            {/* Countdown */}
            {countdown && !expired && (
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-neutral-600">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  Sisa waktu bayar
                </span>
                <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums">
                  {countdown.label}
                </span>
              </div>
            )}

            {/* Steps */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Cara bayar
              </p>
              <ol className="space-y-2">
                {instructions.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[11px] text-neutral-600 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-neutral-100 text-neutral-500 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Upload */}
            {!expired && invoice.status !== 'paid' && (
              <div className="pt-4 border-t border-neutral-100 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {awaiting || rejected ? 'Unggah ulang bukti' : 'Konfirmasi pembayaran'}
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-neutral-300 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors p-4 text-center"
                >
                  {preview ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={preview}
                        alt="Pratinjau bukti"
                        className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-neutral-900 truncate">{file?.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {file ? `${(file.size / 1024).toFixed(0)} KB` : ''} · klik untuk ganti
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="h-5 w-5 text-neutral-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-700">
                        Pilih screenshot / foto bukti
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        JPG, PNG, WebP, atau PDF · maks 4 MB
                      </p>
                    </div>
                  )}
                </button>

                <div className="space-y-1.5">
                  <Label htmlFor="payer_note" className="text-[11px] font-semibold text-neutral-700">
                    Catatan (opsional)
                  </Label>
                  <Input
                    id="payer_note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Mis. dibayar dari GoPay 0812xxxx"
                    maxLength={500}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-2 shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Mengunggah...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Kirim Bukti Pembayaran
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="h-10 rounded-xl text-xs font-semibold border-neutral-200 text-neutral-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* Already submitted */}
            {(awaiting || invoice.status === 'paid') && invoice.proof_path && (
              <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 border border-neutral-200 px-3.5 py-2.5">
                <FileImage className="h-4 w-4 text-neutral-400 shrink-0" />
                <span className="text-[11px] text-neutral-600 truncate">
                  Bukti sudah diunggah
                </span>
                {invoice.status === 'paid' ? (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> LUNAS
                  </span>
                ) : (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-600 shrink-0">
                    <Clock className="h-3 w-3" /> MENUNGGU
                  </span>
                )}
              </div>
            )}

            <p className="text-[10px] text-neutral-400 flex items-start gap-1.5 leading-relaxed">
              <Smartphone className="h-3 w-3 mt-0.5 shrink-0" />
              Simpan halaman ini atau screenshot nominalnya. Kalau ada masalah, hubungi admin dengan
              nomor invoice <span className="font-mono">{invoice.number}</span>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}