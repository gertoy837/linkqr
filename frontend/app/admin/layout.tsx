'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { QrCode, ShieldCheck, ArrowLeft, LogOut } from 'lucide-react';

/**
 * Guard for the operator console.
 *
 * The API enforces `is_admin` server-side with the `admin` middleware; this is
 * the UX layer so a non-admin never sees the shell at all. Never treat this as
 * the security boundary — a crafted request still has to pass the API.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.is_admin) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold text-lg">
            QR
          </div>
          <p className="text-xs text-neutral-500 font-medium">Memeriksa akses admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 antialiased font-sans">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-neutral-900 tracking-tight">
                Link<span className="text-indigo-600">QR</span>
              </span>
            </Link>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
              <ShieldCheck className="h-3 w-3" />
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:block text-[11px] text-neutral-500">{user.email}</span>
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-[11px] font-semibold gap-1.5 border-neutral-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Dashboard
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 rounded-lg text-[11px] font-semibold text-neutral-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}