@extends('emails.layout')

@section('title', 'Atur ulang password')
@section('preheader', 'Tautan untuk mengatur ulang password akun LinkQR kamu.')

@section('content')

<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">
  Atur ulang password
</h1>
<p style="margin:0 0 22px;font-size:14px;color:#64748b;line-height:1.6;">
  Halo {{ $nama }}, kami menerima permintaan untuk mengatur ulang password akun
  LinkQR kamu. Klik tombol di bawah untuk membuat password baru.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  <tr>
    <td style="background:#4f46e5;border-radius:10px;">
      <a href="{{ $link }}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        Buat password baru
      </a>
    </td>
  </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:22px;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
        Tautan ini berlaku <strong>{{ $berlakuMenit }} menit</strong> dan hanya bisa
        dipakai sekali. Kalau kamu tidak meminta ini, abaikan email ini —
        password kamu tidak akan berubah.
      </p>
    </td>
  </tr>
</table>

<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
  Kalau tombolnya tidak bisa diklik, salin tautan ini ke browser:<br>
  <span style="color:#64748b;word-break:break-all;">{{ $link }}</span>
</p>

@endsection
