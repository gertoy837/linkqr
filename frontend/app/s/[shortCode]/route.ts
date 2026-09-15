import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://qr-api.gertoy.biz.id/api';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string
  );
}

function notFoundPage(shortCode: string): string {
  const safe = escapeHtml(shortCode);
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link Tidak Ditemukan — LinkQR</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafafa;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{max-width:440px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:40px 32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.05),0 20px 40px -20px rgba(0,0,0,.08)}
  .logo{width:56px;height:56px;border-radius:16px;background:#4f46e5;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 8px 20px -6px rgba(79,70,229,.5)}
  .logo svg{width:28px;height:28px;fill:#fff}
  h1{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px}
  p{font-size:14px;color:#64748b;line-height:1.6}
  .code{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#f1f5f9;color:#475569;padding:6px 12px;border-radius:8px;margin:16px 0 24px;border:1px solid #e2e8f0}
  a.btn{display:inline-flex;align-items:center;gap:8px;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 24px;border-radius:12px;transition:background .15s}
  a.btn:hover{background:#4338ca}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2z"/></svg>
  </div>
  <h1>Link Tidak Ditemukan</h1>
  <p>QR code atau link pendek ini tidak terdaftar, sudah dihapus, atau sedang dinonaktifkan oleh pemiliknya.</p>
  <div class="code">/s/${safe}</div>
  <br>
  <a class="btn" href="/">Kembali ke LinkQR</a>
</div>
</body>
</html>`;
}

function getHeader(req: NextRequest, name: string): string {
  const v = req.headers.get(name.toLowerCase());
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  const ua = getHeader(request, 'user-agent');
  const referer = getHeader(request, 'referer');

  const cfIp = getHeader(request, 'cf-connecting-ip');
  const realIp = getHeader(request, 'x-real-ip');
  const forwarded = getHeader(request, 'x-forwarded-for');
  const visitorIp = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '');

  const cfCountry = getHeader(request, 'cf-ipcountry');

  try {
    const res = await fetch(`${API_URL}/s/${encodeURIComponent(shortCode)}`, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'User-Agent': ua,
        Referer: referer,
        Accept: 'application/json, text/html',
        ...(visitorIp ? { 'X-Visitor-IP': visitorIp } : {}),
        ...(cfCountry ? { 'X-Visitor-Country': cfCountry } : {}),
      },
    });

    const location = res.headers.get('location');
    if (location && [301, 302, 303, 307, 308].includes(res.status)) {
      return NextResponse.redirect(location, 302);
    }

    return new NextResponse(notFoundPage(shortCode), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse(notFoundPage(shortCode), {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}