<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pendaftaran tidak boleh pernah mengaktifkan paket berbayar.
 *
 * Bug yang dijaga di sini: `?plan=business_pro` (link dari halaman harga) dulu
 * ditulis langsung ke tenant baru, jadi siapa pun yang mendaftar lewat tombol
 * Business Pro langsung mendapat paket Pro + kuota unlimited tanpa membayar.
 */
class RegistrationPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_signup_always_creates_a_starter_workspace(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Budi',
            'email' => 'budi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'business_pro',
            'billing_cycle' => 'yearly',
        ]);

        $response->assertCreated();

        $tenant = Tenant::where('name', "Budi's Workspace")->firstOrFail();

        $this->assertSame('starter', $tenant->plan);
        $this->assertNull($tenant->plan_expires_at, 'Workspace baru tidak boleh punya masa aktif berbayar.');
    }

    public function test_signup_reports_the_requested_plan_without_activating_it(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Siti',
            'email' => 'siti@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
        ]);

        $response->assertCreated()
            ->assertJsonPath('requested_plan', 'business_pro')
            ->assertJsonPath('requested_billing_cycle', 'monthly')
            ->assertJsonPath('requires_payment', true)
            ->assertJsonPath('user.tenant.plan', 'starter');
    }

    public function test_free_plan_signup_does_not_ask_for_payment(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Andi',
            'email' => 'andi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'starter',
        ])
            ->assertCreated()
            ->assertJsonPath('requires_payment', false);
    }

    public function test_signup_without_a_plan_defaults_to_starter(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Rina',
            'email' => 'rina@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertCreated()
            ->assertJsonPath('requires_payment', false)
            ->assertJsonPath('user.tenant.plan', 'starter');
    }

    public function test_enterprise_cannot_be_self_activated(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Korporat',
            'email' => 'korporat@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'enterprise',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('plan');

        $this->assertDatabaseMissing('tenants', ['plan' => 'enterprise']);
    }

    public function test_quota_of_a_new_signup_matches_the_free_plan(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Dewi',
            'email' => 'dewi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'business_pro',
        ]);

        $token = $response->json('token');

        $this->withToken($token)->getJson('/api/plan')
            ->assertOk()
            ->assertJsonPath('current.plan', 'starter')
            ->assertJsonPath('current.usage.qr_limit', 5)
            ->assertJsonPath('current.usage.scan_limit', 1000);
    }
}
