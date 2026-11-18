export type Difficulty = 'easy' | 'standard' | 'hard' | 'expert';
export type Operator = '+' | '-' | '*' | '/';
export interface Cell { readonly id: number; readonly x: number; readonly y: number; readonly given?: number }
export interface Equation { readonly cells: readonly [number, number, number]; readonly op: Operator }
export interface Puzzle {
  readonly puzzleId: string; readonly contentVersion: number; readonly rulesetVersion: string;
  readonly width: number; readonly height: number; readonly cells: readonly Cell[];
  readonly equations: readonly Equation[]; readonly tray: readonly number[];
  readonly difficulty: Difficulty; readonly campaignPosition: number; readonly decisionTags: readonly string[];
}
export type Placements = Record<string, string>;
export type Mode = 'campaign' | 'free' | 'daily' | 'endless';
export interface Layout { placements: Placements; trayOrder: string[] }
export interface Attempt extends Layout {
  id: string; puzzleId: string; contentVersion: number; rulesetVersion: string; mode: Mode;
  boardRevision: number; history: Layout[]; commandIds: string[];
  status: 'playing' | 'won' | 'out-of-lives'; lives: number; assisted: boolean;
  hintsUsed: number; elapsedPlaying: number; userPaused: boolean; lastRejectedSignature: string | null;
}
export type BoardAction =
  | { type: 'PlaceFromTray'; tokenId: string; cellId: number }
  | { type: 'MoveCell'; from: number; to: number }
  | { type: 'ReturnToTray'; cellId: number }
  | { type: 'Undo' } | { type: 'SortTray' } | { type: 'SubmitEndless' };
export type Command = BoardAction & { commandId: string; expectedRevision: number };
export type EquationState = 'neutral' | 'valid' | 'invalid';
export const tokenId = (index: number): string => `t${index}`;
export function tokenValue(puzzle: Puzzle, id: string): number | undefined {
  return /^t(0|[1-9]\d*)$/.test(id) ? puzzle.tray[Number(id.slice(1))] : undefined;
}
export function cellValue(puzzle: Puzzle, state: Layout, id: number): number | undefined {
  const cell = puzzle.cells.find(c => c.id === id);
  return cell?.given ?? (state.placements[id] === undefined ? undefined : tokenValue(puzzle, state.placements[id]!));
}
export function arithmetic(op: Operator, a: number, b: number, c: number): boolean {
  switch (op) { case '+': return a + b === c; case '-': return a - b === c;
    case '*': return a * b === c; case '/': return b > 0 && a === b * c; }
}
export function evaluate(puzzle: Puzzle, state: Layout): EquationState[] {
  return puzzle.equations.map(eq => {
    const [a,b,c] = eq.cells.map(id => cellValue(puzzle,state,id));
    return a === undefined || b === undefined || c === undefined ? 'neutral' : arithmetic(eq.op,a,b,c) ? 'valid' : 'invalid';
  });
}
export function isSolved(puzzle: Puzzle, state: Layout): boolean {
  return Object.keys(state.placements).length === puzzle.tray.length && evaluate(puzzle,state).every(v => v === 'valid');
}
export function assertInventory(puzzle: Puzzle, layout: Layout): void {
  const tokens = puzzle.tray.map((_,i) => tokenId(i));
  if (layout.trayOrder.length !== tokens.length || new Set(layout.trayOrder).size !== tokens.length || layout.trayOrder.some(t => !tokens.includes(t))) throw Error('Invalid tray order');
  const placed = Object.values(layout.placements);
  if (new Set(placed).size !== placed.length || placed.some(t => !tokens.includes(t))) throw Error('Invalid token inventory');
  for (const id of Object.keys(layout.placements)) {
    const cell = puzzle.cells.find(c => String(c.id) === id);
    if (!cell || cell.given !== undefined) throw Error('Invalid placement target');
  }
}
