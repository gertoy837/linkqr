<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * "Akses API Developer" hanya untuk Enterprise — dan gate-nya harus berlaku
 * saat MEMBUAT kunci, bukan hanya saat memakainya. Sebelumnya paket Starter
 * bisa membuat API key (HTTP 201) yang tidak akan pernah bisa dipakai.
 */
class ApiKeyFeatureGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_cannot_create_an_api_key(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/api-keys', ['name' => 'kunci-uji'])
            ->assertForbidden()
            ->assertJsonPath('code', 'plan_upgrade_required');

        $this->assertDatabaseCount('api_keys', 0);
    }

    public function test_the_list_endpoint_stays_open_so_the_ui_can_offer_an_upgrade(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/api-keys')
            ->assertOk()
            ->assertJsonPath('feature_enabled', false);
    }

    public function test_enterprise_can_create_and_use_an_api_key(): void
    {
        $tenant = $this->makeTenant(['plan' => 'enterprise', 'plan_expires_at' => Carbon::now()->addYear()]);
        $user = $this->makeUser($tenant);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/api-keys', ['name' => 'integrasi'])
            ->assertCreated();

        $plain = $response->json('plain_key');
        $this->assertIsString($plain);

        // Kunci mentah tidak boleh tersimpan apa adanya di database.
        $this->assertDatabaseMissing('api_keys', ['key_hash' => $plain]);

        $this->withHeader('X-API-Key', $plain)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('workspace.plan', 'enterprise');
    }

    public function test_a_bogus_api_key_is_rejected(): void
    {
        $this->withHeader('X-API-Key', 'lqr_tidak-ada')
            ->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('code', 'api_key_invalid');
    }
}
