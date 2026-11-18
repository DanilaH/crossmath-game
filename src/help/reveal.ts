// The answer boundary is intentionally isolated from the explanation service.
import answers from '../../docs/spec/product/content_v09/author_solutions.json';
import { cellValue, tokenValue } from '../core/types';
import type { Attempt, Layout, Puzzle } from '../core/types';
import type { HintPlan } from './logic';
const solutions: Readonly<Record<string,{answer:number[]}>> = answers;
export function reveal(p: Puzzle, a: Attempt, selectedCell?: number): HintPlan | null {
  const answer=solutions[p.puzzleId]?.answer; if (!answer || a.status !== 'playing') return null;
  const wrong=p.cells.filter(c => c.given === undefined && cellValue(p,a,c.id) !== answer[c.id]);
  const target=wrong.find(c => c.id === selectedCell) ?? wrong[0]; if (!target) return null;
  return {puzzleId:p.puzzleId,boardRevision:a.boardRevision,kind:'reveal',rule:'reveal',assignments:[{cellId:target.id,value:answer[target.id]!,evidence:[]}],returns:wrong.filter(c => a.placements[c.id] !== undefined).map(c=>c.id)};
}
export function materializeHelp(p: Puzzle, a: Attempt, plan: HintPlan): Layout | null {
  const placements={...a.placements};
  for (const cell of plan.returns) { if (!p.cells.some(c => c.id === cell && c.given === undefined)) return null; delete placements[cell]; }
  for (const assignment of plan.assignments) {
    if (!p.cells.some(c => c.id === assignment.cellId && c.given === undefined) || placements[assignment.cellId] !== undefined) return null;
    if (plan.kind === 'reveal' && solutions[p.puzzleId]?.answer[assignment.cellId] !== assignment.value) return null;
    const used=new Set(Object.values(placements));
    const token=a.trayOrder.find(t => !used.has(t) && tokenValue(p,t) === assignment.value);
    if (!token) return null; placements[assignment.cellId]=token;
  }
  if (plan.kind === 'reveal') for (const cell of plan.returns) {
    if (cellValue(p,a,cell) === solutions[p.puzzleId]?.answer[cell]) return null;
  }
  return {placements,trayOrder:[...a.trayOrder]};
}
