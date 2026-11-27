import { ActionInterstitialGate, isActionInterstitialGateState } from '@danilah/mini-games-kit/platform';
import type { ActionInterstitialGateState, InterstitialRequestOutcome } from '@danilah/mini-games-kit/platform';
import { config } from '../content/catalog';
import { dateAvailable } from '../meta/calendar';
import type { Save } from '../app/model';
import type { Attempt } from '../core/types';
import { endlessEnabled } from '../content/modeAvailability';
import { validWinBonusTarget, winBonusOffer } from './winBonus';
import type { WinBonusTarget } from './winBonus';

export type RewardKind = 'hint' | 'continue' | 'win-bonus';
export interface RewardRequest {
  id: string;
  profileId: string;
  kind: RewardKind;
  target?: { attemptId: string; runId?: string };
  win?: WinBonusTarget;
}
export interface RewardEvent { id: string; profileId: string; outcome: 'earned' | 'cancelled' | 'failed' }
type Settlement = RewardEvent['outcome'] | 'expired';
export interface AdState {
  requests: Record<string, { request: RewardRequest; settlement?: Settlement }>;
  continued: Record<string, string>;
  lastReward: number | null;
  lastInterstitial: number | null;
  interstitialGate?: ActionInterstitialGateState;
}

export function createAdState(): AdState {
  return {requests:{}, continued:{}, lastReward:null, lastInterstitial:null};
}

export function activeSeconds(save: Save): number {
  return Object.values(save.career.modes).reduce((total, mode) => total + mode.seconds, 0);
}

const gateConfig = {
  initialGraceMs: 0,
  minIntervalMs: config.ads.interstitialMinActiveSeconds * 1000,
  minActionsBetweenRequests: 1,
  protectedWins: config.ads.interstitialProtectFirstNewWins,
  retryIntervalMs: config.ads.interstitialNoFillRetryActiveSeconds * 1000,
  rewardedExtensionMs: config.ads.postRewardedProtectSeconds * 1000,
  maxRewardedProtectionMs: config.ads.maxRewardedProtectActiveSeconds * 1000,
};

function interstitialGate(save: Save): ActionInterstitialGate {
  const {lastInterstitial, lastReward, interstitialGate: previous} = save.ads;
  // Legacy deadlines overlapped. Import their maximum once; do not retroactively stack rewards.
  const state = previous ?? {
    nextEligibleAtMs: lastInterstitial === null && lastReward === null ? null : Math.max(
      lastInterstitial === null ? 0 : lastInterstitial * 1000 + gateConfig.minIntervalMs,
      lastReward === null ? 0 : lastReward * 1000 + gateConfig.rewardedExtensionMs,
    ),
    actionsSinceRequest: 0,
    lastRequestId: null,
    pendingUntilMs: null,
  };
  return new ActionInterstitialGate(() => activeSeconds(save) * 1000, gateConfig, state);
}

function reserveResult(save: Save, resultId: string | undefined): ActionInterstitialGate | null {
  if(Object.values(save.ads.requests).some(entry=>entry.settlement===undefined))return null;
  if (save.meta.screen !== 'play' || !endlessEnabled && save.attempt.mode === 'endless' || save.attempt.status !== 'won' || !save.result ||
      save.result.id !== resultId || save.result.interstitialRequested) return null;
  const gate = interstitialGate(save);
  return gate.beginRequest(save.result.id, save.profile.solvedIds.length) ? gate : null;
}

export function canShowInterstitial(save: Save): boolean {
  return reserveResult(save, save.result?.id) !== null;
}

export function beginInterstitial(save: Save, resultId: string): boolean {
  const gate = reserveResult(save, resultId);
  if (!gate) return false;
  save.ads.interstitialGate = gate.snapshot();
  save.result!.interstitialRequested = true;
  return true;
}

export function settleInterstitial(save: Save, resultId: string, outcome: InterstitialRequestOutcome): boolean {
  const gate = interstitialGate(save);
  if (!gate.settleRequest(resultId, outcome)) return false;
  save.ads.interstitialGate = gate.snapshot();
  if (outcome === 'shown') save.ads.lastInterstitial = activeSeconds(save);
  return true;
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
  if (save.meta.screen !== 'play' || !endlessEnabled && save.attempt.mode === 'endless') return false;
  // Unknown pending is not a terminal cancellation, including after a cold restart.
  if(Object.values(save.ads.requests).some(entry=>entry.settlement===undefined))return false;
  if(kind==='win-bonus')return winBonusOffer(save)!==null;
  return kind === 'hint' ? save.attempt.status === 'playing' : eligibleTarget(save, save.attempt);
}

export function createRewardRequest(save: Save, id: string, kind: RewardKind): RewardRequest {
  if(!id||Object.hasOwn(save.ads.requests,id))throw Error('Duplicate ad request');
  const a = save.attempt;
  const target = kind === 'continue' ? {attemptId:a.id, ...(a.runId ? {runId:a.runId} : {})} : undefined;
  const request:RewardRequest = {id, profileId:save.profile.id, kind, ...(target ? {target} : {})};
  if(kind==='win-bonus'){
    const win=winBonusOffer(save);
    if(!win)throw Error('Ineligible win bonus');
    request.win=win;
    // The voluntary candidate consumes this result's forced opportunity even on cancel.
    // It never chains a forced show after the player leaves the video.
    save.result!.interstitialRequested=true;
  }
  save.ads.requests[id] = {request};
  return request;
}

// Only invoked from the session writer after matching a durable request.
export function settleReward(save: Save, event: RewardEvent): void {
  const entry = save.ads.requests[event.id]!;
  entry.settlement = event.outcome;
  if (event.outcome !== 'earned') return;

  if(entry.request.kind==='win-bonus' && Object.values(save.ads.requests).some(other=>other!==entry&&other.request.win?.resultId===entry.request.win!.resultId&&other.settlement==='earned')){
    entry.settlement='expired';return;
  }

  const gate = interstitialGate(save);
  gate.recordEarnedReward();
  save.ads.interstitialGate = gate.snapshot();
  save.ads.lastReward = activeSeconds(save);
  if (entry.request.kind === 'hint') {
    save.profile.hintCredits += config.rewardedHintCredits;
    return;
  }
  if(entry.request.kind==='win-bonus'){
    const target=entry.request.win!;
    // The persisted request is the authority. No current-result/UI/SDK amount is used.
    save.profile.coins+=target.delta;
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
  if (!ads || !record(ads.requests) || !record(ads.continued) || !time(ads.lastReward) || !time(ads.lastInterstitial)
    || ads.interstitialGate !== undefined && !isActionInterstitialGateState(ads.interstitialGate)) {
    throw Error('Invalid ad state');
  }
  for (const [id, entry] of Object.entries(ads.requests)) {
    const request = entry?.request;
    if (!id || request?.id !== id || request.profileId !== save.profile.id ||
        !['hint', 'continue', 'win-bonus'].includes(request.kind) ||
        (request.kind === 'continue' ? !request.target || typeof request.target.attemptId !== 'string'
          || !request.target.attemptId || (request.target.runId !== undefined && typeof request.target.runId !== 'string') : !!request.target)
        || (request.kind==='win-bonus' ? !validWinBonusTarget(request.win) || !!request.target : request.win!==undefined)
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
