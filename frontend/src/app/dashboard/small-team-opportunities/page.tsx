'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SmallTeamOpportunitySnapshot } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function SmallTeamOpportunityPage() {
  const [snapshot, setSnapshot] = useState<SmallTeamOpportunitySnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getSmallTeamOpportunities();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load small-team opportunities');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading small-team opportunities...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Small-Team Opportunity Center"
        title="Opportunities Tailored for 3-20 Person Teams"
        subtitle="Filter by low startup cost, low PPC dependency, manageable inventory, and operational simplicity to avoid overextension."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Applied Filters</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {snapshot.filtersApplied.map((filter) => (
            <span key={filter} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
              {filter}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.opportunities.map((opportunity) => (
          <article key={opportunity.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">{opportunity.productName}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-slate-500">Startup cost</p>
                <p className="font-semibold text-slate-800">{opportunity.startupCostEstimate}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-slate-500">PPC dependency</p>
                <p className="font-semibold text-slate-800">{opportunity.ppcDependency}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-slate-500">Inventory complexity</p>
                <p className="font-semibold text-slate-800">{opportunity.inventoryComplexity}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-slate-500">Review barrier</p>
                <p className="font-semibold text-slate-800">{opportunity.reviewBarrier}/100</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Why this fits small sellers</p>
              <p className="mt-1">{opportunity.fitReason}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
