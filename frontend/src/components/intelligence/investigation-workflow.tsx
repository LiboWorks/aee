'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import type { InvestigationStep } from '@/lib/types';

interface InvestigationWorkflowProps {
  steps: InvestigationStep[];
}

function stepTone(step: InvestigationStep): string {
  if (step.status === 'completed') return 'border-emerald-200 bg-emerald-50';
  if (step.status === 'running') return 'border-cyan-200 bg-cyan-50';
  if (step.status === 'warning') return 'border-amber-200 bg-amber-50';
  return 'border-slate-200 bg-slate-50';
}

function stepLabel(step: InvestigationStep): string {
  if (step.status === 'completed') return 'Completed';
  if (step.status === 'running') return 'Running';
  if (step.status === 'warning') return 'Warning';
  return 'Pending';
}

export function InvestigationWorkflow({ steps }: InvestigationWorkflowProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const expanded = expandedStep === step.id;
        return (
          <motion.div key={step.id} layout className={`rounded-2xl border ${stepTone(step)}`}>
            <button
              type="button"
              onClick={() => setExpandedStep(expanded ? null : step.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white text-center text-sm font-semibold leading-8 text-slate-700">
                    {step.order}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-600">{step.summary}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">{stepLabel(step)}</span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 border-t border-white/70 bg-white/70 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Raw findings</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {step.rawFindings.length > 0 ? (
                          step.rawFindings.map((finding, index) => <li key={`${step.id}_finding_${index}`}>- {finding}</li>)
                        ) : (
                          <li>- Evidence will appear once this step executes.</li>
                        )}
                      </ul>

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {step.checkedSources.length > 0 ? (
                          step.checkedSources.map((source) => (
                            <span key={source} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                              {source}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No source checks yet.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signal chart</p>
                      <div className="mt-2 h-28 rounded-xl border border-slate-200 bg-white p-2">
                        {step.charts.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={step.charts}>
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Area type="monotone" dataKey="value" stroke="#0f766e" fill="#99f6e4" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">Waiting for chart data</div>
                        )}
                      </div>

                      {step.evidence.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {step.evidence.slice(0, 2).map((item) => (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                              <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
