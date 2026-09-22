import api from './api';

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  plan: string;
  billing_cycle: string;
  plan_expires_at: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  tenant_id?: number;
  is_admin?: boolean;
  tenant?: TenantInfo;
}

export interface AuthResponse {
  token: string;
  user: User;
  /**
   * Plan that was picked on the pricing page during signup. It is only an
   * intent — the account is always created on the free plan, and this plan
   * activates once its invoice is verified.
   */
  requested_plan?: string;
  requested_billing_cycle?: string;
  requires_payment?: boolean;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/login', { email, password });
  return response.data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  password_confirmation: string,
  plan?: string,
  billing_cycle?: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/register', {
    name,
    email,
    password,
    password_confirmation,
    ...(plan ? { plan } : {}),
    ...(billing_cycle ? { billing_cycle } : {}),
  });
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/logout');
  } catch {
    // ignore network errors on logout
  }
  clearAuth();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Cookie hanya ditandai Secure kalau halaman memang dilayani lewat HTTPS.
 * Menandainya Secure di http://localhost membuat cookie-nya tidak pernah
 * tersimpan, dan middleware akan terus memantulkan user ke /login saat
 * pengembangan lokal.
 *
 * Catatan: cookie ini sengaja tidak HttpOnly karena di-set dari JavaScript.
 * Membuatnya HttpOnly butuh login melewati route handler Next.js, dan selama
 * token juga disimpan di localStorage (yang memang dibutuhkan untuk memanggil
 * API dengan bearer token), HttpOnly saja belum menutup jalur XSS. Yang
 * benar-benar mengurangi risikonya adalah masa berlaku token yang terbatas —
 * lihat SANCTUM_EXPIRATION di backend.
 */
const SECURE_FLAG =
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Mirror the token into a cookie as well: the Next.js middleware runs on the
  // edge and cannot read localStorage, so without this every request to
  // /dashboard gets bounced straight back to /login even after a successful login.
  //
  // `role` rides along for the same reason. It lets the middleware send an
  // already-signed-in admin to /admin instead of the customer dashboard, and
  // it is only a routing hint — the API re-checks `is_admin` on every admin
  // request, so a tampered cookie grants nothing.
  if (typeof document !== 'undefined') {
    document.cookie = `token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${SECURE_FLAG}`;
    document.cookie = `role=${user.is_admin ? 'admin' : 'user'}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${SECURE_FLAG}`;
  }
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (typeof document !== 'undefined') {
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'role=; path=/; max-age=0; SameSite=Lax';
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}