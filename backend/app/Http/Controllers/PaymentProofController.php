<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Http\JsonResponse;

/**
 * Menyajikan bukti transfer pelanggan.
 *
 * Sebelumnya file disimpan di disk `public` dan disajikan lewat symlink
 * /storage, artinya siapa pun yang tahu URL-nya bisa mengunduh struk transfer
 * (nama, bank, nominal) tanpa login. Sekarang file ada di disk privat dan
 * hanya bisa diambil lewat endpoint ber-autentikasi.
 */
class PaymentProofController extends Controller
{
    /** Disk privat tempat bukti pembayaran disimpan. */
    public const DISK = 'local';

    /** Folder relatif di dalam disk tersebut. */
    public const FOLDER = 'payment-proofs';

    /**
     * GET /api/invoices/{invoice}/proof
     *
     * Untuk pelanggan: hanya invoice miliknya sendiri. Admin tetap boleh
     * (dipakai console kalau perlu membuka lewat jalur pelanggan).
     */
    public function customer(Request $request, Invoice $invoice)
    {
        $user = $request->user();

        if ($invoice->user_id !== $user->id && !$user->is_admin) {
            abort(403, 'Bukti pembayaran ini bukan milikmu.');
        }

        return $this->serve($invoice);
    }

    /**
     * GET /api/admin/invoices/{invoice}/proof
     *
     * Console operator — dilindungi middleware `admin` di level route.
     */
    public function admin(Invoice $invoice)
    {
        return $this->serve($invoice);
    }

    private function serve(Invoice $invoice): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        $path = (string) $invoice->proof_path;

        // proof_path berasal dari database, tapi tetap divalidasi: jangan sampai
        // sebuah nilai aneh membawa kita keluar dari folder bukti pembayaran.
        $safe = $path !== ''
            && !str_contains($path, '..')
            && str_starts_with($path, self::FOLDER . '/');

        if (!$safe || !Storage::disk(self::DISK)->exists($path)) {
            return response()->json([
                'message' => 'Bukti pembayaran tidak ditemukan.',
                'code' => 'proof_not_found',
            ], 404);
        }

        // response() menebak mime type dan mengirim inline supaya bisa dipratinjau
        // di browser tanpa harus diunduh dulu.
        return Storage::disk(self::DISK)->response($path);
    }
}
