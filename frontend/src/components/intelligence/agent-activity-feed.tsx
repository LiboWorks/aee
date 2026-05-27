'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatRelativeTime, severityClassName } from '@/lib/intelligence';
import type { AgentActivity } from '@/lib/types';

interface AgentActivityFeedProps {
  activities: AgentActivity[];
}

export function AgentActivityFeed({ activities }: AgentActivityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const expanded = expandedId === activity.id;
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : activity.id)}
              className="w-full p-4 text-left hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClassName(activity.severity)}`}>
                  {activity.severity}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {activity.agentName}
                </span>
                <span className="text-xs text-slate-400">{formatRelativeTime(activity.timestamp)}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{activity.headline}</p>
              <p className="mt-1 text-sm text-slate-600">{activity.details}</p>
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-t border-slate-100 bg-slate-50/60"
                >
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checked sources</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activity.checkedSources.map((source) => (
                          <span key={source} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conclusion</p>
                      <p className="mt-1 text-sm text-slate-700">{activity.conclusion}</p>
                    </div>
                    {activity.evidence.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {activity.evidence.map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-sm font-medium text-slate-900">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
