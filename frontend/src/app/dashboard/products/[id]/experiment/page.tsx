'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Experiment, ExperimentResult } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function ExperimentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params.id as string;
  const executionIdParam = searchParams.get('executionId');

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Form state
  const [durationDays, setDurationDays] = useState(7);
  const [budgetAllocation, setBudgetAllocation] = useState(100);
  const [kpiTargets, setKpiTargets] = useState({ ctr: 0.5, cvr: 10, roi: 1.5 });

  const loadExperiment = useCallback(async (id: string) => {
    const exp = await api.getExperiment(id);
    setExperiment(exp);
    if (exp.results) setResults(exp.results);
  }, []);

  // Check if there's already an experiment for this product
  useEffect(() => {
    // No auto-load for now — user creates experiment explicitly
  }, [productId]);

  const handleCreate = async () => {
    if (!executionIdParam) {
      setError('No execution ID provided');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const exp = await api.createExperiment({
        executionId: executionIdParam,
        durationDays,
        budgetAllocation,
        kpiTargets,
      });
      await loadExperiment(exp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment');
    } finally {
      setCreating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!experiment) return;
    setEvaluating(true);
    try {
      const result = await api.evaluateExperiment(experiment.id);
      setEvaluation(result);
      await loadExperiment(experiment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const chartData = results.map((r) => ({
    day: `Day ${r.day}`,
    ...r.metrics,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Experiment Dashboard</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {!experiment && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Setup New Experiment</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Duration (days)</label>
              <input
                type="number"
                className="input w-32"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                min={1}
                max={90}
              />
            </div>
            <div>
              <label className="label">Budget Allocation ($)</label>
              <input
                type="number"
                className="input w-32"
                value={budgetAllocation}
                onChange={(e) => setBudgetAllocation(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="label">KPI Targets</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">CTR (%)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.1"
                    value={kpiTargets.ctr}
                    onChange={(e) => setKpiTargets({ ...kpiTargets, ctr: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">CVR (%)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.1"
                    value={kpiTargets.cvr}
                    onChange={(e) => setKpiTargets({ ...kpiTargets, cvr: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ROI (x)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.1"
                    value={kpiTargets.roi}
                    onChange={(e) => setKpiTargets({ ...kpiTargets, roi: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <button onClick={handleCreate} className="btn-primary" disabled={creating}>
              {creating ? 'Running Simulation...' : 'Run Experiment'}
            </button>
          </div>
        </div>
      )}

      {experiment && (
        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4">
            <span className={`badge text-sm ${
              experiment.status === 'running' ? 'bg-blue-100 text-blue-700' :
              experiment.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {experiment.status}
            </span>
            <span className="text-sm text-gray-500">
              {experiment.durationDays} days · ${experiment.budgetAllocation} budget
            </span>
            {experiment.status !== 'completed' && (
              <button onClick={handleEvaluate} className="btn-primary text-sm" disabled={evaluating}>
                {evaluating ? 'Evaluating...' : 'Evaluate Results'}
              </button>
            )}
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Daily Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" name="Impressions" />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#10b981" name="Clicks" />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#f59e0b" name="Conversions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Revenue & Spend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="spend" stroke="#ef4444" name="Spend ($)" />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold mb-4">ROI Trend</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="roi" stroke="#8b5cf6" name="ROI (x)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Evaluation Results */}
          {evaluation && (
            <div className="card border-2 border-primary-200">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold">Evaluation</h2>
                <span className={`badge text-sm ${
                  (evaluation.overallDecision as string) === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {(evaluation.overallDecision as string)?.toUpperCase()}
                </span>
              </div>
              {evaluation.reasoning ? (
                <p className="text-gray-600 mb-4">{String(evaluation.reasoning)}</p>
              ) : null}
              {Array.isArray(evaluation.suggestions) && (
                <div>
                  <h3 className="font-medium mb-2">Optimization Suggestions</h3>
                  <ul className="space-y-1">
                    {(evaluation.suggestions as string[]).map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary-500">→</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Data Table */}
          {results.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="text-lg font-semibold mb-4">Daily Metrics</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4">Day</th>
                    <th className="pb-2 pr-4">Impressions</th>
                    <th className="pb-2 pr-4">Clicks</th>
                    <th className="pb-2 pr-4">CTR</th>
                    <th className="pb-2 pr-4">Conversions</th>
                    <th className="pb-2 pr-4">CVR</th>
                    <th className="pb-2 pr-4">Spend</th>
                    <th className="pb-2 pr-4">Revenue</th>
                    <th className="pb-2">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{r.day}</td>
                      <td className="py-2 pr-4">{r.metrics.impressions}</td>
                      <td className="py-2 pr-4">{r.metrics.clicks}</td>
                      <td className="py-2 pr-4">{r.metrics.ctr.toFixed(2)}%</td>
                      <td className="py-2 pr-4">{r.metrics.conversions}</td>
                      <td className="py-2 pr-4">{r.metrics.cvr.toFixed(2)}%</td>
                      <td className="py-2 pr-4">${r.metrics.spend.toFixed(2)}</td>
                      <td className="py-2 pr-4">${r.metrics.revenue.toFixed(2)}</td>
                      <td className="py-2">{r.metrics.roi.toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
