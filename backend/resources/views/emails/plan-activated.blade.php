@extends('emails.layout')

@section('title', 'Paket ' . $invoice->planName() . ' aktif')
@section('preheader', 'Pembayaran terverifikasi. Paket ' . $invoice->planName() . ' kamu sudah aktif.')

@section('content')

<!-- Ikon centang -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="width:48px;height:48px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;text-align:center;vertical-align:middle;">
      <span style="color:#059669;font-size:24px;font-weight:700;line-height:48px;">&#10003;</span>
    </td>
  </tr>
</table>

<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">
  Pembayaran diterima, paket aktif
</h1>
<p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
  Halo {{ $nama }}, pembayaran invoice
  <span style="font-family:ui-monospace,Menlo,monospace;color:#0f172a;">{{ $invoice->number }}</span>
  sudah kami verifikasi. Terima kasih!
</p>

<!-- Detail paket -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
  <tr>
    <td style="padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#166534;padding-bottom:6px;">Paket aktif</td>
          <td align="right" style="font-size:13px;color:#14532d;font-weight:700;padding-bottom:6px;">{{ $invoice->planName() }}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#166534;padding-bottom:6px;">Siklus</td>
          <td align="right" style="font-size:13px;color:#14532d;font-weight:600;padding-bottom:6px;">
            {{ $invoice->billing_cycle === 'yearly' ? 'Tahunan (12 bulan)' : 'Bulanan' }}
          </td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#166534;">Berlaku sampai</td>
          <td align="right" style="font-size:13px;color:#14532d;font-weight:700;">
            {{ optional($berlakuSampai)->translatedFormat('d F Y') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<h2 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">Yang sekarang bisa kamu pakai</h2>
<ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:1.9;">
  @foreach ($fitur as $f)
  <li>{{ $f }}</li>
  @endforeach
</ul>

@if ($invoice->billing_cycle === 'yearly')
<p style="margin:0 0 22px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:12px;color:#92400e;line-height:1.6;">
  Kamu memilih paket tahunan — lebih hemat 20% dibanding bayar bulanan.
  Total yang dibayar Rp {{ number_format((int) $invoice->total_amount, 0, ',', '.') }}
  untuk 12 bulan penuh.
</p>
@endif

<table role="presentation" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#4f46e5;border-radius:10px;">
      <a href="{{ $link }}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        Buka dashboard
      </a>
    </td>
  </tr>
</table>

@endsection
