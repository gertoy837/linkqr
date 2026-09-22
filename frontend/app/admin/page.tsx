'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Users,
  QrCode as QrIcon,
  MousePointerClick,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  TrendingUp,
  Search,
  ExternalLink,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';

interface InvoiceRow {
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
  payer_note: string | null;
  admin_note: string | null;
  submitted_at: string | null;
  created_at: string;
  tenant?: { id: number; name: string };
  user?: { id: number; name: string; email: string };
}

interface Overview {
  totals: { tenants: number; users: number; qr_codes: number; scans: number };
  revenue: {
    mrr: number;
    arr: number;
    collected_all_time: number;
    awaiting_verification: number;
    unverified_amount: number;
  };
  plans: { starter: number; business_pro: number; enterprise: number };
  tenants: Array<{
    id: number;
    name: string;
    plan: string;
    plan_name: string;
    expires_at: string | null;
    is_expired: boolean;
    users_count: number;
    qr_codes_count: number;
    created_at: string;
  }>;
}

type Filter = 'awaiting_verification' | 'pending' | 'paid' | 'rejected' | '';

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function planLabel(key: string): string {
  if (key === 'business_pro') return 'Business Pro';
  if (key === 'enterprise') return 'Enterprise';
  return 'Starter';
}

function relativeTime(iso: string | null): string {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function AdminPage() {
  const { toast } = useToast();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('awaiting_verification');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [active, setActive] = useState<InvoiceRow | null>(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState<'verify' | 'reject' | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      try {
        const [ovRes, invRes] = await Promise.all([
          api.get<Overview>('/admin/overview'),
          api.get('/admin/invoices', {
            params: { ...(filter ? { status: filter } : {}), ...(q.trim() ? { q: q.trim() } : {}) },
          }),
        ]);
        setOverview(ovRes.data);
        setInvoices(invRes.data?.data ?? []);
        setCounts(invRes.data?.counts ?? {});
      } catch (err: any) {
        toast({
          title: 'Gagal memuat data admin',
          description: err?.response?.data?.message || 'Coba lagi.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, q, toast]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // New payments should surface without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => load(true), 20000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  // Bukti transfer disajikan lewat endpoint ber-auth, bukan /storage publik,
  // jadi gambarnya diambil sebagai blob memakai bearer token lalu dijadikan
  // object URL. Object URL-nya dicabut saat dialog ditutup supaya tidak bocor.
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active?.proof_path) {
      setProofUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    api
      .get(`/admin/invoices/${active.id}/proof`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setProofUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setProofUrl(null);
      });

    return () => {
      cancelled = true;
      setProofUrl(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [active]);

  const handleDecision = async (kind: 'verify' | 'reject') => {
    if (!active) return;
    setActing(kind);
    try {
      const res = await api.post(`/admin/invoices/${active.id}/${kind}`, {
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast({ title: kind === 'verify' ? 'Pembayaran diverifikasi' : 'Invoice ditolak', description: res.data?.message });
      setActive(null);
      setNote('');
      await load(true);
    } catch (err: any) {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setActing(null);
    }
  };

  const filters: Array<{ key: Filter; label: string; tone: string }> = [
    { key: 'awaiting_verification', label: 'Perlu Verifikasi', tone: 'amber' },
    { key: 'pending', label: 'Belum Bayar', tone: 'neutral' },
    { key: 'paid', label: 'Lunas', tone: 'emerald' },
    { key: 'rejected', label: 'Ditolak', tone: 'red' },
    { key: '', label: 'Semua', tone: 'neutral' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat console admin...
        </div>
      </div>
    );
  }

  const r = overview?.revenue;
  const t = overview?.totals;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Operator Console</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Verifikasi pembayaran QRIS dan pantau performa langganan.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing}
          className="rounded-xl h-9 gap-2 text-xs font-semibold border-neutral-200 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* Money needs attention */}
      {(r?.awaiting_verification ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {r?.awaiting_verification} pembayaran menunggu verifikasi
            </p>
            <p className="text-xs mt-1 text-amber-700">
              Total {rupiah(r?.unverified_amount ?? 0)} belum dikonfirmasi. Pelanggan menunggu paketnya aktif.
            </p>
          </div>
        </div>
      )}

      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'MRR',
            value: rupiah(r?.mrr ?? 0),
            icon: Wallet,
            bg: 'bg-indigo-50 border-indigo-100',
            color: 'text-indigo-600',
            hint: `ARR ${rupiah(r?.arr ?? 0)}`,
          },
          {
            label: 'Total Diterima',
            value: rupiah(r?.collected_all_time ?? 0),
            icon: TrendingUp,
            bg: 'bg-emerald-50 border-emerald-100',
            color: 'text-emerald-600',
            hint: 'Sepanjang waktu',
          },
          {
            label: 'Workspace Aktif',
            value: String(t?.tenants ?? 0),
            icon: Users,
            bg: 'bg-blue-50 border-blue-100',
            color: 'text-blue-600',
            hint: `${t?.users ?? 0} pengguna`,
          },
          {
            label: 'QR & Scan',
            value: `${t?.qr_codes ?? 0}`,
            icon: QrIcon,
            bg: 'bg-amber-50 border-amber-100',
            color: 'text-amber-600',
            hint: `${t?.scans ?? 0} total scan`,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{s.label}</span>
                  <div className={`w-9 h-9 rounded-xl border ${s.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-extrabold text-neutral-900 tracking-tight tabular-nums">{s.value}</p>
                <p className="mt-1 text-[11px] text-neutral-500">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan distribution */}
      {overview && (
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-sm font-bold text-neutral-900">Distribusi Paket</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Starter', count: overview.plans.starter, bar: 'bg-neutral-400' },
                { label: 'Business Pro', count: overview.plans.business_pro, bar: 'bg-indigo-500' },
                { label: 'Enterprise', count: overview.plans.enterprise, bar: 'bg-violet-500' },
              ].map((p) => {
                const total = Math.max(1, t?.tenants ?? 1);
                return (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-neutral-600">{p.label}</span>
                      <span className="text-xs font-bold text-neutral-900 tabular-nums">{p.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full rounded-full ${p.bar}`} style={{ width: `${Math.max(2, (p.count / total) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice queue */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-neutral-900">Antrian Invoice</CardTitle>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nomor / email..."
                className="h-9 pl-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {filters.map((f) => {
              const on = filter === f.key;
              const badge = f.key ? counts[f.key === 'awaiting_verification' ? 'awaiting' : f.key] ?? 0 : 0;
              return (
                <button
                  key={f.key || 'all'}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                    on ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {f.label}
                  {f.key && badge > 0 && (
                    <span className={`px-1.5 rounded-full text-[9px] font-bold ${on ? 'bg-white/20 text-white' : 'bg-white text-neutral-700'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-9 w-9 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-700">Tidak ada invoice di filter ini</p>
              <p className="text-xs text-neutral-500 mt-1">Semua bersih. Kerja bagus 👍</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv) => {
                const awaiting = inv.status === 'awaiting_verification';
                return (
                  <button
                    key={inv.id}
                    onClick={() => { setActive(inv); setNote(''); }}
                    className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                      awaiting ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50' : 'border-neutral-100 hover:bg-neutral-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      inv.status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : awaiting ? 'bg-amber-100 border-amber-200 text-amber-700'
                        : inv.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-600'
                        : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                    }`}>
                      {inv.status === 'paid' ? <CheckCircle2 className="h-5 w-5" />
                        : awaiting ? <Clock className="h-5 w-5" />
                        : inv.status === 'rejected' ? <XCircle className="h-5 w-5" />
                        : <Wallet className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-neutral-900 truncate">{inv.user?.name ?? 'Unknown'}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                          {planLabel(inv.plan)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">{inv.user?.email}</p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {inv.number} · {relativeTime(inv.submitted_at || inv.created_at)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-neutral-900 tabular-nums">{rupiah(inv.total_amount)}</p>
                      <span className={`text-[10px] font-bold ${
                        inv.status === 'paid' ? 'text-emerald-600'
                          : awaiting ? 'text-amber-600'
                          : inv.status === 'rejected' ? 'text-red-600'
                          : 'text-neutral-400'
                      }`}>
                        {inv.status_label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Decision dialog ── */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              {active?.number}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {active?.user?.name} · {active?.user?.email} · {active?.tenant?.name}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="grid md:grid-cols-2 gap-5 pt-2">
              {/* Proof */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Bukti pembayaran
                </p>
                {proofUrl ? (
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={proofUrl}
                      alt="Bukti transfer"
                      className="w-full rounded-xl border border-neutral-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-neutral-200 py-12 text-center">
                    <ImageIcon className="h-7 w-7 text-neutral-300 mx-auto mb-2" />
                    <p className="text-xs text-neutral-500">Belum ada bukti diunggah</p>
                  </div>
                )}
                {active.payer_note && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Catatan pembeli
                    </p>
                    <p className="text-xs text-neutral-700">{active.payer_note}</p>
                  </div>
                )}
              </div>

              {/* Facts + action */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-2.5">
                  {[
                    ['Paket', planLabel(active.plan)],
                    ['Siklus', active.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan'],
                    ['Harga paket', rupiah(active.amount)],
                    ['Kode unik', `+${active.unique_code}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">{k}</span>
                      <span className="font-semibold text-neutral-900 tabular-nums">{v}</span>
                    </div>
                  ))}
                  <div className="pt-2.5 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">Harusnya dibayar</span>
                    <span className="text-base font-extrabold text-indigo-600 tabular-nums">
                      {rupiah(active.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <strong>Cocokkan nominal.</strong> Transfer harus PERSIS {rupiah(active.total_amount)} —
                    3 digit terakhir ({active.unique_code}) itu penanda invoice ini. Kalau beda, kemungkinan
                    itu pembayaran invoice lain.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700">
                    Catatan admin (opsional)
                  </label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={active.status === 'rejected' ? 'Alasan penolakan...' : 'Mis. nominal cocok'}
                    maxLength={500}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                {active.status !== 'paid' ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDecision('verify')}
                      disabled={acting !== null}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 border-0 shadow-sm"
                    >
                      {acting === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Verifikasi &amp; Aktifkan
                    </Button>
                    <Button
                      onClick={() => handleDecision('reject')}
                      disabled={acting !== null}
                      variant="outline"
                      className="h-11 rounded-xl text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                    >
                      {acting === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Tolak
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-800">
                      Invoice ini sudah lunas dan paketnya aktif.
                    </p>
                  </div>
                )}

                {active.admin_note && (
                  <p className="text-[11px] text-neutral-500">
                    Catatan sebelumnya: {active.admin_note}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}