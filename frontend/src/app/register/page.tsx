'use client';

import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const { signUp, loading } = useAuth();
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    try {
      await signUp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Cognito sign-up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-3">Create Account</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Sign-up, email verification, and password reset are handled by Amazon Cognito Hosted UI.
        </p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <button type="button" onClick={handleSignUp} className="btn-primary w-full" disabled={loading}>
          {loading ? 'Redirecting...' : 'Continue to Sign Up'}
        </button>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
