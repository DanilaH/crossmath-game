import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Save } from '../src/app/model';
import { createSave, decodeSave } from '../src/app/model';
import { SaveRepository, SAVE_KEY } from '../src/app/saveRepository';
import { GameSession } from '../src/app/session';
import * as catalog from '../src/content/catalog';
import { boardShape, closeFreeAssignment, pinFreeAssignment, resolveFreeAssignment, selectPilotPuzzle } from '../src/content/freeIssuance';
import { bucketTurn } from '../src/content/rotation';
import type { FreeTrack } from '../src/content/rotation';
import { createAttempt } from '../src/core/engine';
import { availableOffers, findWitness, freeTrackOffer, refreshQuests } from '../src/meta/missions';
import oldAnswers from '../docs/spec/product/content_v09/author_solutions.json';
import newAnswers from '../docs/spec/product/content_v2/author_solutions.json';

const answers:Readonly<Record<string,{answer:number[]}>>={...oldAnswers,...newAnswers};
const campaign=catalog.campaignSequence('content-v2');
const date='2026-11-27T12:00:00Z';
const fresh=()=>createSave('profile',date,'UTC','original');
const assignments=(ids:string[])=>{
 const lastId=new Map<string,number>(),lastShape=new Map<string,number>();
 const idGaps:number[]=[],shapeGaps:number[]=[];
 for(const [index,id] of ids.entries()){
  const shape=boardShape(catalog.getPuzzle(id)),previousId=lastId.get(id),previousShape=lastShape.get(shape);
  if(previousId!==undefined)idGaps.push(index-previousId);
  if(previousShape!==undefined)shapeGaps.push(index-previousShape);
  lastId.set(id,index);lastShape.set(shape,index);
 }
 return {unique:lastId.size,minIdGap:idGaps.length?Math.min(...idGaps):null,idGapLE12:idGaps.filter(gap=>gap<=12).length,
  idGapLE50:idGaps.filter(gap=>gap<=50).length,shapeGap1:shapeGaps.filter(gap=>gap===1).length,
  shapeGapLE3:shapeGaps.filter(gap=>gap<=3).length,shapeGapLE6:shapeGaps.filter(gap=>gap<=6).length};
};
function measure(track:FreeTrack,prefix:number,policy:'legacy'|'d4-v2'){
 const save=fresh(),ids:string[]=[];
 save.profile.solvedIds=campaign.slice(0,prefix);
 save.meta.freeProgress={relax:0,challenge:0};
 let repeatBeforeCycle=0;
 for(let index=0;index<360;index++){
  const next=resolveFreeAssignment(save,track,policy)!;
  const pool=catalog.freeTrackBucket(track,index);
  const unsolved=pool.filter(p=>!save.profile.solvedIds.includes(p.puzzleId));
  expect(next.index).toBe(index);
  expect(catalog.getPuzzle(next.puzzleId).bucket).toBe(bucketTurn(track,index).bucket);
  expect((unsolved.length?unsolved:pool).some(p=>p.puzzleId===next.puzzleId)).toBe(true);
  if(ids.includes(next.puzzleId)&&pool.some(p=>!ids.includes(p.puzzleId)))repeatBeforeCycle++;
  if(policy==='d4-v2'){
   pinFreeAssignment(save.meta,track,next);
   closeFreeAssignment(save.meta,track,index);
  }
  ids.push(next.puzzleId);
  if(!save.profile.solvedIds.includes(next.puzzleId))save.profile.solvedIds.push(next.puzzleId);
  save.meta.freeProgress[track]++;
 }
 const length=track==='relax'?120:105;
 return {...assignments(ids),firstCycleUnique:new Set(ids.slice(0,length)).size,earlyBucketRepeat:repeatBeforeCycle,
  traceSha256:createHash('sha256').update(ids.join('\n')).digest('hex'),ids};
}
function report(name:string,data:unknown){
 const base=process.env.ISSUANCE_REPORT;
 if(!base)return;
 const path=`${base}/${name}.json`;
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(data,null,2)+'\n');
}
type Trace={idTrace:string[]};
type Model={
 scenarios:{track:FreeTrack;initialCampaignWins:string|number;baseline:Trace;candidate3:Trace}[];
 stress:{track:FreeTrack;prefix:number;idTrace:string[];baselineTrace:string[]}[];
};
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});

describe('ISSUE-01 independent issuance measurement',()=>{
 it('matches 18 baseline and 18 pilot product traces against the pinned independent model',()=>{
  const path='docs/porting/issuance-pilot-20261126/';
  const recorded=JSON.parse(readFileSync(path+'MEASUREMENTS.json','utf8'));
  const current=JSON.parse(execFileSync(process.execPath,[path+'model.mjs'],{encoding:'utf8'}));
  expect(current.scenarios).toEqual(recorded.scenarios);
  expect(current.stress).toEqual(recorded.stress);
  const model:Model=JSON.parse(execFileSync(process.execPath,[path+'model.mjs','--trace'],{encoding:'utf8'}));
  const streams=[...model.scenarios.map(row=>({track:row.track,prefix:Number(row.initialCampaignWins)||0,
   baseline:row.baseline.idTrace,pilot:row.candidate3.idTrace})),...model.stress.map(row=>({
   track:row.track,prefix:row.prefix,baseline:row.baselineTrace,pilot:row.idTrace,
  }))];
  const rows=streams.map(({track,prefix,baseline,pilot})=>{
   const old=measure(track,prefix,'legacy'),next=measure(track,prefix,'d4-v2');
   expect(old.ids).toEqual(baseline);
   expect(next.ids).toEqual(pilot);
   expect(next.firstCycleUnique).toBe(track==='relax'?120:105);
   expect(next.earlyBucketRepeat).toBe(0);
   expect(next.idGapLE50).toBe(0);
   return {track,prefix,baseline:old,pilot:next};
  });
  report('completed-streams',{source:'Product resolver compared by every ID to the independent pinned model',steps:streams.length*360*2,rows});
 },20_000);
 it('recognizes translated, rotated and reflected numeric coordinates and ignores given values',()=>{
  const puzzle=catalog.getPuzzle('cm-own-02-217');
  const transformed={...puzzle,cells:puzzle.cells.map(c=>({...c,x:50-c.y,y:8+c.x,given:7})).reverse()};
  expect(boardShape(transformed)).toBe(boardShape(puzzle));
  expect(boardShape({...puzzle,cells:transformed.cells.slice(1)})).not.toBe(boardShape(puzzle));
  const previous={ [puzzle.puzzleId]:{count:1,lastIndex:4} };
  expect(selectPilotPuzzle([],[],5,previous)).toBeUndefined();
  expect(selectPilotPuzzle([puzzle],[puzzle.puzzleId],5,previous)).toBe(puzzle);
  expect(previous[puzzle.puzzleId]).toEqual({count:1,lastIndex:4});
 });
});

class Memory {
 data=new Map<string,string>();
 failure:'none'|'before'|'after'='none';
 async getItem(key:string){return this.data.get(key)??null;}
 async setItem(key:string,value:string){
  if(key===SAVE_KEY && this.failure==='before')throw Error('write failed');
  this.data.set(key,value);
  if(key===SAVE_KEY && this.failure==='after')throw Error('ack lost');
 }
 async removeItem(key:string){this.data.delete(key);}
}
async function setup(old?:Save){
 const memory=new Memory();
 if(old)memory.data.set(SAVE_KEY,JSON.stringify(old));
 const repo=new SaveRepository(memory,fresh),clock={now:date};
 let serial=0;
 const load=async()=>new GameSession(await repo.load(),repo,()=>`issuance-${++serial}`,()=>clock.now);
 return {memory,repo,clock,load,session:await load()};
}
const usePilot=()=>vi.stubEnv('MODE','issuance-pilot');
const progressed=(prefix:number)=>{
 const save=fresh();
 save.profile.campaignCursor=prefix;
 save.profile.solvedIds=campaign.slice(0,prefix);
 save.attempt=createAttempt(catalog.campaignPuzzle(prefix),'campaign-position');
 return save;
};
async function solve(session:GameSession){
 const puzzle=catalog.getPuzzle(session.state.attempt.puzzleId);
 const answer=answers[puzzle.puzzleId]!.answer;
 for(const cell of puzzle.cells.filter(c=>c.given===undefined)){
  if(session.state.attempt.placements[cell.id])continue;
  const used=new Set(Object.values(session.state.attempt.placements));
  const token=puzzle.tray.findIndex((value,i)=>value===answer[cell.id]&&!used.has('t'+i));
  expect(token).toBeGreaterThanOrEqual(0);
  expect((await session.command({type:'PlaceFromTray',tokenId:'t'+token,cellId:cell.id})).outcome).toBe('applied');
 }
 expect(session.state.attempt.status).toBe('won');
 return session.state.result!;
}

describe('ISSUE-01 Free assignment through the actual session writer',()=>{
 it('keeps the usual release policy, unlocks at 3/15 and respects the 60-campaign transition in the pilot',async()=>{
  const regular=await setup(progressed(15));
  expect(await regular.session.openFreeTrack('relax')).toBe('opened');
  expect(regular.session.state.meta.freeIssuance).toBeUndefined();
  expect(regular.session.state.attempt.puzzleId).toBe(catalog.newFreeTrackPuzzle('relax',0,campaign.slice(0,15)).puzzleId);

  usePilot();
  const {session}=await setup();
  expect(await session.openFreeTrack('relax')).toBe('unavailable');
  expect(await session.openFreeTrack('challenge')).toBe('unavailable');
  for(let i=1;i<=60;i++){
   if(i>1)expect(await session.next()).toBe(true);
   const result=await solve(session);
   if(i===1)expect(result.baseCoins).toBe(10);
   if(i===3)expect(result.unlockedModes).toEqual(['free']);
   if(i===15)expect(result.unlockedModes).toEqual(['challenge']);
  }
  expect(session.state.profile.campaignCursor).toBe(60);
  expect(await session.openFreeTrack('relax')).toBe('opened');
  const first=session.state.attempt.puzzleId,seen=[first];
  expect(session.state.meta.freeIssuance?.relax?.pin).toEqual({index:0,puzzleId:first,policy:'d4-v2'});
  for(let index=0;index<7;index++){
   await solve(session);
   expect(session.state.meta.freeProgress?.relax).toBe(index+1);
   expect(session.state.meta.freeIssuance?.relax?.pin).toBeUndefined();
   expect(await session.next()).toBe(true);
   const id=session.state.attempt.puzzleId;
   expect(catalog.getPuzzle(id).bucket).toBe(bucketTurn('relax',index+1).bucket);
   seen.push(id);
  }
  expect(new Set(seen).size).toBe(seen.length);
 },20_000);

 it.each([undefined,1] as const)('continues an old assignment marker %s and keeps its pin on replace and restart',async version=>{
  usePilot();
  const original=progressed(60);
  original.meta.freeProgress={relax:24,challenge:0};
  const puzzle=catalog.freeTrackPuzzle('relax',24);
  const previous={...createAttempt(puzzle,'old-free','free'),freeTrack:'relax' as const,freeIndex:24};
  previous.placements[puzzle.cells.find(c=>c.given===undefined)!.id]='t0';
  if(version!==undefined)Object.assign(previous,{freeAssignmentVersion:version});
  original.meta.inactive.free={attempt:previous,result:null};
  const {load,repo,session}=await setup(original);
  expect(await session.openFreeTrack('relax')).toBe('opened');
  expect(session.state.attempt).toEqual(previous);
  expect(await session.openFreeTrack('challenge')).toBe('confirm_replace');
  expect(session.state.meta.freeIssuance).toBeUndefined();
  expect(await session.openFreeTrack('challenge',true)).toBe('opened');
  expect(session.state.meta.freeIssuance?.relax).toEqual({version:2,since:24,issued:{},
   pin:{index:24,puzzleId:puzzle.puzzleId,policy:'legacy'}});
  const restored=await load(),attemptBefore=restored.state.attempt;
  expect(await restored.openFreeTrack('relax')).toBe('confirm_replace');
  expect(restored.state.attempt).toEqual(attemptBefore);
  expect(await restored.openFreeTrack('relax',true)).toBe('opened');
  expect(restored.state.attempt.puzzleId).toBe(puzzle.puzzleId);
  const issuance=structuredClone(restored.state.meta.freeIssuance);
  expect(await restored.restart()).toBe(true);
  expect(await restored.newGame('relax',true)).toBe('opened');
  expect((await repo.load()).meta.freeIssuance).toEqual(issuance);
  expect(restored.state.attempt.freeIndex).toBe(24);
 });

 it('does not reselect a committed field after it is solved in Campaign or charge that win again',async()=>{
  usePilot();
  const id=catalog.newFreeTrackPuzzle('relax',0,[]).puzzleId;
  const position=catalog.getPuzzle(id).campaignPosition;
  const {session,load}=await setup(progressed(position-1));
  expect(await session.openFreeTrack('relax')).toBe('opened');
  expect(session.state.attempt.puzzleId).toBe(id);
  expect(await session.openFreeTrack('challenge',true)).toBe('opened');
  expect(await session.openCampaign()).toBe('opened');
  expect((await solve(session)).baseCoins).toBeGreaterThan(0);
  const restored=await load();
  expect(await restored.openFreeTrack('relax',true)).toBe('opened');
  expect(restored.state.attempt.puzzleId).toBe(id);
  expect(restored.state.meta.freeIssuance?.relax?.issued[id]?.count).toBe(1);
  const stale=freeTrackOffer(restored.state,'relax')!;
  const result=await solve(restored);
  expect(result.baseCoins).toBe(0);
  expect(restored.state.meta.freeProgress?.relax).toBe(1);
  expect(await restored.openOffer(stale,true)).toBe('unavailable');
  const current=freeTrackOffer(restored.state,'relax')!;
  expect(await restored.openOffer({...current,freeIndex:0},true)).toBe('unavailable');
  expect((await load()).state.result).toEqual(result);
 });

 it('preserves paid missions, canonicalizes old witnesses and declines unavailable bucket plans without writing',async()=>{
  usePilot();
  const old=progressed(60);
  refreshQuests(old);
  const oldWitness=freeTrackOffer(old,'relax')!;
  delete oldWitness.freeIndex;
  const quests=old.meta.quests!;
  quests.slots[0]={goalId:'win1',target:1,progress:1,paid:true};
  quests.slots[1]={goalId:'free',target:1,progress:0,paid:false};
  quests.witness=[oldWitness];
  old.meta.slotReceipts=[quests.dayKey+':0'];
  const {session,repo}=await setup(old);
  expect(session.questOffer(1)).toMatchObject({puzzleId:oldWitness.puzzleId,freeIndex:0});
  expect(await session.openQuest(1)).toBe('opened');
  expect(session.state.attempt.puzzleId).toBe(oldWitness.puzzleId);
  const plan=session.state.meta.quests!;
  expect(plan.slots[0]).toEqual(quests.slots[0]);
  expect(plan.witness.length).toBeLessThanOrEqual(3);
  const valid=findWitness(plan.slots,availableOffers(session.state),plan.dayKey,60,[]);
  expect(plan.witness).toEqual(valid);
  const before=await repo.load();
  vi.spyOn(catalog,'freeTrackBucket').mockReturnValue([]);
  expect(await session.openFreeTrack('challenge',true)).toBe('unavailable');
  expect(await repo.load()).toEqual(before);
 });

 it('commits once across durable failure, retry, a lost acknowledgment and cold restore',async()=>{
  usePilot();
  const {session,repo,memory,load}=await setup(progressed(60));
  const offered=freeTrackOffer(session.state,'relax')!;
  const before=await repo.load();
  memory.failure='before';
  await expect(session.openFreeTrack('relax')).rejects.toThrow('write failed');
  expect(await repo.load()).toEqual(before);
  expect(freeTrackOffer(session.state,'relax')).toEqual(offered);
  memory.failure='after';
  expect(await session.openFreeTrack('relax')).toBe('opened');
  memory.failure='none';
  const cold=await load(),data=cold.state.meta.freeIssuance?.relax;
  expect(data?.issued[offered.puzzleId!]?.count).toBe(1);
  expect(cold.state.attempt.puzzleId).toBe(offered.puzzleId);
  expect(await cold.openFreeTrack('relax')).toBe('opened');
  expect((await repo.load()).meta.freeIssuance?.relax).toEqual(data);
  const malformed=structuredClone(cold.state);
  malformed.meta.freeIssuance!.relax!.issued[offered.puzzleId]!.lastIndex=4;
  expect(()=>decodeSave(malformed)).toThrow('Corrupt Free assignment history');
 });

 it('resumes a replay at its old position without replacing the next assignment',async()=>{
  usePilot();
  const {session,load}=await setup(progressed(60));
  await session.openFreeTrack('relax');
  const won=await solve(session);
  expect((await load()).state.result).toEqual(won);
  await session.restart();
  await session.openCampaign();
  const restored=await load();
  expect(await restored.openFreeTrack('relax')).toBe('opened');
  expect(restored.state.attempt.puzzleId).toBe(won.puzzleId);
  expect(restored.state.attempt.freeIndex).toBe(0);
  const next=freeTrackOffer(restored.state,'relax',true)!;
  expect(next.freeIndex).toBe(1);
  expect(await restored.newGame('relax')).toBe('confirm_replace');
  expect(await restored.newGame('relax',true)).toBe('opened');
  expect(restored.state.attempt.puzzleId).toBe(next.puzzleId);
  expect(restored.state.meta.freeIssuance?.relax?.issued[won.puzzleId]?.count).toBe(1);
 });

 it('honors a saved pilot pin in a regular build and uses legacy selection on the following position',async()=>{
  usePilot();
  const {session,load}=await setup(progressed(60));
  await session.openFreeTrack('relax');
  const issued=session.state.attempt.puzzleId;
  await session.openFreeTrack('challenge',true);
  vi.stubEnv('MODE','test');
  const regular=await load();
  expect(await regular.openFreeTrack('relax',true)).toBe('opened');
  expect(regular.state.attempt.puzzleId).toBe(issued);
  await solve(regular);
  const expected=catalog.newFreeTrackPuzzle('relax',1,regular.state.profile.solvedIds).puzzleId;
  expect(await regular.next()).toBe(true);
  expect(regular.state.attempt.puzzleId).toBe(expected);
  expect(regular.state.meta.freeIssuance?.relax).toMatchObject({issued:{[issued]:{count:1}},pin:{index:1,policy:'legacy'}});
 });
});

describe('ISSUE-01 mixed play through the session and storage',()=>{
 it('compares the same Campaign, Daily, switch, abandon and reopen script for both policies',async()=>{
  const boundary=catalog.newFreeTrackPuzzle('relax',0,[]).campaignPosition-1;
  const rows=[];
  for(const [prefix,firstTrack] of [[15,'challenge'],[60,'relax'],[boundary,'relax']] as const){
   for(const policy of ['legacy','d4-v2'] as const){
    vi.stubEnv('MODE',policy==='d4-v2'?'issuance-pilot':'test');
    const {clock,load,repo,session:initial}=await setup(progressed(prefix));
    let session=initial;
    const lastSeen=new Map<string,string>(),rerolls:string[]=[];
    const completed:Record<FreeTrack,string[]>={relax:[],challenge:[]};
    const start=async(track:FreeTrack)=>{
     const index=session.state.meta.freeProgress?.[track]??0;
     const key=`${track}:${index}`,projection=freeTrackOffer(session.state,track);
     expect(await session.openFreeTrack(track,true)).toBe('opened');
     const id=session.state.attempt.puzzleId;
     expect(projection?.puzzleId).toBe(id);
     expect(session.state.attempt.freeIndex).toBe(index);
     expect(catalog.getPuzzle(id).bucket).toBe(bucketTurn(track,index).bucket);
     const previous=lastSeen.get(key);
     if(previous && previous!==id)rerolls.push(`${key} ${previous} → ${id}`);
     lastSeen.set(key,id);
    };
    let campaignWins=0,dailyWins=0,coldStarts=0;
    for(let step=0;step<36;step++){
     const track=step%2===0?firstTrack:firstTrack==='relax'?'challenge':'relax';
     await start(track);
     if(step%4===0){
      await start(track==='relax'?'challenge':'relax');
      expect(await session.openCampaign()).toBe('opened');
      await solve(session);campaignWins++;
      await start(track);
     }
     if(step%6===2){
      clock.now=new Date(Date.parse(clock.now)+86_400_000).toISOString();
      await session.refreshDay();
      expect(await session.openDaily(session.state.meta.effectiveDay)).toBe('opened');
      expect((await solve(session)).dailyCoins).toBe(catalog.config.dailyBonusCoins);
      dailyWins++;
      await start(track);
     }
     if(step%5===0){
      const previous=session.state.attempt.puzzleId;
      expect(await session.restart()).toBe(true);
      await session.navigate('home');
      session=await load();coldStarts++;
      await start(track);
      expect(session.state.attempt.puzzleId).toBe(previous);
     }
     const issued=session.state.attempt.puzzleId;
     const expectedBase=session.state.profile.solvedIds.includes(issued)?0:
      catalog.config.difficultyRewards[catalog.getPuzzle(issued).difficulty].coins;
     const win=await solve(session);
     expect(win.baseCoins).toBe(expectedBase);
     completed[track].push(issued);
    }
    const state=await repo.load();
    expect(state.meta.freeProgress).toEqual({relax:18,challenge:18});
    if(policy==='d4-v2'){
     expect(rerolls).toEqual([]);
     const tracked=Object.values(state.meta.freeIssuance!).flatMap(t=>Object.values(t.issued));
     expect(tracked.reduce((total,row)=>total+row.count,0)).toBe(lastSeen.size);
     expect(tracked.length).toBeLessThanOrEqual(225);
    }else{
     expect(state.meta.freeIssuance).toBeUndefined();
     if(prefix===boundary)expect(rerolls.length).toBeGreaterThan(0);
    }
    rows.push({prefix,firstTrack,policy,campaignWins,dailyWins,coldStarts,rerolls,issuedPositions:lastSeen.size,
     relax:{...assignments(completed.relax),ids:completed.relax},
     challenge:{...assignments(completed.challenge),ids:completed.challenge}});
   }
  }
  report('mixed-sessions',{source:'GameSession plus real SaveRepository, in-memory disk adapter, the same scripted actions',rows});
 },90_000);
});
