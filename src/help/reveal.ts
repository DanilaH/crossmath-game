// The answer boundary is intentionally isolated from the explanation service.
import newAnswers from '../../docs/spec/product/content_v2/author_solutions.json';
import answers from '../../docs/spec/product/content_v09/author_solutions.json';
// Frozen public IDs only: no laboratory catalog or answer dependency in Explain.
import additionalAnswers from '../content/additionalAnswers.json';
import { cellValue, tokenValue } from '../core/types';
import type { Attempt, Layout, Puzzle } from '../core/types';
import type { HintPlan } from './logic';
const solutions: Readonly<Record<string,{answer:number[]}>> = {...answers, ...newAnswers, ...additionalAnswers};

function revealReturns(p: Puzzle, a: Attempt, target: number, answer: readonly number[]): number[] | null {
  const value = answer[target];
  const returns = a.placements[target] === undefined ? [] : [target];
  const placed = new Set(Object.values(a.placements));
  if (a.trayOrder.some(token => !placed.has(token) && tokenValue(p,token) === value)) return returns;
  const source = p.cells.find(cell => cell.id !== target && a.placements[cell.id] !== undefined &&
    answer[cell.id] !== value && tokenValue(p,a.placements[cell.id]!) === value);
  return source ? [...returns,source.id] : null;
}

export function reveal(p: Puzzle, a: Attempt, selectedCell?: number): HintPlan | null {
  const answer = solutions[p.puzzleId]?.answer;
  if (!answer || a.status !== 'playing') return null;
  const wrong = p.cells.filter(c => c.given === undefined && cellValue(p,a,c.id) !== answer[c.id]);
  const target = wrong.find(c => c.id === selectedCell) ?? wrong[0];
  if (!target) return null;
  const returns = revealReturns(p,a,target.id,answer);
  return returns && {attemptId:a.id,puzzleId:p.puzzleId,boardRevision:a.boardRevision,kind:'reveal',rule:'reveal',
    assignments:[{cellId:target.id,value:answer[target.id]!,evidence:[]}],returns};
}
export function materializeHelp(p: Puzzle, a: Attempt, plan: HintPlan): Layout | null {
  if (plan.kind === 'reveal') {
    const assignment = plan.assignments[0];
    if (plan.rule !== 'reveal' || plan.assignments.length !== 1 || !assignment) return null;
    const expected = reveal(p,a,assignment.cellId);
    if (!expected || expected.assignments[0]!.cellId !== assignment.cellId || expected.assignments[0]!.value !== assignment.value ||
        expected.returns.length !== plan.returns.length || expected.returns.some((cell,index) => cell !== plan.returns[index])) return null;
  }
  const placements={...a.placements};
  for (const cell of plan.returns) { if (!p.cells.some(c => c.id === cell && c.given === undefined)) return null; delete placements[cell]; }
  for (const assignment of plan.assignments) {
    if (!p.cells.some(c => c.id === assignment.cellId && c.given === undefined) || placements[assignment.cellId] !== undefined) return null;
    const used=new Set(Object.values(placements));
    const token=a.trayOrder.find(t => !used.has(t) && tokenValue(p,t) === assignment.value);
    if (!token) return null; placements[assignment.cellId]=token;
  }
  return {placements,trayOrder:[...a.trayOrder]};
}
