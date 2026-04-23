'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from './api';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    loading: true,
  });

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        setState({ isAuthenticated: true, userId: payload.sub, email: payload.email, loading: false });
      } else {
        api.setToken(null);
        setState((s) => ({ ...s, loading: false }));
      }
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.accessToken);
    setState({ isAuthenticated: true, userId: res.userId, email: res.email, loading: false });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await api.register(email, password);
    // Registration no longer auto-logs in — user must activate via email first
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setState({ isAuthenticated: false, userId: null, email: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function parseJwt(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
