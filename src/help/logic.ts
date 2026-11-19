import { arithmetic, cellValue, tokenValue } from '../core/types';
import { countSolutions } from '../content/validator';
import type { Attempt, Equation, Puzzle } from '../core/types';

export interface Evidence { equationIndex: number; candidates: number[] }
export interface Assignment { cellId: number; value: number; evidence: Evidence[] }
export interface HintPlan {
  puzzleId: string; boardRevision: number; kind: 'explain' | 'reveal';
  rule: 'direct_result' | 'direct_inverse' | 'tray' | 'intersection' | 'reveal';
  assignments: Assignment[]; returns: number[];
}
export class HintBudgetExceeded extends Error {}
type Bag = Map<number,number>;
export const visiblePlacements = (p: Puzzle, a: Attempt): Record<string,number> => Object.fromEntries(Object.keys(a.placements).map(id => [id,cellValue(p,a,Number(id))!]));
function inventory(p: Puzzle, a: Attempt): Bag {
  const used = new Set(Object.values(a.placements)), bag:Bag = new Map();
  for (const t of a.trayOrder) if (!used.has(t)) { const v=tokenValue(p,t)!; bag.set(v,(bag.get(v) ?? 0)+1); }
  return bag;
}
function possibilities(p: Puzzle, a: Attempt, eq: Equation, bag: Bag, spend: () => void): number[][] {
  const rows:number[][]=[];
  const visit=(i:number,values:number[]):void => {
    spend();
    if (i === 3) { if (arithmetic(eq.op,values[0]!,values[1]!,values[2]!)) rows.push(values); return; }
    const known = cellValue(p,a,eq.cells[i]!);
    if (known !== undefined) { visit(i+1,[...values,known]); return; }
    for (const [v,n] of bag) if (n > 0) { bag.set(v,n-1); visit(i+1,[...values,v]); bag.set(v,n); }
  };
  visit(0,[]); return rows;
}
const intersection=(sets:number[][]):number[] => (sets[0] ?? []).filter(v => sets.every(s => s.includes(v)));

/** No answer data or authored trace can enter this API. All domains come from visible tokens. */
export function explain(p: Puzzle, a: Attempt, budget = p.contentVersion === 2 ? 160_000 : 40_000): HintPlan | null {
  if (a.status !== 'playing') return null;
  // Reject an inconsistent player hypothesis instead of teaching a conclusion from a false premise.
  const compatible=countSolutions(p,budget,visiblePlacements(p,a));
  if (compatible.exhausted || !compatible.count) return null;
  let remaining=budget;
  const spend=():void => { if (--remaining < 0) throw new HintBudgetExceeded(); };
  const bag=inventory(p,a), proposals: {priority:number; eq:number; assignment:Assignment; rule:HintPlan['rule']}[]=[];
  const supports=new Map<number,Evidence[]>();
  // Single-gap deductions have the highest priority. Find one before enumerating dense lines.
  for (const [index, eq] of p.equations.entries()) {
    const free = eq.cells.filter(id => cellValue(p,a,id) === undefined);
    if (free.length !== 1) continue;
    const cellId = free[0]!;
    const position = eq.cells.indexOf(cellId);
    const candidates = possibilities(p,a,eq,bag,() => {}).map(row => row[position]!);
    if (candidates.length === 1) return {
      puzzleId:p.puzzleId,boardRevision:a.boardRevision,kind:'explain',rule:position === 2 ? 'direct_result' : 'direct_inverse',
      assignments:[{cellId,value:candidates[0]!,evidence:[{equationIndex:index,candidates}]}],returns:[],
    };
  }
  try {
    p.equations.forEach((eq,index) => {
      const free=eq.cells.filter(id => cellValue(p,a,id) === undefined);
      if (!free.length) return;
      const rows=possibilities(p,a,eq,bag,spend);
      for (const cellId of free) {
        const position=eq.cells.indexOf(cellId), candidates=[...new Set(rows.map(row => row[position]!))].sort((x,y)=>x-y);
        const evidence={equationIndex:index,candidates}; supports.set(cellId,[...(supports.get(cellId) ?? []),evidence]);
        if (candidates.length === 1) proposals.push({priority:free.length === 1 ? 0 : 2,eq:index,rule:free.length === 1 ? position === 2 ? 'direct_result' : 'direct_inverse' : 'tray',assignment:{cellId,value:candidates[0]!,evidence:[evidence]}});
      }
    });
    for (const [cellId,evidence] of supports) if (evidence.length > 1 && evidence.every(e => e.candidates.length > 1)) {
      const common=intersection(evidence.map(e => e.candidates));
      if (common.length === 1) proposals.push({priority:1,eq:evidence[0]!.equationIndex,rule:'intersection',assignment:{cellId,value:common[0]!,evidence}});
    }
  } catch (error) { if (error instanceof HintBudgetExceeded) return null; throw error; }
  proposals.sort((x,y) => x.priority-y.priority || x.eq-y.eq || x.assignment.cellId-y.assignment.cellId);
  const first=proposals[0];
  return first ? {puzzleId:p.puzzleId,boardRevision:a.boardRevision,kind:'explain',rule:first.rule,assignments:[first.assignment],returns:[]} : null;
}

/** Separate enumeration and arithmetic from the proposer; never trusts candidate lists or prose. */
export function verifyExplanation(p: Puzzle, a: Attempt, plan: HintPlan, budget = p.contentVersion === 2 ? 200_000 : 80_000): boolean {
  if (plan.kind !== 'explain' || plan.rule === 'reveal' || plan.puzzleId !== p.puzzleId || plan.boardRevision !== a.boardRevision || plan.returns.length || !plan.assignments.length) return false;
  const feasible=countSolutions(p,budget,visiblePlacements(p,a));
  if (feasible.exhausted || !feasible.count) return false;
  const used=new Set(Object.values(a.placements)), freeTokens=a.trayOrder.filter(t => !used.has(t));
  const taken=new Set<string>(), assigned=new Set<number>(); let visits=0;
  for (const assignment of plan.assignments) {
    if (assigned.has(assignment.cellId) || cellValue(p,a,assignment.cellId) !== undefined || !p.cells.some(c => c.id === assignment.cellId)) return false;
    assigned.add(assignment.cellId);
    const token=freeTokens.find(t => !taken.has(t) && tokenValue(p,t) === assignment.value);
    if (!token) return false; taken.add(token);
    if (!assignment.evidence.length || new Set(assignment.evidence.map(e=>e.equationIndex)).size !== assignment.evidence.length) return false;
    const actualSets:number[][]=[];
    for (const evidence of assignment.evidence) {
      const eq=p.equations[evidence.equationIndex]; if (!eq || !eq.cells.includes(assignment.cellId)) return false;
      const unknown=eq.cells.filter(id => cellValue(p,a,id) === undefined);
      const candidates=new Set<number>();
      const enumerate=(i:number,selected:string[],values:Record<number,number>):void => {
        if (++visits > budget) throw new HintBudgetExceeded();
        if (i < unknown.length) { for (const t of freeTokens) if (!selected.includes(t)) enumerate(i+1,[...selected,t],{...values,[unknown[i]!]:tokenValue(p,t)!}); return; }
        const v=eq.cells.map(id => cellValue(p,a,id) ?? values[id]!);
        const valid=eq.op === '+' ? v[2]!-v[0]! === v[1]! : eq.op === '-' ? v[1]!+v[2]! === v[0]! : eq.op === '*' ? v[0]! !== 0 && v[2]!%v[0]! === 0 && v[2]!/v[0]! === v[1]! : v[1]! > 0 && v[0]!%v[1]! === 0 && v[0]!/v[1]! === v[2]!;
        if (valid) candidates.add(values[assignment.cellId]!);
      };
      try { enumerate(0,[],{}); } catch (error) { if (error instanceof HintBudgetExceeded) return false; throw error; }
      const actual=[...candidates].sort((x,y)=>x-y);
      if (JSON.stringify(actual) !== JSON.stringify(evidence.candidates)) return false;
      actualSets.push(actual);
      if (plan.rule === 'direct_result' && (unknown.length !== 1 || assignment.cellId !== eq.cells[2])) return false;
      if (plan.rule === 'direct_inverse' && (unknown.length !== 1 || assignment.cellId === eq.cells[2])) return false;
      if (plan.rule === 'tray' && unknown.length < 2) return false;
    }
    if (plan.rule === 'intersection' && (actualSets.length < 2 || actualSets.some(s => s.length < 2))) return false;
    const common=intersection(actualSets);
    if (common.length !== 1 || common[0] !== assignment.value) return false;
  }
  return true;
}
