import { buckets } from './rotation';
import type { Bucket } from './rotation';
import type { Puzzle, Equation, Operator } from '../core/types';

function requireThat(condition: unknown, message: string): asserts condition { if (!condition) throw Error(message); }
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const record = (v: unknown): v is Record<string,unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export function parsePuzzle(input: unknown): Puzzle {
  requireThat(record(input),'Puzzle must be an object');
  requireThat(typeof input.puzzleId === 'string' && /^cm-own-0[123]-\d{3}$/.test(input.puzzleId),'Invalid puzzle ID');
  requireThat((input.contentVersion === 1 || input.contentVersion === 2 || input.contentVersion === 3) && input.puzzleId.startsWith(`cm-own-0${input.contentVersion}-`) && input.rulesetVersion === 'cm-integer-1','Unsupported content/rules version');
  requireThat(['easy','standard','hard','expert'].includes(String(input.difficulty)),'Invalid difficulty');
  requireThat(input.contentVersion === 1 ? input.bucket === undefined : buckets.includes(input.bucket as Bucket), 'Invalid bucket');
  const bound = input.contentVersion !== 1 ? 13 : 11;
  requireThat(integer(input.campaignPosition) && input.campaignPosition > 0,'Invalid campaign position');
  requireThat(Array.isArray(input.decisionTags) && input.decisionTags.every(x => typeof x === 'string'),'Invalid tags');
  requireThat(!['answer','solution','steps'].some(k => k in input),'Hidden solution in public puzzle');
  requireThat(integer(input.width) && input.width >= 1 && input.width <= bound && integer(input.height) && input.height >= 1 && input.height <= bound,'Invalid bounds');
  requireThat(Array.isArray(input.cells) && input.cells.length > 0 && Array.isArray(input.equations) && input.equations.length > 0 && Array.isArray(input.tray),'Missing board arrays');
  const positions = new Set<string>(); const glyphs = new Map<string,string>();
  for (const [id,cell] of input.cells.entries()) {
    requireThat(record(cell) && Object.keys(cell).every(k => ['id','x','y','given'].includes(k)),'Invalid cell');
    requireThat(cell.id === id && integer(cell.x) && cell.x >= 0 && cell.x < input.width && integer(cell.y) && cell.y >= 0 && cell.y < input.height,'Invalid cell geometry');
    requireThat(cell.given === undefined || integer(cell.given) && cell.given >= 1 && cell.given <= 99,'Invalid given');
    const pos = `${cell.x},${cell.y}`; requireThat(!positions.has(pos),'Duplicate cell coordinate'); positions.add(pos); glyphs.set(pos,'N');
  }
  requireThat(input.tray.every(v => integer(v) && v >= 1 && v <= 99),'Invalid tray values');
  const puzzle = input as unknown as Puzzle;
  requireThat(puzzle.tray.length === puzzle.cells.filter(c => c.given === undefined).length,'Tray size mismatch');
  requireThat(Math.min(...puzzle.cells.map(c => c.x)) === 0 && Math.min(...puzzle.cells.map(c => c.y)) === 0 && Math.max(...puzzle.cells.map(c => c.x)) + 1 === puzzle.width && Math.max(...puzzle.cells.map(c => c.y)) + 1 === puzzle.height,'Unnormalized geometry');
  const sequences = new Set<string>(), used = new Set<number>();
  for (const raw of input.equations) {
    requireThat(record(raw) && Array.isArray(raw.cells) && raw.cells.length === 3 && raw.cells.every(id => integer(id) && puzzle.cells[id] !== undefined),'Unsupported expression grammar');
    requireThat(['+','-','*','/'].includes(String(raw.op)),'Unsupported operation');
    const eq = raw as unknown as Equation;
    const [a,b,c] = eq.cells.map(id => puzzle.cells[id]!);
    const dx = b!.x - a!.x, dy = b!.y - a!.y;
    requireThat((dx === 2 && dy === 0 || dx === 0 && dy === 2) && c!.x === b!.x + dx && c!.y === b!.y + dy,'Expression must run right/down');
    const sequence = Array.from({length:5},(_,i) => `${a!.x + i*dx/2},${a!.y + i*dy/2}`).join(';');
    requireThat(!sequences.has(sequence),'Duplicate equation'); sequences.add(sequence);
    for (const id of eq.cells) used.add(id);
    for (const i of [1,3]) { const pos = `${a!.x + i*dx/2},${a!.y + i*dy/2}`; requireThat(!glyphs.has(pos),'Overlapping glyphs'); glyphs.set(pos,i === 1 ? eq.op : '='); }
  }
  requireThat(used.size === puzzle.cells.length,'Unreferenced numeric cell');
  const found = new Set<string>();
  for (const pos of glyphs.keys()) {
    const [x,y] = pos.split(',').map(Number) as [number,number];
    for (const [dx,dy] of [[1,0],[0,1]] as const) {
      if (glyphs.has(`${x-dx},${y-dy}`)) continue;
      const line: string[] = []; let xx=x, yy=y;
      while (glyphs.has(`${xx},${yy}`)) { line.push(`${xx},${yy}`); xx+=dx; yy+=dy; }
      if (line.length > 1) found.add(line.join(';'));
    }
  }
  requireThat(found.size === sequences.size && [...found].every(s => sequences.has(s)),'Unintended visible expression');
  const reached = new Set<string>(), queue = [[...glyphs.keys()][0]!];
  while (queue.length) {
    const pos=queue.pop()!; if (reached.has(pos)) continue; reached.add(pos);
    const [x,y]=pos.split(',').map(Number) as [number,number];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const n=`${x+dx!},${y+dy!}`; if (glyphs.has(n) && !reached.has(n)) queue.push(n); }
  }
  requireThat(reached.size === glyphs.size,'Disconnected board');
  return puzzle;
}

// Independent search: equation-first enumeration, value-counted physical bag, stop at solution 2.
// Neither author_solutions nor the help engine is imported here.
function satisfies(op: Operator, a: number, b: number, c: number): boolean {
  if (op === '+') return c-a === b;
  if (op === '-') return b+c === a;
  if (op === '*') return a !== 0 && c%a === 0 && c/a === b;
  return b > 0 && a%b === 0 && a/b === c;
}
export function countSolutions(puzzle: Puzzle, budget = 500_000, placements: Readonly<Record<string,number>> = {}): { count: number; exhausted: boolean } {
  let visits=0, exhausted=false, count=0;
  const known = new Map(puzzle.cells.filter(c => c.given !== undefined).map(c => [c.id,c.given!]));
  const bag = new Map<number,number>(); for (const v of puzzle.tray) bag.set(v,(bag.get(v) ?? 0)+1);
  for (const [id,value] of Object.entries(placements)) {
    const cell = puzzle.cells.find(c => String(c.id) === id);
    if (!cell || cell.given !== undefined || (bag.get(value) ?? 0) <= 0) return {count:0,exhausted:false};
    known.set(cell.id,value); bag.set(value,bag.get(value)!-1);
  }
  const domain = [...bag.keys()];
  const tables = puzzle.equations.map(eq => {
    const [left,middle,right] = eq.cells;
    const first = known.has(left) ? [known.get(left)!] : domain;
    const second = known.has(middle) ? [known.get(middle)!] : domain;
    const last = known.get(right);
    const rows: number[][] = [];
    for (const a of first) for (const b of second) {
      if (++visits > budget) {exhausted = true;return {cells:eq.cells,rows};}
      const c = last ?? (eq.op === '+' ? a+b : eq.op === '-' ? a-b : eq.op === '*' ? a*b : a/b);
      if ((last !== undefined || bag.has(c)) && satisfies(eq.op,a,b,c)) rows.push([a,b,c]);
    }
    return {cells:eq.cells,rows};
  });
  const search = (): void => {
    if (count >= 2 || exhausted) return;
    let best: {free:number[]; rows:number[][]} | undefined;
    for (const table of tables) {
      const free = table.cells.filter(id => !known.has(id));
      const rows: number[][] = [];
      for (const row of table.rows) {
        if (++visits > budget) {exhausted = true;return;}
        const needed: number[] = [];
        const compatible = table.cells.every((id,i) => {
          const value = row[i]!;
          if (known.has(id)) return known.get(id) === value;
          const copies = 1 + needed.filter(n => n === value).length;
          needed.push(value);
          return (bag.get(value) ?? 0) >= copies;
        });
        if (compatible) rows.push(needed);
      }
      if (!rows.length) return;
      if (free.length && (!best || rows.length < best.rows.length)) best = {free,rows};
    }
    if (!best) {if ([...bag.values()].every(n => n === 0)) count++;return;}
    for (const row of best.rows) {
      best.free.forEach((id,i) => {const v=row[i]!;known.set(id,v);bag.set(v,bag.get(v)!-1);});
      search();
      best.free.forEach((id,i) => {const v=row[i]!;known.delete(id);bag.set(v,bag.get(v)!+1);});
      if (count >= 2 || exhausted) return;
    }
  };
  search(); return {count,exhausted};
}
