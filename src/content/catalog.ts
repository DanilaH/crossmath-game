import tunedBoards from '../../docs/spec/product/content_v2/boards.json';
import { bankIndex, buckets, bucketTurn } from './rotation';
import type { ContentVersion, FreeTrack } from './rotation';
import rawBoards from '../../docs/spec/product/content_v09/boards.json';
import rawRoutes from '../../docs/spec/product/content_v09/routes.json';
import balance from '../../docs/spec/product/meta_v08/config.json';
import { parsePuzzle } from './validator';
import type { Puzzle } from '../core/types';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}
export const boards: readonly Puzzle[] = deepFreeze(rawBoards.map(parsePuzzle));
export const routes = deepFreeze(rawRoutes);
export const config = deepFreeze(balance);
const legacyById = new Map(boards.map(p => [p.puzzleId,p]));
if (boards.length !== 240 || legacyById.size !== 240 || routes.campaignSequence.length !== 240 || new Set(routes.campaignSequence).size !== 240) throw Error('Incomplete campaign');
for (const id of [...routes.campaignSequence,...routes.dailySequence,...routes.endlessSequence,...Object.values(routes.freePlayPools).flat()]) if (!legacyById.has(id)) throw Error('Unknown routed puzzle');
const newBank = tunedBoards.map(parsePuzzle);
const pools = new Map(buckets.map(bucket => [bucket, newBank.filter(puzzle => puzzle.bucket === bucket)]));
const trackPuzzle = (track: FreeTrack, index: number): Puzzle => {
  const {bucket, turn} = bucketTurn(track, index);
  const pool = pools.get(bucket)!;
  return pool[bankIndex(turn, pool.length)]!;
};
const tunedCampaign = [
  ...routes.campaignSequence.slice(0, 15),
  ...Array.from({length: 120}, (_, index) => trackPuzzle('relax', index).puzzleId),
  ...Array.from({length: 105}, (_, index) => trackPuzzle('challenge', index).puzzleId),
];
if (new Set(tunedCampaign).size !== 240 || new Set(newBank.map(puzzle => puzzle.puzzleId)).size !== 275 || newBank.length !== 275 || pools.get('daily')?.length !== 50) {
  throw Error('Incomplete content-v2 bank');
}
for (const [index, id] of tunedCampaign.entries()) {
  const puzzle = newBank.find(entry => entry.puzzleId === id);
  if (puzzle && puzzle.campaignPosition !== index + 1) throw Error('Inconsistent content-v2 campaign position');
}
export const referenceBoards: readonly Puzzle[] = deepFreeze(newBank);
const byId = new Map([...boards, ...referenceBoards].map(puzzle => [puzzle.puzzleId, puzzle]));
const latestCampaign = deepFreeze(tunedCampaign);
export const campaignSequence = (version: ContentVersion): readonly string[] => version === 'content-v2' ? latestCampaign : routes.campaignSequence;
export const freeTrackPuzzle = (track: FreeTrack, index: number): Puzzle => trackPuzzle(track, index);
export const freeAssignmentVersion = 1;

export function newFreeTrackPuzzle(track: FreeTrack, index: number, solvedIds: readonly string[]): Puzzle {
  const pool = pools.get(bucketTurn(track, index).bucket)!;
  const solved = new Set(solvedIds);
  let latest: Puzzle | undefined;
  for (const puzzle of pool) {
    if (!solved.has(puzzle.puzzleId) && (!latest || puzzle.campaignPosition > latest.campaignPosition)) latest = puzzle;
  }
  return latest ?? freeTrackPuzzle(track, index);
}
export const dailyBank = deepFreeze(pools.get('daily')!.map(puzzle => puzzle.puzzleId));
export const dailyVersion = 'calendar-v2';
export function getPuzzle(id: string): Puzzle { const puzzle=byId.get(id); if (!puzzle) throw Error(`Unavailable puzzle: ${id}`); return puzzle; }
export function campaignPuzzle(index: number, version: ContentVersion = 'content-v2'): Puzzle { const id=campaignSequence(version)[index]; if (!id) throw Error('Campaign complete'); return getPuzzle(id); }
