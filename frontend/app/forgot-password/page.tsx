'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/forgot-password', { email: email.trim() });
      setTerkirim(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()?.[0] ||
        'Gagal mengirim tautan. Coba lagi sebentar lagi.';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-7">
        <Link
          href="/login"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke halaman masuk
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Lupa password?
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Masukkan email akunmu, kami kirimkan tautan untuk membuat password baru.
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

      {terkirim ? (
        /* Pesan sukses sengaja tidak menyebut apakah emailnya terdaftar:
           kalau menyebut, halaman ini bisa dipakai menebak email mana yang
           punya akun. */
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[13px] font-semibold text-emerald-900">
                Email sudah dikirim
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">
                Kalau <span className="font-medium">{email.trim()}</span> terdaftar,
                tautan atur ulang password sudah kami kirim ke sana. Tautannya
                berlaku 60 menit dan hanya bisa dipakai sekali.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
            <p className="text-[12px] font-semibold text-neutral-700">
              Tidak menemukan emailnya?
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-neutral-500">
              <li>&middot; Periksa folder spam atau promosi.</li>
              <li>&middot; Pastikan alamatnya tidak salah ketik.</li>
              <li>&middot; Tunggu satu menit, lalu coba lagi.</li>
            </ul>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTerkirim(false);
              setEmail('');
            }}
            className="h-11 w-full border-neutral-300 text-[15px] font-semibold"
          >
            Kirim ke email lain
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-neutral-300 pl-10 focus-visible:ring-indigo-600"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="h-11 w-full bg-indigo-600 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim tautan atur ulang'
            )}
          </Button>
        </form>
      )}

      <div className="mt-7 border-t border-neutral-200 pt-5 text-center">
        <p className="text-sm text-neutral-500">
          Ingat passwordnya?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 underline-offset-2 hover:text-indigo-700 hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
