<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Support\DateGrouping;
use App\Support\QrColor;
use App\Support\QrLogo;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QrCodeController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        // `logo` disembunyikan dari daftar: isinya data URL yang bisa ratusan
        // kilobyte, dan halaman daftar tidak merender gambar QR sama sekali.
        // Ikut mengirimkannya hanya membengkakkan respons tanpa ada pemakai.
        $qrs = $request->user()->qrCodes()->latest()->get()->makeHidden('logo');

        return response()->json($qrs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'target_url' => 'required|url',
            'color' => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
            'logo' => 'nullable|string',
        ]);

        // Kuota paket ditegakkan di dalam User::createQrWithinQuota(), dalam satu
        // transaksi dengan pembuatan QR — memeriksa lalu membuat sebagai dua
        // langkah terpisah membiarkan dua permintaan paralel dua-duanya lolos.
        //
        // Dihitung per USER, bukan per tenant: dashboard menampilkan QR milik
        // user ini sendiri, jadi hitungan tingkat tenant membuat bar pemakaian
        // tidak cocok dengan daftarnya.
        $user = $request->user();

        $color = $validated['color'] ?? QrCode::DEFAULT_COLOR;
        $logo = $validated['logo'] ?? null;

        // Warna & logo adalah fitur berbayar — halaman harga mengiklankannya
        // sebagai "Kustomisasi Logo & Warna" milik Business Pro. Sebelumnya
        // keduanya bebas dipakai paket Starter, jadi keunggulan yang dijual ke
        // pembeli Pro sebenarnya bisa didapat gratis.
        if (!$user->canUseFeature('logo_branding')) {
            if (strtoupper($color) !== strtoupper(QrCode::DEFAULT_COLOR)) {
                return $this->upgradeRequired('Warna kustom');
            }

            if ($logo !== null) {
                return $this->upgradeRequired('Logo kustom');
            }
        }

        if ($logo !== null && !QrLogo::isValid($logo)) {
            return response()->json([
                'message' => QrLogo::rejectionMessage(),
                'code' => 'invalid_logo',
            ], 422);
        }

        // Warna terlalu pucat menghasilkan QR yang gagal discan di kamera HP
        // sungguhan. Ditolak di sini supaya pelanggan tidak membayar fitur yang
        // justru merusak QR-nya.
        if (!QrColor::isScannable($color)) {
            return response()->json([
                'message' => QrColor::rejectionMessage(),
                'code' => 'color_too_light',
            ], 422);
        }

        $qr = $user->createQrWithinQuota([
            'title' => $validated['title'],
            'target_url' => $validated['target_url'],
            'color' => $color,
            'logo' => $logo,
        ]);

        if (!$qr) {
            return response()->json([
                'message' => "Kuota QR Code paket {$user->planName()} sudah habis "
                    . "({$user->qrUsed()}/{$user->qrLimit()}). Upgrade paket untuk menambah QR.",
                'code' => 'qr_limit_reached',
                'usage' => [
                    'qr_used' => $user->qrUsed(),
                    'qr_limit' => $user->qrLimit(),
                ],
            ], 403);
        }

        return response()->json($qr, 201);
    }

    public function show(QrCode $qrCode)
    {
        $this->authorize('view', $qrCode);

        return response()->json($qrCode);
    }

    public function update(Request $request, QrCode $qrCode)
    {
        $this->authorize('update', $qrCode);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'target_url' => 'sometimes|url',
            'is_active' => 'sometimes|boolean',
            'color' => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
            'logo' => 'nullable|string',
        ]);

        $user = $request->user();

        // Aturan untuk paket Starter: yang sudah dimiliki boleh dipertahankan,
        // yang belum boleh ditambah. QR lama yang sudah berwarna kustom tetap
        // menyimpan warnanya (kalau tidak, mengedit judul saja akan diam-diam
        // mereset warna yang sudah dipakai di QR tercetak), tapi tidak bisa
        // berpindah ke warna lain atau menambah logo.
        if (!$user->canUseFeature('logo_branding')) {
            if (array_key_exists('color', $validated)) {
                // null / "" diperlakukan sebagai "kembalikan ke warna bawaan".
                // Tanpa ini, kiriman null menghasilkan 403 dengan pesan yang
                // menyesatkan ("warna kustom") padahal user justru ingin
                // melepas kustomisasinya.
                if ($validated['color'] === null || $validated['color'] === '') {
                    $validated['color'] = QrCode::DEFAULT_COLOR;
                }

                $baru = strtoupper((string) $validated['color']);
                $sekarang = strtoupper((string) ($qrCode->color ?? QrCode::DEFAULT_COLOR));

                // Yang dilarang adalah MENAMBAH kustomisasi. Menyimpan warna
                // yang sama atau kembali ke bawaan itu mengurangi, jadi boleh —
                // seragam dengan kebijakan menghapus logo.
                $kembaliKeBawaan = $baru === strtoupper(QrCode::DEFAULT_COLOR);

                if ($baru !== $sekarang && !$kembaliKeBawaan) {
                    return $this->upgradeRequired('Warna kustom');
                }
            }

            // Menghapus logo (null) selalu boleh — itu mengurangi, bukan menambah.
            if (!empty($validated['logo']) && $validated['logo'] !== $qrCode->logo) {
                return $this->upgradeRequired('Logo kustom');
            }
        }

        if (!empty($validated['logo']) && !QrLogo::isValid($validated['logo'])) {
            return response()->json([
                'message' => QrLogo::rejectionMessage(),
                'code' => 'invalid_logo',
            ], 422);
        }

        if (array_key_exists('color', $validated)
            && !QrColor::isScannable((string) $validated['color'])) {
            return response()->json([
                'message' => QrColor::rejectionMessage(),
                'code' => 'color_too_light',
            ], 422);
        }

        $qrCode->update($validated);

        return response()->json($qrCode);
    }

    public function destroy(QrCode $qrCode)
    {
        $this->authorize('delete', $qrCode);
        $qrCode->delete();

        return response()->json(['message' => 'QR code dihapus.']);
    }

    public function stats(QrCode $qrCode)
    {
        $this->authorize('view', $qrCode);

        $since = Carbon::now()->subDays(29)->startOfDay();

        // Semua agregasi dilakukan di SQL. Versi sebelumnya memuat SELURUH scan
        // log ke memori lalu mengelompokkannya di PHP — untuk QR yang sudah
        // discan puluhan ribu kali itu memuat puluhan ribu model sekaligus.
        $perDay = $qrCode->scanLogs()
            ->where('scanned_at', '>=', $since)
            ->select(
                DB::raw(DateGrouping::dayExpression('scanned_at') . ' as day'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('day')
            ->pluck('total', 'day');

        $devices = $qrCode->scanLogs()
            ->whereNotNull('device_type')
            ->where('device_type', '!=', '')
            ->select('device_type as label', DB::raw('COUNT(*) as total'))
            ->groupBy('device_type')
            ->pluck('total', 'label');

        $countries = $qrCode->scanLogs()
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->select('country as label', DB::raw('COUNT(*) as total'))
            ->groupBy('country')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'label');

        // Terbaru dulu. Tanpa orderBy, "recent_logs" justru mengembalikan scan
        // paling LAMA karena SQLite mengembalikan baris dalam urutan penyisipan.
        $recent = $qrCode->scanLogs()
            ->orderByDesc('scanned_at')
            ->limit(10)
            ->get();

        return response()->json([
            'total_scans' => $qrCode->scan_count,
            'last_30_days' => $perDay,
            'devices' => $devices,
            'countries' => $countries,
            'recent_logs' => $recent,
        ]);
    }

    /** Jawaban seragam saat paket sekarang tidak mencakup fitur kustomisasi. */
    private function upgradeRequired(string $what): JsonResponse
    {
        return response()->json([
            'message' => "{$what} tersedia di paket Business Pro. Upgrade untuk memakainya.",
            'code' => 'plan_upgrade_required',
            'feature' => 'logo_branding',
        ], 403);
    }
}
