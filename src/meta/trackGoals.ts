import { getPuzzle } from '../content/catalog';
import type { Bucket, FreeTrack } from '../content/rotation';
import type { Completion, Save } from '../app/model';
import type { Attempt } from '../core/types';

export const trackGoalDefinitions = {
  'relax-easy-v1': {track:'relax',target:3},
  'relax-normal-v1': {track:'relax',target:1},
  'relax-position-v1': {track:'relax',target:3},
  'challenge-hard-v1': {track:'challenge',target:1},
  'challenge-expert-v1': {track:'challenge',target:1},
  'challenge-position-v1': {track:'challenge',target:3},
} as const;

export type TrackGoalId = keyof typeof trackGoalDefinitions;
export const relaxGoalTarget = trackGoalDefinitions['relax-easy-v1'].target;

const winBuckets = {
  'relax-normal-v1': ['normal-short','normal-long'],
  'challenge-hard-v1': ['hard-short'],
  'challenge-expert-v1': ['expert-short'],
} satisfies Record<string,readonly Bucket[]>;

export type TrackWinGoalId = keyof typeof winBuckets;
export interface TrackGoalReceipt { id: Exclude<TrackGoalId,'relax-easy-v1'>; progress: number; stepComplete?: true }
interface ActiveGoal { id: TrackGoalId; progress: number }

function isWinGoal(id: string): id is TrackWinGoalId { return Object.hasOwn(winBuckets,id); }

export function activeTrackGoal(save: Save, track: FreeTrack): ActiveGoal | null {
  const {relaxGoalIds,trackGoalWins,freeProgress} = save.meta;
  if (track === 'relax') {
    const easy = relaxGoalIds?.length ?? 0;
    if (easy < relaxGoalTarget) return {id:'relax-easy-v1',progress:easy};
    if (!trackGoalWins?.['relax-normal-v1']) return {id:'relax-normal-v1',progress:0};
  } else {
    if (!trackGoalWins?.['challenge-hard-v1']) return {id:'challenge-hard-v1',progress:0};
    if (!trackGoalWins?.['challenge-expert-v1']) return {id:'challenge-expert-v1',progress:0};
  }
  const position = `${track}-position-v1` as const;
  const progress = freeProgress?.[track] ?? 0;
  return progress < trackGoalDefinitions[position].target ? {id:position,progress} : null;
}

export function settleTrackGoal(save: Save, receipt: Completion, goal: ActiveGoal | null): void {
  if (!goal) return;
  const {id} = goal;
  const {puzzleId} = save.attempt;
  const puzzle = getPuzzle(puzzleId);
  if (id === 'relax-easy-v1') {
    const ids = save.meta.relaxGoalIds ??= [];
    if (puzzle.difficulty === 'easy' && !ids.includes(puzzleId)) ids.push(puzzleId);
    receipt.relaxGoalProgress = ids.length;
    return;
  }
  const {track,target} = trackGoalDefinitions[id];
  let progress: number;
  if (isWinGoal(id)) {
    const buckets: readonly Bucket[] = winBuckets[id];
    const matched = puzzle.bucket !== undefined && buckets.includes(puzzle.bucket);
    progress = Number(matched);
    if (matched) (save.meta.trackGoalWins ??= {})[id] = true;
  } else progress = Math.min(target,save.meta.freeProgress?.[track] ?? 0);
  receipt.trackGoal = {id,progress};
  if (!activeTrackGoal(save,track)) receipt.trackGoal.stepComplete = true;
}

export function validateTrackGoalWins(save: Save): void {
  const wins = save.meta.trackGoalWins;
  if (wins === undefined) return;
  if (!wins || typeof wins !== 'object' || Array.isArray(wins) ||
    Object.entries(wins).some(([id,value])=>!isWinGoal(id) || value !== true) ||
    (wins['relax-normal-v1'] && save.meta.relaxGoalIds?.length !== relaxGoalTarget) ||
    (wins['challenge-expert-v1'] && !wins['challenge-hard-v1'])) throw Error('Corrupt track goals');
}

export function validTrackGoalReceipt(save: Save, attempt: Attempt, receipt: TrackGoalReceipt): boolean {
  if (!receipt || !Object.hasOwn(trackGoalDefinitions,receipt.id) || (receipt.id as TrackGoalId) === 'relax-easy-v1' || attempt.mode !== 'free') return false;
  const {track,target} = trackGoalDefinitions[receipt.id];
  return attempt.freeTrack === track && Number.isSafeInteger(receipt.progress) && receipt.progress >= 0 && receipt.progress <= target &&
    (!isWinGoal(receipt.id) || receipt.progress === 0 || save.meta.trackGoalWins?.[receipt.id] === true) &&
    (receipt.stepComplete === undefined || (receipt.stepComplete === true && receipt.progress === target && !activeTrackGoal(save,track)));
}
