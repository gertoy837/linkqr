import type { MetadataRoute } from 'next';

const NOINDEX = process.env.NEXT_PUBLIC_ROBOTS_NOINDEX === 'true';

export default function robots(): MetadataRoute.Robots {
  // Staging: larang semuanya dan jangan umumkan sitemap.
  if (NOINDEX) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Halaman dashboard, admin, dan redirect short link tidak perlu
        // diindeks: isinya privat dan /s/* sengaja tidak menghasilkan konten
        // yang berguna bagi mesin pencari.
        disallow: ['/dashboard/', '/admin/', '/s/', '/api/'],
      },
    ],
    sitemap: 'https://qr.kovarastudio.id/sitemap.xml',
  };
}