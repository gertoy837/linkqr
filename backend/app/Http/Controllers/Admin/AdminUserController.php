<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Manajemen user dari sisi operator.
 *
 * Sebelumnya operator hanya bisa mengelola workspace; kalau ada satu akun yang
 * bermasalah (spam signup, karyawan keluar, lupa password) tidak ada satu pun
 * tempat untuk menanganinya.
 *
 * Tiga penjagaan yang sengaja dipasang, karena panel admin tanpa pagar adalah
 * cara paling cepat mengunci diri sendiri dari sistem:
 *   1. Tidak bisa menurunkan atau menghapus akun sendiri.
 *   2. Tidak bisa menghapus admin terakhir yang tersisa.
 *   3. Tidak bisa menghapus user yang punya invoice lunas — itu catatan
 *      keuangan, dan relasinya cascade sehingga riwayat pendapatan ikut hilang.
 *      Untuk kasus itu, nonaktifkan workspace-nya dari halaman Workspace.
 */
class AdminUserController extends Controller
{
    /** GET /api/admin/users */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => 'nullable|string|max:100',
            'role' => 'nullable|string|in:admin,user',
            'status' => 'nullable|string|in:active,suspended',
            'plan' => 'nullable|string|in:' . implode(',', array_keys(config('plans', []))),
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 50);

        $query = User::query()
            ->with('tenant:id,name,slug,plan,is_active,plan_expires_at')
            ->withCount(['qrCodes', 'invoices', 'apiKeys']);

        if (!empty($validated['q'])) {
            $term = '%' . $validated['q'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhereHas('tenant', fn ($t) => $t->where('name', 'like', $term));
            });
        }

        if (!empty($validated['role'])) {
            $query->where('is_admin', $validated['role'] === 'admin');
        }

        if (!empty($validated['status'])) {
            $query->whereHas(
                'tenant',
                fn ($t) => $t->where('is_active', $validated['status'] === 'active')
            );
        }

        if (!empty($validated['plan'])) {
            $query->whereHas('tenant', fn ($t) => $t->where('plan', $validated['plan']));
        }

        $total = (clone $query)->count();
        $users = $query->latest('id')->offset(($page - 1) * $perPage)->limit($perPage)->get();

        return response()->json([
            'data' => $users->map(fn (User $u) => $this->rowPayload($u))->values(),
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
            'counts' => [
                'total' => User::count(),
                'admins' => User::where('is_admin', true)->count(),
                'active' => User::whereHas('tenant', fn ($q) => $q->where('is_active', true))->count(),
                'suspended' => User::whereHas('tenant', fn ($q) => $q->where('is_active', false))->count(),
                'new_this_month' => User::where('created_at', '>=', now()->startOfMonth())->count(),
            ],
        ]);
    }

    /** GET /api/admin/users/{user} */
    public function show(Request $request, User $user)
    {
        $user->load([
            'tenant:id,name,slug,plan,is_active,plan_expires_at,billing_cycle',
            'qrCodes' => fn ($q) => $q->orderByDesc('scan_count')->limit(10),
            'invoices' => fn ($q) => $q->latest()->limit(10),
        ]);

        $paidInvoices = $user->invoices()->where('status', Invoice::STATUS_PAID)->count();

        return response()->json([
            'user' => array_merge($this->rowPayload($user), [
                'tenant' => $user->tenant ? [
                    'id' => $user->tenant->id,
                    'name' => $user->tenant->name,
                    'slug' => $user->tenant->slug,
                    'plan' => $user->tenant->plan,
                    'plan_name' => $user->tenant->planName(),
                    'is_active' => (bool) $user->tenant->is_active,
                    'is_expired' => $user->tenant->isExpired(),
                    'plan_expires_at' => optional($user->tenant->plan_expires_at)->toIso8601String(),
                ] : null,
                'qr_codes' => $user->qrCodes,
                'invoices' => $user->invoices,
                'paid_invoices_count' => $paidInvoices,
                'is_self' => $user->id === $request->user()->id,
                'can_delete' => $this->deletableReason($request, $user) === null,
                'delete_blocked_reason' => $this->deletableReason($request, $user),
            ]),
        ]);
    }

    /** POST /api/admin/users/{user}/role */
    public function updateRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'is_admin' => 'required|boolean',
        ]);

        $makeAdmin = (bool) $validated['is_admin'];

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak bisa mengubah peran akun sendiri. Minta admin lain melakukannya.',
                'code' => 'cannot_change_own_role',
            ], 422);
        }

        if (!$makeAdmin && $this->isLastAdmin($user)) {
            return response()->json([
                'message' => 'Ini admin terakhir. Angkat admin lain dulu sebelum menurunkan yang ini.',
                'code' => 'last_admin',
            ], 422);
        }

        if ($user->is_admin === $makeAdmin) {
            return response()->json([
                'message' => $makeAdmin ? 'Akun ini sudah admin.' : 'Akun ini sudah user biasa.',
                'user' => $this->rowPayload($user->fresh()),
            ]);
        }

        $user->is_admin = $makeAdmin;
        $user->save();

        return response()->json([
            'message' => $makeAdmin
                ? "{$user->name} sekarang admin."
                : "Peran admin {$user->name} dicabut.",
            'user' => $this->rowPayload($user->fresh()),
        ]);
    }

    /**
     * POST /api/admin/users/{user}/password
     *
     * Reset manual: tidak ada alur lupa-password di aplikasi ini, jadi ini satu-satunya
     * cara membantu pelanggan yang terkunci dari akunnya.
     */
    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        // Password lama tidak boleh tetap bisa dipakai lewat sesi yang sudah terbuka.
        $revoked = $user->tokens()->delete();

        return response()->json([
            'message' => "Password {$user->name} diganti. {$revoked} sesi login dicabut.",
            'revoked_sessions' => $revoked,
        ]);
    }

    /** POST /api/admin/users/{user}/revoke-sessions */
    public function revokeSessions(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Ini sesi kamu sendiri — kamu akan langsung keluar. Pakai tombol Keluar.',
                'code' => 'cannot_revoke_self',
            ], 422);
        }

        $revoked = $user->tokens()->delete();

        return response()->json([
            'message' => "{$revoked} sesi login {$user->name} dicabut.",
            'revoked_sessions' => $revoked,
        ]);
    }

    /** DELETE /api/admin/users/{user} */
    public function destroy(Request $request, User $user)
    {
        $blocked = $this->deletableReason($request, $user);

        if ($blocked !== null) {
            return response()->json([
                'message' => $blocked,
                'code' => 'user_not_deletable',
            ], 422);
        }

        $name = $user->name;
        $email = $user->email;

        DB::transaction(function () use ($user) {
            // Token, QR code, dan scan log ikut terhapus lewat cascade di skema.
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json([
            'message' => "Akun {$name} ({$email}) dihapus permanen.",
        ]);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /** null = boleh dihapus; string = alasan kenapa tidak boleh. */
    private function deletableReason(Request $request, User $user): ?string
    {
        if ($user->id === $request->user()->id) {
            return 'Tidak bisa menghapus akun sendiri.';
        }

        if ($this->isLastAdmin($user)) {
            return 'Ini admin terakhir. Angkat admin lain dulu sebelum menghapus yang ini.';
        }

        $paid = $user->invoices()->where('status', Invoice::STATUS_PAID)->count();

        if ($paid > 0) {
            return "Akun ini punya {$paid} invoice lunas. Invoice adalah catatan keuangan dan ikut "
                . 'terhapus kalau akunnya dihapus. Nonaktifkan workspace-nya saja dari halaman Workspace.';
        }

        return null;
    }

    private function isLastAdmin(User $user): bool
    {
        if (!$user->is_admin) {
            return false;
        }

        return User::where('is_admin', true)->whereKeyNot($user->id)->doesntExist();
    }

    private function rowPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => (bool) $user->is_admin,
            'tenant_id' => $user->tenant_id,
            'tenant_name' => $user->tenant?->name,
            'tenant_slug' => $user->tenant?->slug,
            'tenant_plan' => $user->tenant?->plan,
            'tenant_plan_name' => $user->tenant?->planName(),
            'tenant_is_active' => $user->tenant ? (bool) $user->tenant->is_active : null,
            'tenant_is_expired' => $user->tenant?->isExpired(),
            'qr_codes_count' => $user->qr_codes_count ?? $user->qrCodes()->count(),
            'invoices_count' => $user->invoices_count ?? $user->invoices()->count(),
            'api_keys_count' => $user->api_keys_count ?? $user->apiKeys()->count(),
            'created_at' => optional($user->created_at)->toIso8601String(),
        ];
    }
}
