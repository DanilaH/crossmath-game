import { freeTrackBucket, getPuzzle, newFreeTrackPuzzle } from './catalog';
import { bucketTurn, isFreeTrack, rotations } from './rotation';
import type { FreeTrack } from './rotation';
import type { Attempt, Puzzle } from '../core/types';
import type { Save } from '../app/model';
import type { MetaState } from '../meta/types';

export const pilotIssuancePolicy = 'd4-v2';
type IssuancePolicy = 'legacy' | typeof pilotIssuancePolicy;
export const buildIssuancePolicy = (): IssuancePolicy => ['issuance-pilot','content-lab','league-lab'].includes(import.meta.env.MODE) ? pilotIssuancePolicy : 'legacy';

interface IssuedBoard { count: number; lastIndex: number }
export interface FreeAssignment { index: number; puzzleId: string; policy: IssuancePolicy }
interface TrackIssuance { version: 2; since: number; issued: Record<string, IssuedBoard>; pin?: FreeAssignment }
export type FreeIssuance = Partial<Record<FreeTrack, TrackIssuance>>;

const shapes = new WeakMap<Puzzle, string>();
const shapeWindow = 3;

/** Canonical numeric-cell locations modulo translation, rotation and reflection. */
export function boardShape(puzzle: Puzzle): string {
  const cached = shapes.get(puzzle);
  if (cached !== undefined) return cached;
  const keys = Array.from({length:8},(_,transform)=>{
    const points = puzzle.cells.map(({x,y})=>{
      if (transform & 1) [x,y]=[y,x];
      return [transform & 2 ? -x : x, transform & 4 ? -y : y] as const;
    });
    const left=Math.min(...points.map(([x])=>x)),top=Math.min(...points.map(([,y])=>y));
    return points.map(([x,y])=>`${x-left},${y-top}`).sort().join(';');
  });
  const canonical=keys.sort()[0]!;
  shapes.set(puzzle,canonical);
  return canonical;
}

export function selectPilotPuzzle(
  pool: readonly Puzzle[], solvedIds: readonly string[], index: number, issued: Readonly<Record<string,IssuedBoard>>,
): Puzzle | undefined {
  if (pool.length <= 1) return pool[0];
  const solved = new Set(solvedIds);
  const unsolved = pool.filter(puzzle=>!solved.has(puzzle.puzzleId));
  const eligible = unsolved.length ? unsolved : pool;
  const count = (puzzle:Puzzle)=>issued[puzzle.puzzleId]?.count ?? 0;
  const minimum = Math.min(...eligible.map(count));
  const tier = eligible.filter(puzzle=>count(puzzle)===minimum);

  const seenShapes = new Map<string,number>();
  for (const [id,entry] of Object.entries(issued)) {
    const shape=boardShape(getPuzzle(id));
    seenShapes.set(shape,Math.max(seenShapes.get(shape)??-1,entry.lastIndex));
  }
  const lastShape = (puzzle:Puzzle)=>seenShapes.get(boardShape(puzzle)) ?? -Infinity;
  const novel = tier.filter(puzzle=>index-lastShape(puzzle)>shapeWindow);
  const oldest = Math.min(...tier.map(lastShape));
  const candidates = novel.length ? novel : tier.filter(puzzle=>lastShape(puzzle)===oldest);
  const frequency = new Map<string,number>();
  for (const puzzle of candidates) {
    const shape=boardShape(puzzle);
    frequency.set(shape,(frequency.get(shape)??0)+1);
  }
  const size = (puzzle:Puzzle)=>frequency.get(boardShape(puzzle))!;
  const last = (puzzle:Puzzle)=>issued[puzzle.puzzleId]?.lastIndex ?? -1;
  return candidates.sort((a,b)=>size(b)-size(a) || last(a)-last(b) || b.campaignPosition-a.campaignPosition ||
    (a.puzzleId < b.puzzleId ? -1 : Number(a.puzzleId > b.puzzleId)))[0];
}

export function resolveFreeAssignment(save: Save, track: FreeTrack, policy = buildIssuancePolicy(), currentOnly = false): FreeAssignment | undefined {
  const {meta} = save;
  const index = meta.freeProgress?.[track] ?? 0;
  const journal = meta.freeIssuance?.[track];
  const pin = journal?.pin?.index === index ? journal.pin : undefined;
  const saved = meta.activeSlot === 'free' ? save.attempt : meta.inactive.free?.attempt;
  if (saved?.status === 'playing' && saved.freeTrack === track && (!currentOnly || saved.freeIndex===index)) {
    return pin?.puzzleId===saved.puzzleId && pin.index===saved.freeIndex ? pin
      : {index:saved.freeIndex!,puzzleId:saved.puzzleId,policy:'legacy'};
  }
  if (pin) return pin;
  const pool = freeTrackBucket(track,index);
  if (!pool.length) return;
  const solved = save.profile.solvedIds;
  const puzzle = policy === pilotIssuancePolicy ? selectPilotPuzzle(pool,solved,index,journal?.issued ?? {})
    : newFreeTrackPuzzle(track,index,solved);
  if (puzzle) return {index,puzzleId:puzzle.puzzleId,policy};
}

/** Called only on the snapshot that will be committed with the new Free attempt. */
export function pinFreeAssignment(meta: MetaState, track: FreeTrack, assignment: FreeAssignment): void {
  const tracks = meta.freeIssuance ??= {};
  const state = tracks[track] ??= {version:2,since:assignment.index,issued:{}};
  if (state.pin?.index === assignment.index && state.pin.puzzleId === assignment.puzzleId) return;
  state.pin = assignment;
  if (assignment.policy === pilotIssuancePolicy) {
    const previous=state.issued[assignment.puzzleId];
    state.issued[assignment.puzzleId]={count:(previous?.count??0)+1,lastIndex:assignment.index};
  }
}

export function preserveFreeAssignment(save: Save, attempt: Attempt | undefined): void {
  if (!attempt?.freeTrack || attempt.status!=='playing') return;
  if (attempt.freeIndex!==(save.meta.freeProgress?.[attempt.freeTrack]??0)) return;
  const assignment = resolveFreeAssignment(save,attempt.freeTrack);
  if (assignment) pinFreeAssignment(save.meta,attempt.freeTrack,assignment);
}

export function closeFreeAssignment(meta: MetaState, track: FreeTrack, index: number): void {
  const state=meta.freeIssuance?.[track];
  if (state?.pin?.index === index) delete state.pin;
}

export function validateFreeIssuance(meta: MetaState): void {
  if (meta.freeIssuance === undefined) return;
  const fail=()=>{throw Error('Corrupt Free assignment history');};
  const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
  if (!meta.freeIssuance || typeof meta.freeIssuance!=='object' || Array.isArray(meta.freeIssuance)) fail();
  for (const [track,state] of Object.entries(meta.freeIssuance)) {
    if (!isFreeTrack(track)) throw Error('Unknown Free assignment track');
    const cursor = meta.freeProgress?.[track] ?? 0;
    if (!state || state.version!==2 || !integer(state.since) || state.since>cursor || !state.issued || typeof state.issued!=='object' || Array.isArray(state.issued)) fail();
    let assigned = 0;
    const positions = new Set<number>();
    for (const [id,record] of Object.entries(state.issued)) {
      const {bucket} = getPuzzle(id);
      if (!bucket || !rotations[track].some(entry=>entry===bucket) || !record || !integer(record.count) || !record.count ||
          !integer(record.lastIndex) || record.lastIndex<state.since || record.lastIndex>cursor || positions.has(record.lastIndex) ||
          bucketTurn(track,record.lastIndex).bucket!==bucket) fail();
      assigned += record.count;
      positions.add(record.lastIndex);
    }
    if (assigned>cursor-state.since+1) fail();
    const {pin}=state;
    if (pin !== undefined && (!pin || !integer(pin.index) || pin.index<state.since || pin.index>cursor ||
        getPuzzle(pin.puzzleId).bucket!==bucketTurn(track,pin.index).bucket ||
        !['legacy',pilotIssuancePolicy].includes(pin.policy) ||
        pin.policy===pilotIssuancePolicy && state.issued[pin.puzzleId]?.lastIndex!==pin.index)) fail();
  }
}
