import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { GameSession } from '../src/app/session';
import { SaveRepository, SAVE_KEY } from '../src/app/saveRepository';
import type { Save } from '../src/app/model';
import { calendarDayIndex, calendarPuzzle, dayFromIndex } from '../src/meta/calendar';
import { getPuzzle } from '../src/content/catalog';
import original from '../docs/spec/product/content_v09/author_solutions.json';
import current from '../docs/spec/product/content_v2/author_solutions.json';
const answers:Record<string,{answer:number[]}>= {...original,...current};
const root=process.env.CROSSMATH_LONG_DAILY;
it.skipIf(!root)('updates the real 828-date legacy save and persists every tile to 1100',async()=>{
 const raw=readFileSync(root+'/before/legacy-829-open.json','utf8'), historical=JSON.parse(raw) as Save;
 const memory=new Map([[SAVE_KEY,raw],[SAVE_KEY+'.backup',readFileSync(root+'/before/legacy-828.json','utf8')]]);
 const repo=new SaveRepository({async getItem(k){return memory.get(k)??null},async setItem(k,v){memory.set(k,v)},async removeItem(k){memory.delete(k)}},()=>{throw Error('must keep old profile');});
 let now=historical.meta.effectiveDay+'T12:00:00Z';
 const s=new GameSession(await repo.load(),repo,randomUUID,()=>now);
 const migratedBytes=Buffer.byteLength(memory.get(SAVE_KEY)!);
 expect(s.state.attempt).toEqual(historical.attempt);
 expect(s.state.profile).toEqual(historical.profile);
 expect(s.state.meta.assignments).toEqual(historical.meta.assignments);
 expect(s.state.meta.monthlyTrophies).toEqual(historical.meta.monthlyTrophies);
 expect(s.state.meta.completedDates).toEqual(historical.meta.completedDates);
 expect(s.state.meta.inactive.campaign).toEqual(historical.meta.inactive.campaign);
 for(const [key,slot] of Object.entries(historical.meta.inactive)){
  if(slot.attempt.mode!=='daily')continue;
  const day=slot.attempt.dayKey!;
  expect(s.state.meta.inactive[key] ?? s.state.meta.archivedDailyResults?.[day]).toEqual(s.state.meta.inactive[key]?slot:slot.result);
 }
 async function solve(){
  const puzzle=getPuzzle(s.state.attempt.puzzleId);
  for(const cell of puzzle.cells){
   if(cell.given!==undefined||s.state.attempt.placements[cell.id]!==undefined)continue;
   const used=new Set(Object.values(s.state.attempt.placements));
   const token=puzzle.tray.findIndex((v,i)=>v===answers[puzzle.puzzleId]!.answer[cell.id]&&!used.has('t'+i));
   const move=await s.command({type:'PlaceFromTray',tokenId:'t'+token,cellId:cell.id});
   expect(move.outcome).toBe('applied');
  }
  expect(s.state.attempt.status).toBe('won');
 }
 const milestones:Record<string,unknown>={};
 for(let i=829;i<=1100;i++){
  const day=dayFromIndex(calendarDayIndex('2026-01-01')+i-1);
  now=day+'T12:00:00Z';
  if(i>829) expect(await s.openDaily(day)).toBe('opened');
  expect(s.state.attempt.puzzleId).toBe(calendarPuzzle(day));
  await solve();
  expect(s.state.meta.completedDates.length).toBe(i);
  expect(s.state.result?.dailyCoins).toBe(30);
  if(i===829||i%25===0){
   const saved=await repo.load();
   milestones[i]={bytes:Buffer.byteLength(memory.get(SAVE_KEY)!),months:Object.keys(saved.meta.monthlyTrophies!).length,fullSlots:Object.keys(saved.meta.inactive).length,compactReceipts:Object.keys(saved.meta.archivedDailyResults!).length};
   console.log('checkpoint',i,milestones[i]);
  }
 }
 const last=await repo.load(), win=structuredClone(last.result);
 expect(last.meta.completedDates).toHaveLength(1100);
 expect(last.meta.completedDates.filter(d=>d===last.attempt.dayKey)).toHaveLength(1);
 expect(last.profile.id).toBe(historical.profile.id);
 expect(await s.restart()).toBe(true);
 await solve();
 expect(s.state.result?.dailyCoins).toBe(0);
 expect(s.state.result?.dailyTrophyMonth).toBeUndefined();
 expect(s.state.profile.coins).toBe(last.profile.coins);
 expect(await s.openCampaign()).toBe('opened');
 expect(s.state.attempt.puzzleId).toBe('cm-own-01-006');
 const puzzle=getPuzzle(s.state.attempt.puzzleId);
 const cell=puzzle.cells.find(c=>c.given===undefined)!;
 await s.command({type:'PlaceFromTray',tokenId:'t0',cellId:cell.id});
 expect((await repo.load()).attempt.placements[cell.id]).toBe('t0');
 await s.command({type:'Undo'});
 expect((await repo.load()).attempt.placements[cell.id]).toBeUndefined();
 writeFileSync(root+'/long-route.json',JSON.stringify({before:Buffer.byteLength(raw),migratedBytes,milestones,win,repeatedDailyCoins:0},null,2));
},900000);
