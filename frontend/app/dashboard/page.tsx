'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, MousePointerClick, Clock, TrendingUp, Plus, ArrowRight, BarChart3, Link2, Zap } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  total_qr: number;
  total_scans: number;
  today_scans: number;
  growth: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const qrRes = await api.get('/qr-codes');
        const totalQr = qrRes.data?.length || 0;
        setStats({
          total_qr: totalQr,
          total_scans: 0,
          today_scans: 0,
          growth: 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Memuat...</div>;
  }

  const statItems = [
    { label: 'Total QR', value: stats?.total_qr ?? 0, icon: QrCode, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { label: 'Total Scan', value: stats?.total_scans ?? 0, icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Scan Hari Ini', value: stats?.today_scans ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Pertumbuhan', value: `${stats?.growth ?? 0}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Selamat datang kembali, {user?.name || 'User'}!</p>
        </div>
        <Link href="/dashboard/qr-codes/new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Buat QR Baru
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <BarChart3 className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada aktivitas scan</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">QR yang kamu buat akan muncul di sini</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Mulai Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/qr-codes/new" className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Buat QR Baru</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </Link>
            <Link href="/dashboard/qr-codes" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Kelola QR</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
            <Link href="/dashboard/analytics" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Lihat Analitik</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}