'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  Crown,
  Ban,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  LogOut,
  Trash2,
  Loader2,
  Building2,
  QrCode as QrIcon,
  ReceiptText,
  Key,
  ExternalLink,
  UserPlus,
} from 'lucide-react';

interface UserRow {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  tenant_id: number | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  tenant_plan: string | null;
  tenant_plan_name: string | null;
  tenant_is_active: boolean | null;
  tenant_is_expired: boolean | null;
  qr_codes_count: number;
  invoices_count: number;
  api_keys_count: number;
  created_at: string | null;
}

interface UserDetail {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  tenant: {
    id: number;
    name: string;
    slug: string;
    plan: string;
    plan_name: string;
    is_active: boolean;
    is_expired: boolean;
    plan_expires_at: string | null;
  } | null;
  qr_codes: Array<{ id: number; title: string; short_code: string; scan_count: number; is_active: boolean }>;
  invoices: Array<{ id: number; number: string; plan: string; total_amount: number; status: string; status_label: string }>;
  qr_codes_count: number;
  invoices_count: number;
  api_keys_count: number;
  paid_invoices_count: number;
  is_self: boolean;
  can_delete: boolean;
  delete_blocked_reason: string | null;
}

interface Counts {
  total: number;
  admins: number;
  active: number;
  suspended: number;
  new_this_month: number;
}

type RoleFilter = '' | 'admin' | 'user';

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

export default function AdminUsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('');

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      try {
        const res = await api.get('/admin/users', {
          params: {
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(role ? { role } : {}),
          },
        });
        setUsers(res.data?.data ?? []);
        setCounts(res.data?.counts ?? null);
      } catch (err: any) {
        toast({
          title: 'Gagal memuat user',
          description: err?.response?.data?.message || 'Coba lagi.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [q, role, toast]
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setNewPassword('');
    setConfirmPassword('');
    setConfirmDelete(false);
    try {
      const res = await api.get(`/admin/users/${id}`);
      setDetail(res.data.user as UserDetail);
    } catch (err: any) {
      toast({
        title: 'Gagal memuat detail',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const act = async (kind: 'role' | 'password' | 'revoke' | 'delete') => {
    if (!detail) return;
    setBusy(kind);
    try {
      if (kind === 'role') {
        const res = await api.post(`/admin/users/${detail.id}/role`, { is_admin: !detail.is_admin });
        toast({ title: 'Peran diperbarui', description: res.data?.message });
      } else if (kind === 'password') {
        if (newPassword.length < 8) {
          toast({ title: 'Password terlalu pendek', description: 'Minimal 8 karakter.', variant: 'destructive' });
          setBusy(null);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast({ title: 'Password tidak cocok', description: 'Ulangi dengan nilai yang sama.', variant: 'destructive' });
          setBusy(null);
          return;
        }
        const res = await api.post(`/admin/users/${detail.id}/password`, {
          password: newPassword,
          password_confirmation: confirmPassword,
        });
        toast({ title: 'Password diganti', description: res.data?.message });
        setNewPassword('');
        setConfirmPassword('');
      } else if (kind === 'revoke') {
        const res = await api.post(`/admin/users/${detail.id}/revoke-sessions`);
        toast({ title: 'Sesi dicabut', description: res.data?.message });
      } else {
        const res = await api.delete(`/admin/users/${detail.id}`);
        toast({ title: 'Akun dihapus', description: res.data?.message });
        setDetail(null);
      }
      await load(true);
      if (kind !== 'delete') await openDetail(detail.id);
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

  const filters: Array<{ key: RoleFilter; label: string; icon: typeof Users }> = [
    { key: '', label: 'Semua', icon: Users },
    { key: 'admin', label: 'Admin', icon: ShieldCheck },
    { key: 'user', label: 'User', icon: UserIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Kelola User</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Peran, password, dan sesi login seluruh akun.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          className="rounded-xl h-9 gap-2 text-xs font-semibold border-neutral-200 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* Summary */}
      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total User', value: counts.total, icon: Users, tone: 'indigo' },
            { label: 'Admin', value: counts.admins, icon: ShieldCheck, tone: 'emerald' },
            { label: 'Baru Bulan Ini', value: counts.new_this_month, icon: UserPlus, tone: 'amber' },
            {
              label: 'Workspace Nonaktif',
              value: counts.suspended,
              icon: AlertTriangle,
              tone: 'red',
            },
          ].map((s) => {
            const Icon = s.icon;
            const tones: Record<string, string> = {
              indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
              emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
              amber: 'bg-amber-50 border-amber-100 text-amber-600',
              red: 'bg-red-50 border-red-100 text-red-600',
            };
            return (
              <Card key={s.label} className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {s.label}
                    </span>
                    <div className={`w-9 h-9 rounded-xl border ${tones[s.tone]} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-neutral-900 tabular-nums">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Daftar */}
      <Card className="border border-neutral-200/80 shadow-xs rounded-2xl bg-white">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-neutral-900">Daftar Akun</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama / email / workspace..."
                className="h-9 pl-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            {filters.map((f) => {
              const on = role === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key || 'all'}
                  onClick={() => setRole(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                    on ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-neutral-500 text-sm font-medium">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat user...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-9 w-9 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-700">Tidak ada user</p>
              <p className="text-xs text-neutral-500 mt-1">Coba ubah filter atau kata kunci.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openDetail(u.id)}
                  className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                    u.tenant_is_active === false
                      ? 'border-red-100 bg-red-50/40 hover:bg-red-50'
                      : u.is_admin
                        ? 'border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/60'
                        : 'border-neutral-100 hover:bg-neutral-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-sm font-bold ${
                      u.tenant_is_active === false
                        ? 'bg-red-100 border-red-200 text-red-600'
                        : u.is_admin
                          ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                    }`}
                  >
                    {u.tenant_is_active === false ? <Ban className="h-5 w-5" /> : initial(u.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-neutral-900 truncate">{u.name}</p>
                      {u.is_admin && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0 flex items-center gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          ADMIN
                        </span>
                      )}
                      {u.tenant_plan === 'business_pro' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                          {u.tenant_plan_name}
                        </span>
                      )}
                      {u.tenant_is_active === false && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                          NONAKTIF
                        </span>
                      )}
                      {u.tenant_is_active !== false && u.tenant_is_expired && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                          KEDALUWARSA
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{u.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-500">
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {u.tenant_name ?? 'tanpa workspace'}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <QrIcon className="h-3 w-3" />
                        {u.qr_codes_count}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <ReceiptText className="h-3 w-3" />
                        {u.invoices_count}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-[10px] text-neutral-400">Gabung</p>
                    <p className="text-[11px] font-semibold text-neutral-600">{shortDate(u.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      <Dialog
        open={!!detail || detailLoading}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-10 gap-3 text-neutral-500 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat detail...
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-sm font-bold text-neutral-600">
                    {initial(detail.name)}
                  </div>
                  <span className="truncate">{detail.name}</span>
                  {detail.is_admin && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">
                      ADMIN
                    </span>
                  )}
                  {detail.is_self && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                      KAMU
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="font-mono text-[11px]">{detail.email}</DialogDescription>
              </DialogHeader>

              {/* Ringkasan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'QR Code', value: detail.qr_codes_count, icon: QrIcon },
                  { label: 'Invoice', value: detail.invoices_count, icon: ReceiptText },
                  { label: 'API Key', value: detail.api_keys_count, icon: Key },
                  { label: 'Invoice Lunas', value: detail.paid_invoices_count, icon: CheckCircle2 },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                        <Icon className="h-3 w-3" />
                        {s.label}
                      </div>
                      <p className="mt-1.5 text-lg font-extrabold text-neutral-900 tabular-nums">{s.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Workspace */}
              {detail.tenant ? (
                <div className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <p className="text-xs font-bold text-neutral-900 truncate">{detail.tenant.name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                          {detail.tenant.plan_name}
                        </span>
                        {!detail.tenant.is_active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                            NONAKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5">/{detail.tenant.slug}</p>
                      {detail.tenant.plan_expires_at && (
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Aktif s/d {shortDate(detail.tenant.plan_expires_at)}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/admin/tenants"
                      className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      Workspace
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Akun ini tidak terhubung ke workspace mana pun.</p>
              )}

              {/* Aksi akun */}
              <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                <p className="text-xs font-bold text-neutral-900">Aksi Akun</p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null || detail.is_self}
                    onClick={() => act('role')}
                    className="h-9 rounded-xl text-[11px] font-semibold gap-1.5"
                  >
                    {busy === 'role' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                    {detail.is_admin ? 'Cabut Admin' : 'Jadikan Admin'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null || detail.is_self}
                    onClick={() => act('revoke')}
                    className="h-9 rounded-xl text-[11px] font-semibold gap-1.5"
                  >
                    {busy === 'revoke' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                    Cabut Sesi Login
                  </Button>
                </div>

                {detail.is_self && (
                  <p className="text-[10px] text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    Ini akunmu sendiri — peran dan sesi tidak bisa diubah dari sini, supaya kamu tidak
                    mengunci diri sendiri dari console.
                  </p>
                )}

                {/* Reset password */}
                <div className="border-t border-neutral-100 pt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-neutral-400" />
                    Ganti Password
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-neutral-500">Password baru</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-neutral-500">Ulangi password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy !== null || !newPassword}
                    onClick={() => act('password')}
                    className="h-9 rounded-xl text-[11px] font-semibold gap-1.5"
                  >
                    {busy === 'password' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    Simpan Password
                  </Button>
                  <p className="text-[10px] text-neutral-500">
                    Semua sesi login akun ini otomatis dicabut setelah password diganti.
                  </p>
                </div>
              </div>

              {/* Hapus */}
              <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 space-y-2.5">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Akun
                </p>

                {!detail.can_delete ? (
                  <p className="text-[11px] text-red-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {detail.delete_blocked_reason}
                  </p>
                ) : !confirmDelete ? (
                  <>
                    <p className="text-[11px] text-neutral-600">
                      Akun, {detail.qr_codes_count} QR code, dan seluruh riwayat scan-nya akan hilang
                      permanen. QR yang sudah dicetak berhenti berfungsi.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="h-9 rounded-xl text-[11px] font-semibold gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus akun ini
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-red-700">
                      Yakin? Tindakan ini tidak bisa dibatalkan.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => act('delete')}
                        className="h-9 rounded-xl text-[11px] font-semibold gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {busy === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Ya, hapus permanen
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        className="h-9 rounded-xl text-[11px] font-semibold"
                      >
                        Batal
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
