<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'domain',
        'is_active',
        'plan',
        'billing_cycle',
        'plan_expires_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'plan_expires_at' => 'datetime',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }

    // ---------------------------------------------------------------------
    // Plan helpers
    // ---------------------------------------------------------------------

    public static function planDefinitions(): array
    {
        return config('plans', []);
    }

    public function planDefinition(): array
    {
        $plans = static::planDefinitions();

        return $plans[$this->plan] ?? $plans['starter'] ?? [];
    }

    public function planName(): string
    {
        return $this->planDefinition()['name'] ?? ucfirst((string) $this->plan);
    }

    /** null = unlimited */
    public function qrLimit(): ?int
    {
        return $this->planDefinition()['limits']['qr_codes'] ?? null;
    }

    /** null = unlimited */
    public function scanLimit(): ?int
    {
        return $this->planDefinition()['limits']['scans_per_month'] ?? null;
    }

    public function qrUsed(): int
    {
        return $this->qrCodes()->count();
    }

    public function qrRemaining(): ?int
    {
        $limit = $this->qrLimit();

        return $limit === null ? null : max(0, $limit - $this->qrUsed());
    }

    public function canCreateQr(): bool
    {
        $limit = $this->qrLimit();

        return $limit === null || $this->qrUsed() < $limit;
    }

    /** Scans recorded against this workspace since the 1st of this month. */
    public function scansThisMonth(): int
    {
        $qrIds = $this->qrCodes()->pluck('id');

        if ($qrIds->isEmpty()) {
            return 0;
        }

        return QrScanLog::whereIn('qr_code_id', $qrIds)
            ->where('scanned_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public function scanRemaining(): ?int
    {
        $limit = $this->scanLimit();

        return $limit === null ? null : max(0, $limit - $this->scansThisMonth());
    }

    /**
     * Scan quota is a SOFT limit on purpose: a QR code that is already printed
     * and stuck to a table must never stop working because a quota ran out.
     * We keep counting (so analytics stays truthful) and warn in the dashboard
     * instead of blocking the redirect.
     */
    public function isOverScanLimit(): bool
    {
        $limit = $this->scanLimit();

        return $limit !== null && $this->scansThisMonth() >= $limit;
    }

    public function isExpired(): bool
    {
        return $this->plan_expires_at !== null && $this->plan_expires_at->isPast();
    }
}