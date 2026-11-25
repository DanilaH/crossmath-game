import { tokenId } from '../core/types';
import type { Attempt, Operator, Puzzle } from '../core/types';
import type { DomainChange, DomainConstraint, DomainProof, DomainReduction, DomainRule } from './domainProof';

type Domains = Map<number, number[]>;
type Row = [number, number, number];
type Check = { contradiction: true } | { contradiction: false; changes: DomainChange[] };

function rightOperand(op: Operator, left: number, result: number): number {
  switch (op) {
    case '+': return result - left;
    case '-': return left - result;
    case '*': return result / left;
    case '/': return left / result;
  }
}

/** Replays the certificate independently. The proposer is never used as an oracle. */
export function verifyDomainProof(
  puzzle: Puzzle, attempt: Attempt, proof: DomainProof, rule: DomainRule, target: number, answer: number,
  spend: (units?: number) => void,
): boolean {
  if (!Array.isArray(proof?.steps) || !proof.steps.length) return false;
  const used = new Set(Object.values(attempt.placements));
  const capacity = new Map<number,number>();
  puzzle.tray.forEach((value,index) => {
    if (!used.has(tokenId(index))) capacity.set(value,(capacity.get(value) ?? 0)+1);
  });
  const available = [...capacity.keys()].sort((a,b) => a-b);
  const fixed = new Map<number,number>();
  const domains: Domains = new Map();
  for (const {id,given} of puzzle.cells) {
    const token = attempt.placements[id];
    const known = given ?? (token === undefined ? undefined : puzzle.tray[Number(token.slice(1))]);
    if (known === undefined) domains.set(id,available);
    else fixed.set(id,known);
  }
  spend(domains.size * available.length);
  if (!domains.has(target) || !capacity.has(answer)) return false;
  const rowsByEquation = new Map<number,Row[]>();

  // Index tuples from the left operand and result. Reconstruct physical capacity from token IDs.
  function equationRows(index: number): Row[] {
    const cached = rowsByEquation.get(index);
    if (cached) return cached;
    const {cells,op} = puzzle.equations[index]!;
    const [leftId,rightId,resultId] = cells;
    const choices = (id: number) => fixed.has(id) ? [fixed.get(id)!] : available;
    const rightChoices = new Set(choices(rightId)), rows: Row[] = [];
    for (const left of choices(leftId)) for (const result of choices(resultId)) {
      spend();
      const right = rightOperand(op,left,result);
      if (!rightChoices.has(right)) continue;
      const row: Row = [left,right,result], required = new Map<number,number>();
      cells.forEach((id,i) => {
        if (!fixed.has(id)) required.set(row[i]!, (required.get(row[i]!) ?? 0)+1);
      });
      if ([...required].every(([value,count]) => count <= (capacity.get(value) ?? 0))) rows.push(row);
    }
    rowsByEquation.set(index,rows);
    return rows;
  }

  function check(current: Domains, constraint: DomainConstraint): Check | undefined {
    if (constraint?.type === 'equation') {
      const {equationIndex} = constraint;
      if (!Number.isInteger(equationIndex) || !puzzle.equations[equationIndex]) return undefined;
      const {cells} = puzzle.equations[equationIndex]!, rows = equationRows(equationIndex);
      spend(1 + rows.length);
      const candidates = rows.filter(row => cells.every((id,i) => current.get(id)?.includes(row[i]!) ?? true));
      if (!candidates.length) return {contradiction:true};
      const changes: DomainChange[] = [];
      for (const [i,cellId] of cells.entries()) {
        const domain = current.get(cellId);
        if (!domain) continue;
        const supported = new Set(candidates.map(row => row[i]!));
        const values = domain.filter(v => supported.has(v));
        if (values.length < domain.length) changes.push({cellId,values});
      }
      return {contradiction:false,changes};
    }
    if (constraint?.type !== 'inventory' || !capacity.has(constraint.value)) return undefined;
    spend(1 + current.size);
    const {value} = constraint, limit = capacity.get(value)!;
    const matching = [...current].filter(([,list]) => list.includes(value));
    const singletons = matching.reduce((count,[,domain]) => count + Number(domain.length === 1),0);
    if (singletons > limit || matching.length < limit) return {contradiction:true};
    const changes: DomainChange[] = [];
    for (const [cellId,domain] of matching) {
      if (domain.length === 1) continue;
      if (singletons === limit) changes.push({cellId,values:domain.filter(v => v !== value)});
      else if (matching.length === limit) changes.push({cellId,values:[value]});
    }
    return {contradiction:false,changes};
  }

  function replay(current: Domains, reduction: DomainReduction): boolean {
    const actual = check(current,reduction);
    if (!actual || actual.contradiction || !actual.changes.length || !Array.isArray(reduction.changes)
      || reduction.changes.length !== actual.changes.length) return false;
    for (const [i,expected] of actual.changes.entries()) {
      const supplied = reduction.changes[i];
      if (supplied?.cellId !== expected.cellId || !Array.isArray(supplied.values) || supplied.values.length !== expected.values.length
        || !expected.values.every((value,j) => value === supplied.values[j])) return false;
    }
    for (const {cellId,values} of actual.changes) current.set(cellId,values);
    return true;
  }

  let rejected = false;
  for (const step of proof.steps) {
    spend();
    if (step?.type !== 'exclude') {
      if (!replay(domains,step)) return false;
      continue;
    }
    const {cellId,value,reductions,contradiction} = step, domain = domains.get(cellId);
    if (!domain || domain.length < 2 || !domain.includes(value) || !Array.isArray(reductions)) return false;
    spend(domains.size);
    const branch = new Map(domains);
    branch.set(cellId,[value]);
    for (const reduction of reductions) {
      if (!replay(branch,reduction)) return false;
    }
    if (check(branch,contradiction)?.contradiction !== true) return false;
    domains.set(cellId,domain.filter(v => v !== value));
    rejected = true;
  }
  const conclusion = domains.get(target)!;
  return rejected === (rule === 'contradiction') && conclusion.length === 1 && conclusion[0] === answer;
}
