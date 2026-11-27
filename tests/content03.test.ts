import {mkdirSync,writeFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {labBanks,parseLabPuzzle} from '../src/lab/contentBank';
import {referenceBoards,boards as original} from '../src/content/catalog';
import {boardShape} from '../src/content/freeIssuance';
import {countSolutions} from '../src/content/validator';
import {createAttempt,applyCommand,applyHelpLayout} from '../src/core/engine';
import {assertInventory,tokenValue} from '../src/core/types';
import type {Puzzle,Attempt} from '../src/core/types';
import {prepareExplanation,verifyExplanation} from '../src/help/logic';
import {materializeHelp} from '../src/help/reveal';
import solutions from '../docs/experiments/content03/author_solutions.json';
import existingSolutions from '../docs/spec/product/content_v2/author_solutions.json';
import maskCases from '../docs/experiments/content03/masks.json';

const answers:Readonly<Record<string,{answer:number[]}>>={...existingSolutions,...solutions};
function peel(p:Puzzle){
 let left=new Set(p.cells.filter(c=>c.given===undefined).map(c=>c.id));
 const initial=p.equations.filter(eq=>eq.cells.filter(id=>left.has(id)).length===1).length;
 let rounds=0;
 while(left.size){
  const singles=p.equations.map(eq=>eq.cells.filter(id=>left.has(id))).filter(ids=>ids.length===1).map(ids=>ids[0]!);
  if(!singles.length)break;
  singles.forEach(id=>left.delete(id));rounds++;
 }
 return {initialSingleEquations:initial,peelResidual:left.size,peelRounds:rounds};
}
function prove(p:Puzzle,start:'empty'|'prefix'){
 let a=createAttempt(p,'assay-'+p.puzzleId);
 const answer=answers[p.puzzleId.replace(/-mask\d+$/,'')]!.answer;
 if(start==='prefix')for(const cell of p.cells.filter(c=>c.given===undefined&&c.id%3===1)){
  const token=a.trayOrder.find(t=>tokenValue(p,t)===answer[cell.id]&&!Object.values(a.placements).includes(t))!;
  a=applyCommand(p,a,{type:'PlaceFromTray',cellId:cell.id,tokenId:token,commandId:'prefix-'+cell.id,expectedRevision:a.boardRevision}).state;
 }
 const steps=[];
 let run=0,maxRun=0;
 while(a.status==='playing'){
  const snapshot=JSON.stringify(a),result=prepareExplanation(p,a);
  expect(result.outcome,p.puzzleId).toBe('ready');
  if(result.outcome!=='ready')throw Error(p.puzzleId);
  expect(verifyExplanation(p,a,result.plan)).toBe(true);
  expect(JSON.stringify(a)).toBe(snapshot);
  const {plan}=result;
  expect(plan.assignments).toHaveLength(1);
  expect(plan.assignments[0]!.value).toBe(answer[plan.assignments[0]!.cellId]);
  const layout=materializeHelp(p,a,plan)!;
  expect(layout).not.toBeNull();assertInventory(p,layout);
  for(const [id,token] of Object.entries(a.placements))expect(layout.placements[id]).toBe(token);
  const direct=plan.rule.startsWith('direct_');
  run=direct?0:run+1;maxRun=Math.max(maxRun,run);
  steps.push({rule:plan.rule,units:result.proofSearchUnits??0});
  a=applyHelpLayout(p,a,layout,'explain-'+steps.length);
  expect(steps.length).toBeLessThanOrEqual(p.tray.length);
 }
 return {start,steps,nonDirect:steps.filter(x=>!x.rule.startsWith('direct_')).length,
  advanced:steps.filter(x=>['propagation','contradiction'].includes(x.rule)).length,maxNonDirectRun:maxRun,
  proofUnitsMax:Math.max(0,...steps.map(x=>x.units)),proofUnitsSum:steps.reduce((n,x)=>n+x.units,0)};
}
function metric(p:Puzzle){
 const shape=boardShape(p);
 return {id:p.puzzleId,shape,...peel(p),width:p.width,height:p.height,equations:p.equations.length,holes:p.tray.length,
  distinctTray:new Set(p.tray).size,operations:p.equations.map(eq=>eq.op),
  mask:p.cells.filter(c=>c.given===undefined).map(c=>[c.x,c.y]).sort().join(';')};
}
describe('CONTENT-03',()=>{
 it('admits the separate 40-field control and 40-field candidate with unique numeric solutions and verified Explain',()=>{
  const rows=[];
  expect(original.length+referenceBoards.length).toBe(515);
  const old=new Set([...original,...referenceBoards].map(p=>p.puzzleId));
  for(const [name,bank] of Object.entries(labBanks)){
   if(name==='daily'||name==='ops')continue;
   expect(bank).toHaveLength(40);
   const shapeCounts=new Map<string,number>();
   for(const p of bank){
    expect(old.has(p.puzzleId)).toBe(false);
    const data=metric(p),bounds=name==='easy9'?9:7;
    expect(Math.max(p.width,p.height)).toBeLessThanOrEqual(bounds);
    expect(p.equations.length).toBe(p.tray.length);
    expect([7,8]).toContain(p.tray.length);
    expect([...p.tray,...p.cells.flatMap(c=>c.given?[c.given]:[])] .every(v=>v<=30)).toBe(true);
    expect(data.initialSingleEquations).toBeGreaterThan(0);
    expect(data.peelResidual).toBe(0);
    expect(countSolutions(p)).toEqual({count:1,exhausted:false});
    const runs=[prove(p,'empty'),prove(p,'prefix')];
    expect(runs.every(x=>x.nonDirect===0)).toBe(true);
    const a=createAttempt(p,'wrong'),cell=p.cells.find(c=>c.given===undefined)!;
    const token=a.trayOrder.find(t=>tokenValue(p,t)!==answers[p.puzzleId]!.answer[cell.id])!;
    const wrong=applyCommand(p,a,{type:'PlaceFromTray',tokenId:token,cellId:cell.id,commandId:'error',expectedRevision:0}).state;
    expect(prepareExplanation(p,wrong).outcome).toBe('incompatible_position');
    shapeCounts.set(data.shape,(shapeCounts.get(data.shape)??0)+1);
    rows.push({bank:name,...data,runs});
   }
   if(name==='easy9'){
    expect(shapeCounts.size).toBeGreaterThanOrEqual(12);
    expect(Math.max(...shapeCounts.values())).toBeLessThanOrEqual(8);
   }
   expect(bank.filter(p=>p.equations.length===7)).toHaveLength(8);
  }
  if(process.env.CONTENT03_REPORT){
   mkdirSync('.test-output/content03',{recursive:true});
   writeFileSync('.test-output/content03/proofs.json',JSON.stringify({fields:rows},null,2)+'\n');
  }
 },60_000);
 it('proves 50 additional Daily boards and 16 matched operation variants with the unchanged Explain engine',()=>{
  const rows=[];
  let directOnly=0;
  for(const [bank,puzzles] of Object.entries(labBanks).filter(([name])=>['daily','ops'].includes(name))){
   for(const p of puzzles){
    expect(countSolutions(p)).toEqual({count:1,exhausted:false});
    const runs=[prove(p,'empty'),prove(p,'prefix')];
    if(bank==='daily'){
     expect([15,16,17]).toContain(p.equations.length);
     expect([15,16,17,18]).toContain(p.tray.length);
     if(peel(p).peelResidual===0)directOnly++;
    }else{
     const pair=labBanks.easy9[p.campaignPosition-1]!;
     expect(p.cells.map(c=>[c.x,c.y,c.given===undefined])).toEqual(pair.cells.map(c=>[c.x,c.y,c.given===undefined]));
     const ratio=p.equations.filter(e=>['*','/'].includes(e.op)).length/p.equations.length;
     expect(ratio).toBeGreaterThanOrEqual(.2);expect(ratio).toBeLessThanOrEqual(.3);
    }
    rows.push({bank,...metric(p),runs});
   }
  }
  expect(labBanks.daily).toHaveLength(50);expect(labBanks.ops).toHaveLength(16);expect(directOnly).toBe(20);
  if(process.env.CONTENT03_REPORT){
   mkdirSync('.test-output/content03',{recursive:true});
   writeFileSync('.test-output/content03/proofs-b.json',JSON.stringify({fields:rows},null,2)+'\n');
  }
 },90_000);
 it('rejects malformed topology, hidden answers and exhausted checks without relaxing the grammar',()=>{
  const p=labBanks.easy9[0]!;
  expect(()=>parseLabPuzzle({...p,answer:[]})).toThrow('Hidden solution');
  expect(()=>parseLabPuzzle({...p,equations:[{cells:[0,1,2,3,4],op:'+'}]})).toThrow();
  expect(()=>parseLabPuzzle({...p,cells:p.cells.map((c,i)=>i?c:{...c,x:c.x+1})})).toThrow();
  expect(countSolutions(p,0).exhausted).toBe(true);
  expect(prepareExplanation(p,createAttempt(p,'budget'),0).outcome).toBe('budget_exhausted');
 });
 it('measures the current difficulty ladder and controlled mask variants without admitting nonunique boards',()=>{
  const rows=referenceBoards.map(p=>({...metric(p),bucket:p.bucket,run:prove(p,'empty')}));
  const masks=maskCases.map(row=>{
   const p=parseLabPuzzle(row.board),unique=countSolutions(p,500_000);
   if(row.outcome==='unique'){
    expect(unique).toEqual({count:1,exhausted:false});
    return {base:row.base,id:p.puzzleId,outcome:row.outcome,...peel(p),run:prove(p,'empty')};
   }
   expect(unique.exhausted?'budget_exhausted':unique.count>1?'nonunique':'invalid').toBe(row.outcome);
   return {base:row.base,id:p.puzzleId,outcome:row.outcome,...peel(p)};
  });
  if(process.env.CONTENT03_REPORT){
   mkdirSync('.test-output/content03',{recursive:true});
   writeFileSync('.test-output/content03/calibration.json',JSON.stringify({baseline:rows,masks},null,2)+'\n');
  }
 },90_000);
});
