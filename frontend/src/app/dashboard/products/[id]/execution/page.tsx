'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { ListingAsset, Execution } from '@/lib/types';

export default function ExecutionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = params.id as string;
  const assetIdParam = searchParams.get('assetId');

  const [asset, setAsset] = useState<ListingAsset | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [phase, setPhase] = useState<'manual' | 'automation' | 'api'>('manual');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const loadAsset = useCallback(async () => {
    if (!assetIdParam) return;
    try {
      const a = await api.getAsset(assetIdParam);
      setAsset(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    }
  }, [assetIdParam]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  const handleApprove = async () => {
    if (!asset) return;
    try {
      const updated = await api.approveAsset(asset.id);
      setAsset(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleCreateExecution = async () => {
    if (!asset) return;
    setLoading(true);
    setError('');
    try {
      const exec = await api.createExecution({ listingAssetId: asset.id, phase });
      setExecution(exec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create execution');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!execution) return;
    setConfirming(true);
    setError('');
    try {
      const res = await api.confirmExecution(execution.id);
      setExecution(res.execution);
      setResult(res.result as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleGoToExperiment = () => {
    if (!execution) return;
    router.push(`/dashboard/products/${productId}/experiment?executionId=${execution.id}`);
  };

  if (!asset) return <div className="animate-pulse text-gray-500">Loading assets...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Execution Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Review, approve, and execute your listing</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${
            asset.status === 'draft' ? 'bg-gray-100 text-gray-600' :
            asset.status === 'approved' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {asset.status}
          </span>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Asset Preview */}
      <div className="space-y-4 mb-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Product Title</h2>
          <p className="text-gray-700">{asset.title}</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Bullet Points</h2>
          <ul className="space-y-2">
            {asset.bulletPoints.map((bp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary-500 font-bold mt-0.5">•</span>
                <span>{bp}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: asset.description }} />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Image Generation Prompts</h2>
          <div className="space-y-2">
            {asset.imagePrompts.map((prompt, i) => (
              <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm">
                <span className="font-medium text-gray-500">Image {i + 1}:</span> {prompt}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {asset.status === 'draft' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Approve Listing</h2>
          <p className="text-sm text-gray-500 mb-4">Review the listing above and approve to proceed with execution.</p>
          <button onClick={handleApprove} className="btn-success">✓ Approve Listing</button>
        </div>
      )}

      {asset.status === 'approved' && !execution && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Execute</h2>
          <div className="mb-4">
            <label className="label">Execution Phase</label>
            <div className="flex gap-3">
              {([
                { value: 'manual' as const, label: 'Manual Copy', desc: 'Download assets and manually enter into Seller Central' },
                { value: 'automation' as const, label: 'Auto-Fill', desc: 'Playwright automation fills forms (requires feature flag)' },
                { value: 'api' as const, label: 'SP-API', desc: 'Submit via Amazon SP-API (mock in MVP)' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPhase(opt.value)}
                  className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                    phase === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreateExecution} className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Execution'}
          </button>
        </div>
      )}

      {execution && execution.status === 'pending' && (
        <div className="card border-yellow-300">
          <h2 className="text-lg font-semibold mb-3">⚠️ Confirm Execution</h2>
          <p className="text-sm text-gray-600 mb-4">
            You are about to execute a <span className="font-semibold">{execution.phase}</span> deployment of this listing.
            This action will be logged. Please confirm to proceed.
          </p>
          <div className="flex gap-3">
            <button onClick={handleConfirm} className="btn-primary" disabled={confirming}>
              {confirming ? 'Executing...' : 'Confirm & Execute'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card mt-4">
          <h2 className="text-lg font-semibold mb-3">Execution Result</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          <button onClick={handleGoToExperiment} className="btn-primary mt-4">
            Run Experiment →
          </button>
        </div>
      )}
    </div>
  );
}
