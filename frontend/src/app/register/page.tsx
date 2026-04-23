'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'One number' },
  { test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), label: 'One special character' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!allRulesPass) {
      setError('Password does not meet all requirements');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card w-full max-w-md text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-600 mb-4">
            We&apos;ve sent an activation link to <strong>{email}</strong>.
            Click the link to activate your account.
          </p>
          <p className="text-sm text-gray-500 mb-4">The link expires in 24 hours.</p>
          <Link href="/login" className="text-primary-600 hover:underline text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <li key={rule.label} className={`text-xs flex items-center gap-1.5 ${rule.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{rule.test(password) ? '✓' : '○'}</span> {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading || !allRulesPass}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
