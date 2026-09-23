{{--
    Kerangka dasar semua email LinkQR.

    Semua gaya ditulis inline karena banyak klien email (Gmail, Outlook) membuang
    <style> di <head>. Tabel dipakai untuk tata letak, bukan flexbox, karena
    Outlook tidak mendukung flex/grid dengan andal.
--}}
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title', 'LinkQR')</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">

<!-- Preheader: teks yang muncul di daftar inbox, disembunyikan di dalam email. -->
<div style="display:none;font-size:1px;color:#f4f5f7;max-height:0;overflow:hidden;">
  @yield('preheader', '')
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
  <tr>
    <td align="center">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#4f46e5;border-radius:10px;text-align:center;vertical-align:middle;">
                  <span style="color:#ffffff;font-size:18px;font-weight:700;line-height:36px;">L</span>
                </td>
                <td style="padding-left:12px;">
                  <span style="font-size:17px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">LinkQR</span>
                  <div style="font-size:11px;color:#94a3b8;margin-top:1px;">QR Code Dinamis</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Isi -->
        <tr>
          <td style="padding:32px;">
            @yield('content')
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              Email ini dikirim otomatis oleh sistem LinkQR. Kalau kamu tidak
              merasa melakukan tindakan ini, abaikan saja email ini.
            </p>
            <p style="margin:10px 0 0;font-size:12px;color:#cbd5e1;">
              &copy; {{ date('Y') }} LinkQR &middot;
              <a href="{{ config('app.frontend_url') }}" style="color:#94a3b8;text-decoration:none;">{{ config('app.frontend_url') }}</a>
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
