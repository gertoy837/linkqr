import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Rasio kontras warna terhadap putih (WCAG 2.1). */
export function contrastWithWhite(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return 0;

  const kanal = [1, 3, 5].map((i) => {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  const luminance = 0.2126 * kanal[0] + 0.7152 * kanal[1] + 0.0722 * kanal[2];

  return 1.05 / (luminance + 0.05);
}

/**
 * Ambang yang sama dengan App\Support\QrColor::MIN_CONTRAST di server.
 *
 * Divalidasi di kedua sisi dengan sengaja: di sini supaya user tahu lebih awal,
 * di server supaya aturannya benar-benar tidak bisa dilewati.
 */
export const MIN_QR_CONTRAST = 3.0;

export function isScannableColor(hex: string): boolean {
  return contrastWithWhite(hex) >= MIN_QR_CONTRAST;
}
