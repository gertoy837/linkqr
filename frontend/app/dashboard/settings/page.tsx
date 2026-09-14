'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { User, Mail, Calendar, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  const infoItems = [
    { label: 'Nama', value: user?.name || '-', icon: User },
    { label: 'Email', value: user?.email || '-', icon: Mail },
    { label: 'Bergabung sejak', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Pengaturan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola akun dan preferensi</p>
      </div>

      <Card className="border-0 shadow-sm max-w-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {infoItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}

          <Button variant="outline" className="w-full gap-2" disabled>
            <Shield className="h-4 w-4" />
            Ubah Password (segera)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}