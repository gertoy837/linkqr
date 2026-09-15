'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { QrCode, LayoutDashboard, BarChart3, Settings, LogOut, PlusCircle, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/qr-codes', label: 'QR Codes', icon: QrCode },
  { href: '/dashboard/qr-codes/new', label: 'Buat QR Baru', icon: PlusCircle },
  { href: '/dashboard/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-neutral-200/80 flex flex-col h-full sticky top-0 z-30 select-none">
      {/* Header Logo */}
      <div className="p-5 border-b border-neutral-200/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neutral-900 tracking-tight leading-none">
              Link<span className="text-indigo-600">QR</span>
            </span>
            <span className="text-[10px] text-neutral-400 mt-1 font-medium">Dashboard Suite</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs border border-indigo-100/80'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              <Icon className={cn('h-4 w-4 transition-colors', isActive ? 'text-indigo-600' : 'text-neutral-400')} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Pintasan
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-neutral-400" />
          <span>Lihat Landing Page</span>
        </Link>
      </nav>

      {/* Profile & Logout Footer */}
      <div className="p-4 border-t border-neutral-200/80 bg-neutral-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-neutral-200/80 shadow-xs mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-neutral-500 truncate">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-xl h-9 text-xs font-semibold"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar dari Akun
        </Button>
      </div>
    </aside>
  );
}