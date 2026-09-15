'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  MousePointerClick,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  ArrowRight,
  BarChart3,
  Zap,
  Sparkles,
  CheckCircle2,
  Crown,
  AlertTriangle,
  Infinity as InfinityIcon,
} from 'lucide-react';
import Link from 'next/link';

interface QrItem {
  id: number;
  title: string;
  target_url: string;
  short_code: string;
  created_at: string;
}

/**
 * Semua angka di sini datang dari /analytics/summary — endpoint yang sama
 * dipakai halaman Analitik. Jangan pernah hitung ulang dari jumlah QR:
 * itu bikin dashboard dan halaman Analitik menampilkan angka yang berbeda.
 */
interface Stats {
  total_qr: number;
  active_qr: number;
  total_scans: number;
  today_scans: number;
  unique_visitors: number;
  growth: number;
  window_scans: number;
  days: number;
}

interface PlanUsage {
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
  usage: PlanUsage;
}

const RANGE_DAYS = 30;

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [recentQr, setRecentQr] = useState<QrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [qrRes, summaryRes, planRes] = await Promise.all([
        api.get('/qr-codes'),
        api.get('/analytics/summary', { params: { days: RANGE_DAYS } }),
        api.get('/plan'),
      ]);

      const qrs: QrItem[] = qrRes.data || [];
      const s = summaryRes.data || {};

      setRecentQr(qrs.slice(0, 5));
      setStats({
        total_qr: qrs.length,
        active_qr: s.active_qr ?? qrs.length,
        total_scans: s.total_scans ?? 0,
        today_scans: s.scans_today ?? 0,
        unique_visitors: s.unique_visitors ?? 0,
        growth: s.growth ?? 0,
        window_scans: s.scans_window ?? 0,
        days: s.days ?? RANGE_DAYS,
      });
      setPlan(planRes.data?.current ?? null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Ikut live seperti halaman Analitik: polling 15 detik + refetch saat tab aktif
  useEffect(() => {
    const id = setInterval(() => fetchStats(true), 15000);
    const onFocus = () => fetchStats(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat data dashboard...
        </div>
      </div>
    );
  }

  const growth = stats?.growth ?? 0;
  const growthUp = growth >= 0;

  const usage = plan?.usage;
  const isPaid = plan && plan.plan !== 'starter';

  // Extract to non-optional locals: TS cannot narrow `usage?.x` inside the
  // JSX ternaries below, which produced "possibly undefined" build errors.
  const qrUsed = usage?.qr_used ?? 0;
  const qrLimit = usage?.qr_limit ?? null;
  const qrRemaining = usage?.qr_remaining ?? 0;
  const scansUsed = usage?.scans_used ?? 0;
  const scanLimit = usage?.scan_limit ?? null;

  const qrAtLimit = qrLimit !== null && qrUsed >= qrLimit;
  const scanAtLimit = usage?.over_scan_limit ?? false;

  const qrPct =
    qrLimit === null ? 100 : Math.max(2, Math.min(100, (qrUsed / qrLimit) * 100));
  const scanPct =
    scanLimit === null
      ? 100
      : Math.max(2, Math.min(100, (scansUsed / scanLimit) * 100));

  const statItems = [
    {
      label: 'Total QR Code',
      value: stats?.total_qr ?? 0,
      icon: QrCode,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      badge: qrLimit !== null ? `${qrUsed}/${qrLimit} kuota` : 'Tanpa batas',
      badgeTone: qrAtLimit ? ('down' as const) : ('neutral' as const),
    },
    {
      label: 'Total Scan All-Time',
      value: stats?.total_scans ?? 0,
      icon: MousePointerClick,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      badge: 'Live Tracking',
      badgeTone: 'neutral' as const,
    },
    {
      label: 'Scan Hari Ini',
      value: stats?.today_scans ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      badge: 'Hari Ini',
      badgeTone: 'neutral' as const,
    },
    {
      label: `Pengunjung Unik (${stats?.days ?? RANGE_DAYS}h)`,
      value: stats?.unique_visitors ?? 0,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      badge: `${growthUp ? '+' : ''}${growth}% vs periode lalu`,
      badgeTone: growthUp ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-xl shadow-indigo-900/10 border border-indigo-700/30">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
              {isPaid ? (
                <Crown className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              )}
              <span>
                {plan?.plan_name ?? 'Starter'} Plan
                {plan?.billing_cycle === 'yearly' ? ' · Tahunan' : ''}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Selamat Datang Kembali, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-indigo-200/80 text-sm max-w-xl leading-relaxed">
              Pantau performa QR code dinamis dan link pendekmu dari satu dashboard terpusat.
              {lastUpdated && (
                <span className="text-indigo-300/60">
                  {' '}
                  · Diperbarui {lastUpdated.toLocaleTimeString('id-ID')}
                </span>
              )}
            </p>
          </div>
          <Link href="/dashboard/qr-codes/new">
            <Button size="lg" className="bg-white text-indigo-950 hover:bg-neutral-100 font-semibold shadow-lg shadow-black/10 gap-2 h-12 px-6 rounded-2xl border-0 shrink-0">
              <Plus className="h-5 w-5 text-indigo-600" />
              Buat QR Code Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan quota warning */}
      {plan?.is_expired && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">
              Paket {plan.plan_name} sudah kedaluwarsa
            </p>
            <p className="text-xs mt-1 text-red-700">
              Perbarui paket untuk tetap mendapat fitur penuh. QR yang sudah ada tetap berjalan.
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button size="sm" className="rounded-xl h-8 text-xs font-semibold border-0 bg-red-600 hover:bg-red-700 text-white">
              Perbarui
            </Button>
          </Link>
        </div>
      )}

      {!plan?.is_expired && (qrAtLimit || scanAtLimit) && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {qrAtLimit
                ? `Kuota QR paket ${plan?.plan_name} sudah penuh (${usage?.qr_used}/${usage?.qr_limit})`
                : `Scan bulan ini melebihi kuota (${usage?.scans_used}/${usage?.scan_limit})`}
            </p>
            <p className="text-xs mt-1 text-amber-700">
              {qrAtLimit
                ? 'Upgrade paket untuk membuat QR baru. QR yang sudah ada tetap berjalan normal.'
                : 'QR tetap berjalan normal — pertimbangkan upgrade agar tidak ada batasan.'}
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button size="sm" className="rounded-xl h-8 text-xs font-semibold border-0 bg-amber-600 hover:bg-amber-700 text-white">
              Lihat Paket
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border border-neutral-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {item.label}
                  </span>
                  <div className={`w-9 h-9 rounded-xl border ${item.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                    {item.value}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      item.badgeTone === 'up'
                        ? 'text-emerald-700 bg-emerald-50'
                        : item.badgeTone === 'down'
                          ? 'text-red-700 bg-red-50'
                          : 'text-neutral-500 bg-neutral-100'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ringkasan periode + link ke analitik lengkap */}
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            {growthUp ? (
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">
              {stats?.window_scans ?? 0} scan dalam {stats?.days ?? RANGE_DAYS} hari terakhir
            </p>
            <p className="text-[11px] text-neutral-500">
              Angka ini sama dengan yang tampil di halaman Analitik.
            </p>
          </div>
        </div>
        <Link href="/dashboard/analytics">
          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-semibold gap-1.5 hover:border-indigo-200 hover:text-indigo-600">
            Analitik Lengkap
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Main Grid: Recent QR + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent QR List */}
        <Card className="lg:col-span-2 border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-neutral-100">
            <div>
              <CardTitle className="text-base font-bold text-neutral-900">
                Daftar QR Terbaru
              </CardTitle>
              <p className="text-xs text-neutral-500 mt-0.5">
                QR code dinamis yang paling sering diakses
              </p>
            </div>
            <Link href="/dashboard/qr-codes">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold gap-1 rounded-xl">
                Lihat Semua ({stats?.total_qr ?? 0})
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4 px-4">
            {recentQr.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-3">
                  <QrCode className="h-7 w-7 text-neutral-400" />
                </div>
                <p className="text-sm font-semibold text-neutral-800">Belum Ada QR Code</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  Kamu belum membuat QR code pertama. Klik tombol di bawah untuk membuat secara instan.
                </p>
                <Link href="/dashboard/qr-codes/new">
                  <Button size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 font-medium">
                    <Plus className="h-4 w-4" /> Buat QR Pertama
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQr.map((qr) => (
                  <div key={qr.id} className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors truncate">
                          {qr.title}
                        </h4>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {qr.target_url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="hidden sm:inline-block text-[11px] font-mono font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
                        /s/{qr.short_code}
                      </span>
                      <Link href={`/dashboard/qr-codes/${qr.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-semibold hover:border-indigo-200 hover:text-indigo-600">
                          Detail
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Plan Usage + Quick Actions */}
        <div className="space-y-6">
          {/* Plan & quota card */}
          {plan && (
            <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    {isPaid ? (
                      <Crown className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                    )}
                    Pemakaian Paket
                  </CardTitle>
                  <Link href="/dashboard/billing">
                    <Button variant="ghost" size="sm" className="text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold h-7 px-2 rounded-lg">
                      Kelola
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* QR quota */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
                      <QrCode className="h-3 w-3 text-neutral-400" />
                      Kuota QR
                    </span>
                    <span className="text-[11px] font-bold text-neutral-900 tabular-nums">
                      {qrUsed}
                      <span className="text-neutral-400">
                        /{qrLimit ?? '∞'}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        qrLimit === null
                          ? 'bg-indigo-400'
                          : qrAtLimit
                            ? 'bg-red-500'
                            : qrUsed / qrLimit >= 0.8
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                      }`}
                      style={{ width: `${qrPct}%` }}
                    />
                  </div>
                </div>

                {/* Scan quota */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
                      <MousePointerClick className="h-3 w-3 text-neutral-400" />
                      Scan Bulan Ini
                    </span>
                    <span className="text-[11px] font-bold text-neutral-900 tabular-nums">
                      {scansUsed}
                      <span className="text-neutral-400">
                        /{scanLimit ?? '∞'}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        scanLimit === null
                          ? 'bg-emerald-400'
                          : scanAtLimit
                            ? 'bg-red-500'
                            : scansUsed / scanLimit >= 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                      }`}
                      style={{ width: `${scanPct}%` }}
                    />
                  </div>
                </div>

                {/* Plan meta */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    {plan.billing_cycle === 'yearly' ? 'Siklus tahunan' : 'Siklus bulanan'}
                  </span>
                  {qrLimit === null && scanLimit === null ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <InfinityIcon className="h-3 w-3" /> Unlimited
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-neutral-700">
                      {qrRemaining} QR tersisa
                    </span>
                  )}
                </div>

                {plan.plan === 'starter' && (
                  <Link href="/dashboard/billing" className="block">
                    <Button className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm shadow-indigo-500/20 border-0">
                      <Crown className="h-3.5 w-3.5" />
                      Upgrade ke Pro
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-neutral-100">
              <CardTitle className="text-base font-bold text-neutral-900">
                Pintasan Cepat
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              <Link href="/dashboard/qr-codes/new" className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 hover:bg-indigo-100/80 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Buat QR Baru</p>
                    <p className="text-[10px] text-neutral-500">Dinamis & bisa kustom warna</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
              </Link>

              <Link href="/dashboard/analytics" className="flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral-50 border border-neutral-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Lihat Laporan Analitik</p>
                    <p className="text-[10px] text-neutral-500">Lokasi, device, & browser</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
              </Link>

              <Link href="/dashboard/settings" className="flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral-50 border border-neutral-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Pengaturan Profil</p>
                    <p className="text-[10px] text-neutral-500">Kredensial & integrasi</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Status Sistem
                </span>
                <h4 className="text-sm font-bold mt-1">API & Redirect Online</h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Layanan pengalihan QR dinamis berjalan 100% tanpa hambatan.
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}