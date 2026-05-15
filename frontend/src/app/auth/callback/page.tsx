'use client';

import { useEffect } from 'react';

export default function AuthCallbackPage() {
  useEffect(() => {
    window.location.replace('/dashboard/new');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md text-center">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <h1 className="text-2xl font-bold mb-2">Redirecting</h1>
        <p className="text-gray-600 text-sm">Authentication is handled by ALB and Cognito.</p>
      </div>
    </div>
  );
}
