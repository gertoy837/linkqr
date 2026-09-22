<?php

namespace Tests;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    protected function makeTenant(array $attributes = []): Tenant
    {
        return Tenant::create(array_merge([
            'name' => 'Test Workspace',
            'slug' => 'ws-' . Str::lower(Str::random(10)),
            'is_active' => true,
            'plan' => 'starter',
            'billing_cycle' => 'monthly',
            'plan_expires_at' => null,
        ], $attributes));
    }

    protected function makeUser(Tenant $tenant, array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'email' => Str::lower(Str::random(10)) . '@example.com',
            // Cast `hashed` di model yang meng-hash, jadi kirim teks biasa.
            'password' => 'password123',
            'tenant_id' => $tenant->id,
            'is_admin' => false,
        ], $attributes));
    }
}
