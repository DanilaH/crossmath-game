import { config } from '../content/catalog';

export interface WorkshopReceipt { from: number; to: number }
export interface WorkshopTarget { index: number; part: number; percent: number; remaining: number }

const { fragmentWinThresholds: thresholds, fragmentsPerCard } = config.collection;

export function workshopTarget(wins: number, fragments: number): WorkshopTarget | undefined {
  const upper = thresholds[fragments];
  if (upper === undefined) return;
  const lower = thresholds[fragments - 1] ?? 0;
  return {
    index: Math.floor(fragments / fragmentsPerCard),
    part: fragments % fragmentsPerCard + 1,
    percent: Math.floor(100 * Math.max(0, Math.min(wins - lower, upper - lower)) / (upper - lower)),
    remaining: Math.max(0, upper - wins),
  };
}

export function workshopBeats(progress: WorkshopReceipt, fragments: number, earned: number): WorkshopTarget[] {
  const beats: WorkshopTarget[] = [];
  for (let step = fragments - earned; step < fragments; step++) {
    const target = workshopTarget(progress.to, step);
    if (target) beats.push(target);
  }
  if (!earned || progress.to > (thresholds[fragments - 1] ?? 0)) {
    const target = workshopTarget(progress.to, fragments);
    if (target) beats.push(target);
  }
  return beats;
}
