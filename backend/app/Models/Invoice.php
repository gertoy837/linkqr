<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Invoice extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_AWAITING = 'awaiting_verification';
    public const STATUS_PAID = 'paid';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AWAITING,
        self::STATUS_PAID,
        self::STATUS_REJECTED,
        self::STATUS_EXPIRED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'number',
        'tenant_id',
        'user_id',
        'plan',
        'billing_cycle',
        'amount',
        'unique_code',
        'total_amount',
        'status',
        'driver',
        'proof_path',
        'payer_note',
        'admin_note',
        'submitted_at',
        'paid_at',
        'verified_at',
        'verified_by',
        'expires_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'unique_code' => 'integer',
        'total_amount' => 'integer',
        'submitted_at' => 'datetime',
        'paid_at' => 'datetime',
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected $appends = ['status_label'];

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (empty($invoice->number)) {
                $invoice->number = static::generateNumber();
            }
        });
    }

    public static function generateNumber(): string
    {
        do {
            $number = 'INV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
        } while (static::where('number', $number)->exists());

        return $number;
    }

    // ---------------------------------------------------------------------
    // Relations
    // ---------------------------------------------------------------------

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ---------------------------------------------------------------------
    // Presentation
    // ---------------------------------------------------------------------

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING => 'Menunggu Pembayaran',
            self::STATUS_AWAITING => 'Menunggu Verifikasi',
            self::STATUS_PAID => 'Lunas',
            self::STATUS_REJECTED => 'Ditolak',
            self::STATUS_EXPIRED => 'Kedaluwarsa',
            self::STATUS_CANCELLED => 'Dibatalkan',
            default => ucfirst((string) $this->status),
        };
    }

    public function planName(): string
    {
        return config("plans.{$this->plan}.name", ucfirst((string) $this->plan));
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Can the customer still act on this invoice (pay / re-upload proof)?
     *
     * Ini murni pembacaan. Sebelumnya method ini diam-diam menulis ke database
     * (menandai invoice basi sebagai `expired`), sehingga sebuah predikat punya
     * efek samping. Pemanggil yang memang ingin housekeeping itu sekarang
     * memanggil expireIfLapsed() secara eksplisit, dan command
     * invoices:expire-stale tetap menangani invoice yang tidak pernah dibuka lagi.
     */
    public function isActionable(): bool
    {
        if (in_array($this->status, [self::STATUS_PAID, self::STATUS_CANCELLED], true)) {
            return false;
        }

        if ($this->isExpired()) {
            return false;
        }

        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_AWAITING,
            self::STATUS_REJECTED,
        ], true);
    }

    /**
     * Tandai invoice yang sudah lewat batas waktu sebagai kedaluwarsa.
     *
     * @return bool true kalau statusnya benar-benar berubah.
     */
    public function expireIfLapsed(): bool
    {
        if (!$this->isExpired()) {
            return false;
        }

        if (!in_array($this->status, [self::STATUS_PENDING, self::STATUS_REJECTED], true)) {
            return false;
        }

        $this->forceFill(['status' => self::STATUS_EXPIRED])->save();

        return true;
    }

    /**
     * Apply the purchased plan to the tenant.
     *
     * Renewals extend from the current expiry instead of from today, so a
     * customer who pays early does not lose the days they already paid for.
     */
    public function activatePlan(): void
    {
        $tenant = $this->tenant;

        if (!$tenant) {
            return;
        }

        // Paket dan masa aktif lama harus dibaca SEBELUM ditimpa. Versi
        // sebelumnya menimpa $tenant->plan lebih dulu, lalu membandingkannya
        // dengan $this->plan — perbandingan yang jadi selalu benar sehingga
        // syaratnya mati dan tidak pernah menyaring apa pun.
        $previousPlan = $tenant->plan;
        $wasActive = $tenant->plan_expires_at !== null
            && $tenant->plan_expires_at->isFuture();

        $tenant->plan = $this->plan;
        $tenant->billing_cycle = $this->billing_cycle;

        if ($this->plan === 'starter') {
            $tenant->plan_expires_at = null;
        } else {
            // Perpanjangan paket yang sama menambah dari tanggal kedaluwarsa
            // lama; pindah paket (atau paket yang sudah lapsed) mulai dari hari ini.
            $isRenewal = $previousPlan === $this->plan && $wasActive;

            $base = $isRenewal ? $tenant->plan_expires_at->copy() : Carbon::now();

            $tenant->plan_expires_at = $this->billing_cycle === 'yearly'
                ? $base->addYear()
                : $base->addMonth();

            // Siklus baru, jadi pengingatnya direset. Tanpa ini, pelanggan yang
            // memperpanjang tidak akan pernah menerima pengingat lagi pada
            // periode berikutnya — kolomnya masih berisi ambang periode lalu.
            $tenant->renewal_reminder_stage = 0;
            $tenant->renewal_reminder_sent_at = null;
        }

        $tenant->save();
    }

    public function markPaid(?int $verifiedBy = null, ?string $note = null): void
    {
        // Satu transaksi: invoice tidak boleh tercatat lunas sementara paketnya
        // gagal diterapkan. Tanpa ini, kegagalan di activatePlan() meninggalkan
        // pelanggan yang sudah bayar tapi tidak mendapat fiturnya.
        DB::transaction(function () use ($verifiedBy, $note) {
            $this->status = self::STATUS_PAID;
            $this->paid_at = $this->paid_at ?? Carbon::now();
            $this->verified_at = Carbon::now();
            $this->verified_by = $verifiedBy;

            if ($note !== null) {
                $this->admin_note = $note;
            }

            $this->save();

            $this->activatePlan();
        });
    }

    // ---------------------------------------------------------------------
    // Scopes
    // ---------------------------------------------------------------------

    public function scopePendingReview($query)
    {
        return $query->whereIn('status', [self::STATUS_PENDING, self::STATUS_AWAITING]);
    }
}