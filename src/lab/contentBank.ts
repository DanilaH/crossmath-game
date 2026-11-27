import raw from '../../docs/experiments/content03/banks.json';
import { parsePuzzle } from '../content/validator';
import type { Puzzle } from '../core/types';

/** Use the strict production topology validator without admitting lab IDs into its catalog. */
export function parseLabPuzzle(input: unknown): Puzzle {
  const board=input as Puzzle;
  if (!board || !/^cm-lab-17-(control7|easy9|daily|ops)-\d{3}(-mask\d+)?$/.test(board.puzzleId)) throw Error('Invalid laboratory ID');
  if (board.contentVersion!==2) throw Error('Invalid laboratory version');
  const valid=parsePuzzle({...board,puzzleId:'cm-own-02-999'});
  return {...valid,puzzleId:board.puzzleId};
}

export const labBanks={control7:raw.control7.map(parseLabPuzzle),easy9:raw.easy9.map(parseLabPuzzle),
  daily:raw.daily.map(parseLabPuzzle),ops:raw.ops.map(parseLabPuzzle)};
export type LabBank=keyof typeof labBanks;
export const labCatalog=new Map(Object.values(labBanks).flat().map(puzzle=>[puzzle.puzzleId,puzzle]));
