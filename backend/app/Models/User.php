<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

    /**
     * Apakah fitur ini tersedia untuk paket user sekarang?
     *
     * Admin selalu boleh — sama seperti middleware EnsurePlanFeature, supaya
     * operator bisa menguji fitur berbayar tanpa menaikkan paketnya sendiri.
     */
    public function canUseFeature(string $feature): bool
    {
        if ($this->is_admin) {
            return true;
        }

        return $this->tenant?->canUseFeature($feature) ?? false;
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

    /**
     * Buat QR baru sambil menegakkan kuota paket, dalam satu transaksi.
     *
     * Versi sebelumnya memeriksa kuota lalu membuat QR sebagai dua langkah
     * terpisah, jadi dua permintaan paralel bisa dua-duanya lolos pengecekan.
     * Baris user dikunci supaya pemeriksaan dan penulisan tidak bisa disela.
     *
     * Catatan: lockForUpdate() hanya benar-benar mengunci di MySQL/MariaDB dan
     * PostgreSQL. Di SQLite (database yang dipakai sekarang) Laravel
     * mengabaikannya, jadi di sana perlindungannya sebatas transaksi — cukup
     * untuk kasus ini karena pembuatan QR adalah aksi langka per user.
     *
     * @return QrCode|null null kalau kuota paketnya sudah habis.
     */
    public function createQrWithinQuota(array $attributes): ?QrCode
    {
        return DB::transaction(function () use ($attributes) {
            $locked = static::whereKey($this->getKey())->lockForUpdate()->first();

            if (!$locked || !$locked->canCreateQr()) {
                return null;
            }

            do {
                $shortCode = Str::random(6);
            } while (QrCode::where('short_code', $shortCode)->exists());

            return $locked->qrCodes()->create($attributes + [
                'short_code' => $shortCode,
                'tenant_id' => $locked->tenant_id,
            ]);
        });
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