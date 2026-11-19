import { describe, expect, it } from 'vitest';
import { config, getPuzzle } from '../src/content/catalog';
import { createAttempt } from '../src/core/engine';
import { createSave, decodeSave, settleCompletion } from '../src/app/model';
import { RecoveryRequired, SAVE_KEY, SaveRepository } from '../src/app/saveRepository';
import { GameSession } from '../src/app/session';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import type { Save } from '../src/app/model';

class Memory implements StorageAdapter{
 data=new Map<string,string>();failure:'none'|'before'|'after'|'ambiguous'='none';unreadable=false;
 async getItem(k:string):Promise<string|null>{if(this.unreadable)throw Error('read failed');return this.data.get(k)??null;}
 async setItem(k:string,v:string):Promise<void>{if(k===SAVE_KEY&&this.failure==='before')throw Error('disk full');this.data.set(k,v);if(k===SAVE_KEY&&this.failure!=='none'){if(this.failure==='ambiguous')this.unreadable=true;throw Error('ack lost');}}
 async removeItem(k:string):Promise<void>{this.data.delete(k);}
}
const fresh=()=>createSave('profile','2026-11-18T10:00:00.000Z','Asia/Yekaterinburg','first');
async function setup(state?:Save){const storage=new Memory();if(state)storage.data.set(SAVE_KEY,JSON.stringify(state));const repo=new SaveRepository(storage,fresh);let id=0;const session=new GameSession(await repo.load(),repo,()=>`op${++id}`);return{storage,repo,session};}
describe('P04/P05/P06: durable game operations',()=>{
 it('saves the first move, result, cursor, wallet and reward receipt together; cold reentry never pays twice',async()=>{
  const{storage,repo,session}=await setup();await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},3,{commandId:'one',expectedRevision:0});
  expect(session.state.profile.coins).toBe(130);expect(session.state.profile.xp).toBe(10);expect(session.state.profile.campaignCursor).toBe(1);expect(session.state.result?.coins).toBe(10);
  const loaded=await repo.load();expect(loaded.attempt.elapsedPlaying).toBe(3);expect(settleCompletion(loaded)).toEqual(loaded);
  expect((await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},0,{commandId:'one',expectedRevision:0})).outcome).toBe('duplicate');
  const restarted=new GameSession(await new SaveRepository(storage,fresh).load(),repo,()=> 'next');await restarted.restart();await restarted.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});expect(restarted.state.profile.coins).toBe(130);expect(restarted.state.result?.coins).toBe(0);
 });
 it('restores exact duplicate instances and user pause, independently of external blockers',async()=>{
  const s=fresh();s.attempt=createAttempt(getPuzzle('cm-own-01-007'),'seven');const{session,repo}=await setup(s);
  await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:0});await session.command({type:'PlaceFromTray',tokenId:'t2',cellId:1});await session.update({},true,12);
  const loaded=await repo.load();expect(loaded.attempt.placements).toEqual({'0':'t0','1':'t2'});expect(loaded.attempt.userPaused).toBe(true);expect(loaded.attempt.elapsedPlaying).toBe(12);
 });
 it('charges exactly once for a verified hint, including a repeated call after restart; undo preserves the charge',async()=>{
  const s=fresh();s.attempt=createAttempt(getPuzzle('cm-own-01-010'),'ten');const{session,repo}=await setup(s);
  const plan=session.prepareHelp('explain')!;const result=await session.help('explain','stable-help',0,plan);expect(result.costCoins).toBe(60);expect(session.state.profile.coins).toBe(60);
  const restored=new GameSession(await repo.load(),repo,()=> 'id');expect(await restored.help('explain','stable-help',0,plan)).toEqual(result);expect(restored.state.profile.coins).toBe(60);
  await restored.command({type:'Undo'});expect(restored.state.profile.coins).toBe(60);expect(restored.state.attempt.assisted).toBe(true);expect(restored.state.attempt.hintsUsed).toBe(1);
 });
 it('spends credits first and returns zero cost for stale, invalid, no-step, insufficient and solved requests',async()=>{
  const s=fresh();s.attempt=createAttempt(getPuzzle('cm-own-01-010'),'ten');s.profile.hintCredits=1;s.profile.coins=0;const{session}=await setup(s);let plan=session.prepareHelp('explain')!;
  expect((await session.help('explain','stale',99,plan)).outcome).toBe('stale_snapshot');const bad=structuredClone(plan);bad.assignments[0]!.value=99;expect((await session.help('explain','bad',0,bad)).outcome).toBe('invalid_proof');
  expect((await session.help('explain','empty',0,null)).outcome).toBe('no_step');
  expect((await session.help('explain','credit',0,plan)).costCredits).toBe(1);expect(session.state.profile.hintCredits).toBe(0);
  plan=session.prepareHelp('explain')!;expect((await session.help('explain','poor',1,plan)).outcome).toBe('insufficient_resource');expect(session.state.profile.coins).toBe(0);
  const first=await setup();await first.session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});expect((await first.session.help('reveal','won',1,null)).outcome).toBe('already_solved');
 });
 it('keeps the last durable state if a write fails before mutation and allows the same gesture retry',async()=>{
  const{storage,session,repo}=await setup();storage.failure='before';const metadata={commandId:'retry-same',expectedRevision:0};
  await expect(session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},0,metadata)).rejects.toThrow();expect(session.state.profile.coins).toBe(120);expect((await repo.load()).attempt.placements).toEqual({});
  storage.failure='none';await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},0,metadata);expect(session.state.profile.coins).toBe(130);
 });
 it('persists a zero-cost refusal under its operation ID as well',async()=>{
  const s=fresh();s.attempt=createAttempt(getPuzzle('cm-own-01-010'),'ten');const{session,repo}=await setup(s);
  const refused=await session.help('explain','no-step-id',0,null);const valid=session.prepareHelp('explain')!;
  const restored=new GameSession(await repo.load(),repo,()=> 'other');expect(await restored.help('explain','no-step-id',0,valid)).toEqual(refused);expect(restored.state.profile.coins).toBe(120);expect(restored.state.attempt.hintsUsed).toBe(0);
 });
 it('recognizes committed data when persistence succeeded but its acknowledgement failed',async()=>{
  const{storage,session,repo}=await setup();storage.failure='after';await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});expect(session.state.profile.coins).toBe(130);expect((await repo.load()).result?.coins).toBe(10);
 });
 it('blocks mutation until durable state can be reloaded after an ambiguous write plus failed read',async()=>{
  const{storage,session,repo}=await setup();storage.failure='ambiguous';await expect(session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2})).rejects.toBeInstanceOf(RecoveryRequired);
  storage.failure='none';storage.unreadable=false;await expect(session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2})).rejects.toBeInstanceOf(RecoveryRequired);
  const loaded=await repo.load();expect(loaded.profile.coins).toBe(130);expect(settleCompletion(loaded)).toEqual(loaded);
 });
 it('quarantines corrupt primary, restores last-good backup, and rejects corruption without a backup',async()=>{
  const{storage,session,repo}=await setup();await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});storage.data.set(SAVE_KEY,'broken bytes');const loaded=await repo.load();expect(loaded.profile.coins).toBe(120);expect(storage.data.get(SAVE_KEY+'.quarantine')).toBe('broken bytes');expect(repo.recoveredBackup).toBe(true);
  const bad=new Memory();bad.data.set(SAVE_KEY,'broken');await expect(new SaveRepository(bad,fresh).load()).rejects.toThrow();
 });
 it('detects a stale writer instead of overwriting a newer confirmed profile',async()=>{
  const{storage,session}=await setup();const repo2=new SaveRepository(storage,fresh);const old=await repo2.load();await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});await expect(repo2.commit(0,{...old,revision:1})).rejects.toThrow('revision');
 });
 it('grants every rank/card milestone exactly once across the complete campaign, including 228/229',async()=>{
  const{session}=await setup();
  // Deterministic integration fixture: actual engine actions, own answers only drive test input.
  const answers: Record<string,{answer:number[]}> = {
    ...(await import('../docs/spec/product/content_v09/author_solutions.json')).default,
    ...(await import('../docs/spec/product/content_v2/author_solutions.json')).default,
  };
  for(let i=0;i<240;i++){
   const p=getPuzzle(session.state.attempt.puzzleId),answer=answers[p.puzzleId]!.answer;
   for(const cell of p.cells.filter(c=>c.given===undefined)){const used=new Set(Object.values(session.state.attempt.placements));const token=p.tray.findIndex((v,n)=>v===answer[cell.id]&&!used.has('t'+n));await session.command({type:'PlaceFromTray',tokenId:'t'+token,cellId:cell.id});}
   expect(session.state.attempt.status).toBe('won');expect(settleCompletion(session.state)).toEqual(session.state);
   if(i===7)expect(session.state.profile.paidCardIds).toHaveLength(1);if(i===227||i===228){expect(session.state.profile.fragments).toBe(48);expect(session.state.profile.paidCardIds).toHaveLength(12);}
   if(i===228)expect(session.state.result?.cardCoins).toBe(0);
   if(i<239)expect(await session.next()).toBe(true);
  }
  expect(session.state.profile.solvedIds).toHaveLength(240);expect(session.state.profile.campaignCursor).toBe(240);expect(await session.next()).toBe(false);expect(decodeSave(session.state)).toEqual(session.state);expect(config.collection.fragmentWinThresholds).toHaveLength(48);
 },75_000);
});
