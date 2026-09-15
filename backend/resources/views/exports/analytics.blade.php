<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Analitik LinkQR</title>
<style>
    @page { margin: 32px 36px; }
    * { box-sizing: border-box; }
    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 10px;
        color: #0f172a;
        margin: 0;
    }
    .header {
        border-bottom: 2px solid #4f46e5;
        padding-bottom: 10px;
        margin-bottom: 16px;
    }
    .brand { font-size: 18px; font-weight: bold; color: #4f46e5; letter-spacing: -0.3px; }
    .brand span { color: #0f172a; }
    .subtitle { font-size: 9px; color: #64748b; margin-top: 3px; }
    .meta { margin-top: 8px; font-size: 9px; color: #475569; }
    .meta td { padding: 1px 0; }
    .meta .k { color: #94a3b8; padding-right: 8px; }

    h2 {
        font-size: 11px;
        color: #0f172a;
        margin: 18px 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .cards { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 0 -8px; }
    .cards td {
        width: 33%;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px;
        vertical-align: top;
    }
    .cards .label { font-size: 8px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.4px; }
    .cards .value { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }

    table.data { width: 100%; border-collapse: collapse; }
    table.data th {
        text-align: left;
        font-size: 8px;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.4px;
        padding: 6px 8px;
        background: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
    }
    table.data td {
        padding: 5px 8px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 9px;
    }
    table.data td.num { text-align: right; font-weight: bold; }

    .bar-wrap { background: #f1f5f9; height: 6px; border-radius: 3px; width: 100%; }
    .bar { background: #4f46e5; height: 6px; border-radius: 3px; }

    .two-col { width: 100%; border-collapse: collapse; }
    .two-col > tbody > tr > td { width: 50%; vertical-align: top; padding-right: 10px; }

    .footer {
        margin-top: 20px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        font-size: 8px;
        color: #94a3b8;
        text-align: center;
    }
</style>
</head>
<body>

<div class="header">
    <div class="brand">Link<span>QR</span></div>
    <div class="subtitle">Laporan Analitik QR Code Dinamis</div>

    <table class="meta">
        <tr>
            <td class="k">Workspace</td>
            <td><strong>{{ $workspace }}</strong></td>
        </tr>
        <tr>
            <td class="k">Periode</td>
            <td>{{ $period_from->format('d M Y') }} &ndash; {{ $period_to->format('d M Y') }} ({{ $period_days }} hari)</td>
        </tr>
        <tr>
            <td class="k">Dibuat</td>
            <td>{{ $generated_at->format('d M Y, H:i') }} WIB &middot; oleh {{ $user }}</td>
        </tr>
    </table>
</div>

<h2>Ringkasan</h2>
<table class="cards">
    <tr>
        <td>
            <div class="label">Total Scan</div>
            <div class="value">{{ number_format($total_scans, 0, ',', '.') }}</div>
        </td>
        <td>
            <div class="label">Pengunjung Unik</div>
            <div class="value">{{ number_format($unique_visitors, 0, ',', '.') }}</div>
        </td>
        <td>
            <div class="label">QR Aktif</div>
            <div class="value">{{ number_format($active_qr, 0, ',', '.') }}</div>
        </td>
    </tr>
</table>

@php
    $maxCount = max(1, collect($series)->max('count') ?? 1);
    $seriesChunks = array_chunk($series, 15);
@endphp

<h2>Tren Harian</h2>
@foreach ($seriesChunks as $chunk)
    <table class="data" style="margin-bottom: 6px;">
        <thead>
            <tr>
                @foreach ($chunk as $point)
                    <th style="text-align: center; font-size: 7px; padding: 4px 2px;">
                        {{ \Carbon\Carbon::parse($point['date'])->format('d/m') }}
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            <tr>
                @foreach ($chunk as $point)
                    <td style="text-align: center; padding: 4px 2px;">
                        <div style="font-weight: bold; font-size: 9px;">{{ $point['count'] }}</div>
                        <div class="bar-wrap" style="margin-top: 3px;">
                            <div class="bar" style="width: {{ max(3, round(($point['count'] / $maxCount) * 100)) }}%;"></div>
                        </div>
                    </td>
                @endforeach
            </tr>
        </tbody>
    </table>
@endforeach

<table class="two-col">
    <tr>
        <td>
            <h2>Perangkat</h2>
            @if (count($by_device))
                <table class="data">
                    <thead><tr><th>Perangkat</th><th style="text-align:right;">Jumlah</th></tr></thead>
                    <tbody>
                        @foreach ($by_device as $row)
                            <tr>
                                <td>{{ ucfirst($row['label']) }}</td>
                                <td class="num">{{ $row['count'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="font-size: 9px; color: #94a3b8;">Belum ada data.</p>
            @endif
        </td>
        <td>
            <h2>Negara</h2>
            @if (count($by_country))
                <table class="data">
                    <thead><tr><th>Negara</th><th style="text-align:right;">Jumlah</th></tr></thead>
                    <tbody>
                        @foreach ($by_country as $row)
                            <tr>
                                <td>{{ $row['label'] }}</td>
                                <td class="num">{{ $row['count'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="font-size: 9px; color: #94a3b8;">Belum ada data.</p>
            @endif
        </td>
    </tr>
</table>

<table class="two-col">
    <tr>
        <td>
            <h2>Sistem Operasi</h2>
            @if (count($by_os))
                <table class="data">
                    <thead><tr><th>OS</th><th style="text-align:right;">Jumlah</th></tr></thead>
                    <tbody>
                        @foreach ($by_os as $row)
                            <tr>
                                <td>{{ $row['label'] }}</td>
                                <td class="num">{{ $row['count'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="font-size: 9px; color: #94a3b8;">Belum ada data.</p>
            @endif
        </td>
        <td>
            <h2>Browser</h2>
            @if (count($by_browser))
                <table class="data">
                    <thead><tr><th>Browser</th><th style="text-align:right;">Jumlah</th></tr></thead>
                    <tbody>
                        @foreach ($by_browser as $row)
                            <tr>
                                <td>{{ $row['label'] }}</td>
                                <td class="num">{{ $row['count'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @else
                <p style="font-size: 9px; color: #94a3b8;">Belum ada data.</p>
            @endif
        </td>
    </tr>
</table>

<h2>QR Paling Banyak Discan</h2>
@if (count($top_qr))
    <table class="data">
        <thead>
            <tr>
                <th>Nama QR</th>
                <th>Link Pendek</th>
                <th style="text-align:right;">Jumlah Scan</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($top_qr as $row)
                <tr>
                    <td>{{ $row['title'] }}</td>
                    <td style="font-family: DejaVu Sans Mono, monospace; font-size: 8px;">/s/{{ $row['short_code'] }}</td>
                    <td class="num">{{ $row['count'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <p style="font-size: 9px; color: #94a3b8;">Belum ada scan pada periode ini.</p>
@endif

<div class="footer">
    Laporan dibuat otomatis oleh LinkQR &middot; {{ $generated_at->format('d/m/Y H:i') }}
</div>

</body>
</html>