<?php

/**
 * Payment configuration.
 *
 * The product ships with a provider-agnostic billing layer. `driver` picks the
 * active gateway; `manual_qris` is the zero-approval default so the platform can
 * take real money before any payment provider has approved the merchant account.
 *
 * To move to an automated gateway later (Midtrans/Xendit/Tripay), implement
 * App\Payments\PaymentGateway in a new class, register it in App\Payments\
 * PaymentManager, and switch PAYMENT_DRIVER in .env. Nothing in the billing
 * controller or the frontend has to change.
 */
return [

    'driver' => env('PAYMENT_DRIVER', 'manual_qris'),

    // How long a customer has to complete payment before the invoice lapses.
    'invoice_expiry_hours' => (int) env('PAYMENT_INVOICE_EXPIRY_HOURS', 24),

    // A 1-99 rupiah suffix is added to the plan price so each invoice has a
    // unique payable amount. This is what makes manual verification reliable.
    'unique_code_enabled' => (bool) env('PAYMENT_UNIQUE_CODE', true),

    'manual_qris' => [
        'merchant' => env('PAYMENT_QRIS_MERCHANT', 'Kovara Studio'),

        // Nomor Merchant ID (NMID) printed on the QRIS — shown to the customer
        // so they can confirm they are paying the right merchant.
        'nmid' => env('PAYMENT_QRIS_NMID'),

        // Public URL of the static QRIS image (upload it anywhere reachable).
        'image' => env('PAYMENT_QRIS_IMAGE'),

        // Optional bank fallback, shown alongside the QRIS.
        'bank' => [
            'name' => env('PAYMENT_BANK_NAME'),
            'account' => env('PAYMENT_BANK_ACCOUNT'),
            'holder' => env('PAYMENT_BANK_HOLDER'),
        ],

        'instructions' => [
            'Buka aplikasi e-wallet atau m-banking apa pun yang mendukung QRIS.',
            'Scan gambar QRIS di atas.',
            'Masukkan nominal TEPAT sebesar total tagihan (termasuk 3 digit terakhir).',
            'Simpan bukti pembayaran, lalu unggah di halaman ini.',
        ],
    ],
];