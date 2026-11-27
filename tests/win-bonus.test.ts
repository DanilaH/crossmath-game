import {describe,expect,it} from 'vitest';
import {createSave,decodeSave,rankThreshold} from '../src/app/model';
import type {Save} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {SaveRepository,SAVE_KEY} from '../src/app/saveRepository';
import {boards,config,getPuzzle} from '../src/content/catalog';
import {createAttempt} from '../src/core/engine';
import {canRequestReward,canShowInterstitial,createRewardRequest} from '../src/platform/adState';
import {winBonusCandidate,winBonusOffer} from '../src/platform/winBonus';
import answers from '../docs/spec/product/content_v09/author_solutions.json';
const solutions:Record<string,{answer:number[]}>=answers;
const now='2026-11-28T12:00:00Z';
class Memory {
 data=new Map<string,string>();fail=false;
 async getItem(k:string){return this.data.get(k)??null;}
 async setItem(k:string,v:string){if(this.fail&&k===SAVE_KEY)throw Error('Disk failure');this.data.set(k,v);}
 async removeItem(k:string){this.data.delete(k);}
}
async function setup(difficulty='easy',paidDay=false){
 const storage=new Memory(),seed=createSave('bonus-profile',now,'UTC','a','content-v1');
 const puzzle=boards.find(p=>p.difficulty===difficulty)!;
 seed.attempt=createAttempt(puzzle,'a');seed.profile.campaignCursor=puzzle.campaignPosition-1;
 seed.profile.solvedIds=boards.filter(p=>p.puzzleId!==puzzle.puzzleId).slice(0,6).map(p=>p.puzzleId);
 seed.profile.xp=rankThreshold(1)-config.difficultyRewards[puzzle.difficulty].xp;
 if(paidDay){
  seed.meta.issuedDays=1;seed.meta.quests={dayKey:'2026-11-28',issueIndex:0,configVersion:config.configVersion,witness:[],replacements:[],slots:config.goals.slice(0,3).map(g=>({goalId:g.id,target:g.goal,progress:g.goal,paid:true}))};
  seed.meta.slotReceipts=[0,1,2].map(i=>`2026-11-28:${i}`);seed.meta.setReceipts=['2026-11-28'];
 }
 const repo=new SaveRepository(storage,()=>seed);let n=0;
 const session=new GameSession(await repo.load(),repo,()=>`bonus-${++n}`,()=>now);
 const used=new Set<number>();
 for(const c of puzzle.cells.filter(c=>c.given===undefined)){
  const i=puzzle.tray.findIndex((value,index)=>value===solutions[puzzle.puzzleId]!.answer[c.id]&&!used.has(index));used.add(i);
  await session.command({type:'PlaceFromTray',tokenId:'t'+i,cellId:c.id});
 }
 expect(session.state.result!.baseCoins).toBe(config.difficultyRewards[puzzle.difficulty].coins);
 return {storage,repo,session};
}
function persistedRequest(save:Save,id='stored'){
 const win=winBonusOffer(save,true)!;expect(win).not.toBeNull();
 save.ads.requests[id]={request:{id,profileId:save.profile.id,kind:'win-bonus',win}};
 return save.ads.requests[id]!.request;
}
it('honors a previously durable candidate receipt with the candidate switched off, once',async()=>{
 const {session,repo}=await setup();persistedRequest(session.state);await session.update({},false);
 const before=await repo.load(),coins=before.profile.coins,receipt={id:'stored',profileId:before.profile.id,outcome:'earned' as const};
 await session.next();const next=structuredClone(session.state.result);
 expect(await session.acceptReward(receipt,()=>true)).toBe('applied');
 expect(session.state.profile.coins).toBe(coins+20);expect(session.state.result).toEqual(next);
 expect(session.state.profile.hintCredits).toBe(before.profile.hintCredits);
 expect(await session.acceptReward(receipt,()=>true)).toBe('already-applied');
 const reopened=new GameSession(await repo.load(),repo,()=> 'new-id',()=>now);
 await reopened.acceptReward(receipt,()=>true);expect(reopened.state.profile.coins).toBe(coins+20);
 expect(reopened.state.ads.interstitialGate!.nextEligibleAtMs).toBe(120000);
});
it('strictly validates optional target without changing old schema4 saves',async()=>{
 const {session}=await setup();const old=decodeSave(session.state);expect(old.schemaVersion).toBe(4);
 persistedRequest(old);expect(decodeSave(old)).toEqual(old);
 for(const patch of [{delta:21},{baseCoins:0},{policy:'remote'},{puzzleId:'unknown'},{resultId:'win:'}]){
  const bad=structuredClone(old);Object.assign(bad.ads.requests.stored!.request.win!,patch);expect(()=>decodeSave(bad)).toThrow();
 }
});
it('never creates the candidate in regular mode or changes the ordinary reward',async()=>{
 if(winBonusCandidate)return;
 const {session,repo}=await setup(),before=await repo.load();
 expect(winBonusOffer(session.state)).toBeNull();expect(await session.beginReward('win-bonus')).toBeNull();
 expect(await repo.load()).toEqual(before);expect(session.state.result!.rankCoins).toBe(60);
});
describe.runIf(winBonusCandidate)('isolated WIN-RV-01 proposal',()=>{
 it('adds exactly20 after a base10 + rank60 receipt70, with the daily plan already paid',async()=>{
  const {session}=await setup('easy',true);expect(session.state.result!.coins).toBe(70);const coins=session.state.profile.coins;
  const request=(await session.beginReward('win-bonus'))!;
  await session.acceptReward({id:request.id,profileId:request.profileId,outcome:'earned'},()=>true);
  expect(session.state.profile.coins).toBe(coins+20);expect(session.state.result!.coins).toBe(70);
 });
 it.each(['easy','standard','hard','expert'])('adds only 2×base for %s, never ranks or other rewards',async difficulty=>{
  const {session,repo}=await setup(difficulty),before=await repo.load(),result=structuredClone(before.result),base=before.result!.baseCoins!;
  const request=(await session.beginReward('win-bonus'))!;expect(request.win!.delta).toBe(2*base);
  expect(canRequestReward(session.state,'win-bonus')).toBe(false);expect(canShowInterstitial(session.state)).toBe(false);
  const receipt={id:request.id,profileId:request.profileId,outcome:'earned' as const};
  await session.acceptReward(receipt,()=>true);
  expect(session.state.profile.coins).toBe(before.profile.coins+2*base);expect(session.state.result).toEqual({...result,interstitialRequested:true});
  for(const field of ['xp','rank','fragments','paidCardIds','solvedIds'] as const)expect(session.state.profile[field]).toEqual(before.profile[field]);
  expect(await session.beginReward('win-bonus')).toBeNull();await session.acceptReward(receipt,()=>true);expect(session.state.profile.coins).toBe(before.profile.coins+2*base);
 });
 it('bounds first-five, replay, Daily, offline capability-independent domain eligibility',async()=>{
  const {session}=await setup(),save=session.state;
  save.profile.solvedIds=save.profile.solvedIds.slice(0,5);expect(winBonusOffer(save)).toBeNull();
  save.profile.solvedIds.push(boards[100]!.puzzleId);expect(winBonusOffer(save)).not.toBeNull();
  save.result!.first=false;expect(winBonusOffer(save)).toBeNull();save.result!.first=true;
  save.attempt.mode='daily';expect(winBonusOffer(save)).toBeNull();save.attempt.mode='endless';expect(winBonusOffer(save)).toBeNull();
 });
 it.each(['failed','cancelled'] as const)('late earned after %s + a different request cannot pay the same result twice',async outcome=>{
  const {session,repo}=await setup(),coins=session.state.profile.coins;
  const first=(await session.beginReward('win-bonus'))!;
  await session.acceptReward({id:first.id,profileId:first.profileId,outcome},()=>true);
  expect(session.state.profile.coins).toBe(coins);
  const second=(await session.beginReward('win-bonus'))!;
  await session.acceptReward({id:first.id,profileId:first.profileId,outcome:'earned'},()=>true);
  await session.acceptReward({id:second.id,profileId:second.profileId,outcome:'earned'},()=>true);
  expect(session.state.profile.coins).toBe(coins+20);expect(session.state.ads.requests[second.id]!.settlement).toBe('expired');
  expect((await repo.load()).ads.interstitialGate!.nextEligibleAtMs).toBe(120000);
 });
 it('retains both effect and claim through failed write, request/commit restarts and duplicate delivery',async()=>{
  const {session,repo,storage}=await setup();const request=(await session.beginReward('win-bonus'))!,before=await repo.load();
  const receipt={id:request.id,profileId:request.profileId,outcome:'earned' as const};
  storage.fail=true;await expect(session.acceptReward(receipt,()=>true)).rejects.toThrow();expect(session.state).toEqual(before);
  storage.fail=false;const restored=new GameSession(await repo.load(),repo,()=> 'restart',()=>now);
  await restored.acceptReward(receipt,()=>true);expect(restored.state.profile.coins).toBe(before.profile.coins+20);
  const committed=new GameSession(await repo.load(),repo,()=> 'after-ack',()=>now);
  await committed.acceptReward(receipt,()=>true);expect(committed.state.profile.coins).toBe(before.profile.coins+20);
 });
 it('never redirects a claim to another profile and rejects request id reuse',async()=>{
  const {session,repo}=await setup(),request=(await session.beginReward('win-bonus'))!,before=await repo.load();
  await expect(session.acceptReward({id:request.id,profileId:'other',outcome:'earned'},()=>true)).rejects.toThrow();
  expect(session.state).toEqual(before);expect(()=>createRewardRequest(session.state,request.id,'hint')).toThrow();
 });
});
