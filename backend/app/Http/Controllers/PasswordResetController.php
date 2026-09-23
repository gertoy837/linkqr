<?php

namespace App\Http\Controllers;

use App\Mail\ResetPassword;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Alur "lupa password" lewat email.
 *
 * Memakai password broker bawaan Laravel (tabel password_reset_tokens) supaya
 * token-nya di-hash, kedaluwarsa, dan sekali pakai — bukan token buatan sendiri
 * yang gampang salah.
 *
 * Catatan keamanan: permintaan reset SELALU menjawab dengan pesan sukses yang
 * sama, baik emailnya terdaftar maupun tidak. Kalau tidak, endpoint ini bisa
 * dipakai untuk menebak email mana yang punya akun (user enumeration).
 */
class PasswordResetController extends Controller
{
    /** POST /api/forgot-password */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            $token = Password::broker()->createToken($user);

            $link = rtrim(config('app.frontend_url'), '/')
                . '/reset-password?token=' . $token
                . '&email=' . urlencode($user->email);

            try {
                Mail::to($user->email)->send(new ResetPassword(
                    nama: $user->name,
                    link: $link,
                    berlakuMenit: (int) config('auth.passwords.users.expire', 60),
                ));
            } catch (\Throwable $e) {
                // Kegagalan kirim email tidak boleh membocorkan bahwa email ini
                // terdaftar. Dicatat supaya operator tetap bisa menelusuri.
                report($e);
            }
        }

        return response()->json([
            'message' => 'Kalau email itu terdaftar, kami sudah mengirim tautan '
                . 'atur ulang password. Periksa kotak masuk dan folder spam.',
        ]);
    }

    /** POST /api/reset-password */
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::broker()->reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $validated['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Semua token login lama dicabut. Kalau password direset karena
                // akun diduga diambil orang, sesi penyerang harus ikut mati —
                // kalau tidak, dia tetap punya akses walau passwordnya diganti.
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Password berhasil diganti. Silakan masuk dengan password baru.',
        ]);
    }
}
