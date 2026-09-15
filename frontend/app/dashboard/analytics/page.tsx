'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/dashboard/export-menu';
import {
  BarChart3,
  MousePointerClick,
  Globe,
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  Layers,
  Monitor,
  Tablet as TabletIcon,
  Bot,
  MapPin,
  Clock,
  Download,
} from 'lucide-react';

interface Bucket {
  label: string;
  count: number;
}

interface SeriesPoint {
  date: string;
  count: number;
}

interface TopQr {
  id: number;
  title: string;
  short_code: string | null;
  count: number;
}

interface RecentScan {
  id: number;
  qr_code_id: number;
  country: string | null;
  city: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  scanned_at: string | null;
}

interface AnalyticsSummary {
  total_scans: number;
  scans_today: number;
  scans_window: number;
  previous_window: number;
  growth: number;
  unique_visitors: number;
  active_qr: number;
  days: number;
  series: SeriesPoint[];
  by_device: Bucket[];
  by_os: Bucket[];
  by_browser: Bucket[];
  by_country: Bucket[];
  top_qr: TopQr[];
  recent: RecentScan[];
}

const RANGES = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
];

function deviceIcon(type: string | null) {
  switch ((type || '').toLowerCase()) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return TabletIcon;
    case 'bot':
      return Bot;
    default:
      return Monitor;
  }
}

function relativeTime(iso: string | null) {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // Dibaca dari /plan supaya tombol Export bisa menampilkan dialog unduhan
  // untuk paket Pro, atau ajakan upgrade untuk Starter. Server tetap penjaga
  // sesungguhnya lewat middleware feature:export.
  const [canExport, setCanExport] = useState(false);

  const fetchAnalytics = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      try {
        const [res, planRes] = await Promise.all([
          api.get<AnalyticsSummary>('/analytics/summary', { params: { days } }),
          // Kegagalan /plan tidak boleh menggagalkan analitik — cukup bikin
          // tombol export bersikap konservatif (terkunci).
          api.get('/plan').catch(() => null),
        ]);
        setData(res.data);
        const plan = planRes?.data?.current;
        setCanExport(
          !!plan &&
            (plan.plan === 'business_pro' || plan.plan === 'enterprise')
        );
        setLastUpdated(new Date());
        setError(null);
      } catch (err: any) {
        if (!background) {
          setError(err?.response?.data?.message || 'Gagal memuat analitik');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days]
  );

  // Initial load + refetch whenever the range changes.
  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Live-ish polling so new scans show up without a manual reload.
  useEffect(() => {
    const id = setInterval(() => fetchAnalytics(true), 15000);
    const onFocus = () => fetchAnalytics(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAnalytics]);

  const series = data?.series ?? [];
  const maxSeries = useMemo(
    () => Math.max(1, ...series.map((p) => p.count)),
    [series]
  );
  const windowTotal = data?.scans_window ?? 0;
  const growth = data?.growth ?? 0;
  const hasData = (data?.total_scans ?? 0) > 0;

  const statItems = [
    {
      label: 'Total Scan All-Time',
      value: data?.total_scans ?? 0,
      icon: MousePointerClick,
      bg: 'bg-indigo-50 border-indigo-100',
      color: 'text-indigo-600',
      hint: `${data?.scans_today ?? 0} hari ini`,
    },
    {
      label: `Scan ${days} Hari`,
      value: windowTotal,
      icon: TrendingUp,
      bg: 'bg-blue-50 border-blue-100',
      color: 'text-blue-600',
      hint:
        growth >= 0
          ? `+${growth}% vs periode lalu`
          : `${growth}% vs periode lalu`,
      hintIcon: growth >= 0 ? TrendingUp : TrendingDown,
      hintColor: growth >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      label: 'Pengunjung Unik',
      value: data?.unique_visitors ?? 0,
      icon: Users,
      bg: 'bg-emerald-50 border-emerald-100',
      color: 'text-emerald-600',
      hint: 'Berdasarkan IP',
    },
    {
      label: 'Negara Terdeteksi',
      value: (data?.by_country ?? []).length,
      icon: Globe,
      bg: 'bg-amber-50 border-amber-100',
      color: 'text-amber-600',
      hint: `${data?.active_qr ?? 0} QR aktif`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat analitik...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Analitik
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Data scan real-time dari semua QR code kamu.
            {lastUpdated && (
              <span className="text-neutral-400">
                {' '}
                Diperbarui {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  days === r.days
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="h-9 w-9 rounded-xl"
            title="Muat ulang"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportOpen(true)}
            className="h-9 rounded-xl gap-1.5 text-xs font-semibold border-neutral-200 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ekspor</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          const HintIcon = (item as any).hintIcon;
          return (
            <Card
              key={item.label}
              className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {item.label}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-xl border ${item.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                    {item.value}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium">
                  {HintIcon && (
                    <HintIcon
                      className={`h-3 w-3 ${(item as any).hintColor}`}
                    />
                  )}
                  <span
                    className={
                      (item as any).hintColor || 'text-neutral-500'
                    }
                  >
                    {item.hint}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Time series */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <CardTitle className="text-base font-bold text-neutral-900">
            Tren Scan {days} Hari Terakhir
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Total {windowTotal} scan pada periode ini
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {windowTotal === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-700">
                Belum ada scan pada periode ini
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Scan salah satu QR code untuk melihat datanya muncul di sini
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-[3px] h-44">
              {series.map((point) => (
                <div
                  key={point.date}
                  className="group relative flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div
                    className="w-full rounded-t bg-indigo-500/80 group-hover:bg-indigo-600 transition-colors min-h-[2px]"
                    style={{
                      height: `${Math.max(2, (point.count / maxSeries) * 100)}%`,
                    }}
                  />
                  <div className="pointer-events-none absolute -top-8 hidden group-hover:block whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg z-10">
                    {point.date.slice(5)}: {point.count} scan
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        <BreakdownCard
          title="Perangkat"
          icon={Smartphone}
          items={data?.by_device ?? []}
          total={windowTotal}
          iconFor={(label) => deviceIcon(label)}
          emptyHint="Belum ada data perangkat"
        />
        <BreakdownCard
          title="Negara"
          icon={MapPin}
          items={data?.by_country ?? []}
          total={windowTotal}
          emptyHint="Negara belum terdeteksi"
        />
        <BreakdownCard
          title="Sistem Operasi"
          icon={Layers}
          items={data?.by_os ?? []}
          total={windowTotal}
          emptyHint="Belum ada data OS"
        />
        <BreakdownCard
          title="Browser"
          icon={Globe}
          items={data?.by_browser ?? []}
          total={windowTotal}
          emptyHint="Belum ada data browser"
        />
      </div>

      {/* Top QR + Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-base font-bold text-neutral-900">
              QR Paling Banyak Discan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {(data?.top_qr ?? []).length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Belum ada data</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {(data?.top_qr ?? []).map((qr, i) => (
                  <li
                    key={qr.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {qr.title}
                      </p>
                      {qr.short_code && (
                        <p className="text-[11px] font-mono text-neutral-400">
                          /s/{qr.short_code}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-neutral-900">
                      {qr.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Scan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {(data?.recent ?? []).length === 0 ? (
              <div className="text-center py-8">
                <MousePointerClick className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Belum ada scan</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {(data?.recent ?? []).map((scan) => {
                  const Icon = deviceIcon(scan.device_type);
                  return (
                    <li
                      key={scan.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100"
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-900">
                          {scan.device_type || 'unknown'}
                          {scan.os ? ` \u00b7 ${scan.os}` : ''}
                          {scan.browser ? ` \u00b7 ${scan.browser}` : ''}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {scan.country
                            ? `${scan.city ? scan.city + ', ' : ''}${scan.country}`
                            : 'Lokasi tidak diketahui'}
                        </p>
                      </div>
                      <span className="text-[11px] text-neutral-400 shrink-0">
                        {relativeTime(scan.scanned_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportMenu
        open={exportOpen}
        onOpenChange={setExportOpen}
        featureEnabled={canExport}
      />
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  items,
  total,
  emptyHint,
  iconFor,
}: {
  title: string;
  icon: any;
  items: Bucket[];
  total: number;
  emptyHint: string;
  iconFor?: (label: string) => any;
}) {
  return (
    <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
      <CardHeader className="pb-3 border-b border-neutral-100">
        <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Icon className="h-4 w-4 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-neutral-500">{emptyHint}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              const RowIcon = iconFor ? iconFor(item.label) : null;
              return (
                <li key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 capitalize truncate">
                      {RowIcon && (
                        <RowIcon className="h-3 w-3 text-neutral-400 shrink-0" />
                      )}
                      {item.label}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 shrink-0 ml-2">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}