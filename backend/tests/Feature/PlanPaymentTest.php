<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Paket berbayar hanya boleh aktif setelah pembayaran diverifikasi.
 */
class PlanPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function starterUser(): array
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    public function test_legacy_plan_select_refuses_a_paid_plan(): void
    {
        [$tenant, $user] = $this->starterUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/plan/select', ['plan' => 'business_pro', 'billing_cycle' => 'monthly'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'payment_required');

        $this->assertSame('starter', $tenant->fresh()->plan);
    }

    public function test_legacy_plan_select_still_allows_the_free_plan(): void
    {
        $tenant = $this->makeTenant(['plan' => 'business_pro', 'plan_expires_at' => Carbon::now()->addMonth()]);
        $user = $this->makeUser($tenant);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/plan/select', ['plan' => 'starter'])
            ->assertOk()
            ->assertJsonPath('requires_payment', false);

        $this->assertSame('starter', $tenant->fresh()->plan);
        $this->assertNull($tenant->fresh()->plan_expires_at);
    }

    public function test_creating_an_invoice_does_not_activate_the_plan(): void
    {
        [$tenant, $user] = $this->starterUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro', 'billing_cycle' => 'monthly'])
            ->assertCreated()
            ->assertJsonPath('requires_payment', true)
            ->assertJsonPath('invoice.status', Invoice::STATUS_PENDING);

        $this->assertSame('starter', $tenant->fresh()->plan, 'Invoice pending tidak boleh mengaktifkan paket.');
    }

    public function test_verifying_an_invoice_activates_the_plan(): void
    {
        [$tenant, $user] = $this->starterUser();
        $admin = $this->makeUser($tenant, ['is_admin' => true]);

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 7,
            'total_amount' => 59007,
            'status' => Invoice::STATUS_AWAITING,
            'driver' => 'manual_qris',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/invoices/{$invoice->id}/verify")
            ->assertOk();

        $tenant->refresh();
        $this->assertSame('business_pro', $tenant->plan);
        $this->assertTrue($tenant->plan_expires_at->isFuture());
        $this->assertSame(Invoice::STATUS_PAID, $invoice->fresh()->status);
    }

    public function test_renewing_the_same_plan_extends_from_the_current_expiry(): void
    {
        $expiry = Carbon::now()->addDays(10);
        $tenant = $this->makeTenant(['plan' => 'business_pro', 'plan_expires_at' => $expiry]);
        $user = $this->makeUser($tenant);

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 1,
            'total_amount' => 59001,
            'status' => Invoice::STATUS_PENDING,
            'driver' => 'manual_qris',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $invoice->markPaid($user->id);

        // 10 hari yang tersisa harus tetap dihitung, bukan hangus.
        $this->assertEqualsWithDelta(
            $expiry->copy()->addMonth()->timestamp,
            $tenant->fresh()->plan_expires_at->timestamp,
            5
        );
    }

    public function test_paying_after_expiry_starts_from_today(): void
    {
        $tenant = $this->makeTenant([
            'plan' => 'business_pro',
            'plan_expires_at' => Carbon::now()->subDays(20),
        ]);
        $user = $this->makeUser($tenant);

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 2,
            'total_amount' => 59002,
            'status' => Invoice::STATUS_PENDING,
            'driver' => 'manual_qris',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $invoice->markPaid($user->id);

        // Hari yang sudah hilang tidak boleh ikut dihitung.
        $this->assertTrue($tenant->fresh()->plan_expires_at->isAfter(Carbon::now()->addDays(27)));
    }

    public function test_unique_codes_do_not_collide_between_active_invoices(): void
    {
        $codes = [];

        for ($i = 0; $i < 15; $i++) {
            $tenant = $this->makeTenant();
            $user = $this->makeUser($tenant);

            $invoice = app(\App\Payments\PaymentManager::class)
                ->driver()
                ->createInvoice($user, 'business_pro', 'monthly', 59000);

            $codes[] = $invoice->unique_code;
        }

        $this->assertSame(
            count($codes),
            count(array_unique($codes)),
            'Kode unik harus berbeda antar invoice aktif pada paket yang sama.'
        );
    }
}
