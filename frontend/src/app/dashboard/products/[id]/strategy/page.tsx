'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Product, ProductRawData, Strategy } from '@/lib/types';

const numberFormatter = new Intl.NumberFormat('en-US');

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
}

function formatNumber(value: number | null) {
  return value === null ? '—' : numberFormatter.format(value);
}

export default function StrategyPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadProduct = useCallback(async () => {
    try {
      const p = await api.getProduct(productId);
      setProduct(p);
      if (p.strategies && p.strategies.length > 0) {
        const s = await api.getStrategy(p.strategies[0].id);
        setStrategy(s);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const generateStrategy = async () => {
    setGenerating(true);
    setError('');
    try {
      const s = await api.generateStrategy(productId);
      setStrategy(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Strategy generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!strategy) return;
    try {
      const asset = await api.generateAssets(strategy.id);
      router.push(`/dashboard/products/${productId}/execution?assetId=${asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Asset generation failed');
    }
  };

  if (!product) return <div className="animate-pulse text-gray-500">Loading product...</div>;

  const diff = strategy?.differentiationPlan as Record<string, unknown> | null;
  const pricing = strategy?.pricingStrategy as Record<string, unknown> | null;
  const exec = strategy?.executionPlan as Record<string, unknown> | null;
  const rawData: ProductRawData | null = product.rawData;
  const attributes = Object.entries(rawData?.attributes ?? {}).slice(0, 12);
  const bulletPoints = rawData?.bulletPoints ?? [];
  const reviews = (rawData?.reviews ?? []).slice(0, 12);
  const imageUrls = product.imageUrls ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Strategy</h1>
          <p className="text-gray-500 text-sm mt-1">{product.title}</p>
        </div>
        <div className="flex gap-2">
          {!strategy && (
            <button onClick={generateStrategy} className="btn-primary" disabled={generating}>
              {generating ? 'Generating...' : 'Generate Strategy'}
            </button>
          )}
          {strategy && (
            <button onClick={handleGenerateAssets} className="btn-primary">
              Generate Listing Assets →
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Product Snapshot</h2>
              <a
                href={product.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700 break-all"
              >
                {product.url}
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.category && <span className="badge bg-blue-50 text-blue-700">{product.category}</span>}
              {rawData?.brand && <span className="badge bg-gray-100 text-gray-700">Brand: {rawData.brand}</span>}
              <span className="badge bg-amber-50 text-amber-700">Risk: {product.riskLevel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Price</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(product.price, rawData?.currency)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Rating</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {rawData?.rating !== null && rawData?.rating !== undefined ? `${rawData.rating.toFixed(1)} / 5` : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Review Count</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(rawData?.reviewCount ?? null)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Budget</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(product.budget, rawData?.currency)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">ASIN</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 break-all">{rawData?.asin ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Source</p>
              <p className="mt-2 text-sm font-medium text-gray-900 break-words">{rawData?.source ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Images</h2>
          {imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {imageUrls.slice(0, 6).map((src, index) => (
                <div key={`${src}-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 aspect-square">
                  <img src={src} alt={`${product.title ?? 'Product'} image ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No product images were extracted from the page.</p>
          )}
        </div>
      </div>

      {(bulletPoints.length > 0 || rawData?.description || attributes.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {bulletPoints.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Bullet Points</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {bulletPoints.map((point, index) => (
                  <li key={`${point}-${index}`} className="flex gap-3">
                    <span className="text-primary-600 font-semibold">{index + 1}.</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rawData?.description && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Description</h2>
              <p className="text-sm leading-7 text-gray-700 whitespace-pre-line">{rawData.description}</p>
            </div>
          )}
        </div>
      )}

      {attributes.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Product Attributes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
            {attributes.map(([key, value]) => (
              <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{key}</p>
                <p className="mt-1 text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Recent Reviews</h2>
              <p className="text-sm text-gray-500">Showing {reviews.length} extracted review excerpts for market context.</p>
            </div>
            {rawData?.reviewCount !== null && rawData?.reviewCount !== undefined ? (
              <span className="badge bg-green-50 text-green-700">{numberFormatter.format(rawData.reviewCount)} total reviews</span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {reviews.map((review, index) => (
              <div key={`${review.title}-${review.author}-${index}`} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{review.title || 'Untitled review'}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {[review.author, review.date].filter(Boolean).join(' · ') || 'Anonymous review'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">
                      {review.rating !== null && review.rating !== undefined ? `${review.rating.toFixed(1)}★` : '—'}
                    </p>
                    {review.verified ? <span className="badge bg-emerald-50 text-emerald-700 mt-2">Verified</span> : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-700">{review.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {generating && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4 animate-bounce">🧠</div>
          <p className="text-gray-600">AI is analyzing your product and generating strategy...</p>
          <p className="text-xs text-gray-400 mt-2">This may take 10-30 seconds</p>
        </div>
      )}

      {!strategy && !generating && (
        <div className="card border-dashed">
          <h2 className="text-lg font-semibold">Next Step</h2>
          <p className="text-sm text-gray-600 mt-2">
            The product scrape is complete. Generate the strategy to turn this product snapshot into viability, pricing, and execution guidance.
          </p>
        </div>
      )}

      {strategy && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Viability Score</p>
              <p
                className={`text-4xl font-bold mt-1 ${
                  (strategy.viabilityScore ?? 0) >= 70
                    ? 'text-green-600'
                    : (strategy.viabilityScore ?? 0) >= 40
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {strategy.viabilityScore ?? '—'}<span className="text-lg">/100</span>
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Margin Estimate</p>
              <p className="text-4xl font-bold mt-1 text-primary-600">
                {strategy.marginEstimate ? `${(strategy.marginEstimate * 100).toFixed(0)}%` : '—'}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Competition</p>
              <p
                className={`text-4xl font-bold mt-1 capitalize ${
                  strategy.competitionLevel === 'low'
                    ? 'text-green-600'
                    : strategy.competitionLevel === 'medium'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {strategy.competitionLevel ?? '—'}
              </p>
            </div>
          </div>

          {diff && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Differentiation Strategy</h2>
              <div className="space-y-3">
                {diff.positioningAngle ? (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Positioning:</span>
                    <span className="ml-2">{String(diff.positioningAngle)}</span>
                  </div>
                ) : null}
                {diff.targetAudience ? (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Target Audience:</span>
                    <span className="ml-2">{String(diff.targetAudience)}</span>
                  </div>
                ) : null}
                {Array.isArray(diff.keyDifferentiators) && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Key Differentiators:</span>
                    <ul className="mt-1 space-y-1">
                      {(diff.keyDifferentiators as string[]).map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">✓</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {pricing && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Pricing Strategy</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {pricing.recommendedPrice ? (
                  <div>
                    <span className="text-gray-500">Recommended Price:</span>
                    <span className="font-semibold text-lg ml-1">{formatCurrency(Number(pricing.recommendedPrice), rawData?.currency)}</span>
                  </div>
                ) : null}
                {pricing.launchPrice ? (
                  <div>
                    <span className="text-gray-500">Launch Price:</span>
                    <span className="font-semibold text-lg ml-1">{formatCurrency(Number(pricing.launchPrice), rawData?.currency)}</span>
                  </div>
                ) : null}
                {pricing.pricingModel ? (
                  <div>
                    <span className="text-gray-500">Model:</span>
                    <span className="ml-1 capitalize">{String(pricing.pricingModel)}</span>
                  </div>
                ) : null}
                {pricing.reasoning ? <div className="col-span-2 text-gray-600 italic">{String(pricing.reasoning)}</div> : null}
              </div>
            </div>
          )}

          {exec && Array.isArray((exec as Record<string, unknown>).phases) && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Execution Plan</h2>
              <div className="space-y-4">
                {((exec as Record<string, unknown>).phases as Array<Record<string, unknown>>).map((phase, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{String(phase.name)}</div>
                      <div className="text-sm text-gray-500">{String(phase.duration)}</div>
                      {Array.isArray(phase.tasks) && (
                        <ul className="mt-1 text-sm text-gray-600 space-y-0.5">
                          {(phase.tasks as string[]).map((t, j) => (
                            <li key={j}>• {t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {(exec as Record<string, unknown>).totalTimeline ? (
                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  Total Timeline: <span className="font-medium text-gray-700">{String((exec as Record<string, unknown>).totalTimeline)}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}