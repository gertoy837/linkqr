'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MousePointerClick, Globe, Smartphone, TrendingUp } from 'lucide-react';

interface AnalyticsSummary {
  total_scans: number;
  unique_devices: number;
  top_countries: Record<string, number>;
  top_browsers: Record<string, number>;
  top_devices: Record<string, number>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/qr-codes');
        const qrs = res.data || [];
        setData({
          total_scans: 0,
          unique_devices: 0,
          top_countries: {},
          top_browsers: {},
          top_devices: {},
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat...</div>;
  }

  const statItems = [
    { label: 'Total Scan', value: data?.total_scans ?? 0, icon: MousePointerClick, bg: 'bg-indigo-50 dark:bg-indigo-950/30', color: 'text-indigo-600' },
    { label: 'Perangkat Unik', value: data?.unique_devices ?? 0, icon: Smartphone, bg: 'bg-blue-50 dark:bg-blue-950/30', color: 'text-blue-600' },
    { label: 'Negara Teratas', value: Object.keys(data?.top_countries || {}).length, icon: Globe, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Analitik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas dari semua QR Anda.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1.5">
                      {item.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Browser Teratas</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.top_browsers && Object.keys(data.top_browsers).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(data.top_browsers).slice(0, 5).map(([browser, count]) => (
                  <li key={browser} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{browser}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Perangkat Teratas</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.top_devices && Object.keys(data.top_devices).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(data.top_devices).slice(0, 5).map(([device, count]) => (
                  <li key={device} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{device}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Smartphone className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}