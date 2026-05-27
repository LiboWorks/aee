'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { api } from '@/lib/api';
import type { CompetitionSurvivalSnapshot } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function CompetitionSurvivalPage() {
  const [snapshot, setSnapshot] = useState<CompetitionSurvivalSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCompetitionSurvival();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competition analysis');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading market battlefield analysis...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Competition & Survival Analysis"
        title="Market Battlefield Intelligence"
        subtitle="Evaluate seller concentration, review domination, PPC escalation, and survival probability before entering crowded markets."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Seller Concentration Map</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot.sellerConcentrationMap}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="concentration" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Market Saturation Heatmap</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {snapshot.marketHeatmap.map((entry) => (
              <div
                key={entry.market}
                className="rounded-xl border border-slate-200 p-3"
                style={{
                  background: `linear-gradient(120deg, rgba(255,255,255,0.95), rgba(249,115,22,${Math.min(0.7, entry.heat / 140)}))`,
                }}
              >
                <p className="text-sm font-medium text-slate-900">{entry.market}</p>
                <p className="mt-1 text-xs text-slate-600">Heat {entry.heat}/100</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Review Domination Analysis</h2>
          <div className="mt-3 space-y-2">
            {snapshot.reviewDomination.map((entry) => (
              <div key={entry.competitor} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm text-slate-800">
                  <span>{entry.competitor}</span>
                  <span className="font-semibold">{entry.dominationScore}/100</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${entry.dominationScore}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Price War & PPC Escalation</h2>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshot.ppcEscalationSignals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="intensity" stroke="#dc2626" strokeWidth={2} name="PPC escalation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xs uppercase">Survival Probability</p>
              <p className="mt-1 text-xl font-semibold">{snapshot.survivalProbability}/100</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-red-900">
              <p className="text-xs uppercase">Difficulty Index</p>
              <p className="mt-1 text-xl font-semibold">{snapshot.difficultyIndex}/100</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700">Can small sellers survive here? Use survival probability with review domination and PPC escalation before allocating launch budget.</p>
        </article>
      </div>
    </div>
  );
}
