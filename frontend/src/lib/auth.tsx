'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from './api';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
const AUTH_BASE_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

function buildAuthNavigationUrl(path: string, next: string): string {
  const query = new URLSearchParams({ next });
  return `${AUTH_BASE_URL}${path}?${query.toString()}`;
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    loading: true,
  });

  const resetAuthState = useCallback(() => {
    setState({ isAuthenticated: false, userId: null, email: null, loading: false });
  }, []);

  const syncSession = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      setState({
        isAuthenticated: true,
        userId: user.userId,
        email: user.email,
        loading: false,
      });
    } catch {
      resetAuthState();
    }
  }, [resetAuthState]);

  useEffect(() => {
    void syncSession();
  }, [syncSession]);

  const signIn = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    window.location.assign(buildAuthNavigationUrl('/api/auth/login', '/dashboard/new'));
  }, []);

  const signUp = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    window.location.assign(buildAuthNavigationUrl('/api/auth/login', '/dashboard/new'));
  }, []);

  const logout = useCallback(() => {
    resetAuthState();
    window.location.assign(buildAuthNavigationUrl('/api/auth/logout', '/login'));
  }, [resetAuthState]);

  const refreshUser = useCallback(async () => {
    await syncSession();
  }, [syncSession]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
