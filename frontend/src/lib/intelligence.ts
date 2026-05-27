import { API_URL } from './api';
import type { ActivitySeverity } from './types';

export function getIntelligenceWsUrl(): string {
  const backendUrl = API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  const wsBase = backendUrl.startsWith('https://')
    ? backendUrl.replace('https://', 'wss://')
    : backendUrl.replace('http://', 'ws://');
  return `${wsBase}/ws/intelligence`;
}

export function severityClassName(severity: ActivitySeverity | 'critical' | 'warning'): string {
  if (severity === 'critical') return 'text-red-700 bg-red-50 border-red-200';
  if (severity === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-sky-700 bg-sky-50 border-sky-200';
}

export function trendStageClassName(stage: 'still-early' | 'growth-phase' | 'saturating'): string {
  if (stage === 'still-early') return 'text-emerald-700 bg-emerald-50';
  if (stage === 'growth-phase') return 'text-blue-700 bg-blue-50';
  return 'text-red-700 bg-red-50';
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.max(1, Math.floor((now - then) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
