<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Kunci API untuk paket Enterprise.
 *
 * Kunci asli HANYA ditampilkan sekali saat dibuat. Yang tersimpan di database
 * cuma hash SHA-256, jadi kalau database bocor, kuncinya tidak bisa dipakai.
 * Ini alasan yang sama kenapa password di-hash, bukan disimpan apa adanya.
 */
class ApiKey extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'name',
        'key_prefix',
        'key_hash',
        'last_used_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected $appends = ['is_expired'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Buat kunci baru.
     *
     * @return array{0: ApiKey, 1: string} Model dan kunci mentah (hanya sekali ini).
     */
    public static function generate(User $user, string $name, ?Carbon $expiresAt = null): array
    {
        // 40 karakter acak → ~238 bit entropi. Cukup untuk tidak bisa di-brute force.
        $plain = 'lqr_' . Str::random(40);

        $model = static::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'name' => $name,
            'key_prefix' => substr($plain, 0, 12),
            'key_hash' => hash('sha256', $plain),
            'expires_at' => $expiresAt,
            'is_active' => true,
        ]);

        return [$model, $plain];
    }

    public static function findByPlainKey(string $plain): ?self
    {
        return static::where('key_hash', hash('sha256', $plain))->first();
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isValid(): bool
    {
        return $this->is_active && !$this->is_expired;
    }

    public function touchLastUsed(): void
    {
        // updateQuietly: jangan sentuh updated_at, karena pemakaian API bukan
        // perubahan konfigurasi dan bikin kolom "diubah" menyesatkan di UI.
        $this->updateQuietly(['last_used_at' => now()]);
    }
}