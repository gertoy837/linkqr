'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function NewQrPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [color, setColor] = useState('#059669');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetUrl) {
      toast({ title: 'Harap isi semua field', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/qr-codes', { title, target_url: targetUrl, color });
      toast({ title: 'QR berhasil dibuat!' });
      router.push('/dashboard/qr-codes');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal membuat QR.';
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat QR Baru</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detail QR</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                placeholder="Mis: Link Website Saya"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_url">Target URL</Label>
              <Input
                id="target_url"
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Warna QR</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <span className="text-sm text-slate-500">{color}</span>
              </div>
            </div>
          </CardContent>
          <div className="px-6 pb-6 flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Membuat...' : 'Buat QR'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}