import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/login', { email, password });
  return response.data;
}

export async function register(name: string, email: string, password: string, password_confirmation: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/register', { name, email, password, password_confirmation });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/logout');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
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

export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}