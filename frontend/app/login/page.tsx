'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const signedIn = await login(email, password);
      toast({
        title: 'Berhasil masuk',
        description: signedIn.is_admin
          ? 'Masuk sebagai administrator.'
          : 'Selamat datang kembali!',
      });
      // Admin accounts belong in the operator console, not the customer
      // dashboard. Regular users are unaffected.
      router.push(signedIn.is_admin ? '/admin' : '/dashboard');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Email atau password salah. Periksa kembali lalu coba lagi.';
      // Tampilkan juga di dalam kartu, bukan hanya lewat toast yang cepat hilang.
      setError(String(msg));
      toast({ title: 'Gagal masuk', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Masuk ke akunmu
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Kelola QR code dan pantau analitik scan dari dashboard.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-[13px] leading-snug text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
              Password
            </Label>
            {/* Tidak ada tautan "lupa password" karena API belum punya alur
                reset. Admin dapat mengganti password lewat Konsol Admin >
                Kelola User. Menampilkan tautan mati lebih buruk daripada
                tidak ada sama sekali. */}
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full bg-indigo-600 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            'Masuk'
          )}
        </Button>
      </form>

      <div className="mt-7 border-t border-neutral-200 pt-5 text-center">
        <p className="text-sm text-neutral-500">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 underline-offset-2 hover:text-indigo-700 hover:underline"
          >
            Daftar gratis
          </Link>
        </p>
      </div>

      {/* Panel brand disembunyikan di mobile, jadi nilai jualnya diringkas di sini */}
      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 lg:hidden">
        <p className="text-[13px] leading-relaxed text-indigo-900">
          <span className="font-semibold">Gratis untuk mulai.</span> 5 QR dinamis
          dan 1.000 scan per bulan, tanpa kartu kredit.
        </p>
      </div>
    </AuthShell>
  );
}
