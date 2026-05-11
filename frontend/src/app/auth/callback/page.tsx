'use client';

import { useEffect } from 'react';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
const AUTH_BASE_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

export default function AuthCallbackPage() {
  useEffect(() => {
    const query = window.location.search;
    window.location.replace(`${AUTH_BASE_URL}/api/auth/callback${query}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md text-center">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <h1 className="text-2xl font-bold mb-2">Completing Sign-in</h1>
        <p className="text-gray-600 text-sm">Redirecting to secure callback...</p>
      </div>
    </div>
  );
}
