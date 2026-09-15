'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Search,
  RefreshCw,
  Users,
  QrCode as QrIcon,
  Wallet,
  Ban,
  CheckCircle2,
  Crown,
  AlertTriangle,
  CalendarPlus,
  Loader2,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface TenantRow {
  id: number;
  name: string;
  slug: string;
  plan: string;
  plan_name: string;
  is_active: boolean;
  plan_expires_at: string | null;
  is_expired: boolean;
  users_count: number;
  qr_codes_count: number;
  collected_total: number;
  last_scan_at: string | null;
  created_at: string | null;
}

interface TenantDetail extends TenantRow {
  domain: string | null;
  billing_cycle: string;
  features: string[];
  users: Array<{ id: number; name: string; email: string; is_admin: boolean }>;
  qr_codes: Array<{
    id: number;
    title: string;
    short_code: string;
    scan_count: number;
    is_active: boolean;
    last_scanned_at: string | null;
  }>;
  invoices: Array<{
    id: number;
    number: string;
    plan: string;
    total_amount: number;
    status: string;
    status_label: string;
    created_at: string;
  }>;
}

interface Counts {
  total: number;
  active: number;
  suspended: number;
  expired: number;
  paying: number;
}

type StatusFilter = '' | 'active' | 'suspended' | 'expired';

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'belum pernah';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'belum pernah';
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function AdminTenantsPage() {
  const { toast } = useToast();

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [planFilter, setPlanFilter] = useState('');

  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [targetPlan, setTargetPlan] = useState('business_pro');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      try {
        const res = await api.get('/admin/tenants', {
          params: {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(status ? { status } : {}),
            ...(planFilter ? { plan: planFilter } : {}),
          },
        });
        setTenants(res.data?.data ?? []);
        setCounts(res.data?.counts ?? null);
      } catch (err: any) {
        toast({
          title: 'Gagal memuat workspace',
          description: err?.response?.data?.message || 'Coba lagi.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [q, status, planFilter, toast]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      const t = res.data.tenant as TenantDetail;
      setDetail(t);
      setDays(30);
      setTargetPlan(t.plan === 'starter' ? 'business_pro' : 'business_pro');
    } catch (err: any) {
      toast({
        title: 'Gagal membuka detail',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const act = async (
    label: string,
    fn: () => Promise<any>,
    successKey = 'message'
  ) => {
    setBusy(label);
    try {
      const res = await fn();
      toast({
        title: 'Berhasil',
        description: res?.data?.[successKey] || 'Perubahan tersimpan.',
      });
      await load(true);
      if (detail) await openDetail(detail.id);
    } catch (err: any) {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const filters: Array<{ key: StatusFilter; label: string; count?: number }> = useMemo(
    () => [
      { key: '', label: 'Semua', count: counts?.total },
      { key: 'active', label: 'Aktif', count: counts?.active },
      { key: 'suspended', label: 'Nonaktif', count: counts?.suspended },
      { key: 'expired', label: 'Kedaluwarsa', count: counts?.expired },
    ],
    [counts]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Workspace</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Kelola semua workspace klien: ubah paket, perpanjang masa aktif, atau hentikan layanan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 text-xs font-semibold border-neutral-200"
            >
              Antrian Invoice
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-xl h-9 gap-2 text-xs font-semibold border-neutral-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Summary */}
      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Workspace', value: counts.total, icon: Building2, tone: 'indigo' },
            { label: 'Aktif', value: counts.active, icon: CheckCircle2, tone: 'emerald' },
            { label: 'Berbayar', value: counts.paying, icon: Crown, tone: 'amber' },
            {
              label: 'Nonaktif / Kedaluwarsa',
              value: counts.suspended + counts.expired,
              icon: AlertTriangle,
              tone: 'red',
            },
          ].map((s) => {
            const Icon = s.icon;
            const tones: Record<string, string> = {
              indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
              emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
              amber: 'bg-amber-50 border-amber-100 text-amber-600',
              red: 'bg-red-50 border-red-100 text-red-600',
            };
            return (
              <Card
                key={s.label}
                className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {s.label}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl border ${tones[s.tone]} flex items-center justify-center`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-neutral-900 tabular-nums">
                    {s.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-neutral-900">Daftar Workspace</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700"
              >
                <option value="">Semua paket</option>
                <option value="starter">Starter</option>
                <option value="business_pro">Business Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama / email..."
                  className="h-9 pl-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {filters.map((f) => {
              const on = status === f.key;
              return (
                <button
                  key={f.key || 'all'}
                  onClick={() => setStatus(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                    on
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {f.label}
                  {typeof f.count === 'number' && f.count > 0 && (
                    <span
                      className={`px-1.5 rounded-full text-[9px] font-bold ${
                        on ? 'bg-white/20 text-white' : 'bg-white text-neutral-700'
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {tenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-9 w-9 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-700">Tidak ada workspace</p>
              <p className="text-xs text-neutral-500 mt-1">Coba ubah filter atau kata kunci.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openDetail(t.id)}
                  className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                    !t.is_active
                      ? 'border-red-100 bg-red-50/40 hover:bg-red-50'
                      : t.is_expired
                        ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'
                        : 'border-neutral-100 hover:bg-neutral-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      !t.is_active
                        ? 'bg-red-100 border-red-200 text-red-600'
                        : t.plan === 'business_pro'
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {!t.is_active ? (
                      <Ban className="h-5 w-5" />
                    ) : t.plan === 'business_pro' ? (
                      <Crown className="h-5 w-5" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-neutral-900 truncate">{t.name}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                        {t.plan_name}
                      </span>
                      {!t.is_active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                          NONAKTIF
                        </span>
                      )}
                      {t.is_active && t.is_expired && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                          KEDALUWARSA
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400 mt-0.5">/{t.slug}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t.users_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <QrIcon className="h-3 w-3" />
                        {t.qr_codes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(t.last_scan_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-neutral-900 tabular-nums">
                      {rupiah(t.collected_total)}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {t.plan === 'starter'
                        ? 'tanpa masa aktif'
                        : t.plan_expires_at
                          ? `s/d ${shortDate(t.plan_expires_at)}`
                          : '—'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail / aksi dialog ── */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  {detail.name}
                  {!detail.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      NONAKTIF
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                  /{detail.slug} · {detail.plan_name} · dibuat {shortDate(detail.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-5 pt-2">
                {/* Left: facts + actions */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-2.5">
                    {[
                      ['Paket', detail.plan_name],
                      ['Siklus', detail.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan'],
                      [
                        'Masa aktif',
                        detail.plan === 'starter'
                          ? 'Tanpa batas (gratis)'
                          : detail.plan_expires_at
                            ? shortDate(detail.plan_expires_at)
                            : '—',
                      ],
                      ['Pengguna', String(detail.users_count)],
                      ['QR Code', String(detail.qr_codes_count)],
                      ['Total diterima', rupiah(detail.collected_total)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500">{k}</span>
                        <span className="font-semibold text-neutral-900 tabular-nums">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Change plan */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold text-neutral-700">
                      Ubah paket manual
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={targetPlan}
                        onChange={(e) => setTargetPlan(e.target.value)}
                        className="flex-1 h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium"
                      >
                        <option value="starter">Starter (gratis)</option>
                        <option value="business_pro">Business Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      <Button
                        size="sm"
                        disabled={busy !== null || detail.plan === targetPlan}
                        onClick={() =>
                          act('plan', () =>
                            api.post(`/admin/tenants/${detail.id}/plan`, {
                              plan: targetPlan,
                              billing_cycle: 'monthly',
                              days: 30,
                            })
                          )
                        }
                        className="h-9 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0 shrink-0"
                      >
                        {busy === 'plan' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Terapkan'
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      Paket berbayar otomatis aktif 30 hari. Ini untuk komplimen atau perbaikan data.
                    </p>
                  </div>

                  {/* Extend */}
                  {detail.plan !== 'starter' && (
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-neutral-700">
                        Perpanjang masa aktif
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={3650}
                          value={days}
                          onChange={(e) => setDays(Number(e.target.value))}
                          className="h-9 text-xs rounded-xl w-24"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null || days < 1}
                          onClick={() =>
                            act('extend', () =>
                              api.post(`/admin/tenants/${detail.id}/extend`, { days })
                            )
                          }
                          className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-neutral-300"
                        >
                          {busy === 'extend' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <CalendarPlus className="h-3.5 w-3.5" />
                              Tambah hari
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Suspend / activate */}
                  {detail.is_active ? (
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => {
                        if (
                          !confirm(
                            `Nonaktifkan "${detail.name}"? QR-nya berhenti mengalihkan dan semua sesi loginnya dicabut. Data tetap tersimpan dan bisa diaktifkan kembali.`
                          )
                        )
                          return;
                        act('suspend', () =>
                          api.post(`/admin/tenants/${detail.id}/suspend`, {
                            note: 'Dinonaktifkan dari console admin',
                          })
                        );
                      }}
                      className="w-full h-10 rounded-xl text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                    >
                      {busy === 'suspend' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" />
                          Nonaktifkan Workspace
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      disabled={busy !== null}
                      onClick={() =>
                        act('activate', () => api.post(`/admin/tenants/${detail.id}/activate`))
                      }
                      className="w-full h-10 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5"
                    >
                      {busy === 'activate' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aktifkan Kembali
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Right: users, QR, invoices */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Pengguna ({detail.users.length})
                    </p>
                    <div className="space-y-1.5">
                      {detail.users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-100"
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-neutral-900 truncate">
                              {u.name}
                              {u.is_admin && (
                                <span className="ml-1.5 text-[9px] font-bold text-indigo-600">
                                  ADMIN
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-neutral-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      QR Teratas ({detail.qr_codes.length})
                    </p>
                    <div className="space-y-1.5">
                      {detail.qr_codes.slice(0, 6).map((qr) => (
                        <div
                          key={qr.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-100"
                        >
                          <QrIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-neutral-900 truncate">
                              {qr.title}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-400">
                              /s/{qr.short_code}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-neutral-900 tabular-nums shrink-0">
                            {qr.scan_count}
                          </span>
                          <a
                            href={`/s/${qr.short_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-indigo-600 shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {detail.qr_codes.length === 0 && (
                        <p className="text-[11px] text-neutral-500 text-center py-3">
                          Belum ada QR code
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Invoice Terakhir ({detail.invoices.length})
                    </p>
                    <div className="space-y-1.5">
                      {detail.invoices.slice(0, 5).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-100"
                        >
                          <Wallet className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono text-neutral-700 truncate">
                              {inv.number}
                            </p>
                            <p className="text-[10px] text-neutral-400">{inv.status_label}</p>
                          </div>
                          <span className="text-[11px] font-bold text-neutral-900 tabular-nums shrink-0">
                            {rupiah(inv.total_amount)}
                          </span>
                        </div>
                      ))}
                      {detail.invoices.length === 0 && (
                        <p className="text-[11px] text-neutral-500 text-center py-3">
                          Belum ada invoice
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}