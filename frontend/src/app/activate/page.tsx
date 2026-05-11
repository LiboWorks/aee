'use client';

import Link from 'next/link';

export default function ActivatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md text-center">
        <div className="text-4xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-2">Email Verification Moved</h1>
        <p className="text-gray-600 mb-4 text-sm">
          Account verification is now handled by Amazon Cognito Hosted UI. Use the verification link from Cognito, then sign in again.
        </p>
        <div className="space-y-2">
          <Link href="/login" className="block text-primary-600 hover:underline text-sm">
            Go to Sign In
          </Link>
          <Link href="/register" className="block text-gray-500 hover:underline text-sm">
            Create a New Account
          </Link>
        </div>
      </div>
    </div>
  );
}
