'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QrCode } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      const msg = err.response?.data?.message || 'Email atau password salah.';
      toast({ title: 'Gagal masuk', description: msg, variant: 'destructive' });
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
            <CardTitle className="text-xl font-semibold">Masuk</CardTitle>
            <CardDescription>
              Belum punya akun?{' '}
              <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Daftar di sini
              </Link>
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Memproses...' : 'Masuk'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}