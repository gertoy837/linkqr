<?php

namespace App\Payments;

use InvalidArgumentException;

/**
 * Resolves the configured gateway.
 *
 * Register new providers here — nothing else in the app needs to know which
 * driver is active.
 */
class PaymentManager
{
    /** @var array<string, class-string<PaymentGateway>> */
    protected array $drivers = [
        'manual_qris' => ManualQrisGateway::class,
    ];

    public function driver(?string $name = null): PaymentGateway
    {
        $name = $name ?? config('payment.driver', 'manual_qris');

        if (!isset($this->drivers[$name])) {
            throw new InvalidArgumentException("Payment driver [{$name}] belum terdaftar.");
        }

        return app($this->drivers[$name]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function availableDrivers(): array
    {
        return array_values(array_map(function (string $class) {
            /** @var PaymentGateway $gateway */
            $gateway = app($class);

            return [
                'key' => $gateway->key(),
                'label' => $gateway->label(),
                'requires_manual_verification' => $gateway->requiresManualVerification(),
            ];
        }, $this->drivers));
    }
}