<?php

namespace App\Http\Controllers;

use App\Mail\InvoiceCreated;
use App\Models\Invoice;
use App\Payments\PaymentManager;
use App\Support\Notifier;
use App\Support\PlanPricing;
use Illuminate\Http\Request;

/**
 * Customer-facing billing endpoints.
 *
 * Purchases no longer activate a plan directly (that was the old
 * PlanController::select behaviour, which handed out paid plans for free).
 * A purchase now creates an invoice; the plan only flips once the invoice is
 * marked paid — by an admin now, by a webhook later.
 */
class InvoiceController extends Controller
{
    public function __construct(private PaymentManager $payments)
    {
    }

    /** GET /api/invoices — this user's billing history. */
    public function index(Request $request)
    {
        $invoices = $request->user()
            ->invoices()
            ->latest()
            ->limit(50)
            ->get();

        return response()->json($invoices);
    }

    /**
     * POST /api/invoices
     *
     * Body: plan, billing_cycle. Creates a pending invoice and returns the
     * payment instructions for the active gateway.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|string|in:' . implode(',', array_keys(config('plans', []))),
            'billing_cycle' => 'nullable|string|in:monthly,yearly',
        ]);

        $user = $request->user();
        $tenant = $user->tenant;

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

        // Siklus tahunan = harga per bulan x 12 (bayar setahun di muka).
        $amount = PlanPricing::chargeAmount($planKey, $cycle);

        // A free plan needs no invoice — the old direct switch is still valid
        // for it, and only for it.
        if ($amount === 0) {
            $tenant->plan = $planKey;
            $tenant->billing_cycle = $cycle;
            $tenant->plan_expires_at = null;
            $tenant->save();

            return response()->json([
                'message' => "Paket berhasil diubah ke {$definition['name']}.",
                'requires_payment' => false,
                'current' => $this->planPayload($user->fresh()),
            ]);
        }

        // Reuse a live invoice for the same plan instead of stacking duplicates
        // every time the customer refreshes the page.
        $existing = $user->invoices()
            ->where('plan', $planKey)
            ->where('billing_cycle', $cycle)
            ->whereIn('status', [Invoice::STATUS_PENDING, Invoice::STATUS_AWAITING])
            ->latest()
            ->first();

        $existing?->expireIfLapsed();

        if ($existing && $existing->isActionable()) {
            return response()->json([
                'message' => 'Lanjutkan pembayaran invoice yang sudah dibuat.',
                'requires_payment' => true,
                'invoice' => $existing,
                'instructions' => $this->payments->driver($existing->driver)->instructions($existing),
            ]);
        }

        $gateway = $this->payments->driver();

        $invoice = $gateway->createInvoice($user, $planKey, $cycle, $amount);

        // Beri tahu pelanggan nominal & batas waktunya. Untuk pembayaran QRIS
        // manual, tanpa email ini pelanggan hanya melihat layar sekali lalu
        // tidak punya pengingat apa pun.
        Notifier::send($user->email, new InvoiceCreated(
            invoice: $invoice,
            nama: $user->name,
            link: $this->invoiceLink($invoice),
        ), ['invoice' => $invoice->number]);

        return response()->json([
            'message' => 'Invoice dibuat. Selesaikan pembayaran lalu unggah bukti transfer.',
            'requires_payment' => true,
            'invoice' => $invoice,
            'instructions' => $gateway->instructions($invoice),
        ], 201);
    }

    /** Halaman pembayaran di frontend. */
    private function invoiceLink(Invoice $invoice): string
    {
        return rtrim(config('app.frontend_url'), '/') . '/dashboard/billing';
    }

    /** GET /api/invoices/{invoice} */
    public function show(Request $request, Invoice $invoice)
    {
        $this->authorizeInvoice($request, $invoice);

        return response()->json([
            'invoice' => $invoice,
            'instructions' => $this->payments->driver($invoice->driver)->instructions($invoice),
        ]);
    }

    /**
     * POST /api/invoices/{invoice}/proof
     *
     * Customer uploads the transfer receipt. Status moves to
     * `awaiting_verification` and the admin queue picks it up.
     */
    public function uploadProof(Request $request, Invoice $invoice)
    {
        $this->authorizeInvoice($request, $invoice);

        $invoice->expireIfLapsed();

        if (!$invoice->isActionable()) {
            return response()->json([
                'message' => 'Invoice ini tidak bisa lagi dibayar. Buat invoice baru.',
                'code' => 'invoice_not_actionable',
                'status' => $invoice->status,
            ], 422);
        }

        $validated = $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:4096',
            'payer_note' => 'nullable|string|max:500',
        ]);

        // Disk privat: bukti transfer bukan aset publik.
        $path = $request->file('proof')->store(
            PaymentProofController::FOLDER,
            PaymentProofController::DISK
        );

        $invoice->proof_path = $path;
        $invoice->payer_note = $validated['payer_note'] ?? null;
        $invoice->status = Invoice::STATUS_AWAITING;
        $invoice->submitted_at = now();
        $invoice->save();

        return response()->json([
            'message' => 'Bukti pembayaran diterima. Menunggu verifikasi admin.',
            'invoice' => $invoice,
        ]);
    }

    /**
     * POST /api/invoices/{invoice}/cancel
     */
    public function cancel(Request $request, Invoice $invoice)
    {
        $this->authorizeInvoice($request, $invoice);

        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Invoice sudah lunas.'], 422);
        }

        $invoice->status = Invoice::STATUS_CANCELLED;
        $invoice->save();

        return response()->json(['message' => 'Invoice dibatalkan.', 'invoice' => $invoice]);
    }

    private function authorizeInvoice(Request $request, Invoice $invoice): void
    {
        if ($invoice->user_id !== $request->user()->id && !$request->user()->is_admin) {
            abort(403, 'Invoice ini bukan milikmu.');
        }
    }

    private function planPayload(\App\Models\User $user): array
    {
        $tenant = $user->tenant;

        return [
            'plan' => $tenant?->plan ?? 'starter',
            'plan_name' => $user->planName(),
            'billing_cycle' => $tenant?->billing_cycle ?? 'monthly',
            'plan_expires_at' => optional($tenant?->plan_expires_at)->toIso8601String(),
            'is_expired' => $tenant?->isExpired() ?? false,
        ];
    }
}