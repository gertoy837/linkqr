<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
        'is_admin',
    ];

    protected $casts = [
        'is_admin' => 'boolean',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    // ---------------------------------------------------------------------
    // Plan helpers (per-user)
    //
    // The plan itself lives on the tenant (workspace-level billing), but every
    // quota is counted against THIS user's own QR codes. Counting at tenant
    // level made two users who share a workspace share one quota, so the
    // dashboard (which lists per-user) disagreed with the usage bar: a user
    // with 4 QR codes saw "5/5 habis" because a colleague's QR was included.
    // ---------------------------------------------------------------------

    /** null = unlimited */
    public function qrLimit(): ?int
    {
        return $this->tenant?->qrLimit();
    }

    /** null = unlimited */
    public function scanLimit(): ?int
    {
        return $this->tenant?->scanLimit();
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

    public function planName(): string
    {
        return $this->tenant?->planName() ?? 'Starter';
    }

    /** Scans against this user's own QR codes since the 1st of this month. */
    public function scansThisMonth(): int
    {
        $qrIds = $this->qrCodes()->pluck('id');

        if ($qrIds->isEmpty()) {
            return 0;
        }

        return QrScanLog::whereIn('qr_code_id', $qrIds)
            ->where('scanned_at', '>=', \Carbon\Carbon::now()->startOfMonth())
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
}