import { cellValue } from '../core/types';
import type { Attempt, Operator, Puzzle } from '../core/types';
import type { DomainChange, DomainConstraint, DomainProof, DomainReduction, DomainRule } from './domainProof';

type Domains = Map<number, Set<number>>;
type Row = [number, number, number];
type Spend = (units?: number) => void;

function resultOf(op: Operator, left: number, right: number): number {
  switch (op) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
  }
}

/** Builds a certificate from public positions and a multiset of unused tiles. */
export function proposeDomainStep(puzzle: Puzzle, attempt: Attempt, bag: ReadonlyMap<number, number>, spend: Spend) {
  if (!bag.size) return null;
  const values = [...bag.keys()].sort((a,b) => a-b);
  const fixed = new Map(puzzle.cells.map(cell => [cell.id, cellValue(puzzle, attempt, cell.id)]));
  const ids = puzzle.cells.filter(cell => fixed.get(cell.id) === undefined).map(cell => cell.id);
  spend(ids.length * values.length);
  const domains: Domains = new Map(ids.map(id => [id, new Set(values)]));
  const tables = puzzle.equations.map(({cells,op}) => {
    const known = cells.map(id => fixed.get(id));
    const rows: Row[] = [];
    for (const left of known[0] === undefined ? values : [known[0]]) {
      for (const right of known[1] === undefined ? values : [known[1]]) {
        spend();
        const result = resultOf(op,left,right);
        if (known[2] !== undefined ? result !== known[2] : !bag.has(result)) continue;
        const row: Row = [left,right,result];
        const used = row.filter((_,i) => known[i] === undefined);
        if (used.every(value => used.filter(v => v === value).length <= (bag.get(value) ?? 0))) rows.push(row);
      }
    }
    return rows;
  });

  function close(current: Domains, reductions: DomainReduction[]): DomainConstraint | undefined {
    let changed: boolean;
    do {
      changed = false;
      const record = (constraint: DomainConstraint, changes: DomainChange[]) => {
        if (!changes.length) return;
        for (const {cellId, values} of changes) current.set(cellId, new Set(values));
        reductions.push({...constraint, changes});
        changed = true;
      };
      for (const [equationIndex,{cells}] of puzzle.equations.entries()) {
        const constraint = {type:'equation',equationIndex} as const;
        const rows = tables[equationIndex]!;
        spend(1 + rows.length);
        const allowed = cells.map(() => new Set<number>());
        let supported = false;
        for (const row of rows) {
          if (!cells.every((cell,i) => !current.has(cell) || current.get(cell)!.has(row[i]!))) continue;
          supported = true;
          row.forEach((value,i) => allowed[i]!.add(value));
        }
        if (!supported) return constraint;
        const changes: DomainChange[] = [];
        cells.forEach((cellId,i) => {
          const old = current.get(cellId);
          if (!old) return;
          const values = [...old].filter(value => allowed[i]!.has(value));
          if (values.length !== old.size) changes.push({cellId,values});
        });
        record(constraint, changes);
      }
      for (const [value,capacity] of bag) {
        spend(1 + ids.length);
        const constraint = {type:'inventory',value} as const;
        const possible = ids.filter(id => current.get(id)!.has(value));
        const forced = possible.filter(id => current.get(id)!.size === 1);
        if (forced.length > capacity || possible.length < capacity) return constraint;
        const flexible = possible.filter(id => current.get(id)!.size > 1);
        if (forced.length === capacity) {
          record(constraint, flexible.map(cellId => ({cellId, values:[...current.get(cellId)!].filter(v => v !== value)})));
        } else if (possible.length === capacity) {
          record(constraint, flexible.map(cellId => ({cellId, values:[value]})));
        }
      }
    } while (changed);
    return undefined;
  }

  const initial: DomainReduction[] = [];
  if (close(domains,initial)) return null;
  const proof: DomainProof = {steps:initial};
  const singleton = (rule: DomainRule) => {
    const cellId = ids.find(id => domains.get(id)!.size === 1);
    return cellId === undefined ? null : {cellId,value:[...domains.get(cellId)!][0]!,rule,proof};
  };
  const direct = singleton('propagation');
  if (direct) return direct;

  // Every branch starts from the current proven domains. Branches never create nested assumptions.
  const probeOrder = [...ids].sort((a,b) => domains.get(a)!.size-domains.get(b)!.size || a-b);
  for (const cellId of probeOrder) {
    for (const value of domains.get(cellId)!) {
      if (!domains.get(cellId)!.has(value)) continue;
      spend(1 + ids.length);
      const branch: Domains = new Map(domains);
      branch.set(cellId,new Set([value]));
      const reductions: DomainReduction[] = [];
      const contradiction = close(branch,reductions);
      if (!contradiction) continue;
      proof.steps.push({type:'exclude',cellId,value,reductions,contradiction});
      domains.set(cellId,new Set([...domains.get(cellId)!].filter(v => v !== value)));
      const following: DomainReduction[] = [];
      if (close(domains,following)) return null;
      proof.steps.push(...following);
      const conclusion = singleton('contradiction');
      if (conclusion) return conclusion;
    }
  }
  return null;
}
