'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import { trendStageClassName } from '@/lib/intelligence';
import type { TrendIntelligenceSnapshot } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function TrendIntelligencePage() {
  const [snapshot, setSnapshot] = useState<TrendIntelligenceSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTrendIntelligence();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trend intelligence');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading future market radar...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Trend Intelligence Center"
        title="Future Market Radar"
        subtitle="Detect opportunities before saturation by correlating TikTok acceleration, Google Trends, Reddit momentum, and Amazon search growth."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Trend Acceleration Graph</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshot.trendSignals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tiktokVelocity" stroke="#0ea5e9" strokeWidth={2} name="TikTok velocity" />
              <Line type="monotone" dataKey="googleIndex" stroke="#10b981" strokeWidth={2} name="Google trends" />
              <Line type="monotone" dataKey="redditVelocity" stroke="#f97316" strokeWidth={2} name="Reddit velocity" />
              <Line type="monotone" dataKey="amazonSearchAcceleration" stroke="#0f766e" strokeWidth={2} name="Amazon acceleration" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Stage Signals</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.stageSignals.map((signal) => (
            <article key={signal.market} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{signal.market}</p>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${trendStageClassName(signal.stage)}`}>
                {signal.stage === 'still-early' ? 'Still early' : signal.stage === 'growth-phase' ? 'Entering growth phase' : 'Becoming saturated'}
              </span>
              <p className="mt-2 text-xs text-slate-600">Confidence {signal.confidence}%</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
