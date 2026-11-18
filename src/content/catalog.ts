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
const byId = new Map(boards.map(p => [p.puzzleId,p]));
if (boards.length !== 240 || byId.size !== 240 || routes.campaignSequence.length !== 240 || new Set(routes.campaignSequence).size !== 240) throw Error('Incomplete campaign');
for (const id of [...routes.campaignSequence,...routes.dailySequence,...routes.endlessSequence,...Object.values(routes.freePlayPools).flat()]) if (!byId.has(id)) throw Error('Unknown routed puzzle');
export function getPuzzle(id: string): Puzzle { const puzzle=byId.get(id); if (!puzzle) throw Error(`Unavailable puzzle: ${id}`); return puzzle; }
export function campaignPuzzle(index: number): Puzzle { const id=routes.campaignSequence[index]; if (!id) throw Error('Campaign complete'); return getPuzzle(id); }
