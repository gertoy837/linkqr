'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Check,
  Sparkles,
  QrCode as QrIcon,
  MousePointerClick,
  AlertTriangle,
  RefreshCw,
  Crown,
  Infinity as InfinityIcon,
  Clock,
  ReceiptText,
  History,
} from 'lucide-react';
import { InvoiceDialog, type Invoice, type InvoiceInstructions } from '@/components/dashboard/invoice-dialog';

interface Usage {
  qr_used: number;
  qr_limit: number | null;
  qr_remaining: number | null;
  scans_used: number;
  scan_limit: number | null;
  scan_remaining: number | null;
  over_scan_limit: boolean;
}

interface CurrentPlan {
  plan: string;
  plan_name: string;
  billing_cycle: string;
  plan_expires_at: string | null;
  is_expired: boolean;
  usage: Usage;
  features: string[];
}

interface PlanOption {
  key: string;
  name: string;
  tagline: string;
  price: { monthly: number | null; yearly: number | null };
  limits: { qr_codes: number | null; scans_per_month: number | null };
  features: string[];
  popular: boolean;
  contact_only: boolean;
}

interface PlanResponse {
  current: CurrentPlan;
  plans: PlanOption[];
}

function rupiah(n: number | null): string {
  if (n === null) return 'Hubungi Kami';
  if (n === 0) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function limitLabel(n: number | null, unit: string): string {
  if (n === null) return `Unlimited ${unit}`;
  return `${n.toLocaleString('id-ID')} ${unit}`;
}

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment flow: a paid plan now creates an invoice instead of flipping the
  // plan server-side, so the dialog carries the QRIS + proof upload.
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [activeInstructions, setActiveInstructions] = useState<InvoiceInstructions | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const [planRes, invRes] = await Promise.all([
        api.get<PlanResponse>('/plan'),
        api.get<Invoice[]>('/invoices'),
      ]);
      setData(planRes.data);
      setCycle(planRes.data.current.billing_cycle === 'yearly' ? 'yearly' : 'monthly');
      setInvoices(invRes.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal memuat data paket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleSelect = async (planKey: string) => {
    const target = data?.plans.find((p) => p.key === planKey);

    if (target?.contact_only) {
      toast({
        title: 'Paket Enterprise',
        description: 'Paket ini diaktifkan lewat tim kami. Hubungi support untuk melanjutkan.',
      });
      return;
    }

    setSwitching(planKey);
    try {
      // POST /invoices is the single entry point: a free plan flips directly,
      // a paid plan returns an invoice + the QRIS instructions to display.
      const res = await api.post('/invoices', {
        plan: planKey,
        billing_cycle: cycle,
      });

      if (res.data?.requires_payment === false) {
        toast({
          title: 'Paket diperbarui',
          description: res.data?.message || 'Paket berhasil diubah.',
        });
        await fetchPlan();
        return;
      }

      setActiveInvoice(res.data.invoice as Invoice);
      setActiveInstructions(res.data.instructions as InvoiceInstructions);
      setDialogOpen(true);
      await fetchPlan();
    } catch (err: any) {
      toast({
        title: 'Gagal memproses paket',
        description: err?.response?.data?.message || 'Coba lagi sebentar.',
        variant: 'destructive',
      });
    } finally {
      setSwitching(null);
    }
  };

  const openInvoice = async (inv: Invoice) => {
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setActiveInvoice(res.data.invoice as Invoice);
      setActiveInstructions(res.data.instructions as InvoiceInstructions);
      setDialogOpen(true);
    } catch (err: any) {
      toast({
        title: 'Gagal membuka invoice',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat paket...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error || 'Data paket tidak tersedia.'}
      </div>
    );
  }

  const { current, plans } = data;
  const qrPct =
    current.usage.qr_limit && current.usage.qr_limit > 0
      ? Math.min(100, (current.usage.qr_used / current.usage.qr_limit) * 100)
      : 0;
  const scanPct =
    current.usage.scan_limit && current.usage.scan_limit > 0
      ? Math.min(100, (current.usage.scans_used / current.usage.scan_limit) * 100)
      : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Paket &amp; Tagihan
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Kelola paket langganan dan pantau pemakaian kuota workspace kamu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPlan}
          className="rounded-xl h-9 gap-2 text-xs font-semibold border-neutral-200 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Muat Ulang
        </Button>
      </div>

      {/* Current plan banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-7 text-white border border-indigo-700/30 shadow-xl shadow-indigo-900/10">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
              <Crown className="h-3.5 w-3.5 text-indigo-300" />
              Paket Aktif
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{current.plan_name}</h2>
            <p className="text-indigo-200/80 text-sm">
              {user?.tenant?.name ? `${user.tenant.name} · ` : ''}
              Siklus {current.billing_cycle === 'yearly' ? 'tahunan' : 'bulanan'}
              {current.plan_expires_at && (
                <>
                  {' · aktif s/d '}
                  {new Date(current.plan_expires_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </>
              )}
            </p>
          </div>

          {current.is_expired && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-100 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Paket sudah kedaluwarsa
            </div>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <QrIcon className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900">Kuota QR Code</p>
                  <p className="text-[11px] text-neutral-500">
                    {current.usage.qr_limit === null
                      ? 'Tanpa batas'
                      : `${current.usage.qr_remaining} tersisa`}
                  </p>
                </div>
              </div>
              <span className="text-lg font-extrabold text-neutral-900 tabular-nums">
                {current.usage.qr_used}
                <span className="text-neutral-400 font-semibold">
                  /{current.usage.qr_limit ?? '∞'}
                </span>
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  qrPct >= 100 ? 'bg-red-500' : qrPct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${current.usage.qr_limit === null ? 4 : Math.max(2, qrPct)}%` }}
              />
            </div>

            {current.usage.qr_limit !== null && qrPct >= 100 && (
              <p className="mt-3 text-xs text-red-600 font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Kuota habis — upgrade untuk membuat QR baru.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <MousePointerClick className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900">Scan Bulan Ini</p>
                  <p className="text-[11px] text-neutral-500">
                    {current.usage.scan_limit === null
                      ? 'Tanpa batas'
                      : `${current.usage.scan_remaining} tersisa`}
                  </p>
                </div>
              </div>
              <span className="text-lg font-extrabold text-neutral-900 tabular-nums">
                {current.usage.scans_used}
                <span className="text-neutral-400 font-semibold">
                  /{current.usage.scan_limit ?? '∞'}
                </span>
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  scanPct >= 100 ? 'bg-red-500' : scanPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${current.usage.scan_limit === null ? 4 : Math.max(2, scanPct)}%`,
                }}
              />
            </div>

            {current.usage.over_scan_limit && (
              <p className="mt-3 text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Melebihi kuota bulanan — QR tetap jalan, tapi pertimbangkan upgrade.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan catalogue */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl font-bold text-neutral-900">Ubah Paket</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Aktif langsung tanpa gateway pembayaran. Sambungkan Midtrans/Stripe kapan saja.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-50 border border-neutral-200">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                cycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                cycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Tahunan
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                Hemat 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = plan.key === current.plan;
            const price = plan.contact_only
              ? null
              : cycle === 'yearly'
                ? plan.price.yearly
                : plan.price.monthly;

            return (
              <div
                key={plan.key}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-shadow ${
                  plan.popular
                    ? 'border-2 border-indigo-600 bg-white shadow-xl'
                    : 'border border-neutral-200 bg-white shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md whitespace-nowrap">
                    Paling Populer 🔥
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide shadow-md">
                    Paket Kamu
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{plan.tagline}</p>

                  <div className="my-5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                      {rupiah(price)}
                    </span>
                    {!plan.contact_only && price !== null && price > 0 && (
                      <span className="text-xs text-neutral-500">/ bulan</span>
                    )}
                  </div>

                  <div className="mb-5 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <QrIcon className="h-3.5 w-3.5 text-neutral-400" />
                      {limitLabel(plan.limits.qr_codes, 'QR Code')}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600">
                      {plan.limits.scans_per_month === null ? (
                        <InfinityIcon className="h-3.5 w-3.5 text-neutral-400" />
                      ) : (
                        <MousePointerClick className="h-3.5 w-3.5 text-neutral-400" />
                      )}
                      {limitLabel(plan.limits.scans_per_month, 'scan/bulan')}
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-sm text-neutral-600">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check
                          className={`h-4 w-4 shrink-0 mt-0.5 ${
                            plan.popular ? 'text-indigo-600' : 'text-emerald-600'
                          }`}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleSelect(plan.key)}
                  disabled={isCurrent || switching === plan.key}
                  className={`mt-7 w-full h-11 rounded-xl font-semibold gap-2 ${
                    isCurrent
                      ? 'bg-neutral-100 text-neutral-500 border border-neutral-200 hover:bg-neutral-100'
                      : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 border-0'
                        : 'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {switching === plan.key && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {isCurrent
                    ? 'Paket Aktif'
                    : plan.contact_only
                      ? 'Hubungi Tim'
                      : plan.key === 'starter'
                        ? 'Turun ke Starter'
                        : 'Pilih Paket Ini'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice history */}
      {invoices.length > 0 && (
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                Riwayat Tagihan
              </CardTitle>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {showHistory ? 'Sembunyikan' : `Lihat (${invoices.length})`}
              </button>
            </div>
          </CardHeader>

          {showHistory && (
            <CardContent className="pt-4 space-y-2.5">
              {invoices.map((inv) => {
                const actionable = ['pending', 'awaiting_verification', 'rejected'].includes(inv.status);
                return (
                  <button
                    key={inv.id}
                    onClick={() => openInvoice(inv)}
                    disabled={!actionable}
                    className={`w-full text-left flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
                      actionable
                        ? 'border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50'
                        : 'border-neutral-100 hover:bg-neutral-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : inv.status === 'awaiting_verification'
                            ? 'bg-amber-50 border-amber-100 text-amber-600'
                            : inv.status === 'rejected'
                              ? 'bg-red-50 border-red-100 text-red-600'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                      }`}
                    >
                      <ReceiptText className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {inv.plan === 'business_pro' ? 'Business Pro' : inv.plan} ·{' '}
                        {inv.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan'}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{inv.number}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-neutral-900 tabular-nums">
                        {rupiah(inv.total_amount)}
                      </p>
                      <span
                        className={`text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'text-emerald-600'
                            : inv.status === 'awaiting_verification'
                              ? 'text-amber-600'
                              : inv.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-neutral-500'
                        }`}
                      >
                        {inv.status_label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* Footer note */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-neutral-50/60">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">Pembayaran via QRIS</p>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              Bayar paket berbayar dengan scan QRIS, lalu unggah bukti transfer. Admin akan
              memverifikasi dan paket aktif otomatis. Gateway otomatis (Midtrans/Stripe) bisa
              ditambahkan nanti tanpa mengubah halaman ini.
            </p>
          </div>
        </CardContent>
      </Card>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={activeInvoice}
        instructions={activeInstructions}
        onProofUploaded={fetchPlan}
        onCancelled={fetchPlan}
      />
    </div>
  );
}