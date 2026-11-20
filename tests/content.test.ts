import { bankIndex, bucketTurn, rotations } from '../src/content/rotation';
import type { FreeTrack } from '../src/content/rotation';
import { createAttempt } from '../src/core/engine';
import { explain, verifyExplanation } from '../src/help/logic';
import { reveal } from '../src/help/reveal';
import { describe, expect, it } from 'vitest';
import { boards, campaignSequence, freeTrackPuzzle, getPuzzle, referenceBoards, routes } from '../src/content/catalog';
import { countSolutions, parsePuzzle } from '../src/content/validator';

describe('P02: independently imported own bank',()=>{
  it('has all 240 canonical unique boards and all routes',()=>{
    expect(boards).toHaveLength(240);expect(routes.dailySequence).toHaveLength(135);expect(routes.endlessSequence).toHaveLength(225);
    const counts:Record<string,number>={};
    for(const p of boards){expect(countSolutions(p),p.puzzleId).toEqual({count:1,exhausted:false});counts[p.difficulty]=(counts[p.difficulty]??0)+1;}
    expect(counts).toEqual({easy:70,standard:80,hard:60,expert:30});
  });
  it('loads and solves the entire original v2 bank and can explain or reveal its opening move', () => {
    expect(referenceBoards).toHaveLength(275);
    for (const board of referenceBoards) {
      expect(countSolutions(board), board.puzzleId).toEqual({count:1,exhausted:false});
      const attempt = createAttempt(board,'preview');
      const opening = explain(board,attempt);
      expect(opening && verifyExplanation(board,attempt,opening),board.puzzleId).toBe(true);
      expect(reveal(board,attempt),board.puzzleId).not.toBeNull();
    }
  },20_000);
  it('keeps both six-slot rhythms before and after bank exhaustion', () => {
    expect(campaignSequence('content-v2').slice(0,15)).toEqual(routes.campaignSequence.slice(0,15));
    for (const track of ['relax','challenge'] as FreeTrack[]) {
      const issued = Array.from({length:600},(_,i)=>freeTrackPuzzle(track,i));
      for (let i=0; i<issued.length; i+=6) expect(issued.slice(i,i+6).map(p=>p.bucket)).toEqual(rotations[track]);
      for (const bucket of new Set(rotations[track])) {
        const count = referenceBoards.filter(p=>p.bucket===bucket).length;
        const ids = issued.flatMap((p,i)=>bucketTurn(track,i).bucket===bucket?[p.puzzleId]:[]);
        expect(new Set(ids.slice(0,count)).size).toEqual(count);
        expect(new Set(ids.slice(count,count*2)).size).toEqual(count);
        expect(ids[count]).not.toBe(ids[count-1]);
        expect(bankIndex(count+1,count)).not.toBe(1);
      }
    }
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
