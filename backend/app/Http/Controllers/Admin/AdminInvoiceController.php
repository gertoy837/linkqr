<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Operator console: verify incoming QRIS/bank transfers by hand.
 *
 * This is the piece that makes manual QRIS actually usable — without it the
 * gateway would take money and never grant the plan.
 */
class AdminInvoiceController extends Controller
{
    /** GET /api/admin/invoices?status=awaiting_verification */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:' . implode(',', Invoice::STATUSES),
            'q' => 'nullable|string|max:100',
        ]);

        $query = Invoice::with(['tenant:id,name', 'user:id,name,email'])
            ->latest();

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['q'])) {
            $term = '%' . $validated['q'] . '%';
            $query->where(function ($q) use ($term) {
                $q->where('number', 'like', $term)
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', $term)->orWhere('name', 'like', $term));
            });
        }

        return response()->json([
            'data' => $query->limit(100)->get(),
            'counts' => [
                'pending' => Invoice::where('status', Invoice::STATUS_PENDING)->count(),
                'awaiting' => Invoice::where('status', Invoice::STATUS_AWAITING)->count(),
                'paid' => Invoice::where('status', Invoice::STATUS_PAID)->count(),
                'rejected' => Invoice::where('status', Invoice::STATUS_REJECTED)->count(),
            ],
        ]);
    }

    /** GET /api/admin/invoices/{invoice} */
    public function show(Invoice $invoice)
    {
        $invoice->load(['tenant', 'user:id,name,email', 'verifier:id,name']);

        return response()->json($invoice);
    }

    /**
     * POST /api/admin/invoices/{invoice}/verify
     *
     * Marks the transfer as received. The plan is applied by
     * Invoice::markPaid() — same code path a future webhook will call.
     */
    public function verify(Request $request, Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Invoice sudah lunas sebelumnya.'], 422);
        }

        $validated = $request->validate([
            'note' => 'nullable|string|max:500',
        ]);

        $invoice->markPaid($request->user()->id, $validated['note'] ?? null);

        return response()->json([
            'message' => "Pembayaran {$invoice->number} terverifikasi. Paket {$invoice->planName()} aktif.",
            'invoice' => $invoice->fresh(['tenant']),
        ]);
    }

    /** POST /api/admin/invoices/{invoice}/reject */
    public function reject(Request $request, Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Invoice sudah lunas, tidak bisa ditolak.'], 422);
        }

        $validated = $request->validate([
            'note' => 'nullable|string|max:500',
        ]);

        $invoice->status = Invoice::STATUS_REJECTED;
        $invoice->admin_note = $validated['note'] ?? 'Bukti pembayaran tidak valid.';
        $invoice->save();

        return response()->json([
            'message' => 'Invoice ditolak. Customer bisa mengunggah ulang bukti.',
            'invoice' => $invoice,
        ]);
    }

    /**
     * GET /api/admin/overview
     *
     * The numbers an operator actually needs: how much money is waiting, how
     * many workspaces are paying, and what the recurring revenue looks like.
     */
    public function overview()
    {
        $tenants = Tenant::withCount('users', 'qrCodes')->get();

        $paidInvoices = Invoice::where('status', Invoice::STATUS_PAID)->get();

        // Normalise every paid invoice to a monthly figure so a yearly plan is
        // comparable with a monthly one.
        $mrr = $paidInvoices->sum(function (Invoice $invoice) {
            $price = (int) $invoice->amount;
            $isActive = $invoice->tenant
                && $invoice->tenant->plan === $invoice->plan
                && !$invoice->tenant->isExpired();

            if (!$isActive) {
                return 0;
            }

            return $invoice->billing_cycle === 'yearly'
                ? (int) round($price / 12)
                : $price;
        });

        return response()->json([
            'totals' => [
                'tenants' => $tenants->count(),
                'users' => User::count(),
                'qr_codes' => \App\Models\QrCode::count(),
                'scans' => \App\Models\QrScanLog::count(),
            ],
            'revenue' => [
                'mrr' => $mrr,
                'arr' => $mrr * 12,
                'collected_all_time' => $paidInvoices->sum('total_amount'),
                'awaiting_verification' => Invoice::where('status', Invoice::STATUS_AWAITING)->count(),
                'unverified_amount' => Invoice::where('status', Invoice::STATUS_AWAITING)->sum('total_amount'),
            ],
            'plans' => [
                'starter' => $tenants->where('plan', 'starter')->count(),
                'business_pro' => $tenants->where('plan', 'business_pro')->count(),
                'enterprise' => $tenants->where('plan', 'enterprise')->count(),
            ],
            'tenants' => $tenants->map(fn (Tenant $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'plan' => $t->plan,
                'plan_name' => $t->planName(),
                'expires_at' => optional($t->plan_expires_at)->toIso8601String(),
                'is_expired' => $t->isExpired(),
                'users_count' => $t->users_count,
                'qr_codes_count' => $t->qr_codes_count,
                'created_at' => $t->created_at->toIso8601String(),
            ])->values(),
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenant}/plan
     *
     * Manual override — for comped accounts, offline deals, or fixing a
     * mistake without inventing an invoice.
     */
    public function setTenantPlan(Request $request, Tenant $tenant)
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:' . implode(',', array_keys(config('plans', []))),
            'billing_cycle' => 'nullable|string|in:monthly,yearly',
            'days' => 'nullable|integer|min:1|max:3650',
        ]);

        $tenant->plan = $validated['plan'];
        $tenant->billing_cycle = $validated['billing_cycle'] ?? 'monthly';

        if ($tenant->plan === 'starter') {
            $tenant->plan_expires_at = null;
        } else {
            $tenant->plan_expires_at = now()->addDays($validated['days'] ?? 30);
        }

        $tenant->save();

        return response()->json([
            'message' => "Paket {$tenant->name} diubah ke {$tenant->planName()}.",
            'tenant' => $tenant,
        ]);
    }
}