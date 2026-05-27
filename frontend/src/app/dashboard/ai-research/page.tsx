'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { ResearchWorkspaceResponse } from '@/lib/types';
import { PageHeader } from '@/components/intelligence/page-header';

export default function AiResearchWorkspacePage() {
  const [question, setQuestion] = useState('Can small sellers survive this niche in the next 3 months?');
  const [context, setContext] = useState('Focus on Shenzhen teams with CNY 150k-300k launch budget.');
  const [response, setResponse] = useState<ResearchWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.askResearchWorkspace({ question, context });
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run AI research workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="AI Research Workspace"
        title="Collaborative Investigation Interface"
        subtitle="Ask strategic market questions and trigger workflow-based, evidence-backed multi-agent analysis instead of simple chatbot replies."
      />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-4">
          <h2 className="text-lg font-semibold text-slate-900">Research Prompt</h2>
          <div>
            <label className="label">Question</label>
            <textarea
              className="input min-h-28"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Context</label>
            <textarea
              className="input min-h-24"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Running agent workflow...' : 'Run AI Investigation'}
          </button>
        </form>

        <div className="space-y-4 xl:col-span-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Workflow Trace</h2>
            {response ? (
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                {response.workflow.map((step, index) => (
                  <li key={`${step}_${index}`} className="rounded-xl bg-slate-50 p-3">
                    <span className="font-semibold text-cyan-700">Step {index + 1}:</span> {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Run an investigation to display the multi-agent workflow trace.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">AI Conclusion</h2>
            {response ? (
              <>
                <p className="mt-3 text-sm text-slate-700">{response.answer}</p>
                <p className="mt-2 text-xs text-slate-500">Confidence {response.confidence}%</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Conclusion appears here after agents complete investigation.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Evidence and Next Actions</h2>
            {response ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {response.evidence.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {response.nextActions.map((action, index) => (
                    <div key={`${action}_${index}`} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Evidence-backed actions will be generated after workflow execution.</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
