'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Check, Sparkles } from 'lucide-react';

/**
 * Plan keys mirror config/plans.php on the API. The pricing section on the
 * landing page links here with ?plan=business_pro so the choice the visitor
 * clicked is the one they actually sign up for.
 */
const PLAN_CHOICES = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'Gratis',
    note: '5 QR Code · 1.000 scan/bulan',
  },
  {
    key: 'business_pro',
    name: 'Business Pro',
    price: 'Rp 59.000',
    note: 'Unlimited QR & scan',
    popular: true,
  },
];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast({
        title: 'Password tidak cocok',
        description: 'Pastikan password dan konfirmasi sama.',
        variant: 'destructive',
      });
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
      toast({ title: 'Gagal daftar', description: String(msg), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">LinkQR</span>
          </Link>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold">Daftar Akun</CardTitle>
            <CardDescription>
              Sudah punya akun?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Masuk di sini
              </Link>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Plan picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Pilih Paket
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLAN_CHOICES.map((choice) => {
                    const active = plan === choice.key;
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        onClick={() => setPlan(choice.key)}
                        className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                          active
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {choice.popular && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                            POPULER
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {choice.name}
                          </span>
                          {active && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] font-semibold text-indigo-600 mt-1">
                          {choice.price}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {choice.note}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {plan === 'business_pro' && (
                  <div className="flex items-center gap-2 pt-1">
                    {(['monthly', 'yearly'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCycle(c)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                          cycle === c
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c === 'monthly' ? 'Bulanan' : 'Tahunan (hemat 20%)'}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1">
                  <Sparkles className="h-3 w-3 text-indigo-500 mt-0.5 shrink-0" />
                  Akun selalu mulai dari paket Starter. Paket berbayar aktif setelah
                  pembayaran diverifikasi, dan bisa diubah kapan saja dari halaman
                  Paket &amp; Tagihan.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Nama
                </Label>
                <Input
                  id="name"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700">
                  Konfirmasi Password
                </Label>
                <PasswordInput
                  id="password_confirmation"
                  placeholder="••••••••"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Memproses...' : 'Daftar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}