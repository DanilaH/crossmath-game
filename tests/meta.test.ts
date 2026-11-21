import { describe, expect, it } from 'vitest';
import { boards, config, dailyBank, dailyVersion, freeAssignmentVersion, freeTrackPuzzle, getPuzzle, newFreeTrackPuzzle, referenceBoards, routes } from '../src/content/catalog';
import { rotations } from '../src/content/rotation';
import { createSave, decodeSave, settleCompletion } from '../src/app/model';
import { GameSession, storedSlot } from '../src/app/session';
import { SaveRepository, SAVE_KEY } from '../src/app/saveRepository';
import { unlockAnnouncement } from '../src/ui/locale';
import { createAttempt } from '../src/core/engine';
import { calendarDayIndex, calendarPuzzle, dateAvailable, dayFromIndex, profileDay } from '../src/meta/calendar';
import { availableOffers, contribution, findWitness, freeTrackOffer, goals, resolveQuests } from '../src/meta/missions';
import type { Save } from '../src/app/model';
import type { Offer, QuestSet } from '../src/meta/types';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import answers from '../docs/spec/product/content_v09/author_solutions.json';
import newAnswers from '../docs/spec/product/content_v2/author_solutions.json';
const solutions:Record<string,{answer:number[]}>={...answers, ...newAnswers};
class Memory implements StorageAdapter { data=new Map<string,string>();async getItem(k:string){return this.data.get(k)??null;}async setItem(k:string,v:string){this.data.set(k,v);}async removeItem(k:string){this.data.delete(k);} }
async function setup(day='2026-11-18',state?:Save){const storage=new Memory(),clock={now:day+'T12:00:00.000Z'};const fresh=()=>createSave('profile',clock.now,'UTC','initial');if(state)storage.data.set(SAVE_KEY,JSON.stringify(state));const repo=new SaveRepository(storage,fresh);let n=0;const session=new GameSession(await repo.load(),repo,()=>`meta-op-${++n}`,()=>clock.now);return{session,repo,storage,clock};}
async function win(session:GameSession){const p=getPuzzle(session.state.attempt.puzzleId),answer=solutions[p.puzzleId]!.answer;for(const c of p.cells.filter(c=>c.given===undefined)){if(session.state.attempt.placements[c.id])continue;const used=new Set(Object.values(session.state.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[c.id]&&!used.has('t'+i));expect(token).toBeGreaterThanOrEqual(0);await session.command({type:'PlaceFromTray',tokenId:'t'+token,cellId:c.id});}expect(session.state.attempt.status).toBe('won');}
async function campaign(session:GameSession,count:number){for(let i=0;i<count;i++){if(session.state.attempt.status==='won')await session.next();await win(session);}}
function set(ids:string[],progress=[0,0,0],paid=[false,false,false]):QuestSet{return{dayKey:'2026-11-18',issueIndex:0,configVersion:config.configVersion,slots:ids.map((id,i)=>({goalId:id,target:goals.get(id)!.goal,progress:progress[i]!,paid:paid[i]!})),replacements:[],witness:[]};}

describe('D calendar and mode state',()=>{
 it('announces each newly available mode once, including both choices on the fifteenth unique win', async () => {
  const {session, repo} = await setup();
  await campaign(session, 3);
  expect(session.state.result?.unlockedModes).toEqual(['free']);
  await campaign(session, 2);
  expect(session.state.result?.unlockedModes).toEqual(['daily']);
  await campaign(session, 9);
  expect(session.state.result?.unlockedModes).toEqual([]);
  await campaign(session, 1);
  const modes = session.state.result!.unlockedModes;
  expect(modes).toEqual(['challenge', 'endless']);
  for (const language of ['ru', 'en'] as const) {
    const text = language === 'ru' ? 'Новые режимы · Испытание и Endless' : 'New modes · Challenge and Endless';
    expect(unlockAnnouncement(language, modes)).toBe(text);
    expect(unlockAnnouncement(language, ['endless'])).toBe(text);
  }
  const before = await repo.load();
  expect(settleCompletion(before)).toEqual(before);
  await session.restart();
  await win(session);
  expect(session.state.result?.unlockedModes).toEqual([]);
  expect(session.state.profile.coins).toBe(before.profile.coins);
 });
 it('uses fixed IANA dates, leap days and mathematical modulo before the epoch',()=>{
  expect(profileDay('2026-11-18T20:30:00Z','Asia/Yekaterinburg')).toBe('2026-11-19');expect(profileDay('2026-11-18T20:30:00Z','America/New_York')).toBe('2026-11-18');
  expect(calendarDayIndex('2024-03-01')-calendarDayIndex('2024-02-28')).toBe(2);expect(calendarPuzzle('2025-12-31')).toBe(dailyBank.at(-1));expect(calendarPuzzle('2025-12-31',true)).toBe(routes.dailySequence.at(-1));
  expect(dateAvailable('2026-10-01T12:00:00Z','UTC','2026-11-18','2026-10-19')).toBe(true);expect(dateAvailable('2026-10-01T12:00:00Z','UTC','2026-11-18','2026-10-18')).toBe(false);expect(dateAvailable('2026-11-18T12:00:00Z','UTC','2026-11-18','2026-11-17')).toBe(false);
 });
 it('unlocks Free after 3; preserves a separate campaign and free attempt, IDs and active time',async()=>{
  const{session,repo}=await setup();expect(await session.openFree('easy')).toBe('unavailable');await campaign(session,3);await session.next();
  const campaignId=session.state.attempt.id;await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:0});const placed={...session.state.attempt.placements};
  expect(await session.openFree('easy',false,7)).toBe('opened');const freeId=session.state.attempt.id;expect(storedSlot(session.state,'campaign')!.attempt.elapsedPlaying).toBe(7);expect(session.state.attempt.elapsedPlaying).toBe(0);
  await session.openCampaign(3);expect(session.state.attempt.id).toBe(campaignId);expect(session.state.attempt.placements).toEqual(placed);expect(storedSlot(session.state,'free')!.attempt.elapsedPlaying).toBe(3);
  await session.openFree('easy');expect(session.state.attempt.id).toBe(freeId);expect((await repo.load()).attempt.id).toBe(freeId);expect(await session.openFree('standard')).toBe('unavailable');
 });
 it('requires confirmation before replacing an unfinished free board; unsolved content precedes replay',async()=>{
  const{session}=await setup();await campaign(session,10);await session.openFree('easy');const id=session.state.attempt.id;
  expect(await session.openFree('standard')).toBe('confirm_replace');expect(session.state.attempt.id).toBe(id);expect(await session.openFree('standard',true)).toBe('opened');expect(getPuzzle(session.state.attempt.puzzleId).difficulty).toBe('standard');
  await win(session);expect(await session.next()).toBe(true);expect(session.state.profile.solvedIds).not.toContain(session.state.attempt.puzzleId);
 });
 it('fifth win issues prospectively; new Easy Daily can produce the exact +100 receipt',async()=>{
  const day=Array.from({length:135},(_,i)=>dayFromIndex(calendarDayIndex('2026-11-18')+i)).find(d=>{const p=getPuzzle(calendarPuzzle(d,true));return p.difficulty==='easy'&&p.equations.length===4;})!;
  const previousPreview=createSave('profile',day+'T12:00:00Z','UTC','initial','content-v1');
  previousPreview.meta.assignments[day]={puzzleId:calendarPuzzle(day,true),calendarVersion:routes.version};
  const{session,repo}=await setup(day,previousPreview);await campaign(session,5);expect(session.state.meta.issuedDays).toBe(1);expect(session.state.meta.quests!.slots.every(s=>s.progress===0&&!s.paid)).toBe(true);
  expect(session.state.meta.contributedIds).toContain('cm-own-01-005');expect(await session.openDaily(day)).toBe('opened');await win(session);
  expect(session.state.result).toMatchObject({coins:100,xp:10,baseCoins:10,dailyCoins:30,taskCoins:30,setCoins:30,fragments:1});
  expect(settleCompletion(await repo.load(),day+'T13:00:00Z')).toEqual(await repo.load());
  const balance=session.state.profile.coins;await session.restart();await win(session);expect(session.state.result!.coins).toBe(0);expect(session.state.profile.coins).toBe(balance);
 });
 it('separates canonical reward, dated Daily bonus and today contributions across repeated calendar IDs',async()=>{
  const{session,clock}=await setup();await campaign(session,5);await session.openDaily('2026-11-18');await win(session);const id=session.state.attempt.puzzleId;
  clock.now=dayFromIndex(calendarDayIndex('2026-11-18')+dailyBank.length)+'T12:00:00Z';await session.refreshDay();const today=clock.now.slice(0,10);await session.openDaily(today);expect(session.state.attempt.puzzleId).toBe(id);await win(session);
  expect(session.state.result).toMatchObject({first:false,baseCoins:0,dailyCoins:30,xp:0});expect(session.state.meta.completedDates).toHaveLength(2);
 });
 it('finishes an old started Daily outside the window, preserving its bonus date and refusing a new attempt',async()=>{
  const{session,clock}=await setup();await campaign(session,5);await session.openDaily('2026-11-18');const attempt=session.state.attempt.id;await session.openCampaign();
  clock.now='2026-12-20T12:00:00Z';await session.refreshDay();expect(dateAvailable(session.state.profile.createdAt,'UTC',session.state.meta.effectiveDay,'2026-11-18')).toBe(false);
  expect(await session.openDaily('2026-11-18')).toBe('opened');expect(session.state.attempt.id).toBe(attempt);expect(await session.restart()).toBe(false);await win(session);expect(session.state.meta.completedDates).toContain('2026-11-18');expect(contribution('daily',{puzzleId:session.state.attempt.puzzleId,mode:'daily',dayKey:'2026-11-18'},session.state.meta.effectiveDay)).toBe(0);
  expect(await session.openDaily('2026-11-18')).toBe('unavailable');
 });
 it('allows an in-window retry but refuses an expired exhausted Daily from either slot',async()=>{
  const day='2026-11-18';const {session,clock}=await setup(day);await campaign(session,5);
  await session.openDaily(day);
  session.state.attempt.lives=0;session.state.attempt.status='out-of-lives';await session.update({},false);
  const id=session.state.attempt.id;
  clock.now='2026-12-18T12:00:00Z';await session.refreshDay();
  expect(await session.openDaily(day)).toBe('opened');expect(session.state.attempt.id).toBe(id);expect(session.canRestart()).toBe(true);
  clock.now='2026-12-19T12:00:00Z';await session.refreshDay();const revision=session.state.revision;
  expect(await session.openDaily(day)).toBe('unavailable');expect(await session.restart()).toBe(false);expect(session.state.revision).toBe(revision);
  await session.openCampaign();expect(await session.openDaily(day)).toBe('unavailable');expect(storedSlot(session.state,`daily:${day}`)?.attempt.id).toBe(id);
 });
 it('keeps old assigned dates and the legacy campaign while unassigned dates use the new bank',async()=>{
  const day='2026-11-18',previous=createSave('p',day+'T12:00:00Z','UTC','a','content-v1');
  previous.meta.assignments[day]={puzzleId:calendarPuzzle(day,true),calendarVersion:routes.version};
  const{session,clock,repo}=await setup(day,previous);
  await campaign(session,16);
  expect(session.state.attempt.puzzleId).toBe('cm-own-01-016');
  await session.openDaily(day);
  expect(session.state.attempt.puzzleId).toBe(calendarPuzzle(day,true));
  await session.openCampaign();
  clock.now='2026-11-19T12:00:00Z';
  await session.openDaily('2026-11-19');
  expect(session.state.meta.assignments['2026-11-19']).toEqual({puzzleId:calendarPuzzle('2026-11-19'),calendarVersion:dailyVersion});
  await session.openDaily(day);
  expect((await repo.load()).attempt.puzzleId).toBe(calendarPuzzle(day,true));
 });
 it('pins both Free cursors across replay, replacement and a cold start',async()=>{
  const{session,repo}=await setup();await campaign(session,3);
  expect(await session.openFreeTrack('challenge')).toBe('unavailable');
  await session.openFreeTrack('relax');
  expect(session.state.attempt.puzzleId).toBe('cm-own-02-040');
  await win(session);
  expect(session.state.meta.freeProgress).toEqual({relax:1,challenge:0});
  await session.restart();
  expect((await repo.load()).attempt.freeIndex).toBe(0);
  await win(session);
  expect(session.state.meta.freeProgress).toEqual({relax:1,challenge:0});
  await session.next();
  expect(session.state.attempt.puzzleId).toBe(newFreeTrackPuzzle('relax',1,session.state.profile.solvedIds).puzzleId);
  await session.openCampaign();await campaign(session,12);
  const current=storedSlot(session.state,'free')!.attempt;
  expect(await session.openFreeTrack('challenge')).toBe('confirm_replace');
  expect(storedSlot(session.state,'free')!.attempt).toEqual(current);
  expect(await session.openFreeTrack('challenge',true)).toBe('opened');
  expect((await repo.load()).attempt.freeIndex).toBe(0);
  await win(session);
  expect(session.state.meta.freeProgress).toEqual({relax:1,challenge:1});
 });
 it.each([true,false])('issues distinct first-pay IDs in both campaign/Relax orders (campaign first: %s)',async campaignFirst=>{
  const {session,repo}=await setup();await campaign(session,campaignFirst?16:3);
  if(campaignFirst)expect(session.state.result).toMatchObject({puzzleId:'cm-own-02-001',baseCoins:10});
  expect(await session.openFreeTrack('relax')).toBe('opened');await win(session);
  expect(session.state.result).toMatchObject({puzzleId:'cm-own-02-040',baseCoins:10});
  if(!campaignFirst){await session.openCampaign();await campaign(session,13);expect(session.state.result).toMatchObject({puzzleId:'cm-own-02-001',baseCoins:10});}
  expect((await repo.load()).meta.freeProgress?.relax).toBe(1);
 });
 it.each(['relax','challenge'] as const)('uses the same six baskets and issue policy for the menu, mission witness and Next in %s',async track=>{
  const {session}=await setup();await campaign(session,15);
  for(const [index,bucket] of rotations[track].entries()){
   const offer=availableOffers(session.state).find(o=>o.freeTrack===track)!;
   expect(getPuzzle(offer.puzzleId).bucket).toBe(bucket);
   expect(session.state.profile.solvedIds).not.toContain(offer.puzzleId);
   const opened=index===0 ? await session.openOffer(offer,false,0,true) : await session.next();
   expect(opened).toBe(index===0?'opened':true);
   expect(session.state.attempt).toMatchObject({puzzleId:offer.puzzleId,freeIndex:index,freeAssignmentVersion});
   if(track==='challenge'&&index===0)expect(offer.puzzleId).toBe('cm-own-02-190');
   await win(session);
  }
 });
 it('uses the last unsolved puzzle and advances the cursor when exhausted fallback repeats the last won ID',async()=>{
  const {session,repo}=await setup();await campaign(session,15);
  const pool=referenceBoards.filter(p=>p.bucket==='hard-short');
  const remaining=freeTrackPuzzle('challenge',1).puzzleId;
  session.state.profile.solvedIds.push(...pool.filter(p=>p.puzzleId!==remaining).map(p=>p.puzzleId));
  await session.update({},false);
  await session.openFreeTrack('challenge');expect(session.state.attempt.puzzleId).toBe(remaining);await win(session);
  const won=session.state.attempt.id;expect(await session.next()).toBe(true);
  expect((await repo.load()).attempt).toMatchObject({puzzleId:remaining,freeIndex:1,status:'playing'});
  expect(session.state.attempt.id).not.toBe(won);await win(session);
  expect(session.state.result?.baseCoins).toBe(0);expect(session.state.meta.freeProgress?.challenge).toBe(2);
 });
 it('rechecks an unaccepted Free quest offer after the old ID becomes solved',async()=>{
  const {session}=await setup();await campaign(session,5);
  session.state.meta.quests=set(['free','win1','eq1']);
  await session.refreshDay();
  const advertised=session.questOffer(0)!;expect(advertised).toMatchObject({mode:'free',freeTrack:'relax',puzzleId:'cm-own-02-040'});
  session.state.profile.solvedIds.push(advertised.puzzleId);
  await session.refreshDay();
  const updated=session.questOffer(0)!;
  expect(updated).toMatchObject({freeTrack:'relax',puzzleId:freeTrackOffer(session.state,'relax').puzzleId});
  expect(updated.puzzleId).not.toBe(advertised.puzzleId);
  expect(await session.openOffer(advertised,false,0,true)).toBe('unavailable');
  expect(await session.openOffer(updated,false,0,true)).toBe('opened');
  expect(session.state.attempt.puzzleId).toBe(updated.puzzleId);
 });
 it('restores a legacy active or parked layout and rejects a forged assignment bucket or version',async()=>{
  const {session,repo}=await setup();await campaign(session,15);
  const initial=session.state;
  const p=freeTrackPuzzle('relax',0),first=p.cells.find(c=>c.given===undefined)!;
  const old=createAttempt(p,'issued-previously','free');old.freeTrack='relax';old.freeIndex=0;
  old.placements[first.id]='t0';
  initial.meta.inactive.free={attempt:old,result:null};await session.update({},false);
  expect(freeTrackOffer(session.state,'relax').puzzleId).toBe(p.puzzleId);
  expect(await session.openFreeTrack('challenge')).toBe('confirm_replace');
  expect(storedSlot(await repo.load(),'free')?.attempt).toEqual(old);
  await session.openFreeTrack('relax');expect((await repo.load()).attempt).toEqual(old);
  const corrupt=await repo.load();corrupt.attempt.freeAssignmentVersion=freeAssignmentVersion;corrupt.attempt.freeIndex=1;corrupt.meta.freeProgress={relax:1,challenge:0};
  expect(()=>decodeSave(corrupt)).toThrow();
  await session.openCampaign();expect(storedSlot(await repo.load(),'free')?.attempt.placements).toEqual(old.placements);
 });
 it('advances active issuance once after missed days and never regresses on a clock rollback',async()=>{
  const{session,clock}=await setup();await campaign(session,5);const first=session.state.meta.issuedDays;
  clock.now='2026-11-21T12:00:00Z';await session.refreshDay();expect(session.state.meta.issuedDays).toBe(first+1);const set=structuredClone(session.state.meta.quests);
  clock.now='2026-11-19T12:00:00Z';expect(await session.refreshDay()).toBe(false);expect(session.state.meta.effectiveDay).toBe('2026-11-21');expect(session.state.meta.quests).toEqual(set);
 });
 it('moves the campaign cursor even when the next canonical ID was previously rewarded elsewhere',async()=>{
  const{session}=await setup();await campaign(session,5);await session.next();const id=session.state.attempt.puzzleId;session.state.profile.solvedIds.push(id);await session.update({},false);await win(session);expect(session.state.result!.baseCoins).toBe(0);expect(session.state.profile.campaignCursor).toBe(6);
 });
 it('Daily lives end at zero with free restart and do not leak into another mode',async()=>{
  const{session}=await setup();await campaign(session,5);await session.openDaily('2026-11-18');session.state.attempt.lives=0;session.state.attempt.status='out-of-lives';await session.update({},false);const balance=session.state.profile.coins;
  expect(await session.restart()).toBe(true);expect(session.state.attempt.lives).toBe(3);expect(session.state.profile.coins).toBe(balance);await session.openCampaign();expect(session.state.attempt.mode).toBe('campaign');
 });
});
describe('Relax Easy goal',()=>{
 it('records 1, 2, 2, 3 on the first rotation, survives a cold load, and never adds coins',async()=>{
  const {session,repo}=await setup();await campaign(session,3);
  expect(session.state.meta.relaxGoalIds).toBeUndefined();
  await session.openFreeTrack('relax');
  for(const [index,count] of [1,2,2,3].entries()){
   const balance=session.state.profile.coins;await win(session);const persisted=await repo.load(), result=persisted.result!;
   expect(persisted.meta.relaxGoalIds).toHaveLength(count);expect(result.relaxGoalProgress).toBe(count);
   expect(persisted.profile.coins-balance).toBe(result.coins);
   expect(result.coins).toBe(result.baseCoins!+result.rankCoins!+result.dailyCoins!+result.taskCoins!+result.setCoins!+result.cardCoins);
   expect(settleCompletion(persisted)).toEqual(persisted);
   if(index===1){
    await session.openCampaign();await win(session);expect(session.state.meta.relaxGoalIds).toHaveLength(2);
    expect(session.state.result?.relaxGoalProgress).toBeUndefined();await session.openFreeTrack('relax');
   } else if(index<3)await session.next();
  }
 });
 it('counts an assisted legacy Relax win on a previously paid campaign ID exactly once',async()=>{
  const {session,repo}=await setup();await campaign(session,16);
  const id=session.state.attempt.puzzleId;
  const old=createAttempt(getPuzzle(id),'old-relax-assignment','free');old.freeTrack='relax';old.freeIndex=0;
  session.state.meta.inactive.free={attempt:old,result:null};await session.update({},false);
  await session.openFreeTrack('relax');
  const plan=session.prepareHelp('reveal')!;
  const paid=await session.help('reveal','relax-assisted',session.state.attempt.boardRevision,plan);expect(paid.outcome).toBe('applied');
  await win(session);expect(session.state.attempt.assisted).toBe(true);
  expect(session.state.result).toMatchObject({puzzleId:id,baseCoins:0,relaxGoalProgress:1});
  await session.restart();await win(session);expect((await repo.load()).meta.relaxGoalIds).toEqual([id]);
  expect(session.state.result).toMatchObject({baseCoins:0,relaxGoalProgress:1});
  const duplicate=await repo.load();duplicate.meta.relaxGoalIds!.push(id);expect(()=>decodeSave(duplicate)).toThrow();
 });
 it('does not credit existing Relax receipts after an update; old receipt progress stays historical',async()=>{
  const {session,repo}=await setup();await campaign(session,3);await session.openFreeTrack('relax');
  await win(session);await session.next();await win(session);const second=await repo.load();
  const old=structuredClone(second);delete old.meta.relaxGoalIds;delete old.result!.relaxGoalProgress;
  const upgraded=decodeSave(old);expect(settleCompletion(upgraded)).toEqual(upgraded);
  expect(upgraded.meta.relaxGoalIds).toBeUndefined();
  await session.next();await win(session);await session.next();await win(session);const completed=await repo.load();
  const historical=decodeSave({...second,meta:{...second.meta,relaxGoalIds:completed.meta.relaxGoalIds!},profile:{...second.profile,solvedIds:completed.profile.solvedIds}});
  expect(historical.result?.relaxGoalProgress).toBe(2);
  expect(historical.meta.relaxGoalIds).toHaveLength(3);
 });
});
describe('D reachable daily missions',()=>{
 it('starts an actual replay for a mission instead of reopening an old result',async()=>{
  const{session,clock}=await setup();await campaign(session,5);const old=session.state.attempt.id;
  clock.now='2026-11-19T12:00:00Z';await session.refreshDay();const offer:Offer={puzzleId:session.state.attempt.puzzleId,mode:'campaign'};
  expect(await session.openOffer(offer,false,0,true)).toBe('opened');expect(session.state.attempt.status).toBe('playing');expect(session.state.attempt.id).not.toBe(old);await win(session);expect(session.state.result!.baseCoins).toBe(0);expect(session.state.meta.contributedIds).toContain(offer.puzzleId);
 });
 it('validates the 84 real-bank rotation/profile fixtures respecting locked and unlocked Endless',()=>{
  for(const wins of [5,8,15,50,228,240])for(let day=0;day<7;day++)for(const played of [false,true]){
   const state=createSave('p','2026-11-18T12:00:00Z','UTC','a');state.profile.solvedIds=boards.slice(0,wins).map(p=>p.puzzleId);state.profile.campaignCursor=wins;state.meta.effectiveDay=dayFromIndex(calendarDayIndex('2026-11-18')+day);
   if(played)state.meta.completedDates.push(state.meta.effectiveDay);
   const q=set(config.rotation[day]!);q.dayKey=state.meta.effectiveDay;
   const resolved=resolveQuests(q,availableOffers(state),wins,[]);expect(resolved,`${wins}/${day}/${played}`).not.toBeNull();expect(resolved!.witness.length).toBeLessThanOrEqual(3);expect(new Set(resolved!.witness.map(o=>o.puzzleId)).size).toBe(resolved!.witness.length);if(wins<15)expect(resolved!.slots.some(s=>s.goalId==='endless')).toBe(false);
  }
 });
 it('retains paid and partially completed sibling slots; replacement is one new action',()=>{
  const q=set(['win1','endless','eq6'],[1,0,3],[true,false,false]);const offers:Offer[]=[{puzzleId:'cm-own-01-016',mode:'campaign',campaignPosition:15},{puzzleId:'cm-own-01-017',mode:'campaign',campaignPosition:16}];
  const next=resolveQuests(q,offers,15,[])!;expect(next.slots[0]).toEqual(q.slots[0]);expect(next.slots[1]).toEqual({goalId:'route',target:1,progress:0,paid:false});expect(next.slots[2]!.goalId).toBe('eq6');expect(next.slots[2]!.progress).toBe(3);
  expect(resolveQuests(q,[],15,[])).toBeNull();
 });
 it('does not count the same ID in two modes or skip a future campaign prerequisite',()=>{
  const slots=set(['win2','route','eq1']).slots;
  expect(findWitness(slots,[{puzzleId:'cm-own-01-016',mode:'free'},{puzzleId:'cm-own-01-016',mode:'campaign',campaignPosition:15}],'2026-11-18',15)).toBeNull();
  const one=set(['win1','route','eq1']).slots;expect(findWitness(one,[{puzzleId:'cm-own-01-018',mode:'campaign',campaignPosition:17}],'2026-11-18',15)).toBeNull();
 });
});
describe('D schema/album migration',()=>{
 function legacy(wins:number,fragments:number,paid:string[]=[]){const s=createSave('old','2026-11-18T12:00:00Z','UTC','old-attempt');s.profile.solvedIds=boards.slice(0,wins).map(p=>p.puzzleId);s.profile.fragments=fragments;s.profile.paidCardIds=paid;const raw=JSON.parse(JSON.stringify(s));raw.schemaVersion=1;delete raw.meta;return raw;}
 it('preserves early placements and grants only a newly completed migrated card, once',async()=>{
  const raw=legacy(8,2);raw.attempt=createAttempt(getPuzzle('cm-own-01-007'),'two-fives');raw.attempt.placements={'0':'t0','1':'t2'};
  const first=decodeSave(raw);expect(first.profile.fragments).toBe(4);expect(first.profile.coins).toBe(140);expect(first.attempt.placements).toEqual(raw.attempt.placements);expect(decodeSave(first)).toEqual(first);
  const storage=new Memory();storage.data.set(SAVE_KEY,JSON.stringify(raw));const repo=new SaveRepository(storage,()=>{throw Error('Must not reset');});expect((await repo.load()).profile.coins).toBe(140);expect(JSON.parse(storage.data.get(SAVE_KEY)!).schemaVersion).toBe(4);expect((await repo.load()).profile.coins).toBe(140);
 });
 it('grandfathers historical full cards without receipts, preserves ahead-of-schedule progress and caps at 48',()=>{
  const historic=decodeSave(legacy(8,4));expect(historic.profile.coins).toBe(120);expect(historic.profile.paidCardIds).toEqual(['abacus']);
  const ahead=decodeSave(legacy(8,48));expect(ahead.profile.fragments).toBe(48);expect(ahead.profile.paidCardIds).toHaveLength(12);expect(ahead.profile.coins).toBe(120);
  expect(()=>decodeSave({...ahead,meta:{...ahead.meta,effectiveDay:'not-a-date'}})).toThrow();
 });
});
