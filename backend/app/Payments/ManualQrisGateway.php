<?php

namespace App\Payments;

use App\Models\Invoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Static QRIS + manual verification.
 *
 * Chosen as the default because it needs zero merchant approval: the operator
 * generates a QRIS from any e-wallet/bank app, pastes its image URL in .env,
 * and is immediately able to accept money. The trade-off is that an admin has
 * to confirm each transfer — which is exactly what the admin panel is for.
 */
class ManualQrisGateway implements PaymentGateway
{
    public function key(): string
    {
        return 'manual_qris';
    }

    public function label(): string
    {
        return 'QRIS Statis (verifikasi manual)';
    }

    public function createInvoice(User $user, string $plan, string $cycle, int $amount): Invoice
    {
        $uniqueCode = config('payment.unique_code_enabled', true)
            ? random_int(1, 99)
            : 0;

        return Invoice::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'plan' => $plan,
            'billing_cycle' => $cycle,
            'amount' => $amount,
            'unique_code' => $uniqueCode,
            'total_amount' => $amount + $uniqueCode,
            'status' => Invoice::STATUS_PENDING,
            'driver' => $this->key(),
            'expires_at' => Carbon::now()->addHours(
                (int) config('payment.invoice_expiry_hours', 24)
            ),
        ]);
    }

    public function instructions(Invoice $invoice): array
    {
        $cfg = config('payment.manual_qris', []);

        return [
            'driver' => $this->key(),
            'driver_label' => $this->label(),
            'merchant' => $cfg['merchant'] ?? null,
            'nmid' => $cfg['nmid'] ?? null,
            'qris_image' => $cfg['image'] ?? null,
            'amount' => $invoice->amount,
            'unique_code' => $invoice->unique_code,
            'amount_to_pay' => $invoice->total_amount,
            'steps' => array_values($cfg['instructions'] ?? []),
            'bank' => array_filter([
                'name' => $cfg['bank']['name'] ?? null,
                'account' => $cfg['bank']['account'] ?? null,
                'holder' => $cfg['bank']['holder'] ?? null,
            ]),
            'expires_at' => optional($invoice->expires_at)->toIso8601String(),
            'configured' => !empty($cfg['image']),
        ];
    }

    public function requiresManualVerification(): bool
    {
        return true;
    }

    public function handleWebhook(Request $request): void
    {
        // No provider to hear from — settlement happens in the admin panel.
    }
}