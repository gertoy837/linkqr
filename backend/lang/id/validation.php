<?php

/**
 * Pesan validasi bahasa Indonesia.
 *
 * Sebelum file ini ada, APP_LOCALE bernilai "en" dan folder lang/ belum
 * pernah dibuat, sehingga setiap error validasi tampil dalam bahasa Inggris
 * ("The email field is required.") padahal seluruh antarmuka berbahasa
 * Indonesia. File ini menyelaraskannya.
 *
 * Hanya kunci yang benar-benar dipakai aplikasi ini yang diterjemahkan;
 * sisanya dibiarkan mengikuti bawaan Laravel lewat fallback.
 */
return [

    'accepted' => ':attribute harus disetujui.',
    'active_url' => ':attribute bukan URL yang valid.',
    'after' => ':attribute harus tanggal setelah :date.',
    'alpha' => ':attribute hanya boleh berisi huruf.',
    'alpha_dash' => ':attribute hanya boleh berisi huruf, angka, tanda hubung, dan garis bawah.',
    'alpha_num' => ':attribute hanya boleh berisi huruf dan angka.',
    'array' => ':attribute harus berupa daftar.',
    'before' => ':attribute harus tanggal sebelum :date.',
    'between' => [
        'array' => ':attribute harus berisi antara :min sampai :max item.',
        'file' => ':attribute harus berukuran antara :min sampai :max kilobyte.',
        'numeric' => ':attribute harus bernilai antara :min sampai :max.',
        'string' => ':attribute harus berisi antara :min sampai :max karakter.',
    ],
    'boolean' => ':attribute harus bernilai ya atau tidak.',
    'confirmed' => 'Konfirmasi :attribute tidak cocok.',
    'date' => ':attribute bukan tanggal yang valid.',
    'date_equals' => ':attribute harus tanggal yang sama dengan :date.',
    'date_format' => ':attribute tidak sesuai format :format.',
    'different' => ':attribute dan :other harus berbeda.',
    'digits' => ':attribute harus berisi :digits angka.',
    'digits_between' => ':attribute harus berisi antara :min sampai :max angka.',
    'email' => ':attribute harus berupa alamat email yang valid.',
    'ends_with' => ':attribute harus diakhiri salah satu dari: :values.',
    'exists' => ':attribute yang dipilih tidak valid.',
    'file' => ':attribute harus berupa berkas.',
    'filled' => ':attribute wajib diisi.',
    'gt' => [
        'array' => ':attribute harus berisi lebih dari :value item.',
        'file' => ':attribute harus lebih besar dari :value kilobyte.',
        'numeric' => ':attribute harus lebih besar dari :value.',
        'string' => ':attribute harus lebih dari :value karakter.',
    ],
    'gte' => [
        'array' => ':attribute harus berisi :value item atau lebih.',
        'file' => ':attribute harus berukuran :value kilobyte atau lebih.',
        'numeric' => ':attribute harus lebih besar dari atau sama dengan :value.',
        'string' => ':attribute harus :value karakter atau lebih.',
    ],
    'image' => ':attribute harus berupa gambar.',
    'in' => ':attribute yang dipilih tidak valid.',
    'integer' => ':attribute harus berupa angka bulat.',
    'ip' => ':attribute harus berupa alamat IP yang valid.',
    'json' => ':attribute harus berupa teks JSON yang valid.',
    'lt' => [
        'array' => ':attribute harus berisi kurang dari :value item.',
        'file' => ':attribute harus lebih kecil dari :value kilobyte.',
        'numeric' => ':attribute harus lebih kecil dari :value.',
        'string' => ':attribute harus kurang dari :value karakter.',
    ],
    'lte' => [
        'array' => ':attribute tidak boleh berisi lebih dari :value item.',
        'file' => ':attribute harus berukuran :value kilobyte atau kurang.',
        'numeric' => ':attribute harus kurang dari atau sama dengan :value.',
        'string' => ':attribute harus :value karakter atau kurang.',
    ],
    'max' => [
        'array' => ':attribute tidak boleh berisi lebih dari :max item.',
        'file' => ':attribute tidak boleh lebih besar dari :max kilobyte.',
        'numeric' => ':attribute tidak boleh lebih besar dari :max.',
        'string' => ':attribute tidak boleh lebih dari :max karakter.',
    ],
    'mimes' => ':attribute harus berupa berkas berjenis: :values.',
    'mimetypes' => ':attribute harus berupa berkas berjenis: :values.',
    'min' => [
        'array' => ':attribute harus berisi minimal :min item.',
        'file' => ':attribute harus berukuran minimal :min kilobyte.',
        'numeric' => ':attribute harus minimal :min.',
        'string' => ':attribute harus minimal :min karakter.',
    ],
    'not_in' => ':attribute yang dipilih tidak valid.',
    'not_regex' => 'Format :attribute tidak valid.',
    'numeric' => ':attribute harus berupa angka.',
    'present' => ':attribute harus ada.',
    'regex' => 'Format :attribute tidak valid.',
    'required' => ':attribute wajib diisi.',
    'required_if' => ':attribute wajib diisi bila :other bernilai :value.',
    'required_unless' => ':attribute wajib diisi kecuali :other bernilai :values.',
    'required_with' => ':attribute wajib diisi bila ada :values.',
    'required_without' => ':attribute wajib diisi bila tidak ada :values.',
    'same' => ':attribute dan :other harus sama.',
    'size' => [
        'array' => ':attribute harus berisi :size item.',
        'file' => ':attribute harus berukuran :size kilobyte.',
        'numeric' => ':attribute harus bernilai :size.',
        'string' => ':attribute harus berisi :size karakter.',
    ],
    'starts_with' => ':attribute harus diawali salah satu dari: :values.',
    'string' => ':attribute harus berupa teks.',
    'timezone' => ':attribute harus berupa zona waktu yang valid.',
    'unique' => ':attribute sudah terdaftar.',
    'uploaded' => ':attribute gagal diunggah.',
    'url' => 'Format :attribute tidak valid.',

    'custom' => [
        'password' => [
            'confirmed' => 'Konfirmasi password tidak cocok.',
        ],
        'email' => [
            'unique' => 'Email ini sudah terdaftar. Coba masuk, atau pakai email lain.',
        ],
    ],

    'attributes' => [
        'name' => 'Nama',
        'email' => 'Email',
        'password' => 'Password',
        'password_confirmation' => 'Konfirmasi password',
        'plan' => 'Paket',
        'billing_cycle' => 'Siklus tagihan',
        'title' => 'Judul',
        'target_url' => 'URL tujuan',
        'color' => 'Warna',
        'logo' => 'Logo',
        'is_active' => 'Status aktif',
        'proof' => 'Bukti pembayaran',
        'payer_note' => 'Catatan pembayar',
        'note' => 'Catatan',
        'days' => 'Jumlah hari',
        'format' => 'Format',
        'status' => 'Status',
        'role' => 'Peran',
        'q' => 'Kata kunci',
        'page' => 'Halaman',
        'per_page' => 'Jumlah per halaman',
        'is_admin' => 'Status admin',
        'api_key' => 'API key',
        'expires_in_days' => 'Masa berlaku (hari)',
    ],

];
