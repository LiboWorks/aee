import { randomUUID } from 'crypto';

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function weightedScore(entries: Array<{ value: number; weight: number }>): number {
  const totalWeight = entries.reduce((acc, entry) => acc + entry.weight, 0);
  if (!totalWeight) return 0;
  const weightedTotal = entries.reduce((acc, entry) => acc + entry.value * entry.weight, 0);
  return clampScore(weightedTotal / totalWeight);
}

export function toPercentDelta(next: number, baseline: number): number {
  if (baseline === 0) return 100;
  return Number((((next - baseline) / baseline) * 100).toFixed(1));
}

export function randomFromList<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

export function randomInRange(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(1));
}

export function progressPercent(completedSteps: number, totalSteps: number): number {
  if (!totalSteps) return 0;
  return clampScore((completedSteps / totalSteps) * 100);
}

export function classifyTrendStage(score: number): 'still-early' | 'growth-phase' | 'saturating' {
  if (score < 42) return 'still-early';
  if (score < 72) return 'growth-phase';
  return 'saturating';
}

export function agoMinutes(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
