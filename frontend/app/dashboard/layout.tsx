'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold text-lg">
            QR
          </div>
          <p className="text-xs text-neutral-500 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-neutral-50/80 antialiased font-sans">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Admin accounts are sent to /admin right after login. If one opens
            the customer dashboard on purpose, point the way back instead of
            blocking it — the owner still manages his own QR codes here. */}
        {user.is_admin && (
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/85 backdrop-blur px-6 py-2.5">
            <span className="flex items-center gap-2 text-[11px] font-semibold text-indigo-800">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Kamu masuk sebagai admin — ini dashboard klien.
            </span>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0"
            >
              Console Admin
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        <div className="p-6 md:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}