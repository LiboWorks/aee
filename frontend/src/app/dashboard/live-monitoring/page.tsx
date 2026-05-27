'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatRelativeTime, severityClassName } from '@/lib/intelligence';
import { useIntelligenceRealtime } from '@/lib/use-intelligence-realtime';
import type { IntelligenceRealtimeEvent, LiveMonitoringSnapshot, MonitoringAlert } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function LiveMonitoringPage() {
  const [snapshot, setSnapshot] = useState<LiveMonitoringSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getLiveMonitoring();
        setSnapshot(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monitoring center');
      }
    };
    void load();
  }, []);

  const handleRealtimeEvent = useCallback((event: IntelligenceRealtimeEvent) => {
    if (event.type !== 'monitoring.alert') return;

    setSnapshot((current) => {
      if (!current) return current;
      const alert = event.payload as MonitoringAlert;
      return {
        ...current,
        alerts: [alert, ...current.alerts].slice(0, 15),
      };
    });
  }, []);

  const { connected } = useIntelligenceRealtime({ onEvent: handleRealtimeEvent });

  if (!snapshot) {
    return <div className="text-sm text-slate-500">Loading continuous monitoring...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Live Monitoring & Alerts"
        title="Always Watching the Market"
        subtitle="Continuous AI monitoring tracks products, niches, and competitors, then pushes proactive alerts when market conditions change."
        actions={
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {connected ? 'Live alerts connected' : 'Reconnecting live alerts'}
          </span>
        }
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Tracked Products</h2>
          <div className="mt-3 space-y-2">
            {snapshot.trackedProducts.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-600">{item.currentStatus}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Tracked Competitors</h2>
          <div className="mt-3 space-y-2">
            {snapshot.trackedCompetitors.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-600">{item.status}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Tracked Niches</h2>
          <div className="mt-3 space-y-2">
            {snapshot.trackedNiches.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-600">{item.status}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Alert Stream</h2>
        <div className="mt-4 space-y-3">
          {snapshot.alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
              className={`rounded-xl border p-4 ${severityClassName(alert.severity)}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-current px-2 py-0.5">{alert.alertType}</span>
                <span>{alert.market}</span>
                <span>{formatRelativeTime(alert.detectedAt)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{alert.headline}</p>
              <p className="mt-1 text-sm">{alert.details}</p>
              <p className="mt-2 text-xs">Change: {alert.changePercent}% · Recommended: {alert.recommendedAction}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
