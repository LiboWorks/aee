'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { WorkspaceSettingsSnapshot } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function WorkspaceSettingsPage() {
  const [snapshot, setSnapshot] = useState<WorkspaceSettingsSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getWorkspaceSettings();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace settings');
      }
    };
    void load();
  }, []);

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading workspace settings...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Workspace / Team Settings"
        title="Operational Preferences for Your AI Analyst Team"
        subtitle="Configure team profile defaults, agent cadences, and watchlist thresholds for continuous market monitoring."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900">Team Profile</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 p-3">Target team size: {snapshot.teamProfile.targetTeamSize}</div>
            <div className="rounded-xl bg-slate-50 p-3">Operating model: {snapshot.teamProfile.operatingModel}</div>
            <div className="rounded-xl bg-slate-50 p-3">Default budget range: {snapshot.teamProfile.defaultBudgetRange}</div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900">Agent Preferences</h2>
          <div className="mt-3 space-y-2">
            {snapshot.agentPreferences.map((agent) => (
              <div key={agent.agentId} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{agent.agentId}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${agent.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {agent.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Cadence: {agent.cadence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900">Watchlist Thresholds</h2>
          <div className="mt-3 space-y-2">
            {snapshot.watchlistSettings.map((watch) => (
              <div key={watch.watchType} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{watch.watchType}</p>
                <p className="mt-1 text-xs text-slate-600">{watch.threshold}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
