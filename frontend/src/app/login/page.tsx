'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard/command-center');
    }
  }, [isAuthenticated, loading, router]);

  const handleSignIn = async () => {
    setError('');
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Cognito sign-in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-3">Sign in to AEE</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Authentication is handled by Amazon Cognito Hosted UI.
        </p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <button type="button" onClick={handleSignIn} className="btn-primary w-full" disabled={loading}>
          {loading ? 'Redirecting...' : 'Continue to Sign In'}
        </button>
        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
