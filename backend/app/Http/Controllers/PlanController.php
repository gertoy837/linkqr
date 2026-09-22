<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    /**
     * GET /api/plan
     *
     * Current plan + live usage + the full catalogue, so the billing page can
     * render everything from one request.
     */
    public function show(Request $request)
    {
        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 404);
        }

        return response()->json([
            'current' => $this->userPayload($request->user()),
            'plans' => $this->planCatalogue(),
        ]);
    }

    /**
     * POST /api/plan/select
     *
     * Legacy switch, kept for the free plan and for downgrades. Paid tiers are
     * refused here: they activate only after a verified payment, so they must
     * go through POST /invoices (see InvoiceController). The billing page
     * already uses /invoices for every switch.
     */
    public function select(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:' . implode(',', array_keys(config('plans', []))),
            'billing_cycle' => 'nullable|string|in:monthly,yearly',
        ]);

        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 404);
        }

        $planKey = $validated['plan'];
        $cycle = $validated['billing_cycle'] ?? 'monthly';
        $definition = config("plans.{$planKey}");

        if (!empty($definition['contact_only'])) {
            return response()->json([
                'message' => 'Paket Enterprise diaktifkan lewat tim kami. Hubungi support untuk melanjutkan.',
                'code' => 'contact_only',
            ], 422);
        }

        // A paid plan may only be activated by a verified payment. This
        // endpoint used to flip the plan immediately, which handed out paid
        // tiers for free to anyone who called it. A paid switch must create an
        // invoice first, so one exists before the plan changes.
        $amount = (int) ($definition['price'][$cycle] ?? 0);

        if ($amount > 0) {
            return response()->json([
                'message' => 'Paket berbayar hanya aktif setelah pembayaran diverifikasi. Buat invoice lewat POST /invoices.',
                'code' => 'payment_required',
                'requires_payment' => true,
            ], 422);
        }

        // ---- Activation (free plan only) ----
        $tenant->plan = $planKey;
        $tenant->billing_cycle = $cycle;
        $tenant->plan_expires_at = null;
        $tenant->save();

        return response()->json([
            'message' => "Paket berhasil diubah ke {$definition['name']}.",
            'requires_payment' => false,
            'current' => $this->userPayload($request->user()->fresh()),
        ]);
    }

    /**
     * Usage is counted per USER even though the plan is stored on the tenant.
     * The dashboard lists this user's own QR codes, so a tenant-wide count made
     * the usage bar disagree with the list.
     */
    private function userPayload(\App\Models\User $user): array
    {
        $qrLimit = $user->qrLimit();
        $scanLimit = $user->scanLimit();
        $qrUsed = $user->qrUsed();
        $scansUsed = $user->scansThisMonth();
        $tenant = $user->tenant;

        return [
            'plan' => $tenant?->plan ?? 'starter',
            'plan_name' => $user->planName(),
            'billing_cycle' => $tenant?->billing_cycle ?? 'monthly',
            'plan_expires_at' => optional($tenant?->plan_expires_at)->toIso8601String(),
            'is_expired' => $tenant?->isExpired() ?? false,
            'usage' => [
                'qr_used' => $qrUsed,
                'qr_limit' => $qrLimit,
                'qr_remaining' => $qrLimit === null ? null : max(0, $qrLimit - $qrUsed),
                'scans_used' => $scansUsed,
                'scan_limit' => $scanLimit,
                'scan_remaining' => $scanLimit === null ? null : max(0, $scanLimit - $scansUsed),
                // Per-user, like every other number here: the tenant-wide count
                // included colleagues' scans and lit the warning for the wrong person.
                'over_scan_limit' => $user->isOverScanLimit(),
            ],
            'features' => $tenant?->planDefinition()['features'] ?? [],
        ];
    }

    private function planCatalogue(): array
    {
        $out = [];

        foreach (config('plans', []) as $key => $plan) {
            $out[] = [
                'key' => $key,
                'name' => $plan['name'],
                'tagline' => $plan['tagline'] ?? '',
                'price' => $plan['price'] ?? ['monthly' => null, 'yearly' => null],
                'limits' => $plan['limits'] ?? [],
                'features' => $plan['features'] ?? [],
                'popular' => (bool) ($plan['popular'] ?? false),
                'contact_only' => (bool) ($plan['contact_only'] ?? false),
            ];
        }

        return $out;
    }
}