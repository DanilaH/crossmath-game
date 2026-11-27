import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createSave,decodeSave,settleCompletion} from '../src/app/model';
import type {Save,Completion} from '../src/app/model';
import {getPuzzle,routes} from '../src/content/catalog';
import {SAVE_KEY,SaveRepository} from '../src/app/saveRepository';
import {validateLeague} from '../src/meta/league';
import {recordVersion} from '../src/meta/career';
import answers from '../docs/spec/product/content_v09/author_solutions.json';
const BACKUP_KEY=SAVE_KEY+'.backup';
const now='2026-11-23T09:00:00Z';
function fixture():Save{
 const s=createSave('recovery',now,'UTC','campaign-won'),p=getPuzzle(s.attempt.puzzleId);
 s.profile.createdAt='2020-01-01T00:00:00Z';
 const answer=(answers as Record<string,{answer:number[]}>)[p.puzzleId]!.answer,used=new Set<number>();
 for(const cell of p.cells.filter(c=>c.given===undefined)){const i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));used.add(i);s.attempt.placements[cell.id]='t'+i;}
 s.attempt.status='won';const save=settleCompletion(s,now);
 const slot=(id:string,mode:'campaign'|'free'|'daily'|'endless',day?:string)=>{
  const attempt={...structuredClone(save.attempt),id,mode,...(day?{dayKey:day}:{}),...(mode==='endless'?{runId:'old-run',stageId:0}:{})};
  const result={...structuredClone(save.result!),attemptId:id,id:'win:'+id};delete result.campaignFinished;
  if(mode==='endless'){
   const p=getPuzzle(routes.endlessSequence[0]!);attempt.puzzleId=p.puzzleId;attempt.placements={};attempt.trayOrder=p.tray.map((_,i)=>'t'+i);
   const answer=(answers as Record<string,{answer:number[]}>)[p.puzzleId]!.answer,used=new Set<number>();
   for(const cell of p.cells.filter(c=>c.given===undefined)){const i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));used.add(i);attempt.placements[cell.id]='t'+i;}
   result.puzzleId=p.puzzleId;result.stageKey='old-run:0';result.runScore=100;result.stageScore=100;
   if(!save.profile.solvedIds.includes(p.puzzleId))save.profile.solvedIds.push(p.puzzleId);
  }
  return {attempt,result};
 };
 save.meta.inactive.free=slot('free-won','free');
 save.meta.inactive['daily:2026-11-22']=slot('daily-one','daily','2026-11-22');
 save.meta.inactive['daily:2026-11-21']=slot('daily-two','daily','2026-11-21');
 save.meta.inactive.endless=slot('legacy-endless','endless');
 save.career.run={id:'old-run',version:recordVersion,stage:0,solvedStages:1,score:100,lives:3,assisted:false,status:'active'};
 save.meta.archivedDailyResults={'2026-01-01':slot('old-daily','daily','2026-01-01').result};
 save.meta.completedDates=['2026-01-01','2026-11-21','2026-11-22'];
 for(const day of save.meta.completedDates)save.meta.assignments[day]={puzzleId:p.puzzleId,calendarVersion:routes.version};
 return decodeSave(save);
}
const receipts=(s:Save):[string,Completion][]=>[['current',s.result!],...Object.entries(s.meta.inactive).map(([key,slot])=>[key,slot.result!] as [string,Completion]),...Object.entries(s.meta.archivedDailyResults??{}).map(([day,r])=>['archive:'+day,r] as [string,Completion])];
describe('LEAGUE-01 corruption isolation in every durable result slot',()=>{
 it('starts from a valid profile containing campaign, free, two dates, suspended Endless and an archived date',()=>{expect(receipts(fixture())).toHaveLength(6);});
 for(const [name,bad] of Object.entries({null:null,false:false,zero:0,empty:'',array:[],object:{},namespace:{weekId:'bad',points:1},profile:{weekId:'foreign:2026-11-23:league-lab-2',points:1},weight:{weekId:'recovery:2026-11-23:league-lab-2',points:900},partial:{weekId:'recovery:2026-11-23:league-lab-2',points:1,fromPlace:2}})){
  it(`isolates ${name} from all six results, writes repairs and never falls back to an older wallet`,async()=>{
   const s=fixture(),expected=structuredClone(s);
   for(const [,r] of receipts(s))(r as unknown as {league:unknown}).league=structuredClone(bad);
   const backup=fixture();backup.profile.coins=1;
   const data=new Map([[SAVE_KEY,JSON.stringify(s)],[BACKUP_KEY,JSON.stringify(backup)]]);
   const storage={getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{data.set(k,v);},removeItem:async(k:string)=>{data.delete(k);}};
   const repo=new SaveRepository(storage,fixture),loaded=await repo.load();
   expect(repo.recoveredBackup).toBe(false);expect(loaded.profile).toEqual(expected.profile);expect(loaded.attempt).toEqual(expected.attempt);expect(loaded.career).toEqual(expected.career);
   expect(Object.keys(loaded.leagueReceiptQuarantine!)).toHaveLength(6);
   expect(receipts(loaded)).toEqual(receipts(expected));
   expect(JSON.parse(data.get(SAVE_KEY)!)).toEqual(loaded);
   const cold=await new SaveRepository(storage,fixture).load();expect(cold).toEqual(loaded);
  });
 }
 it.each(['free','daily:2026-11-22','daily:2026-11-21','endless'])('also isolates a corrupt currently active %s result',async key=>{
  const s=fixture(),next=s.meta.inactive[key]!;delete s.meta.inactive[key];s.meta.inactive.campaign={attempt:s.attempt,result:s.result};
  s.attempt=next.attempt;s.result=next.result;s.meta.activeSlot=key;
  (s.result as unknown as {league:unknown}).league={};const before=structuredClone(s.profile),attempt=structuredClone(s.attempt);
  const loaded=decodeSave(s);expect(loaded.profile).toEqual(before);expect(loaded.attempt).toEqual(attempt);expect(loaded.result!.league).toBeUndefined();expect(Object.keys(loaded.leagueReceiptQuarantine!)).toHaveLength(1);
 });
 it.each(['league-v2-active-win.json','league-v2-closed-win.json'])('preserves the old ordinary win and owned result in %s',file=>{
  const old=JSON.parse(readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8')) as Save,expected=structuredClone(old);
  expect(decodeSave(old)).toEqual(expected);expect(old.profile.coins).toBe(130);expect(old.result!.league!.points).toBe(1);expect(old.leagueQuarantine).toBeUndefined();
 });
 it('continues to reject corruption in core reward amounts',()=>{const s=fixture();s.result!.coins=-1;expect(()=>decodeSave(s)).toThrow();});
 it.each(['league-v1-profile.json','league-v2-profile.json'])('preserves the already running legacy %s plans byte for byte',file=>{
  const old=JSON.parse(readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8')) as Save;
  const before=JSON.stringify(old.league);validateLeague(old.league,old.profile);
  const restored=decodeSave(old);expect(JSON.stringify(restored.league)).toBe(before);
  expect(restored.leagueQuarantine).toBeUndefined();expect(restored.profile).toEqual(old.profile);
 });
});
