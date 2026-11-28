import {describe,it,expect} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
const emit=(name:string,value:unknown)=>{mkdirSync('.test-output/functional31/unit',{recursive:true});writeFileSync('.test-output/functional31/unit/'+name+'.json',JSON.stringify(value,null,2)+'\n');};
import {boards,referenceBoards,additionalBoards,getPuzzle,config,campaignSequence} from '../src/content/catalog';
import {createAttempt,applyCommand,applyHelpLayout} from '../src/core/engine';
import {assertInventory,tokenValue} from '../src/core/types';
import {reveal,materializeHelp} from '../src/help/reveal';
import {createSave,decodeSave} from '../src/app/model';
import {SAVE_KEY,SaveRepository} from '../src/app/saveRepository';
import {GameSession,storedSlot} from '../src/app/session';
import {calendarDayIndex,dayFromIndex} from '../src/meta/calendar';
import {product} from '../src/product/releaseProfile';
import type {Save} from '../src/app/model';
import oldAnswers from '../docs/spec/product/content_v09/author_solutions.json';
import newAnswers from '../docs/spec/product/content_v2/author_solutions.json';
import labAnswers from '../docs/experiments/content03/author_solutions.json';
import mapping from '../docs/acceptance/release29/content-map.json';

class Memory {
 data=new Map<string,string>();
 failure:'none'|'before'|'after'='none';
 async getItem(k:string):Promise<string|null>{return this.data.get(k)??null;}
 async setItem(k:string,v:string){if(k===SAVE_KEY&&this.failure==='before')throw Error('before write');this.data.set(k,v);if(k===SAVE_KEY&&this.failure==='after')throw Error('lost ACK');}
 async removeItem(k:string){this.data.delete(k);}
}
const clock={now:'2026-10-01T12:00:00Z'};
const fresh=()=>createSave('independent-audit',clock.now,'UTC','initial');
let serial=0;
const make=(s:Save,r:SaveRepository)=>new GameSession(s,r,()=>`audit-${++serial}`,()=>clock.now);
const answer:Record<string,{answer:number[]}>={...oldAnswers,...newAnswers,...Object.fromEntries(mapping.map(m=>[m.product,(labAnswers as Record<string,{answer:number[]}>)[m.source]!]))};
async function setup(s?:Save){const storage=new Memory();if(s)storage.data.set(SAVE_KEY,JSON.stringify(s));const repo=new SaveRepository(storage,fresh);return{storage,repo,session:make(await repo.load(),repo)};}
async function win(s:GameSession){const p=getPuzzle(s.state.attempt.puzzleId);for(const c of p.cells.filter(c=>c.given===undefined)){
 const used=new Set(Object.values(s.state.attempt.placements));const i=p.tray.findIndex((v,i)=>v===answer[p.puzzleId]!.answer[c.id]&&!used.has('t'+i));
 if(s.state.attempt.placements[c.id])continue;
 expect(i).toBeGreaterThanOrEqual(0);expect((await s.command({type:'PlaceFromTray',tokenId:'t'+i,cellId:c.id})).outcome).toBe('applied');
 }expect(s.state.attempt.status).toBe('won');}
describe.skipIf(!product.candidate)('Independent functional audit — regression of researcher reproductions',()=>{
 it('FUNC-01 measures actual Reveal coverage across every shipped puzzle',()=>{
  const groups=[boards,referenceBoards,additionalBoards];const rows=groups.map(group=>{
   const missing:string[]=[],bad:string[]=[],solved:string[]=[];
   for(const p of group){let a=createAttempt(p,'audit-reveal-'+p.puzzleId);let i=0;
    if(!reveal(p,a)){missing.push(p.puzzleId);continue;}
    while(a.status==='playing'&&i<p.tray.length){const plan=reveal(p,a);if(!plan)break;const layout=materializeHelp(p,a,plan);if(!layout)break;a=applyHelpLayout(p,a,layout,'step'+i++);}
    (a.status==='won'?solved:bad).push(p.puzzleId);
   }
   return {total:group.length,missing:missing.length,firstMissing:missing[0],partialFailure:bad.length,solved:solved.length};
  });
  emit('reveal-coverage',rows);console.log('AUDIT_REVEAL '+JSON.stringify(rows));expect(rows.map(x=>x.total)).toEqual([240,275,90]);expect(rows.map(x=>x.solved)).toEqual([240,275,90]);expect(rows.every(x=>x.missing===0&&x.partialFailure===0)).toBe(true);
 });
 it('FUNC-02 two concurrent repositories reading the same revision: detect lost confirmed write',async()=>{
  class BarrierMemory extends Memory{
   armed=false;arrivals=0;release!:()=>void;barrier=new Promise<void>(r=>this.release=r);
   override async getItem(k:string){const snapshot=await super.getItem(k);if(this.armed&&k===SAVE_KEY&&this.arrivals<2){if(++this.arrivals===2)this.release();await this.barrier;}return snapshot;}
  }
  const storage=new BarrierMemory(),repoA=new SaveRepository(storage,fresh),repoB=new SaveRepository(storage,fresh);
  const a=await repoA.load(),b=await repoB.load();const nextA=structuredClone(a),nextB=structuredClone(b);nextA.revision++;nextB.revision++;nextA.settings.sound=true;nextB.settings.vibration=true;
  storage.armed=true;const outcomes=await Promise.allSettled([repoA.commit(a.revision,nextA),repoB.commit(b.revision,nextB)]);storage.armed=false;
  const final=await repoA.load();const row={outcomes:outcomes.map(x=>x.status),sound:final.settings.sound,vibration:final.settings.vibration,revision:final.revision};
  emit('concurrent-writers',row);console.log('AUDIT_CONCURRENT '+JSON.stringify(row));expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(x=>x.status==='rejected')).toHaveLength(1);
 });
 it('FUNC-03 valid large undo journal can exceed the native save cap; boundary characterization',async()=>{
  const p=referenceBoards.reduce((a,b)=>a.tray.length>b.tray.length?a:b),s=fresh();
  s.attempt=createAttempt(p,'long-audit');let a=s.attempt;const cell=p.cells.find(c=>c.given===undefined)!;
  for(let i=0;i<40;i++){const action=i%2===0?{type:'PlaceFromTray' as const,tokenId:'t0',cellId:cell.id}:{type:'ReturnToTray' as const,cellId:cell.id};const t=applyCommand(p,a,{...action,commandId:'audit-seed-'+i,expectedRevision:a.boardRevision});expect(t.outcome).toBe('applied');a=t.state;}
  const states=a.history,base=structuredClone(a);base.history=[];base.commandIds=[];const size=(n:number)=>{const candidate=structuredClone(s);candidate.attempt={...structuredClone(base),boardRevision:n,history:Array.from({length:n},(_,i)=>states[i%states.length]!),commandIds:Array.from({length:n},(_,i)=>'audit-'+String(i).padStart(30,'0'))};return candidate;};
  const bytes=(x:Save)=>new TextEncoder().encode(JSON.stringify(x)).length;
  let low=0,high=100000;while(low+1<high){const mid=(low+high)>>1;if(bytes(size(mid))>4*1024*1024)high=mid;else low=mid;}
  const near=size(low),over=size(high);decodeSave(over);const {repo,storage}=await setup(near);over.revision=near.revision+1;let outcome='accepted';try{await repo.commit(near.revision,over)}catch(e){outcome=String(e);}
  emit('history-cap',{puzzle:p.puzzleId,synthetic:true,history:high,logicalBytes:bytes(over),storedBytes:[...storage.data.values()].reduce((sum,v)=>sum+new TextEncoder().encode(v).length,0),maxValueBytes:Math.max(...[...storage.data.values()].map(v=>new TextEncoder().encode(v).length)),outcome});console.log('AUDIT_CAP '+JSON.stringify({puzzle:p.puzzleId,tray:p.tray.length,syntheticHistory:high,bytes:bytes(over),outcome}));expect(bytes(over)).toBeGreaterThan(4*1024*1024);expect(outcome).toBe('accepted');expect(await repo.load()).toEqual(over);
 },60000);
 it('real session roundtrips across campaign, mixed modes, league, archive, reward and write faults',async()=>{
  clock.now='2026-10-01T12:00:00Z';const {storage,repo}=await setup();let session=make(await repo.load(),repo);
  let wins=0,roundtrips=0;
  const reload=async()=>{const before=structuredClone(session.state);session=make(await repo.load(),repo);expect(session.state).toEqual(before);roundtrips++;};
  for(let i=0;i<15;i++){if(i)expect(await session.next()).toBe(true);await win(session);wins++;await reload();}
  expect(await session.enterLeague()).toBe(true);await reload();
  expect(await session.next()).toBe(true);const campaign=structuredClone(session.state.attempt);
  for(let day=0;day<20;day++){clock.now=dayFromIndex(calendarDayIndex('2026-10-01')+day)+'T12:00:00Z';await session.refreshDay();
   if(!session.state.league?.active)await session.enterLeague();
   const date=clock.now.slice(0,10);expect(await session.openDaily(date)).toBe('opened');await win(session);wins++;await reload();
   expect(await session.openFreeTrack(day%2?'challenge':'relax',true)).toBe('opened');await win(session);wins++;await reload();
   expect(await session.openCampaign()).toBe('opened');expect(session.state.attempt.id).toBe(campaign.id);expect(session.state.attempt.placements).toEqual(campaign.placements);await reload();
  }
  const before=session.state.profile.coins;const req=await session.beginReward('hint');expect(req).not.toBeNull();const event={id:req!.id,profileId:req!.profileId,outcome:'earned' as const},credits=session.state.profile.hintCredits;
  storage.failure='before';await expect(session.acceptReward(event,()=>true)).rejects.toThrow();expect(session.state.profile.hintCredits).toBe(credits);
  storage.failure='after';expect(await session.acceptReward(event,()=>true)).toBe('applied');storage.failure='none';await reload();expect(session.state.profile.hintCredits).toBe(credits+config.rewardedHintCredits);
  expect(await session.acceptReward(event,()=>true)).toBe('already-applied');expect(session.state.profile.coins).toBe(before);
  const p=getPuzzle(session.state.attempt.puzzleId),cell=p.cells.find(c=>c.given===undefined)!;const state=structuredClone(session.state);
  const meta={commandId:'fault-tile',expectedRevision:state.attempt.boardRevision};storage.failure='before';await expect(session.command({type:'PlaceFromTray',cellId:cell.id,tokenId:'t0'},0,meta)).rejects.toThrow();expect(session.state).toEqual(state);
  storage.failure='after';expect((await session.command({type:'PlaceFromTray',cellId:cell.id,tokenId:'t0'},0,meta)).outcome).toBe('applied');storage.failure='none';await reload();expect((await session.command({type:'PlaceFromTray',cellId:cell.id,tokenId:'t0'},0,meta)).outcome).toBe('duplicate');assertInventory(p,session.state.attempt);
  console.log('AUDIT_JOURNEY '+JSON.stringify({wins,roundtrips,dates:session.state.meta.completedDates.length,leagueHistory:session.state.league?.history.length,coins:session.state.profile.coins,creditExactlyOnce:true}));
 },120000);
});

describe.skipIf(!product.candidate)('Independent extended state and lifecycle probes',()=>{
 it('deterministic legal input perturbations across every catalog board, including duplicate values and saved Undo',()=>{
  let seed=0xACED2026;const rng=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  let applied=0,refused=0,roundtrips=0;
  for(const p of [...boards,...referenceBoards,...additionalBoards]){
   let a=createAttempt(p,'random-'+p.puzzleId);
   const cells=p.cells.filter(c=>c.given===undefined);
   for(let n=0;n<40&&a.status==='playing';n++){
    const cell=cells[rng(cells.length)]!,other=cells[rng(cells.length)]!;
    const free=a.trayOrder.filter(t=>!Object.values(a.placements).includes(t));
    const k=rng(5);const action=k===0?{type:'PlaceFromTray' as const,tokenId:free[rng(Math.max(1,free.length))]??'missing',cellId:cell.id}:k===1?{type:'MoveCell' as const,from:cell.id,to:other.id}:k===2?{type:'ReturnToTray' as const,cellId:cell.id}:k===3?{type:'Undo' as const}:{type:'SortTray' as const};
    const result=applyCommand(p,a,{...action,commandId:'random-'+n,expectedRevision:a.boardRevision});
    if(result.outcome==='applied'){applied++;a=result.state;}else{refused++;expect(result.state).toEqual(a);}
    assertInventory(p,a);for(const history of a.history)assertInventory(p,history);
    if(n%10===0){const save=fresh();if(a.status==='playing'){save.attempt=a;const loaded=decodeSave(JSON.parse(JSON.stringify(save)));expect(loaded.attempt).toEqual(a);roundtrips++;}}
   }
  }
  console.log('AUDIT_INPUT '+JSON.stringify({boards:605,applied,refused,codecRoundtrips:roundtrips}));
 },120000);
 it('full month, archive compaction, parked old Daily recovery, duplicate completion and corrupt-primary recovery',async()=>{
  clock.now='2026-10-01T12:00:00Z';const {repo,storage}=await setup();let s=make(await repo.load(),repo);
  for(let i=0;i<5;i++){if(i)await s.next();await win(s);}
  for(let i=0;i<31;i++){clock.now=dayFromIndex(calendarDayIndex('2026-10-01')+i)+'T12:00:00Z';await s.refreshDay();expect(await s.openDaily(clock.now.slice(0,10))).toBe('opened');await win(s);const before=structuredClone(s.state);s=make(await repo.load(),repo);expect(s.state).toEqual(before);}
  expect(s.state.meta.completedDates).toHaveLength(31);expect(s.state.meta.monthlyTrophies?.['2026-10']?.earnedAt).toBeTruthy();
  const trophy=structuredClone(s.state.meta.monthlyTrophies);const balance=s.state.profile.coins;expect(await s.restart()).toBe(true);await win(s);expect(s.state.result!.dailyCoins).toBe(0);expect(s.state.profile.coins).toBe(balance);
  clock.now='2026-11-01T12:00:00Z';await s.refreshDay();expect(await s.openDaily('2026-11-01')).toBe('opened');
  const p=getPuzzle(s.state.attempt.puzzleId),c=p.cells.find(c=>c.given===undefined)!;const idx=p.tray.findIndex(x=>x===answer[p.puzzleId]!.answer[c.id]);
  expect((await s.command({type:'PlaceFromTray',cellId:c.id,tokenId:'t'+idx})).outcome).toBe('applied');const parked=structuredClone(s.state.attempt);
  expect(await s.openCampaign()).toBe('opened');
  clock.now='2026-12-05T12:00:00Z';await s.refreshDay();s=make(await repo.load(),repo);
  const archived=Object.keys(s.state.meta.archivedDailyResults??{}).length;expect(archived).toBe(31);expect(s.state.meta.monthlyTrophies).toEqual(trophy);
  expect(await s.openDaily('2026-11-01')).toBe('opened');expect(s.state.attempt).toEqual(parked);expect(await s.restart()).toBe(false);await win(s);expect(s.state.result?.dailyCoins).toBe(config.dailyBonusCoins);
  const won=structuredClone(s.state);await s.update({sound:true},false);
  storage.data.set(SAVE_KEY,'corrupt');s=make(await repo.load(),repo);expect(repo.recoveredBackup).toBe(true);expect(s.state.profile).toEqual(won.profile);expect(s.state.result).toEqual(won.result);expect(storage.data.get(SAVE_KEY+'.quarantine')).toBe('corrupt');
  expect(s.state.meta.monthlyTrophies).toEqual(trophy);expect(s.state.meta.completedDates).toHaveLength(32);
  console.log('AUDIT_ARCHIVE '+JSON.stringify({dates:s.state.meta.completedDates.length,archived,trophy:true,expiredUnfinishedResumed:true,backupRecovered:true,receiptPreserved:true}));
 },120000);
});
