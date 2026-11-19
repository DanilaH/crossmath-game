import { config } from '../content/catalog';
import { dateAvailable } from '../meta/calendar';
import type { Save } from '../app/model';
import type { Attempt } from '../core/types';

export type RewardKind = 'hint' | 'continue';
export interface RewardRequest {
  id: string;
  profileId: string;
  kind: RewardKind;
  target?: { attemptId: string; runId?: string };
}
export interface RewardEvent { id: string; profileId: string; outcome: 'earned' | 'cancelled' | 'failed' }
type Settlement = RewardEvent['outcome'] | 'expired';
export interface AdState {
  requests: Record<string, { request: RewardRequest; settlement?: Settlement }>;
  continued: Record<string, string>;
  lastReward: number | null;
  lastInterstitial: number | null;
}

export function createAdState(): AdState {
  return {requests:{}, continued:{}, lastReward:null, lastInterstitial:null};
}

export function activeSeconds(save: Save): number {
  return Object.values(save.career.modes).reduce((total, mode) => total + mode.seconds, 0);
}

export function canShowInterstitial(save: Save): boolean {
  if (save.meta.screen !== 'play' || save.attempt.status !== 'won' || !save.result ||
      save.profile.solvedIds.length <= config.ads.interstitialProtectFirstNewWins) return false;
  const now = activeSeconds(save), ads = save.ads;
  return (ads.lastInterstitial === null || now - ads.lastInterstitial >= config.ads.interstitialMinActiveSeconds)
    && (ads.lastReward === null || now - ads.lastReward >= config.ads.postRewardedProtectSeconds);
}

function eligibleTarget(save: Save, attempt: Attempt): boolean {
  if (attempt.status !== 'out-of-lives' || attempt.lives !== 0 ||
      save.ads.continued[attempt.runId ?? attempt.id]) return false;
  if (attempt.mode === 'daily' && attempt.dayKey) {
    return dateAvailable(save.profile.createdAt, save.profile.timeZone, save.meta.effectiveDay, attempt.dayKey);
  }
  const run = save.career.run;
  return attempt.mode === 'endless' && !!run && run.id === attempt.runId && run.status === 'failed';
}

export function canRequestReward(save: Save, kind: RewardKind): boolean {
  if (save.meta.screen !== 'play') return false;
  return kind === 'hint' ? save.attempt.status === 'playing' : eligibleTarget(save, save.attempt);
}

export function createRewardRequest(save: Save, id: string, kind: RewardKind): RewardRequest {
  const a = save.attempt;
  const target = kind === 'continue' ? {attemptId:a.id, ...(a.runId ? {runId:a.runId} : {})} : undefined;
  const request:RewardRequest = {id, profileId:save.profile.id, kind, ...(target ? {target} : {})};
  save.ads.requests[id] = {request};
  return request;
}

// Only invoked from the session writer after matching a durable request.
export function settleReward(save: Save, event: RewardEvent): void {
  const entry = save.ads.requests[event.id]!;
  entry.settlement = event.outcome;
  if (event.outcome !== 'earned') return;

  save.ads.lastReward = activeSeconds(save);
  if (entry.request.kind === 'hint') {
    save.profile.hintCredits += config.rewardedHintCredits;
    return;
  }
  const target = entry.request.target!;
  const attempt = [save.attempt, ...Object.values(save.meta.inactive).map(slot => slot.attempt)]
    .find(a => a.id === target.attemptId && a.runId === target.runId);
  if (!attempt || !eligibleTarget(save, attempt)) {
    entry.settlement = 'expired';
    return;
  }
  attempt.lives = config.rewardedContinuationLives;
  attempt.status = 'playing';
  save.ads.continued[target.runId ?? target.attemptId] = event.id;
  if (target.runId) {
    const run = save.career.run!;
    run.lives = attempt.lives;
    run.status = 'active';
    run.assisted = true;
    attempt.assisted = true;
  }
}

export function validateAdState(save: Save): void {
  const ads = save.ads;
  const record = (value:unknown) => !!value && typeof value === 'object' && !Array.isArray(value);
  const time = (value:unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
  if (!ads || !record(ads.requests) || !record(ads.continued) || !time(ads.lastReward) || !time(ads.lastInterstitial)) {
    throw Error('Invalid ad state');
  }
  for (const [id, entry] of Object.entries(ads.requests)) {
    const request = entry?.request;
    if (!id || request?.id !== id || request.profileId !== save.profile.id ||
        !['hint', 'continue'].includes(request.kind) ||
        (request.kind === 'continue' ? !request.target || typeof request.target.attemptId !== 'string'
          || !request.target.attemptId || (request.target.runId !== undefined && typeof request.target.runId !== 'string') : !!request.target)
        || (entry.settlement !== undefined && !['earned', 'cancelled', 'failed', 'expired'].includes(entry.settlement))) {
      throw Error('Invalid ad request');
    }
  }
  for (const [scope,id] of Object.entries(ads.continued)) {
    const entry = ads.requests[id];
    if (entry?.settlement !== 'earned' || (entry.request.target?.runId ?? entry.request.target?.attemptId) !== scope) {
      throw Error('Invalid continuation receipt');
    }
  }
}
