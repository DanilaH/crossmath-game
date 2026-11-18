import { describe, expect, it } from 'vitest';
import { boards, getPuzzle, routes } from '../src/content/catalog';
import { countSolutions, parsePuzzle } from '../src/content/validator';

describe('P02: independently imported own bank',()=>{
  it('has all 240 canonical unique boards and all routes',()=>{
    expect(boards).toHaveLength(240);expect(routes.dailySequence).toHaveLength(135);expect(routes.endlessSequence).toHaveLength(225);
    const counts:Record<string,number>={};
    for(const p of boards){expect(countSolutions(p),p.puzzleId).toEqual({count:1,exhausted:false});counts[p.difficulty]=(counts[p.difficulty]??0)+1;}
    expect(counts).toEqual({easy:70,standard:80,hard:60,expert:30});
  });
  it('rejects malformed grammar, fixed values, disconnected and unintended geometry',()=>{
    const p=()=>structuredClone(getPuzzle('cm-own-01-001')) as unknown as Record<string,any>;
    let b=p();b.equations[0].cells.push(1);expect(()=>parsePuzzle(b)).toThrow();
    b=p();b.cells[0].given=0;expect(()=>parsePuzzle(b)).toThrow();
    b=p();b.equations[0].op='^';expect(()=>parsePuzzle(b)).toThrow();
    b=p();b.cells[1].x=1;expect(()=>parsePuzzle(b)).toThrow();
    b=p();b.cells.push({id:3,x:1,y:0});expect(()=>parsePuzzle(b)).toThrow();
    b=p();b.solution=[5];expect(()=>parsePuzzle(b)).toThrow();
  });
  it('does not count swapping identical instances as a second solution',()=>{
    const b=structuredClone(getPuzzle('cm-own-01-001')) as any;
    delete b.cells[0].given;delete b.cells[1].given;b.cells[2].given=6;b.tray=[3,3];
    expect(countSolutions(parsePuzzle(b))).toEqual({count:1,exhausted:false});
    b.cells[2].given=5;b.tray=[2,3];expect(countSolutions(parsePuzzle(b)).count).toBe(2);
    b.tray=[2,2];expect(countSolutions(parsePuzzle(b)).count).toBe(0);
    expect(countSolutions(getPuzzle('cm-own-01-025'),0).exhausted).toBe(true);
  });
});
