'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Product, HistoryResponse } from '@/lib/types';

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getHistory(page);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      }
    };
    load();
  }, [page]);

  const getStatusSummary = (product: Product) => {
    if (!product.strategies || product.strategies.length === 0) return { label: 'Pending Strategy', color: 'bg-gray-100 text-gray-600' };
    const strategy = product.strategies[0] as Product['strategies'] extends (infer T)[] | undefined ? T & { listingAssets?: Array<{ status: string; executions?: Array<{ status: string; experiments?: Array<{ status: string }> }> }> } : never;
    if (!strategy.listingAssets || strategy.listingAssets.length === 0) return { label: 'Strategy Ready', color: 'bg-blue-100 text-blue-700' };
    const asset = strategy.listingAssets[0];
    if (!asset.executions || asset.executions.length === 0) return { label: asset.status === 'approved' ? 'Ready to Execute' : 'Assets Draft', color: 'bg-yellow-100 text-yellow-700' };
    const exec = asset.executions[0];
    if (!exec.experiments || exec.experiments.length === 0) return { label: `Executed (${exec.status})`, color: 'bg-green-100 text-green-700' };
    const experiment = exec.experiments[0];
    return { label: `Experiment: ${experiment.status}`, color: experiment.status === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700' };
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">History & Analytics</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {data && data.products.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No products yet.</p>
          <Link href="/dashboard/new" className="btn-primary">Create Your First Product</Link>
        </div>
      )}

      {data && data.products.length > 0 && (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Budget</th>
                  <th className="pb-3 pr-4">Risk</th>
                  <th className="pb-3 pr-4">Viability</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => {
                  const status = getStatusSummary(product);
                  const score = product.strategies?.[0]?.viabilityScore;
                  return (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="font-medium truncate max-w-xs">{product.title ?? 'Untitled'}</div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">{product.url}</div>
                      </td>
                      <td className="py-3 pr-4">${product.budget}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${
                          product.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                          product.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {score != null ? (
                          <span className={`font-semibold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {score}/100
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 pr-4"><span className={`badge ${status.color}`}>{status.label}</span></td>
                      <td className="py-3 pr-4 text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <Link href={`/dashboard/products/${product.id}/strategy`} className="text-primary-600 hover:underline text-xs">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {data.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-secondary text-sm"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
