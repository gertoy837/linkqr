<?php

namespace App\Payments;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Contract every payment provider must satisfy.
 *
 * The billing controller only ever talks to this interface, which is what lets
 * the platform start on manual QRIS (no merchant approval needed) and swap to
 * Midtrans/Xendit later by registering a second implementation.
 */
interface PaymentGateway
{
    /** Machine name of the driver, stored on each invoice. */
    public function key(): string;

    /** Human label for the admin UI. */
    public function label(): string;

    /**
     * Build a new invoice for a plan purchase.
     *
     * Takes the buying User rather than the Tenant because the invoice records
     * BOTH: the workspace that gets billed (tenant_id) and the person who
     * actually pays (user_id, NOT NULL).
     */
    public function createInvoice(User $user, string $plan, string $cycle, int $amount): Invoice;

    /**
     * Payment instructions handed to the customer (QRIS image, bank fallback,
     * amount to pay, step-by-step copy).
     *
     * @return array<string, mixed>
     */
    public function instructions(Invoice $invoice): array;

    /**
     * Whether this gateway settles automatically (webhook) or needs an admin
     * to confirm the transfer by hand.
     */
    public function requiresManualVerification(): bool;

    /**
     * Handle an incoming provider webhook. Manual gateways no-op here.
     */
    public function handleWebhook(Request $request): void;
}