import { describe, expect, it, vi } from 'vitest';
import { boards, getPuzzle } from '../src/content/catalog';
import * as validator from '../src/content/validator';
import { createAttempt, applyHelpLayout, applyCommand } from '../src/core/engine';
import { explain, prepareExplanation, verifyExplanation, visiblePlacements } from '../src/help/logic';
import { materializeHelp, reveal } from '../src/help/reveal';
import type { BoardAction, Mode } from '../src/core/types';
import fixtures from './fixtures/help-preparation.json';

describe('HELP-01: classify preparation without changing the attempt',()=>{
 const puzzles=Object.fromEntries(Object.entries(fixtures.puzzles).map(([key,puzzle])=>[key,validator.parsePuzzle(puzzle)]));
 it.each(fixtures.cases)('$id',example=>{
  const puzzle=puzzles[example.puzzle]!;
  let attempt=createAttempt(puzzle,example.id,example.mode as Mode);
  for(const placement of example.placements){
   attempt=applyCommand(puzzle,attempt,{type:'PlaceFromTray',...placement,
    commandId:`move-${attempt.boardRevision}`,expectedRevision:attempt.boardRevision}).state;
  }
  const original=structuredClone(attempt);
  expect(validator.countSolutions(puzzle,example.budget,visiblePlacements(puzzle,attempt))).toEqual(example.expectedCompatibility);
  const result=prepareExplanation(puzzle,attempt,example.budget);
  const extended=example.id==='unique_no_supported_step'||example.id==='endless_no_supported_preview';
  expect(result).toMatchObject({outcome:extended?'ready':example.expectedFutureOutcome,
   snapshot:{attemptId:attempt.id,puzzleId:puzzle.puzzleId,boardRevision:attempt.boardRevision}});
  if(result.outcome==='ready'){
   if(extended)expect(result.plan.rule).toBe('propagation');
   else expect(result.plan).toMatchObject(example.expectedBaselinePlan!);
   expect(verifyExplanation(puzzle,attempt,result.plan)).toBe(true);
  }else expect(result).not.toHaveProperty('plan');
  if(example.expectedPhase)expect(result).toHaveProperty('phase',example.expectedPhase);
  if(example.expectedUnavailableReason)expect(result).toHaveProperty('reason',example.expectedUnavailableReason);
  expect(attempt).toEqual(original);
  if(example.mode==='endless')expect(attempt.status).toBe('playing');
 });
 it('treats a partially found solution as exhausted when the check exhausts its budget',()=>{
  const puzzle=puzzles.direct!, attempt=createAttempt(puzzle,'exhaustion');
  const compatibility=vi.spyOn(validator,'countSolutions').mockReturnValueOnce({count:1,exhausted:true});
  try{
   expect(prepareExplanation(puzzle,attempt)).toMatchObject({outcome:'budget_exhausted',phase:'compatibility'});
  }finally{compatibility.mockRestore();}
 });
});

describe('HC01–HC12: help proof boundary',()=>{
 it('completes the entire 240-board bank by freshly computed verified explanations',()=>{
  let assignments=0;
  for(const p of boards){let a=createAttempt(p,'proof:'+p.puzzleId);let steps=0;
   while(a.status==='playing'){
    const plan=explain(p,a);expect(plan,`${p.puzzleId} step ${steps}`).not.toBeNull();expect(verifyExplanation(p,a,plan!)).toBe(true);
    const layout=materializeHelp(p,a,plan!);expect(layout).not.toBeNull();a=applyHelpLayout(p,a,layout!,`help:${++steps}`);assignments+=plan!.assignments.length;
    expect(steps).toBeLessThanOrEqual(p.tray.length);
   }
   expect(a.status).toBe('won');expect(a.assisted).toBe(true);
  }
  expect(assignments).toBe(1422);
 });
 it('uses both candidate sets on field 10; rejects modified support and stale snapshots',()=>{
  const p=getPuzzle('cm-own-01-010'),a=createAttempt(p,'crossing'),plan=explain(p,a)!;
  expect(plan.rule).toBe('intersection');expect(plan.assignments[0]!.value).toBe(4);expect(plan.assignments[0]!.evidence.map(e=>e.candidates)).toEqual([[4,5],[4,6]]);
  const falseSupport=structuredClone(plan);falseSupport.assignments[0]!.evidence[0]!.candidates=[4];expect(verifyExplanation(p,a,falseSupport)).toBe(false);
  expect(verifyExplanation(p,{...a,boardRevision:1},plan)).toBe(false);
  const falseValue=structuredClone(plan);falseValue.assignments[0]!.value=5;expect(verifyExplanation(p,a,falseValue)).toBe(false);
  expect(explain(p,a,0)).toBeNull();
 });
 it('never teaches a conclusion from an inconsistent partial player hypothesis',()=>{
  const p=getPuzzle('cm-own-01-012');let a=createAttempt(p,'wrong');
  a=applyCommand(p,a,{type:'PlaceFromTray',tokenId:'t0',cellId:0,commandId:'place',expectedRevision:0}).state;
  expect(explain(p,a)).toBeNull();
  const plan=reveal(p,a,0)!;expect(plan.kind).toBe('reveal');expect(plan.returns).toEqual([0]);expect(plan.assignments[0]!.value).toBe(7);
  expect(materializeHelp(p,a,plan)!.placements['0']).toBe('t1');
 });
 it('checks joint token consumption for multi-cell plans and preserves paid help across undo',()=>{
  const p=getPuzzle('cm-own-01-007');let a=createAttempt(p,'dupes');const plan=explain(p,a)!;
  const duplicate=structuredClone(plan);duplicate.assignments.push(structuredClone(plan.assignments[0]!));expect(verifyExplanation(p,a,duplicate)).toBe(false);
  a=applyHelpLayout(p,a,materializeHelp(p,a,plan)!, 'paid');
  a=applyCommand(p,a,{type:'Undo',commandId:'undo',expectedRevision:a.boardRevision}).state;expect(a.assisted).toBe(true);expect(a.hintsUsed).toBe(1);expect(a.placements).toEqual({});
 });
 it('accepts a jointly proven multi-cell plan as one help action',()=>{
  const p=getPuzzle('cm-own-01-002'),a=createAttempt(p,'multi'),plan=explain(p,a)!;
  plan.assignments.push({cellId:4,value:3,evidence:[{equationIndex:1,candidates:[3]}]});
  expect(verifyExplanation(p,a,plan)).toBe(true);
  const result=applyHelpLayout(p,a,materializeHelp(p,a,plan)!,'one-operation');expect(result.status).toBe('won');expect(result.hintsUsed).toBe(1);
 });
 it('checks every permutation of the first 15 physical trays for reveal recovery',()=>{
  for(const p of boards.slice(0,15)){
   let a=createAttempt(p,'reveal:'+p.puzzleId),n=0;
   for(const cell of p.cells.filter(c=>c.given===undefined)){
    const action:BoardAction={type:'PlaceFromTray',cellId:cell.id,tokenId:`t${n++}`};
    a=applyCommand(p,a,{...action,commandId:String(n),expectedRevision:a.boardRevision}).state;
   }
   for(let j=0;a.status!=='won'&&j<=p.tray.length;j++){const plan=reveal(p,a)!;expect(plan).not.toBeNull();const layout=materializeHelp(p,a,plan)!;expect(layout).not.toBeNull();a=applyHelpLayout(p,a,layout,`r${j}`);}
   expect(a.status).toBe('won');
  }
 });
});
