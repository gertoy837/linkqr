'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import {
  QrCode,
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  PlusCircle,
  ExternalLink,
  CreditCard,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Each item declares exactly how it matches the current path, so two menu
 * entries can never be highlighted at the same time:
 *  - 'exact'  → only this exact path
 *  - 'prefix' → this path and its children, minus the excluded ones
 */
type NavItem = {
  href: string;
  label: string;
  icon: typeof QrCode;
  match: (pathname: string) => boolean;
  badge?: string;
};

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/dashboard',
  },
  {
    href: '/dashboard/qr-codes',
    label: 'QR Codes',
    icon: QrCode,
    // Matches the list AND detail pages (/dashboard/qr-codes/12),
    // but NOT the create page which has its own entry below.
    match: (p) =>
      p === '/dashboard/qr-codes' ||
      (p.startsWith('/dashboard/qr-codes/') && p !== '/dashboard/qr-codes/new'),
  },
  {
    href: '/dashboard/qr-codes/new',
    label: 'Buat QR Baru',
    icon: PlusCircle,
    match: (p) => p === '/dashboard/qr-codes/new',
    badge: 'Baru',
  },
  {
    href: '/dashboard/analytics',
    label: 'Analitik',
    icon: BarChart3,
    match: (p) => p === '/dashboard/analytics',
  },
  {
    href: '/dashboard/billing',
    label: 'Paket & Tagihan',
    icon: CreditCard,
    match: (p) => p === '/dashboard/billing',
  },
  {
    href: '/dashboard/settings/api-keys',
    label: 'API Keys',
    icon: Key,
    match: (p) => p === '/dashboard/settings/api-keys',
  },
  {
    href: '/dashboard/settings',
    label: 'Pengaturan',
    icon: Settings,
    // Jangan nyala saat berada di sub-halaman API Keys yang punya entri sendiri.
    match: (p) => p === '/dashboard/settings',
  },
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
            <span className="text-[10px] text-neutral-400 mt-1 font-medium">
              Dashboard Suite
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Menu Utama
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100/80 shadow-xs'
                  : 'text-neutral-600 font-medium hover:bg-neutral-50 hover:text-neutral-900'
              )}
            >
              {/* Active left rail */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-indigo-600 transition-all duration-200',
                  isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
                )}
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-indigo-600'
                    : 'text-neutral-400 group-hover:text-neutral-600'
                )}
              />
              <span className="truncate">{item.label}</span>

              {item.badge && !isActive && (
                <span className="ml-auto shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
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
          className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
          <span>Lihat Landing Page</span>
        </Link>

        {/* Operator console — hidden unless the signed-in user is an admin.
            The API enforces this too; hiding it is just so customers never
            see a menu item that would 403 them. */}
        {user?.is_admin && (
          <Link
            href="/admin"
            className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            <span>Console Admin</span>
          </Link>
        )}
      </nav>

      {/* Profile & Logout Footer */}
      <div className="p-4 border-t border-neutral-200/80 bg-neutral-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-neutral-200/80 shadow-xs mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">
              {user?.email || 'user@example.com'}
            </p>
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
