<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Carbon\Carbon;
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
            'current' => $this->tenantPayload($tenant),
            'plans' => $this->planCatalogue(),
        ]);
    }

    /**
     * POST /api/plan/select
     *
     * No payment gateway is wired in yet, so a paid plan activates immediately
     * and is fully usable. That is deliberate: this product ships as a
     * self-hosted package, so the buyer plugs in their own gateway here.
     *
     * To add billing: create the invoice + redirect to your provider (Midtrans,
     * Stripe, ...) BEFORE mutating the tenant, then call the activation block
     * below from the payment webhook instead of from this request.
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

        // ---- Activation ----
        $tenant->plan = $planKey;
        $tenant->billing_cycle = $cycle;

        if ($planKey === 'starter') {
            $tenant->plan_expires_at = null;
        } else {
            $tenant->plan_expires_at = $cycle === 'yearly'
                ? Carbon::now()->addYear()
                : Carbon::now()->addMonth();
        }

        $tenant->save();

        return response()->json([
            'message' => "Paket berhasil diubah ke {$definition['name']}.",
            'current' => $this->tenantPayload($tenant->fresh()),
        ]);
    }

    private function tenantPayload(Tenant $tenant): array
    {
        $qrLimit = $tenant->qrLimit();
        $scanLimit = $tenant->scanLimit();
        $qrUsed = $tenant->qrUsed();
        $scansUsed = $tenant->scansThisMonth();

        return [
            'plan' => $tenant->plan,
            'plan_name' => $tenant->planName(),
            'billing_cycle' => $tenant->billing_cycle,
            'plan_expires_at' => optional($tenant->plan_expires_at)->toIso8601String(),
            'is_expired' => $tenant->isExpired(),
            'usage' => [
                'qr_used' => $qrUsed,
                'qr_limit' => $qrLimit,
                'qr_remaining' => $qrLimit === null ? null : max(0, $qrLimit - $qrUsed),
                'scans_used' => $scansUsed,
                'scan_limit' => $scanLimit,
                'scan_remaining' => $scanLimit === null ? null : max(0, $scanLimit - $scansUsed),
                'over_scan_limit' => $tenant->isOverScanLimit(),
            ],
            'features' => $tenant->planDefinition()['features'] ?? [],
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