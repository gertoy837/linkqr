'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

/**
 * Plan keys mirror config/plans.php on the API. The pricing section on the
 * landing page links here with ?plan=business_pro so the choice the visitor
 * clicked is the one they actually sign up for.
 */
const PLAN_CHOICES = [
  {
    key: 'starter',
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    note: '5 QR Code · 1.000 scan/bulan',
  },
  {
    key: 'business_pro',
    name: 'Business Pro',
    // Harga PER BULAN (bukan total tagihan). Sumber kebenaran:
    // backend/config/plans.php + App\Support\PlanPricing::chargeAmount().
    // Tagihan tahunan = 47200 x 12 = 566400.
    price: { monthly: 59000, yearly: 47200 },
    note: 'Unlimited QR & scan',
    popular: true,
  },
];

/** Format harga gaya Indonesia: 59000 -> "Rp 59.000". */
const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/** Panjang minimal mengikuti aturan validasi di AuthController::register(). */
const MIN_PASSWORD = 8;

/** Skor kekuatan password sederhana — cukup untuk memberi umpan balik dini. */
function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [plan, setPlan] = useState('starter');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the query string after mount. useSearchParams() would force this page
  // into a Suspense boundary during static generation, which is more machinery
  // than a two-key read is worth.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plan');
    const c = params.get('cycle');

    if (p === 'starter' || p === 'business_pro') setPlan(p);
    if (c === 'yearly' || c === 'monthly') setCycle(c);
  }, []);

  const strength = useMemo(() => scorePassword(password), [password]);
  const mismatch =
    passwordConfirmation.length > 0 && password !== passwordConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      const msg = 'Password dan konfirmasi password tidak sama.';
      setError(msg);
      toast({ title: 'Password tidak cocok', description: msg, variant: 'destructive' });
      return;
    }
    if (password.length < MIN_PASSWORD) {
      const msg = `Password minimal ${MIN_PASSWORD} karakter.`;
      setError(msg);
      toast({ title: 'Password terlalu pendek', description: msg, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await register(name, email, password, passwordConfirmation, plan, cycle);

      // Signing up can't activate a paid plan. The account is created on
      // Starter and the plan the visitor picked is carried to checkout, where
      // it activates once the payment is verified.
      if (res.requires_payment && res.requested_plan) {
        const chosen = PLAN_CHOICES.find((c) => c.key === res.requested_plan);
        toast({
          title: 'Akun berhasil dibuat',
          description: `Kamu mulai dari paket Starter. Selesaikan pembayaran ${
            chosen?.name ?? res.requested_plan
          } untuk mengaktifkannya.`,
        });
        router.push(
          `/dashboard/billing?plan=${res.requested_plan}&cycle=${
            res.requested_billing_cycle ?? 'monthly'
          }`
        );
        return;
      }

      toast({ title: 'Berhasil daftar', description: 'Selamat datang di LinkQR!' });
      router.push('/dashboard');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {}).flat()?.[0] ||
        'Gagal mendaftar. Coba lagi.';
      setError(String(msg));
      toast({ title: 'Gagal daftar', description: String(msg), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][strength];
  const strengthColor = [
    'bg-red-400',
    'bg-red-400',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-emerald-500',
  ][strength];

  return (
    <AuthShell maxWidth="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Buat akun gratis
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Mulai dalam hitungan detik — tanpa kartu kredit.
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
        {/* ---------- Pilih paket ---------- */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-neutral-700">Pilih paket</Label>
          <div className="grid grid-cols-2 gap-3">
            {PLAN_CHOICES.map((choice) => {
              const active = plan === choice.key;
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => setPlan(choice.key)}
                  aria-pressed={active}
                  className={`relative rounded-xl border-2 p-3.5 text-left transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  {choice.popular && (
                    <span className="absolute -top-2 right-2.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
                      POPULER
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-bold text-neutral-900">
                      {choice.name}
                    </span>
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        active
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-indigo-600">
                    {choice.price[cycle] === 0
                      ? 'Gratis'
                      : rupiah(choice.price[cycle])}
                    {choice.price[cycle] > 0 && (
                      <span className="text-[11px] font-medium text-neutral-500">
                        {' '}
                        /bulan
                      </span>
                    )}
                  </p>
                  {cycle === 'yearly' && choice.price.yearly > 0 && (
                    // Harga normal dicoret + total setahun yang ditagih, supaya
                    // diskon tahunan terlihat dan nominalnya tidak mengejutkan.
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[10px] text-neutral-400">
                        <span className="line-through">
                          {rupiah(choice.price.monthly)}
                        </span>{' '}
                        <span className="font-semibold text-emerald-600">
                          hemat 20%
                        </span>
                      </p>
                      <p className="text-[10px] font-medium text-neutral-400">
                        Ditagih tahunan {rupiah(choice.price.yearly * 12)}
                      </p>
                    </div>
                  )}
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">
                    {choice.note}
                  </p>
                </button>
              );
            })}
          </div>

          {plan === 'business_pro' && (
            <div className="flex items-center gap-2 pt-0.5">
              {(['monthly', 'yearly'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    cycle === c
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {c === 'monthly' ? 'Bulanan' : 'Tahunan (hemat 20%)'}
                </button>
              ))}
            </div>
          )}

          <p className="flex items-start gap-1.5 pt-0.5 text-[11px] leading-relaxed text-neutral-500">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
            <span>
              Akun selalu mulai dari paket Starter. Paket berbayar aktif setelah
              pembayaran diverifikasi, dan bisa diubah kapan saja dari halaman
              Paket &amp; Tagihan.
            </span>
          </p>
        </div>

        <div className="h-px bg-neutral-200" />

        {/* ---------- Data akun ---------- */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-neutral-700">
            Nama lengkap
          </Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
        </div>

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
          <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder={`Minimal ${MIN_PASSWORD} karakter`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            className="h-11 border-neutral-300 focus-visible:ring-indigo-600"
          />
          {password.length > 0 && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength ? strengthColor : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-neutral-500">
                {strengthLabel}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password_confirmation"
            className="text-sm font-medium text-neutral-700"
          >
            Konfirmasi password
          </Label>
          <PasswordInput
            id="password_confirmation"
            autoComplete="new-password"
            placeholder="Ulangi password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            className={`h-11 border-neutral-300 focus-visible:ring-indigo-600 ${
              mismatch ? 'border-red-400 focus-visible:ring-red-500' : ''
            }`}
          />
          {mismatch && (
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              Password belum sama.
            </p>
          )}
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
            'Buat akun gratis'
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="h-3 w-3" />
          Data kamu aman dan tidak dibagikan ke pihak ketiga.
        </p>
      </form>

      <div className="mt-7 border-t border-neutral-200 pt-5 text-center">
        <p className="text-sm text-neutral-500">
          Sudah punya akun?{' '}
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
