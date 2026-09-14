'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QrCode } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast({ title: 'Password tidak cocok', description: 'Pastikan password dan konfirmasi sama.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, passwordConfirmation);
      toast({ title: 'Berhasil daftar', description: 'Selamat datang di LinkQR!' });
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftar. Coba lagi.';
      toast({ title: 'Gagal daftar', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">LinkQR</span>
          </div>
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
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirmation" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Konfirmasi Password
                </Label>
                <Input
                  id="password_confirmation"
                  type="password"
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