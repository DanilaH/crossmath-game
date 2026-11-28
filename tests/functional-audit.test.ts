import {describe,it,expect} from 'vitest';
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
describe.skipIf(!product.candidate)('Independent functional audit — characterization, not release pass',()=>{
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
  console.log('AUDIT_REVEAL '+JSON.stringify(rows));expect(rows.map(x=>x.total)).toEqual([240,275,90]);expect(rows.every(x=>x.total===x.missing+x.partialFailure+x.solved)).toBe(true);
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
  console.log('AUDIT_CONCURRENT '+JSON.stringify(row));expect(outcomes.some(x=>x.status==='fulfilled')).toBe(true);
 });
 it('FUNC-03 valid large undo journal can exceed the native save cap; boundary characterization',async()=>{
  const p=referenceBoards.reduce((a,b)=>a.tray.length>b.tray.length?a:b),s=fresh();
  s.attempt=createAttempt(p,'long-audit');let a=s.attempt;const cell=p.cells.find(c=>c.given===undefined)!;
  for(let i=0;i<40;i++){const action=i%2===0?{type:'PlaceFromTray' as const,tokenId:'t0',cellId:cell.id}:{type:'ReturnToTray' as const,cellId:cell.id};const t=applyCommand(p,a,{...action,commandId:'audit-seed-'+i,expectedRevision:a.boardRevision});expect(t.outcome).toBe('applied');a=t.state;}
  const states=a.history,base=structuredClone(a);base.history=[];base.commandIds=[];const size=(n:number)=>{const candidate=structuredClone(s);candidate.attempt={...structuredClone(base),boardRevision:n,history:Array.from({length:n},(_,i)=>states[i%states.length]!),commandIds:Array.from({length:n},(_,i)=>'audit-'+String(i).padStart(30,'0'))};return candidate;};
  const bytes=(x:Save)=>new TextEncoder().encode(JSON.stringify(x)).length;
  let low=0,high=100000;while(low+1<high){const mid=(low+high)>>1;if(bytes(size(mid))>4*1024*1024)high=mid;else low=mid;}
  const near=size(low),over=size(high);decodeSave(over);const {repo}=await setup(near);over.revision=near.revision+1;let outcome='accepted';try{await repo.commit(near.revision,over)}catch(e){outcome=String(e);}
  console.log('AUDIT_CAP '+JSON.stringify({puzzle:p.puzzleId,tray:p.tray.length,syntheticHistory:high,bytes:bytes(over),outcome}));expect(bytes(over)).toBeGreaterThan(4*1024*1024);
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
