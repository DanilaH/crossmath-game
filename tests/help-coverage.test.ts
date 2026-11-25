import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { boards, referenceBoards, getPuzzle } from '../src/content/catalog';
import { countSolutions } from '../src/content/validator';
import { createAttempt, applyCommand, applyHelpLayout } from '../src/core/engine';
import { assertInventory, tokenValue, isSolved } from '../src/core/types';
import type { Attempt, Puzzle } from '../src/core/types';
import { prepareExplanation, verifyExplanation, visiblePlacements } from '../src/help/logic';
import type { HintPlan } from '../src/help/logic';
import { materializeHelp } from '../src/help/reveal';
import legacyAnswers from '../docs/spec/product/content_v09/author_solutions.json';
import v2Answers from '../docs/spec/product/content_v2/author_solutions.json';
import helpStops from './fixtures/help11-stops.json';

const bank = [...boards,...referenceBoards];
// Used by the assay only, to make independent controls and check proposed values.
const answers: Readonly<Record<string,{answer:number[]}>> = {...legacyAnswers,...v2Answers};
const cases = [
  {id:'cm-own-02-182',filled:2,cellId:1,value:14,alternatives:8},
  {id:'cm-own-02-217',filled:12,cellId:0,value:26,alternatives:14},
];

function apply(puzzle: Puzzle, attempt: Attempt, plan: HintPlan): Attempt {
  assert.ok(verifyExplanation(puzzle,attempt,plan),puzzle.puzzleId+' verifier');
  const [assignment] = plan.assignments;
  assert.equal(plan.assignments.length,1);
  assert.equal(assignment!.value,answers[puzzle.puzzleId]!.answer[assignment!.cellId]);
  const layout=materializeHelp(puzzle,attempt,plan);
  assert.ok(layout,puzzle.puzzleId+' materialization');
  assertInventory(puzzle,layout);
  assert.equal(Object.keys(layout.placements).length,Object.keys(attempt.placements).length+1);
  for (const [id,token] of Object.entries(attempt.placements)) assert.equal(layout.placements[id],token);
  assert.deepEqual(layout.trayOrder,attempt.trayOrder);
  return applyHelpLayout(puzzle,attempt,layout,'explain-'+attempt.boardRevision);
}

function atFirstCertificate(id: string) {
  const puzzle=getPuzzle(id);
  let attempt=createAttempt(puzzle,'fixture-'+id);
  while (attempt.status==='playing') {
    const result=prepareExplanation(puzzle,attempt);
    assert.equal(result.outcome,'ready',id);
    if(result.plan.proof)return {puzzle,attempt,plan:result.plan,work:result.proofSearchUnits};
    attempt=apply(puzzle,attempt,result.plan);
  }
  throw Error(id+' did not exercise a certificate');
}

describe('HELP-02',()=>{
  it('solves all 515 fields and their alternate prefixes through Explain, verify and Apply',()=>{
    assert.equal(new Set(bank.map(p=>p.puzzleId)).size,515);
    const report = [];
    for (const puzzle of bank) {
      const {puzzleId:id,contentVersion:version} = puzzle, answer=answers[id]!.answer;
      const blanks=puzzle.cells.filter(c=>c.given===undefined);
      const budgets={prepare:version===2?160_000:40_000,verify:version===2?200_000:80_000};
      const runs = [];
      for (const start of ['empty','prefix']) {
        let attempt=createAttempt(puzzle,id+'-'+start);
        if(start==='prefix'){
          attempt.trayOrder.reverse();
          for(const cell of blanks.filter((_,index)=>index%3===1)){
            const token=attempt.trayOrder.find(t=>tokenValue(puzzle,t)===answer[cell.id]&&!Object.values(attempt.placements).includes(t));
            assert.ok(token,id+' prefix token');
            attempt=applyCommand(puzzle,attempt,{type:'PlaceFromTray',cellId:cell.id,tokenId:token,
              expectedRevision:attempt.boardRevision,commandId:'prefix-'+cell.id}).state;
          }
        }
        const initialFilled=Object.keys(attempt.placements).length;
        const steps = [];
        while (attempt.status==='playing') {
          const saved=JSON.stringify(attempt), startTime=performance.now();
          const result=prepareExplanation(puzzle,attempt);
          const prepareMs=performance.now()-startTime;
          assert.equal(JSON.stringify(attempt),saved,id+' prepare mutated the attempt');
          assert.equal(result.outcome,'ready',id+' '+start+' after '+steps.length+' applies');
          const plan=result.plan, proof=plan.proof?.steps;
          const verifiedAt=performance.now();
          const next=apply(puzzle,attempt,plan);
          const verifyAndApplyMs=performance.now()-verifiedAt;
          assert.equal(JSON.stringify(attempt),saved,id+' verify or Apply mutated the input');
          let counterfactuals;
          if(proof){
            const assignment=plan.assignments[0]!, used=new Set(Object.values(attempt.placements));
            const values=new Set(attempt.trayOrder.filter(t=>!used.has(t)).map(t=>tokenValue(puzzle,t)!));
            const visible=visiblePlacements(puzzle,attempt);
            for(const value of values){
              const outcome=countSolutions(puzzle,2_000_000,{...visible,[assignment.cellId]:value});
              assert.deepEqual(outcome,{count:Number(value===assignment.value),exhausted:false},id+' audit counterfactual');
            }
            counterfactuals={positive:1,negative:values.size-1};
          }
          steps.push({rule:plan.rule,cellId:plan.assignments[0]!.cellId,value:plan.assignments[0]!.value,
            proofLength:proof?.reduce((sum,step)=>sum+1+(step.type==='exclude'?step.reductions.length:0),0) ?? plan.assignments[0]!.evidence.length,
            rejectedAssumptions:proof?.filter(step=>step.type==='exclude').length ?? 0,
            proofSearchUnits:result.proofSearchUnits ?? 0,prepareMs,verifyAndApplyMs,
            ...(proof?{placements:attempt.placements,proof,counterfactuals}:{})});
          attempt=next;
          assert.ok(steps.length<=blanks.length-initialFilled,id+' no progress');
        }
        assert.ok(isSolved(puzzle,attempt),id+' final equations');
        assert.equal(attempt.hintsUsed,steps.length);
        assert.equal(steps.length+initialFilled,blanks.length);
        runs.push({start,initialFilled,outcome:'solved',applied:steps.length,steps});
      }
      const wrongCell=blanks.find(cell=>puzzle.tray.some(value=>value!==answer[cell.id]));
      let wrong='not_applicable';
      if(wrongCell){
        const fresh=createAttempt(puzzle,id+'-wrong');
        const token=fresh.trayOrder.find(t=>tokenValue(puzzle,t)!==answer[wrongCell.id])!;
        const wrongAttempt=applyCommand(puzzle,fresh,{type:'PlaceFromTray',cellId:wrongCell.id,tokenId:token,
          expectedRevision:0,commandId:'wrong'}).state;
        wrong=prepareExplanation(puzzle,wrongAttempt).outcome;
        assert.equal(wrong,'incompatible_position',id+' wrong control');
      }
      report.push({id,version,bucket:puzzle.bucket??puzzle.difficulty,budgets,wrong,runs});
    }
    expect(report.filter(row=>row.wrong==='incompatible_position')).toHaveLength(513);
    expect(report.filter(row=>row.wrong==='not_applicable')).toHaveLength(2);
    if(process.env.HELP_COVERAGE_REPORT){
      mkdirSync(dirname(process.env.HELP_COVERAGE_REPORT),{recursive:true});
      writeFileSync(process.env.HELP_COVERAGE_REPORT,JSON.stringify({engine:process.version,fields:report},null,2)+'\n');
    }
  },120_000);

  it.each(cases)('proves the original stop on $id after $filled placements',fixture=>{
    const {puzzle,attempt,plan}=atFirstCertificate(fixture.id);
    assert.equal(Object.keys(attempt.placements).length,fixture.filled);
    const original=helpStops.find(stop=>stop.id===fixture.id)!;
    assert.deepEqual(attempt.placements,original.placements);
    assert.deepEqual(attempt.trayOrder,original.trayOrder);
    expect(plan).toMatchObject({rule:'contradiction',assignments:[{cellId:fixture.cellId,value:fixture.value}]});
    const used=new Set(Object.values(attempt.placements));
    const values=new Set(attempt.trayOrder.filter(t=>!used.has(t)).map(t=>tokenValue(puzzle,t)!));
    assert.equal(values.size-1,fixture.alternatives);
    for(const value of values){
      const placement={...visiblePlacements(puzzle,attempt),[fixture.cellId]:value};
      expect(countSolutions(puzzle,2_000_000,placement)).toEqual({count:Number(value===fixture.value),exhausted:false});
    }
    apply(puzzle,attempt,plan);
  });

  it('rejects altered supports, resource claims and assumption witnesses',()=>{
    const {puzzle,attempt,plan}=atFirstCertificate(cases[0]!.id);
    assert.ok(verifyExplanation(puzzle,attempt,plan));
    const altered=structuredClone(plan);
    const eq=altered.proof!.steps.find(step=>step.type==='equation');
    assert.ok(eq);
    eq.changes[0]!.values[0]=999;
    expect(verifyExplanation(puzzle,attempt,altered)).toBe(false);
    const inventory=structuredClone(plan);
    const count=inventory.proof!.steps.find(step=>step.type==='inventory');
    assert.ok(count);
    count.changes[0]!.values.push(count.value);
    expect(verifyExplanation(puzzle,attempt,inventory)).toBe(false);
    const falseWitness=structuredClone(plan);
    const rejection=falseWitness.proof!.steps.find(step=>step.type==='exclude');
    assert.ok(rejection&&rejection.reductions.length);
    rejection.reductions=[];
    expect(verifyExplanation(puzzle,attempt,falseWitness)).toBe(false);
    const badConstraint=structuredClone(plan);
    const unsupported=badConstraint.proof!.steps.find(step=>step.type==='equation');
    assert.ok(unsupported);
    unsupported.equationIndex=puzzle.equations.length;
    expect(verifyExplanation(puzzle,attempt,badConstraint)).toBe(false);
  });

  it('rejects stale plans, partial proofs, exhaustion and duplicate physical tokens',()=>{
    const {puzzle,attempt,plan}=atFirstCertificate(cases[0]!.id);
    const altered=(changes:Partial<HintPlan>)=>({...plan,...changes});
    const assignment=plan.assignments[0]!;
    expect(verifyExplanation(puzzle,attempt,altered({assignments:[{...assignment,value:999}]}))).toBe(false);
    expect(verifyExplanation(puzzle,attempt,altered({assignments:[{...assignment,cellId:999}]}))).toBe(false);
    expect(verifyExplanation(puzzle,attempt,altered({assignments:[assignment,assignment]}))).toBe(false);
    expect(verifyExplanation(puzzle,attempt,altered({proof:{steps:[]}}))).toBe(false);
    expect(verifyExplanation(puzzle,attempt,{...plan,rule:'research_model'} as unknown as HintPlan)).toBe(false);
    expect(verifyExplanation(puzzle,attempt,plan,0)).toBe(false);
    expect(verifyExplanation(puzzle,{...attempt,boardRevision:attempt.boardRevision+1},plan)).toBe(false);
    expect(verifyExplanation(puzzle,{...attempt,id:'reopened'},plan)).toBe(false);
    const duplicate=structuredClone(attempt), [first,second]=Object.keys(duplicate.placements);
    duplicate.placements[second!]=duplicate.placements[first!]!;
    expect(verifyExplanation(puzzle,duplicate,plan)).toBe(false);
  });
});
