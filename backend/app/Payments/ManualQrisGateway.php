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
            ? $this->pickUniqueCode($plan, $cycle)
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

    /**
     * Kode unik 1-99 yang belum dipakai invoice aktif pada paket dan siklus yang
     * sama.
     *
     * Kode ini penanda agar admin bisa mencocokkan transfer masuk ke satu invoice.
     * Dengan random_int(1, 99) dua pelanggan bisa mendapat kode yang sama untuk
     * paket yang sama, dan pencocokannya jadi ambigu — terutama karena nilai
     * transfernya pun jadi identik.
     */
    private function pickUniqueCode(string $plan, string $cycle): int
    {
        $taken = Invoice::where('plan', $plan)
            ->where('billing_cycle', $cycle)
            ->whereIn('status', [Invoice::STATUS_PENDING, Invoice::STATUS_AWAITING])
            ->pluck('unique_code')
            ->all();

        $available = array_values(array_diff(range(1, 99), $taken));

        // Semua kode terpakai: jatuh ke 0 (tanpa kode) daripada bertabrakan.
        return $available === [] ? 0 : $available[array_rand($available)];
    }

    public function handleWebhook(Request $request): void
    {
        // No provider to hear from — settlement happens in the admin panel.
    }
}