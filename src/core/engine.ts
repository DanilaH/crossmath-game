import { assertInventory, cellValue, evaluate, isSolved, tokenId, tokenValue } from './types';
import type { Attempt, Command, Layout, Mode, Puzzle } from './types';

export function createAttempt(puzzle: Puzzle, id: string, mode: Mode = 'campaign'): Attempt {
  return { id, puzzleId: puzzle.puzzleId, contentVersion: puzzle.contentVersion, rulesetVersion: puzzle.rulesetVersion,
    mode, placements: {}, trayOrder: puzzle.tray.map((_,i) => tokenId(i)), boardRevision: 0,
    history: [], commandIds: [], status: 'playing', lives: 3, assisted: false, hintsUsed: 0,
    elapsedPlaying: 0, userPaused: false, lastRejectedSignature: null };
}
const copyLayout = (s: Layout): Layout => ({ placements: {...s.placements}, trayOrder: [...s.trayOrder] });
export const valueSignature = (p: Puzzle, s: Layout): string => p.cells.filter(c => c.given === undefined).map(c => `${c.id}:${cellValue(p,s,c.id) ?? '_'}`).join('|');
export const expressionSignature = (p: Puzzle, s: Layout, index: number): string => p.equations[index]!.cells.map(id => cellValue(p,s,id) ?? '_').join(':');
export interface Transition { state: Attempt; outcome: 'applied' | 'duplicate' | 'stale_snapshot' | 'unavailable' | 'no_change'; cue: 'place' | 'right' | 'wrong' | 'win' | 'none' }

export function applyCommand(puzzle: Puzzle, state: Attempt, command: Command): Transition {
  const refused = (outcome: Transition['outcome']): Transition => ({state,outcome,cue:'none'});
  if (state.commandIds.includes(command.commandId)) return refused('duplicate');
  if (command.expectedRevision !== state.boardRevision) return refused('stale_snapshot');
  if (state.status !== 'playing' || state.userPaused) return refused('unavailable');
  const next = structuredClone(state);
  const target = (id: number): boolean => puzzle.cells.some(c => c.id === id && c.given === undefined);
  if (command.type === 'SubmitEndless') {
    if (state.mode !== 'endless' || Object.keys(state.placements).length !== puzzle.tray.length) return refused('unavailable');
    if (isSolved(puzzle,state)) next.status = 'won';
    else {
      const signature = valueSignature(puzzle,state);
      if (signature === state.lastRejectedSignature) return refused('no_change');
      next.lastRejectedSignature = signature; next.lives -= 1;
      if (next.lives === 0) next.status = 'out-of-lives';
    }
    next.commandIds.push(command.commandId);
    return {state:next,outcome:'applied',cue:next.status === 'won' ? 'win' : 'wrong'};
  }
  switch (command.type) {
    case 'PlaceFromTray':
      if (!target(command.cellId) || tokenValue(puzzle,command.tokenId) === undefined || Object.values(next.placements).includes(command.tokenId)) return refused('unavailable');
      next.placements[command.cellId] = command.tokenId; break;
    case 'MoveCell': {
      if (!target(command.from) || !target(command.to) || command.from === command.to) return refused('unavailable');
      const source = next.placements[command.from], other = next.placements[command.to];
      if (source === undefined) return refused('unavailable');
      delete next.placements[command.from]; next.placements[command.to] = source;
      if (other !== undefined) next.placements[command.from] = other;
      break;
    }
    case 'ReturnToTray':
      if (next.placements[command.cellId] === undefined) return refused('unavailable');
      delete next.placements[command.cellId]; break;
    case 'Undo': {
      const prior = next.history.pop(); if (!prior) return refused('unavailable');
      next.placements = prior.placements; next.trayOrder = prior.trayOrder; break;
    }
    case 'SortTray':
      next.trayOrder.sort((a,b) => tokenValue(puzzle,a)! - tokenValue(puzzle,b)!);
      if (next.trayOrder.every((t,i) => state.trayOrder[i] === t)) return refused('no_change');
      break;
  }
  if (command.type !== 'Undo') next.history.push(copyLayout(state));
  next.boardRevision += 1; next.commandIds.push(command.commandId); assertInventory(puzzle,next);
  const before = evaluate(puzzle,state), after = evaluate(puzzle,next);
  const wrong = after.some((v,i) => v === 'invalid' && (before[i] !== 'invalid' || expressionSignature(puzzle,state,i) !== expressionSignature(puzzle,next,i)));
  const ordinaryPlacement = !['Undo','SortTray','ReturnToTray'].includes(command.type);
  if (state.mode === 'daily' && ordinaryPlacement && wrong) { next.lives -= 1; if (next.lives === 0) next.status = 'out-of-lives'; }
  if (state.mode !== 'endless' && next.status === 'playing' && isSolved(puzzle,next)) next.status = 'won';
  const cue = next.status === 'won' ? 'win' : state.mode === 'endless' ? 'place' : wrong && ordinaryPlacement ? 'wrong' : after.some((v,i) => v === 'valid' && before[i] !== 'valid') ? 'right' : 'place';
  return {state:next,outcome:'applied',cue};
}

/** Only the verified help service may call this; payment is in the same save transaction. */
export function applyHelpLayout(puzzle: Puzzle, state: Attempt, layout: Layout, operationId: string): Attempt {
  assertInventory(puzzle,layout);
  const next = {...structuredClone(state), ...copyLayout(layout), boardRevision: state.boardRevision + 1,
    history: [...state.history,copyLayout(state)], commandIds: [...state.commandIds,operationId], assisted: true, hintsUsed: state.hintsUsed + 1};
  if (state.mode !== 'endless' && isSolved(puzzle,next)) next.status = 'won';
  return next;
}
