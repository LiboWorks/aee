'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useIntelligenceRealtime } from '@/lib/use-intelligence-realtime';
import type { IntelligenceRealtimeEvent, InvestigationSession } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';
import { InvestigationWorkflow } from '@/components/intelligence/investigation-workflow';

const defaultForm = {
  query: 'Compact home organization products with low review concentration',
  category: 'Home Organization',
  budgetLevel: 'balanced' as const,
  smallTeamMode: true,
  riskTolerance: 'balanced' as const,
  marketType: 'amazon-us' as const,
};

export default function OpportunityWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvestigationId = searchParams.get('investigationId');

  const [form, setForm] = useState(defaultForm);
  const [investigation, setInvestigation] = useState<InvestigationSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInvestigation = useCallback(async (id: string) => {
    try {
      const data = await api.getInvestigation(id);
      setInvestigation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load investigation');
    }
  }, []);

  useEffect(() => {
    if (!initialInvestigationId) return;
    void fetchInvestigation(initialInvestigationId);
  }, [fetchInvestigation, initialInvestigationId]);

  useEffect(() => {
    if (!investigation || investigation.status === 'completed') return;
    const timer = setInterval(() => {
      void fetchInvestigation(investigation.id);
    }, 9000);
    return () => clearInterval(timer);
  }, [fetchInvestigation, investigation]);

  const handleRealtimeEvent = useCallback((event: IntelligenceRealtimeEvent) => {
    if (event.type === 'investigation.progress' || event.type === 'investigation.completed') {
      const session = event.payload as InvestigationSession;
      if (investigation && session.id !== investigation.id) return;
      setInvestigation(session);
    }
  }, [investigation]);

  useIntelligenceRealtime({ onEvent: handleRealtimeEvent });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const started = await api.startInvestigation(form);
      setInvestigation(started);
      router.replace(`/dashboard/opportunity-workspace?investigationId=${started.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start investigation');
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = useMemo(() => investigation?.steps.filter((step) => step.status === 'completed' || step.status === 'warning').length ?? 0, [investigation]);
  const progress = useMemo(() => {
    if (!investigation) return 0;
    return Math.round((completedSteps / Math.max(1, investigation.steps.length)) * 100);
  }, [completedSteps, investigation]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Opportunity Investigation Workspace"
        title="AI Agents Executing Multi-Step Market Research"
        subtitle="Define constraints, run autonomous investigation workflow, and inspect the evidence and reasoning each specialist agent produced."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="space-y-4 xl:col-span-3">
          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Research Controls</h2>

            <label className="label mt-4">Investigation Query</label>
            <textarea
              className="input min-h-24"
              value={form.query}
              onChange={(e) => setForm((current) => ({ ...current, query: e.target.value }))}
            />

            <label className="label mt-3">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
            />

            <label className="label mt-3">Budget Level</label>
            <select
              className="input"
              value={form.budgetLevel}
              onChange={(e) => setForm((current) => ({ ...current, budgetLevel: e.target.value as typeof form.budgetLevel }))}
            >
              <option value="lean">Lean</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>

            <label className="label mt-3">Risk Tolerance</label>
            <select
              className="input"
              value={form.riskTolerance}
              onChange={(e) => setForm((current) => ({ ...current, riskTolerance: e.target.value as typeof form.riskTolerance }))}
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>

            <label className="label mt-3">Market Type</label>
            <select
              className="input"
              value={form.marketType}
              onChange={(e) => setForm((current) => ({ ...current, marketType: e.target.value as typeof form.marketType }))}
            >
              <option value="amazon-us">Amazon US</option>
              <option value="amazon-eu">Amazon EU</option>
              <option value="amazon-jp">Amazon JP</option>
            </select>

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.smallTeamMode}
                onChange={(e) => setForm((current) => ({ ...current, smallTeamMode: e.target.checked }))}
              />
              Small-team mode (3-20 people)
            </label>

            <button type="submit" className="btn-primary mt-4 w-full" disabled={loading}>
              {loading ? 'Launching agents...' : 'Run Investigation'}
            </button>
          </form>

          {investigation ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Progress</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{progress}%</p>
              <p className="text-sm text-slate-600">
                {completedSteps} of {investigation.steps.length} steps completed
              </p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-cyan-500"
                />
              </div>
            </div>
          ) : null}
        </aside>

        <section className="xl:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Live Investigation Workflow</h2>
            {investigation ? (
              <div className="mt-3">
                <InvestigationWorkflow steps={investigation.steps} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Start an investigation to watch agents execute step-by-step market checks.</p>
            )}
          </div>
        </section>

        <aside className="space-y-4 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">AI Reasoning</h2>
            {investigation ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {investigation.steps
                  .filter((step) => step.status === 'completed' || step.status === 'warning')
                  .slice(0, 5)
                  .map((step) => (
                    <div key={step.id} className="rounded-xl bg-slate-50 p-3">
                      <p className="font-medium">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{step.summary}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Reasoning trace will appear during execution.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Evidence Highlights</h2>
            {investigation ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {investigation.steps
                  .flatMap((step) => step.evidence)
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs">{item.summary}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Evidence will populate from each agent step.</p>
            )}
          </div>

          {investigation?.outcome ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Final Output</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-emerald-900">
                <div className="rounded-lg bg-white p-2">Opportunity: {investigation.outcome.opportunityScore}</div>
                <div className="rounded-lg bg-white p-2">Risk: {investigation.outcome.riskScore}</div>
                <div className="rounded-lg bg-white p-2">Entry Difficulty: {investigation.outcome.entryDifficulty}</div>
                <div className="rounded-lg bg-white p-2">Survivability: {investigation.outcome.survivability}</div>
              </div>
              <button
                type="button"
                className="btn-primary mt-3 w-full"
                onClick={() => router.push(`/dashboard/product-intelligence?investigationId=${investigation.id}`)}
              >
                Open Product Intelligence Report
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
