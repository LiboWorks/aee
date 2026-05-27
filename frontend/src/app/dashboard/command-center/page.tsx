'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useIntelligenceRealtime } from '@/lib/use-intelligence-realtime';
import { compactNumber, formatRelativeTime, severityClassName } from '@/lib/intelligence';
import type {
  AgentActivity,
  CommandCenterSnapshot,
  InvestigationSession,
  IntelligenceRealtimeEvent,
  MonitoringAlert,
} from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';
import { AgentActivityFeed } from '@/components/intelligence/agent-activity-feed';

export default function CommandCenterPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState('');
  const [startingQuery, setStartingQuery] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const data = await api.getCommandCenter();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load command center');
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const handleRealtimeEvent = useCallback((event: IntelligenceRealtimeEvent) => {
    setSnapshot((current) => {
      if (!current) return current;

      if (event.type === 'activity.update') {
        const next = event.payload as AgentActivity;
        return {
          ...current,
          liveActivityFeed: [next, ...current.liveActivityFeed].slice(0, 18),
        };
      }

      if (event.type === 'monitoring.alert') {
        const next = event.payload as MonitoringAlert;
        return {
          ...current,
          activeMonitoringAlerts: [next, ...current.activeMonitoringAlerts].slice(0, 8),
        };
      }

      if (event.type === 'investigation.progress' || event.type === 'investigation.completed') {
        const session = event.payload as InvestigationSession;
        const completedSteps = session.steps.filter((step) => step.status === 'completed' || step.status === 'warning').length;
        const progress = Math.round((completedSteps / Math.max(1, session.steps.length)) * 100);

        const others = current.activeInvestigations.filter((item) => item.id !== session.id);
        return {
          ...current,
          activeInvestigations: [
            {
              id: session.id,
              query: session.query,
              progressPercent: progress,
              status: session.status,
            },
            ...others,
          ].slice(0, 8),
        };
      }

      if (event.type === 'connection.ready') {
        const payload = event.payload as {
          activities?: AgentActivity[];
          monitoringAlerts?: MonitoringAlert[];
          activeInvestigations?: CommandCenterSnapshot['activeInvestigations'];
        };

        return {
          ...current,
          liveActivityFeed: payload.activities?.length ? payload.activities : current.liveActivityFeed,
          activeMonitoringAlerts: payload.monitoringAlerts?.length
            ? payload.monitoringAlerts
            : current.activeMonitoringAlerts,
          activeInvestigations: payload.activeInvestigations?.length
            ? payload.activeInvestigations
            : current.activeInvestigations,
        };
      }

      return current;
    });
  }, []);

  const { connected } = useIntelligenceRealtime({ onEvent: handleRealtimeEvent });

  const topAlert = useMemo(() => snapshot?.activeMonitoringAlerts[0] ?? null, [snapshot]);

  const startInvestigation = async (query: string) => {
    setStartingQuery(query);
    try {
      const investigation = await api.startInvestigation({
        query,
        category: 'Command Center Trigger',
        budgetLevel: 'balanced',
        smallTeamMode: true,
        riskTolerance: 'balanced',
        marketType: 'amazon-us',
      });
      router.push(`/dashboard/opportunity-workspace?investigationId=${investigation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start investigation');
    } finally {
      setStartingQuery(null);
    }
  };

  if (!snapshot) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-slate-500">Loading AI command center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="AI Command Center"
        title="Autonomous Market Intelligence Headquarters"
        subtitle="AI agents continuously scan opportunities, detect danger, explain evidence, and prioritize what your team should do now."
        actions={
          <>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {connected ? 'Realtime feed connected' : 'Realtime feed reconnecting'}
            </span>
            <button
              type="button"
              onClick={() => void startInvestigation('Low-competition kitchen accessories for small teams')}
              className="btn-primary"
              disabled={startingQuery !== null}
            >
              {startingQuery ? 'Launching investigation...' : 'Start Investigation'}
            </button>
          </>
        }
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Live AI Agent Activity Feed</h2>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">Always working</span>
            </div>
            <AgentActivityFeed activities={snapshot.liveActivityFeed} />
          </div>
        </section>

        <section className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">AI Research Summary</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {snapshot.aiResearchSummary.map((line, index) => (
                <li key={`${line}_${index}`} className="rounded-xl bg-slate-50 p-3">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Active Monitoring Alerts</h2>
            <div className="mt-3 space-y-2">
              {snapshot.activeMonitoringAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className={`rounded-xl border p-3 text-sm ${severityClassName(alert.severity)}`}>
                  <p className="font-semibold">{alert.headline}</p>
                  <p className="mt-1 text-xs opacity-90">{alert.market} · {formatRelativeTime(alert.detectedAt)}</p>
                </div>
              ))}
            </div>
          </div>

          {topAlert ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Danger Zone</p>
              <p className="mt-2 text-sm font-semibold text-red-900">{topAlert.headline}</p>
              <p className="mt-1 text-sm text-red-800">{topAlert.details}</p>
            </motion.div>
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Emerging Opportunities</h2>
          <span className="text-xs text-slate-500">Prioritized for Shenzhen 3-20 person teams</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.emergingOpportunities.map((opportunity) => (
            <motion.article
              key={opportunity.id}
              whileHover={{ y: -2 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <img src={opportunity.imageUrl} alt={opportunity.productName} className="h-36 w-full object-cover" />
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{opportunity.productName}</p>
                  <p className="text-xs text-slate-500">{opportunity.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2">
                    <p className="text-slate-500">Growth accel.</p>
                    <p className="font-semibold text-emerald-700">{compactNumber(opportunity.growthAcceleration)}%</p>
                  </div>
                  <div className="rounded-xl bg-white p-2">
                    <p className="text-slate-500">Opp. score</p>
                    <p className="font-semibold text-cyan-700">{opportunity.opportunityScore}/100</p>
                  </div>
                  <div className="rounded-xl bg-white p-2">
                    <p className="text-slate-500">Competition</p>
                    <p className="font-semibold text-amber-700">{opportunity.competitionScore}/100</p>
                  </div>
                  <div className="rounded-xl bg-white p-2">
                    <p className="text-slate-500">Margin est.</p>
                    <p className="font-semibold text-slate-800">{opportunity.estimatedMargin}%</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p><span className="font-semibold">Why this matters:</span> {opportunity.whyThisMatters}</p>
                  <p><span className="font-semibold">Why early-stage:</span> {opportunity.whyEarlyStage}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => void startInvestigation(opportunity.productName)}
                  disabled={startingQuery !== null}
                >
                  Investigate Now
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Quick Investigation Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {snapshot.quickInvestigationActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => void startInvestigation(action.prompt)}
              disabled={startingQuery !== null}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
