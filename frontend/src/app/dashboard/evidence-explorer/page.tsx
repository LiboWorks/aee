'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { EvidenceExplorerSnapshot } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function EvidenceExplorerPage() {
  const [snapshot, setSnapshot] = useState<EvidenceExplorerSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getEvidenceExplorer();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load evidence explorer');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading evidence explorer...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Evidence & Source Explorer"
        title="Transparent Evidence Behind Every Recommendation"
        subtitle="Inspect source reliability, raw evidence points, and before-vs-now comparisons to reduce hallucination risk and increase operator trust."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900">Source Catalog</h2>
          <div className="mt-3 space-y-2">
            {snapshot.sourceCatalog.map((source) => (
              <div key={source.sourceName} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{source.sourceName}</p>
                <p className="text-xs text-slate-600">Type: {source.sourceType}</p>
                <p className="text-xs text-slate-600">Reliability: {source.reliabilityScore}/100</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-5">
          <h2 className="text-lg font-semibold text-slate-900">Evidence Ledger</h2>
          <div className="mt-3 grid gap-2">
            {snapshot.evidence.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.sourceName}</p>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-cyan-700 hover:underline">
                    Open source
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">Historical Comparisons</h2>
          <div className="mt-3 space-y-2 text-sm">
            {snapshot.comparisons.map((comparison) => (
              <div key={comparison.label} className="rounded-xl bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{comparison.label}</p>
                <p className="mt-1 text-xs text-slate-600">Baseline: {comparison.baseline}</p>
                <p className="text-xs text-slate-600">Current: {comparison.current}</p>
                <p className={`mt-1 text-xs font-semibold ${comparison.current > comparison.baseline ? 'text-rose-700' : 'text-emerald-700'}`}>
                  Delta: {comparison.current - comparison.baseline}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
