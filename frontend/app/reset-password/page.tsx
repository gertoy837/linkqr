'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const [tautanTidakLengkap, setTautanTidakLengkap] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') ?? '';
    const e = searchParams.get('email') ?? '';

    setToken(t);
    setEmail(e);

    if (!t || !e) {
      setTautanTidakLengkap(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    if (password !== konfirmasi) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: konfirmasi,
      });

      setBerhasil(true);
      toast({
        title: 'Password berhasil diganti',
        description: 'Silakan masuk dengan password baru.',
      });

      // Alihkan ke halaman masuk supaya user langsung bisa lanjut.
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()?.[0] ||
        'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  if (tautanTidakLengkap) {
    return (
      <AuthShell>
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Tautan tidak lengkap
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Tautan atur ulang password ini tidak memuat informasi yang dibutuhkan.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13px] leading-relaxed text-amber-900">
            Biasanya ini terjadi kalau tautannya terpotong saat disalin, atau
            sudah dipakai sebelumnya. Minta tautan baru untuk melanjutkan.
          </p>
        </div>

        <Link href="/forgot-password">
          <Button className="h-11 w-full bg-indigo-600 text-[15px] font-semibold text-white hover:bg-indigo-700">
            Minta tautan baru
          </Button>
        </Link>

        <div className="mt-7 border-t border-neutral-200 pt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke halaman masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (berhasil) {
    return (
      <AuthShell>
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Password sudah diganti
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Akunmu sudah bisa dipakai lagi.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-900">
              Berhasil disimpan
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
              Kamu akan diarahkan ke halaman masuk. Semua sesi login lama sudah
              diakhiri, jadi perangkat lain perlu masuk ulang.
            </p>
          </div>
        </div>

        <Link href="/login" className="mt-6 block">
          <Button className="h-11 w-full bg-indigo-600 text-[15px] font-semibold text-white hover:bg-indigo-700">
            Masuk sekarang
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Buat password baru
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Untuk akun <span className="font-medium text-neutral-700">{email}</span>
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
          <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Password baru
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="konfirmasi" className="text-sm font-medium text-neutral-700">
            Ulangi password baru
          </Label>
          <PasswordInput
            id="konfirmasi"
            autoComplete="new-password"
            placeholder="Ketik ulang password"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            required
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
          {konfirmasi.length > 0 && password !== konfirmasi && (
            <p className="text-[12px] text-amber-700">
              Konfirmasi password belum sama.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || !password || !konfirmasi}
          className="h-11 w-full bg-indigo-600 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan password baru'
          )}
        </Button>
      </form>

      <div className="mt-7 border-t border-neutral-200 pt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke halaman masuk
        </Link>
      </div>
    </AuthShell>
  );
}

/**
 * useSearchParams() hanya bisa dibaca di browser, jadi isinya dibungkus
 * Suspense supaya Next.js bisa merender kerangkanya lebih dulu saat build.
 * Tanpa ini, build gagal dengan "useSearchParams() should be wrapped in a
 * suspense boundary".
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm font-medium text-neutral-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              Memuat...
            </div>
          </div>
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
