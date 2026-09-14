<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::create([
            'name' => 'Default Tenant',
            'slug' => 'default',
            'domain' => null,
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Demo User',
            'email' => 'demo@linkqr.id',
            'password' => Hash::make('password123'),
            'tenant_id' => $tenant->id,
        ]);
    }
}