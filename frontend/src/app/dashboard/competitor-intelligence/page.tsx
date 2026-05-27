'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CompetitorIntelligenceSnapshot } from '@/lib/types';
import { formatRelativeTime } from '@/lib/intelligence';
import { PageHeader } from '@/components/intelligence/page-header';

const typeLabel: Record<CompetitorIntelligenceSnapshot['competitorMoves'][number]['type'], string> = {
  'new-listing': 'New listing',
  'price-change': 'Price change',
  'review-growth': 'Review growth',
  'listing-optimization': 'Listing optimization',
  'sales-shift': 'Sales movement',
  'launch-velocity': 'Launch velocity',
};

export default function CompetitorIntelligencePage() {
  const [snapshot, setSnapshot] = useState<CompetitorIntelligenceSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCompetitorIntelligence();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competitor intelligence');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading competitor intelligence...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Competitor Intelligence"
        title="Automated Competitor Behavior Tracking"
        subtitle="Monitor listing moves, pricing shifts, review momentum, and launch velocity to understand strategic intent before reacting."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2 pr-3">Detected</th>
                <th className="pb-2 pr-3">Competitor</th>
                <th className="pb-2 pr-3">Move</th>
                <th className="pb-2 pr-3">Details</th>
                <th className="pb-2">Strategic Impact</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.competitorMoves.map((move) => (
                <tr key={`${move.competitor}_${move.detectedAt}_${move.type}`} className="border-t border-slate-100 align-top">
                  <td className="py-3 pr-3 text-xs text-slate-500">{formatRelativeTime(move.detectedAt)}</td>
                  <td className="py-3 pr-3 font-medium text-slate-900">{move.competitor}</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">{typeLabel[move.type]}</span>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">{move.details}</td>
                  <td className="py-3 text-slate-700">{move.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
