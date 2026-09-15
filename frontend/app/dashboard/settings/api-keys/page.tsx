'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Lock,
  Crown,
  ArrowRight,
  Power,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface ApiKeyRow {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_expired: boolean;
  created_at: string;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'belum pernah dipakai';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'belum pernah dipakai';
  const mins = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function ApiKeysPage() {
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiresDays, setExpiresDays] = useState('');

  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api-keys');
      setKeys(res.data?.data ?? []);
      setFeatureEnabled(!!res.data?.feature_enabled);
    } catch (err: any) {
      toast({
        title: 'Gagal memuat API key',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setBusy('create');
    try {
      const res = await api.post('/api-keys', {
        name: name.trim(),
        ...(expiresDays ? { expires_in_days: Number(expiresDays) } : {}),
      });
      setCreateOpen(false);
      setName('');
      setExpiresDays('');
      setPlainKey(res.data.plain_key);
      setCopied(false);
      await load();
    } catch (err: any) {
      toast({
        title: 'Gagal membuat API key',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleToggle = async (key: ApiKeyRow) => {
    setBusy(`toggle-${key.id}`);
    try {
      const res = await api.post(`/api-keys/${key.id}/toggle`);
      toast({ title: res.data?.message ?? 'Status diubah' });
      await load();
    } catch (err: any) {
      toast({
        title: 'Gagal',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (key: ApiKeyRow) => {
    if (!confirm(`Hapus API key "${key.name}"? Aplikasi yang memakainya akan langsung berhenti bekerja.`)) return;
    setBusy(`delete-${key.id}`);
    try {
      await api.delete(`/api-keys/${key.id}`);
      toast({ title: 'API key dihapus' });
      await load();
    } catch (err: any) {
      toast({
        title: 'Gagal menghapus',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const copyKey = async () => {
    if (!plainKey) return;
    try {
      await navigator.clipboard.writeText(plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Gagal menyalin', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Memuat API key...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">API Keys</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Integrasikan LinkQR ke aplikasi atau sistem lain milikmu.
          </p>
        </div>

        {featureEnabled && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl h-9 gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm shadow-indigo-500/20 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Buat API Key
          </Button>
        )}
      </div>

      {!featureEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Lock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              Akses API tersedia di paket Enterprise
            </p>
            <p className="text-xs mt-1 text-amber-700">
              Kunci API memungkinkan sistem lain membuat dan membaca QR code secara
              otomatis lewat REST API.
            </p>
          </div>
          <Link href="/dashboard/billing" className="shrink-0">
            <Button
              size="sm"
              className="rounded-xl h-8 text-xs font-semibold border-0 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Crown className="h-3.5 w-3.5" />
              Lihat Paket
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}

      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-600" />
            Daftar Kunci ({keys.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-9 w-9 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-700">Belum ada API key</p>
              <p className="text-xs text-neutral-500 mt-1">
                {featureEnabled
                  ? 'Buat kunci pertama untuk mulai berintegrasi.'
                  : 'Upgrade ke Enterprise untuk membuka fitur ini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                    !key.is_active || key.is_expired
                      ? 'border-neutral-200 bg-neutral-50 opacity-70'
                      : 'border-neutral-100 hover:bg-neutral-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      key.is_active && !key.is_expired
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                    }`}
                  >
                    <Key className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-neutral-900 truncate">{key.name}</p>
                      {!key.is_active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-600">
                          NONAKTIF
                        </span>
                      )}
                      {key.is_expired && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          KEDALUWARSA
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                      {key.key_prefix}••••••••••••••••
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeTime(key.last_used_at)}
                      {key.expires_at && (
                        <>
                          {' · berlaku s/d '}
                          {new Date(key.expires_at).toLocaleDateString('id-ID')}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy !== null}
                      onClick={() => handleToggle(key)}
                      title={key.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`h-8 w-8 ${
                        key.is_active
                          ? 'text-neutral-500 hover:text-amber-600'
                          : 'text-neutral-500 hover:text-emerald-600'
                      }`}
                    >
                      {busy === `toggle-${key.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy !== null}
                      onClick={() => handleDelete(key)}
                      className="h-8 w-8 text-neutral-500 hover:text-red-600"
                    >
                      {busy === `delete-${key.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dokumentasi singkat */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-neutral-50/60">
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-bold text-neutral-900">Cara pakai</p>
          <div className="rounded-xl bg-neutral-900 text-neutral-100 p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-neutral-500"># Ambil daftar QR code</div>
            curl https://qr-api.gertoy.biz.id/api/v1/qr-codes \<br />
            &nbsp;&nbsp;-H &quot;X-API-Key: lqr_xxxxxxxxxxxx&quot;
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">GET</span>
              /api/v1/qr-codes
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">POST</span>
              /api/v1/qr-codes
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">GET</span>
              /api/v1/qr-codes/&#123;code&#125;
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">GET</span>
              /api/v1/qr-codes/&#123;code&#125;/stats
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              Buat API Key Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Beri nama sesuai sistem yang akan memakainya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="key-name" className="text-[11px] font-semibold text-neutral-700">
                Nama kunci
              </Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Website Kovara"
                maxLength={100}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-exp" className="text-[11px] font-semibold text-neutral-700">
                Kedaluwarsa (opsional)
              </Label>
              <Input
                id="key-exp"
                type="number"
                min={1}
                max={3650}
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                placeholder="Kosongkan = berlaku selamanya"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!name.trim() || busy === 'create'}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 border-0 disabled:opacity-50"
            >
              {busy === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Buat Kunci
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plain key reveal — hanya sekali */}
      <Dialog open={!!plainKey} onOpenChange={(o) => !o && setPlainKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              API Key Dibuat
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Salin sekarang — kunci ini tidak akan ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Simpan di tempat aman (password manager). Kalau hilang, kamu harus
                membuat kunci baru — kunci lama tidak bisa dipulihkan.
              </p>
            </div>

            <div className="rounded-xl bg-neutral-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                API Key
              </p>
              <p className="font-mono text-xs text-emerald-400 break-all leading-relaxed">
                {plainKey}
              </p>
            </div>

            <Button
              onClick={copyKey}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 border-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Salin API Key
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}