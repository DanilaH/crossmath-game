import { cellValue } from '../core/types';
import type { Attempt, Puzzle } from '../core/types';
import { operatorGlyph } from './locale';

export function resumePreview(puzzle: Puzzle, attempt?: Attempt): HTMLElement {
  const cells = new Map(puzzle.cells.map(cell => [cell.id, cell]));
  const positions = new Map<string, {id?: number; operator?: string}>();
  for (const cell of puzzle.cells) positions.set(`${cell.x}:${cell.y}`, {id:cell.id});
  const equations = puzzle.equations.map(equation => {
    const [a,b,c] = equation.cells;
    const left = cells.get(a)!, middle = cells.get(b)!, right = cells.get(c)!;
    positions.set(`${(left.x + middle.x) / 2}:${(left.y + middle.y) / 2}`, {operator:operatorGlyph[equation.op]});
    positions.set(`${(middle.x + right.x) / 2}:${(middle.y + right.y) / 2}`, {operator:'='});
    return {equation, left, right};
  });
  const columns = Math.min(5, puzzle.width);
  const rows = Math.min(5, puzzle.height);
  let x = 0, y = 0, best = -1;
  for (let top = 0; top <= puzzle.height - rows; top++) {
    for (let left = 0; left <= puzzle.width - columns; left++) {
      const complete = equations.filter(({left:start,right:end}) => start.x >= left && start.y >= top &&
        end.x < left + columns && end.y < top + rows);
      const withPlacements = complete.filter(({equation}) => equation.cells.some(id => attempt?.placements[id])).length;
      const score = 2 * complete.length + 3 * withPlacements;
      if (score > best) { x = left; y = top; best = score; }
    }
  }
  const view = document.createElement('div');
  view.className = 'resume-preview';
  view.style.setProperty('--columns', String(columns));
  view.style.setProperty('--rows', String(rows));
  const grid=document.createElement('div');grid.className='preview-grid';view.append(grid);
  const value = (id: number) => attempt ? cellValue(puzzle, attempt, id) : cells.get(id)?.given;
  const labels = equations.filter(({left,right}) => left.x >= x && left.y >= y && right.x < x + columns && right.y < y + rows)
    .map(({equation}) => {
      const [a,b,c] = equation.cells.map(id => value(id) ?? '□');
      return `${a} ${operatorGlyph[equation.op]} ${b} = ${c}`;
    });
  view.setAttribute('role','img');
  view.setAttribute('aria-label',labels.join('. '));
  for (let row = y; row < y + rows; row++) for (let column = x; column < x + columns; column++) {
    const found = positions.get(`${column}:${row}`);
    const slot = document.createElement('span');
    if (found?.id !== undefined) {
      const number = value(found.id);
      slot.className = 'preview-slot ' + (number === undefined ? 'preview-blank' :
        cells.get(found.id)?.given === undefined ? 'preview-piece' : 'preview-given');
      slot.textContent = number === undefined ? '·' : String(number);
    } else if (found?.operator) {
      slot.className = 'preview-operator';
      slot.textContent = found.operator;
    }
    slot.setAttribute('aria-hidden','true');
    grid.append(slot);
  }
  const equation=equations.filter(({left,right})=>left.x>=x&&left.y>=y&&right.x<x+columns&&right.y<y+rows)
    .sort((a,b)=>b.equation.cells.filter(id=>attempt?.placements[id]).length-a.equation.cells.filter(id=>attempt?.placements[id]).length)[0]?.equation;
  if(equation){
    const strip=document.createElement('div');strip.className='preview-equation';strip.setAttribute('aria-hidden','true');
    const [a,b,c]=equation.cells;
    for(const [id,op] of [[a,undefined],[undefined,operatorGlyph[equation.op]],[b,undefined],[undefined,'='],[c,undefined]] as const){
      const part=document.createElement('span');
      part.className=id===undefined?'preview-operator':`preview-slot ${value(id)===undefined?'preview-blank':cells.get(id)?.given===undefined?'preview-piece':'preview-given'}`;
      part.textContent=id===undefined?op!:String(value(id)??'·');strip.append(part);
    }
    view.append(strip);
  }
  return view;
}
