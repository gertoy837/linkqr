<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Http\Request;

/**
 * Manajemen workspace dari sisi operator.
 *
 * Ini yang membedakan "punya panel admin" dari "punya kontrol atas bisnis":
 * sebelum ini admin hanya bisa memverifikasi pembayaran, tapi tidak bisa
 * memperbaiki apa pun kalau ada masalah — salah set paket, customer minta
 * perpanjangan karena bayar transfer manual, atau akun yang harus dihentikan
 * sementara.
 */
class AdminTenantController extends Controller
{
    /** GET /api/admin/tenants */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => 'nullable|string|max:100',
            'plan' => 'nullable|string|in:' . implode(',', array_keys(config('plans', []))),
            'status' => 'nullable|string|in:active,suspended,expired',
        ]);

        $query = Tenant::query()
            ->withCount(['users', 'qrCodes'])
            // Total uang yang benar-benar sudah masuk dari workspace ini.
            ->withSum(
                ['invoices as collected_total' => fn ($q) => $q->where('status', Invoice::STATUS_PAID)],
                'total_amount'
            )
            // Aktivitas terakhir: kapan QR milik workspace ini terakhir discan.
            ->withMax('qrCodes as last_scan_at', 'last_scanned_at');

        if (!empty($validated['q'])) {
            $term = '%' . $validated['q'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('slug', 'like', $term)
                    ->orWhereHas('users', fn ($u) => $u->where('email', 'like', $term));
            });
        }

        if (!empty($validated['plan'])) {
            $query->where('plan', $validated['plan']);
        }

        if (!empty($validated['status'])) {
            match ($validated['status']) {
                'suspended' => $query->where('is_active', false),
                'expired' => $query->whereNotNull('plan_expires_at')
                    ->where('plan_expires_at', '<=', now()),
                'active' => $query->where('is_active', true),
            };
        }

        $tenants = $query->latest()->limit(100)->get();

        return response()->json([
            'data' => $tenants->map(fn (Tenant $t) => $this->summaryPayload($t))->values(),
            'counts' => [
                'total' => Tenant::count(),
                'active' => Tenant::where('is_active', true)->count(),
                'suspended' => Tenant::where('is_active', false)->count(),
                'expired' => Tenant::whereNotNull('plan_expires_at')
                    ->where('plan_expires_at', '<=', now())
                    ->count(),
                'paying' => Tenant::where('plan', '!=', 'starter')->count(),
            ],
        ]);
    }

    /** GET /api/admin/tenants/{tenant} */
    public function show(Tenant $tenant)
    {
        $tenant->load([
            'users:id,name,email,is_admin,created_at,tenant_id',
            'qrCodes' => fn ($q) => $q->orderByDesc('scan_count')->limit(20),
            'invoices' => fn ($q) => $q->latest()->limit(30),
        ]);

        return response()->json([
            'tenant' => array_merge($this->summaryPayload($tenant), [
                'created_at' => $tenant->created_at->toIso8601String(),
                'domain' => $tenant->domain,
                'billing_cycle' => $tenant->billing_cycle,
                'features' => $tenant->planDefinition()['features'] ?? [],
                'users' => $tenant->users,
                'qr_codes' => $tenant->qrCodes,
                'invoices' => $tenant->invoices,
            ]),
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenant}/plan
     *
     * Override manual: akun komplimen, deal offline, atau membetulkan kesalahan
     * tanpa harus mengarang invoice palsu.
     */
    public function setPlan(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:' . implode(',', array_keys(config('plans', []))),
            'billing_cycle' => 'nullable|string|in:monthly,yearly',
            'days' => 'nullable|integer|min:1|max:3650',
        ]);

        $previous = $tenant->planName();

        $tenant->plan = $validated['plan'];
        $tenant->billing_cycle = $validated['billing_cycle'] ?? 'monthly';

        if ($tenant->plan === 'starter') {
            $tenant->plan_expires_at = null;
        } else {
            $tenant->plan_expires_at = now()->addDays($validated['days'] ?? 30);
        }

        $tenant->save();

        return response()->json([
            'message' => "Paket {$tenant->name}: {$previous} → {$tenant->planName()}.",
            'tenant' => $this->summaryPayload($tenant->fresh()),
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenant}/extend
     *
     * Perpanjang tanpa mengubah paket. Ini kasus paling sering di lapangan:
     * customer transfer manual, admin sudah verifikasi, tapi masa aktifnya
     * perlu ditambah beberapa hari karena telat bayar.
     *
     * Kalau paketnya sudah lewat masa aktif, hitungannya dari SEKARANG — bukan
     * dari tanggal kedaluwarsa yang sudah lewat, supaya hari yang sudah hilang
     * tidak ikut dihitung.
     */
    public function extend(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:3650',
        ]);

        if ($tenant->plan === 'starter') {
            return response()->json([
                'message' => 'Paket Starter tidak punya masa aktif. Ubah paketnya dulu.',
                'code' => 'starter_has_no_expiry',
            ], 422);
        }

        $base = ($tenant->plan_expires_at && $tenant->plan_expires_at->isFuture())
            ? $tenant->plan_expires_at->copy()
            : now();

        $tenant->plan_expires_at = $base->addDays($validated['days']);
        $tenant->save();

        return response()->json([
            'message' => "Masa aktif {$tenant->name} ditambah {$validated['days']} hari.",
            'tenant' => $this->summaryPayload($tenant->fresh()),
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenant}/suspend
     *
     * Hentikan layanan TANPA menghapus apa pun.
     *
     * Efeknya:
     *  - /s/{code} milik workspace ini berhenti mengalihkan (410 Gone)
     *  - user-nya tidak bisa login lagi
     *  - semua token aktif dicabut, jadi sesi yang sedang jalan langsung mati
     *
     * Data (QR, scan log, invoice) tetap utuh sehingga bisa diaktifkan kembali
     * persis seperti semula.
     */
    public function suspend(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'note' => 'nullable|string|max:500',
        ]);

        if (!$tenant->is_active) {
            return response()->json(['message' => 'Workspace ini sudah nonaktif.'], 422);
        }

        // Jangan sampai operator mengunci dirinya sendiri dari console.
        if ($tenant->users()->where('is_admin', true)->exists()) {
            return response()->json([
                'message' => 'Workspace ini berisi akun admin. Pindahkan adminnya dulu sebelum menonaktifkan.',
                'code' => 'tenant_has_admin',
            ], 422);
        }

        $tenant->is_active = false;
        $tenant->save();

        // Cabut semua sesi login supaya efeknya langsung, bukan menunggu token
        // kedaluwarsa sendiri.
        $revoked = 0;
        foreach ($tenant->users as $user) {
            $revoked += $user->tokens()->delete();
        }

        return response()->json([
            'message' => "Workspace {$tenant->name} dinonaktifkan. {$revoked} sesi login dicabut.",
            'tenant' => $this->summaryPayload($tenant->fresh()),
        ]);
    }

    /** POST /api/admin/tenants/{tenant}/activate */
    public function activate(Tenant $tenant)
    {
        if ($tenant->is_active) {
            return response()->json(['message' => 'Workspace ini sudah aktif.'], 422);
        }

        $tenant->is_active = true;
        $tenant->save();

        return response()->json([
            'message' => "Workspace {$tenant->name} diaktifkan kembali.",
            'tenant' => $this->summaryPayload($tenant->fresh()),
        ]);
    }

    /**
     * GET /api/admin/tenants/{tenant}/invoices
     *
     * Riwayat pembayaran lengkap satu workspace — dipisah dari show() supaya
     * halaman detail tidak ikut berat kalau invoice-nya sudah ratusan.
     */
    public function invoices(Request $request, Tenant $tenant)
    {
        $invoices = $tenant->invoices()
            ->with('user:id,name,email')
            ->latest()
            ->paginate(25);

        return response()->json($invoices);
    }

    private function summaryPayload(Tenant $tenant): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'plan' => $tenant->plan,
            'plan_name' => $tenant->planName(),
            'is_active' => (bool) $tenant->is_active,
            'plan_expires_at' => optional($tenant->plan_expires_at)->toIso8601String(),
            'is_expired' => $tenant->isExpired(),
            'users_count' => $tenant->users_count ?? $tenant->users()->count(),
            'qr_codes_count' => $tenant->qr_codes_count ?? $tenant->qrCodes()->count(),
            'collected_total' => (int) ($tenant->collected_total ?? 0),
            'last_scan_at' => $tenant->last_scan_at,
            'created_at' => optional($tenant->created_at)->toIso8601String(),
        ];
    }
}
