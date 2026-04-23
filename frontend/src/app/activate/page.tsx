'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No activation token provided.');
      return;
    }

    api
      .activateAccount(token)
      .then((res) => {
        if (res.accessToken) {
          api.setToken(res.accessToken);
        }
        setStatus('success');
        setTimeout(() => router.push('/dashboard/new'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Activation failed');
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <h1 className="text-2xl font-bold mb-2">Activating your account...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Account Activated!</h1>
            <p className="text-gray-600 mb-4">
              Your account is now active. Redirecting to dashboard...
            </p>
            <Link href="/dashboard/new" className="text-primary-600 hover:underline text-sm">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Activation Failed</h1>
            <p className="text-red-600 mb-4 text-sm">{error}</p>
            <div className="space-y-2">
              <Link href="/register" className="block text-primary-600 hover:underline text-sm">
                Register again
              </Link>
              <Link href="/login" className="block text-gray-500 hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="card w-full max-w-md text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <h1 className="text-2xl font-bold mb-2">Loading...</h1>
          </div>
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
