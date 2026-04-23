'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [budget, setBudget] = useState(500);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const product = await api.createProduct({ url, budget, riskLevel, currency });
      router.push(`/dashboard/products/${product.id}/strategy`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Discover New Product Opportunity</h1>

      <div className="card max-w-2xl">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label className="label">Amazon Product URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://www.amazon.com/dp/B0XXXXXXXXXX"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Paste the full Amazon product page URL</p>
          </div>

          {/* Currency */}
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="CAD">CAD (CA$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="INR">INR (₹)</option>
              <option value="MXN">MXN (MX$)</option>
              <option value="BRL">BRL (R$)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Amazon will show prices in this currency</p>
          </div>

          {/* Budget */}
          <div>
            <label className="label">Budget ($)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={100}
                max={10000}
                step={100}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                className="input w-28"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min={1}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Total budget for product launch and advertising</p>
          </div>

          {/* Risk Level */}
          <div>
            <label className="label">Risk Level</label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    riskLevel === level
                      ? level === 'low'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : level === 'medium'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {level === 'low' ? '🛡️' : level === 'medium' ? '⚖️' : '🔥'} {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full text-lg py-3" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Product →'}
          </button>
        </form>
      </div>
    </div>
  );
}
