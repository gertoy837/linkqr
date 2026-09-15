'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { User, login as apiLogin, register as apiRegister, logout as apiLogout, getToken, getUser, setAuth, clearAuth } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
    plan?: string,
    billing_cycle?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    const cached = getUser();

    // Show the cached user immediately so the shell does not flash a spinner.
    if (t && cached) {
      setToken(t);
      setUser(cached);
    }

    if (!t) {
      setIsLoading(false);
      return;
    }

    // Then reconcile with the server. localStorage and the `role` cookie can
    // both be stale: an admin can be demoted, a plan can expire, an account
    // can be deleted. Without this refresh the UI kept showing the old role
    // (stale "Console Admin" menu, redirects to /admin) until a manual logout.
    let cancelled = false;

    api
      .get<User>('/user')
      .then((res) => {
        if (cancelled) return;
        // setAuth also rewrites the `role` cookie, so the middleware stops
        // treating a demoted admin as an admin on the next /login visit.
        setAuth(t, res.data);
        setToken(t);
        setUser(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        // Token rejected — drop everything so the middleware bounces to /login.
        clearAuth();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
    // Return the user so the caller can pick a landing page: an admin belongs
    // in /admin, a regular customer in /dashboard.
    return res.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
    plan?: string,
    billing_cycle?: string
  ) => {
    const res = await apiRegister(name, email, password, password_confirmation, plan, billing_cycle);
    setAuth(res.token, res.user);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}