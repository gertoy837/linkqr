<?php

/**
 * Single source of truth for every plan tier.
 *
 * A `null` limit means unlimited. Keep the keys here in sync with the copy on
 * the landing page (frontend/app/page.tsx #pricing) — the billing page reads
 * this file through /api/plan so the two can never drift apart.
 */
return [
    'starter' => [
        'name' => 'Starter',
        'tagline' => 'Untuk coba-coba & penggunaan pribadi',
        'price' => [
            'monthly' => 0,
            'yearly' => 0,
        ],
        'limits' => [
            'qr_codes' => 5,
            'scans_per_month' => 1000,
        ],
        // Flag ini yang benar-benar ditegakkan di server (middleware
        // feature:export, AuthenticateApiKey). Daftar 'features' di bawah
        // hanya teks pemasaran untuk halaman harga.
        'features_enabled' => [
            'export' => false,
            'api_access' => false,
            'custom_domain' => false,
            'logo_branding' => false,
        ],
        'features' => [
            '5 QR Code Dinamis',
            '1.000 Scan per bulan',
            'Analitik Dasar',
            'Short Link Standar',
        ],
    ],

    'business_pro' => [
        'name' => 'Business Pro',
        'tagline' => 'Untuk UMKM & Restoran',
        'price' => [
            'monthly' => 59000,
            'yearly' => 49000,
        ],
        'limits' => [
            'qr_codes' => null,
            'scans_per_month' => null,
        ],
        'features_enabled' => [
            'export' => true,
            'api_access' => false,
            'custom_domain' => false,
            'logo_branding' => true,
        ],
        'features' => [
            'Unlimited QR Code Dinamis',
            'Unlimited Scan Tanpa Batas',
            'Analitik Lengkap & Lokasi',
            'Kustomisasi Logo & Warna',
            'Ekspor Laporan PDF & Excel',
        ],
        'popular' => true,
    ],

    'enterprise' => [
        'name' => 'Enterprise',
        'tagline' => 'Custom Domain & Brand Besar',
        'price' => [
            'monthly' => null,
            'yearly' => null,
        ],
        'limits' => [
            'qr_codes' => null,
            'scans_per_month' => null,
        ],
        'features_enabled' => [
            'export' => true,
            'api_access' => true,
            'custom_domain' => true,
            'logo_branding' => true,
        ],
        'features' => [
            'Semua Fitur Pro',
            'Custom Domain Sendiri',
            'Akses API Developer',
            'Support Prioritas 24/7',
        ],
        'contact_only' => true,
    ],
];