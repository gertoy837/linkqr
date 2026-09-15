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
  tenant?: TenantInfo;
}

export interface AuthResponse {
  token: string;
  user: User;
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

export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Mirror the token into a cookie as well: the Next.js middleware runs on the
  // edge and cannot read localStorage, so without this every request to
  // /dashboard gets bounced straight back to /login even after a successful login.
  if (typeof document !== 'undefined') {
    document.cookie = `token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (typeof document !== 'undefined') {
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}