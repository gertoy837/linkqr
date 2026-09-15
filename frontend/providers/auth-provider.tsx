'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, login as apiLogin, register as apiRegister, logout as apiLogout, getToken, getUser, setAuth, isAuthenticated } from '@/lib/auth';

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
    const u = getUser();
    if (t && u) {
      setToken(t);
      setUser(u);
    }
    setIsLoading(false);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}