'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { api } from '@/lib/api';
import type { ProductIntelligenceReport } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function ProductIntelligencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const investigationId = searchParams.get('investigationId');

  const [report, setReport] = useState<ProductIntelligenceReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProductIntelligenceReport(id);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!investigationId) return;
    void loadReport(investigationId);
  }, [investigationId, loadReport]);

  if (!investigationId) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Product Intelligence Report"
          title="Evidence-Backed AI Research Report"
          subtitle="Open this report from a completed investigation to view executive summary, reasoning, evidence, and strategy guidance."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          No investigation selected.
          <button className="btn-primary mt-3" onClick={() => router.push('/dashboard/opportunity-workspace')}>
            Go to Investigation Workspace
          </button>
        </div>
      </div>
    );
  }

  if (loading || !report) {
    return <div className="text-sm text-slate-500">Generating intelligence report...</div>;
  }

  const survivalRadar = [
    { metric: 'Budget', value: 100 - report.smallTeamSurvival.startupBudgetPressure },
    { metric: 'Inventory', value: 100 - report.smallTeamSurvival.inventoryPressure },
    { metric: 'Logistics', value: 100 - report.smallTeamSurvival.logisticsComplexity },
    { metric: 'Ops Burden', value: 100 - report.smallTeamSurvival.operationalBurden },
    { metric: 'Difficulty', value: 100 - report.smallTeamSurvival.expectedDifficulty },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Product Intelligence Report"
        title={report.productName}
        subtitle="Professional AI-generated opportunity report combining market potential, survivability, risk factors, and strategic recommendations."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Executive Summary</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">{report.executiveSummary.marketPotential}</div>
              <div className="rounded-xl bg-slate-50 p-3">{report.executiveSummary.survivability}</div>
              <div className="rounded-xl bg-slate-50 p-3">{report.executiveSummary.riskLevel}</div>
              <div className="rounded-xl bg-slate-50 p-3">{report.executiveSummary.smallTeamFeasibility}</div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">AI Reasoning Panel</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {report.aiReasoning.map((reasoning, index) => (
                <li key={`${reasoning}_${index}`} className="rounded-xl bg-cyan-50 p-3">{reasoning}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Evidence Explorer</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {report.evidenceExplorer.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                  <p className="mt-2 text-[11px] text-slate-500">{item.sourceName}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Competition Breakdown</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2 pr-3">Seller</th>
                    <th className="pb-2 pr-3">Dominance</th>
                    <th className="pb-2 pr-3">Review Barrier</th>
                    <th className="pb-2">PPC Intensity</th>
                  </tr>
                </thead>
                <tbody>
                  {report.competitionBreakdown.topSellers.map((seller) => (
                    <tr key={seller.sellerName} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-medium">{seller.sellerName}</td>
                      <td className="py-2 pr-3">{seller.dominanceScore}</td>
                      <td className="py-2 pr-3">{seller.reviewBarrier}</td>
                      <td className="py-2">{seller.ppcIntensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Small-Team Survival Analysis</h2>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={survivalRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <Tooltip />
                  <Radar dataKey="value" stroke="#0891b2" fill="#67e8f9" fillOpacity={0.55} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-semibold text-red-900">Risk Intelligence</h2>
            <ul className="mt-3 space-y-2 text-sm text-red-800">
              {report.riskIntelligence.map((risk, index) => (
                <li key={`${risk}_${index}`} className="rounded-xl bg-white/70 p-3">{risk}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-semibold text-emerald-900">AI Recommended Strategy</h2>
            <ul className="mt-3 space-y-2 text-sm text-emerald-900">
              {report.recommendedStrategy.map((strategy, index) => (
                <li key={`${strategy}_${index}`} className="rounded-xl bg-white/70 p-3">{strategy}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
