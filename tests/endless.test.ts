import { describe,it,expect } from 'vitest';
import { createSave,decodeSave,settleCompletion } from '../src/app/model';
import { SaveRepository,SAVE_KEY } from '../src/app/saveRepository';
import { GameSession,storedSlot } from '../src/app/session';
import { boards,config,getPuzzle,routes } from '../src/content/catalog';
import { achievementValue,recordVersion } from '../src/meta/career';
import { availableOffers,findWitness,goals } from '../src/meta/missions';
import type { Save } from '../src/app/model';
import type { QuestSlot } from '../src/meta/types';
import answers from '../docs/spec/product/content_v09/author_solutions.json';
const solutions:Record<string,{answer:number[]}>=answers;
const now='2026-11-19T12:00:00Z';
class Memory {data=new Map<string,string>();failure:'none'|'before'|'after'='none';async getItem(k:string){return this.data.get(k)??null;}async removeItem(k:string){this.data.delete(k);}async setItem(k:string,v:string){if(k===SAVE_KEY&&this.failure==='before')throw Error('before');this.data.set(k,v);if(k===SAVE_KEY&&this.failure==='after')throw Error('ack');}}
async function setup(wins=15,raw?:unknown){const storage=new Memory(),fresh=()=>{const s=createSave('p',now,'UTC','initial');s.profile.solvedIds=boards.slice(0,wins).map(p=>p.puzzleId);s.profile.campaignCursor=wins;return s;};if(raw)storage.data.set(SAVE_KEY,JSON.stringify(raw));const repo=new SaveRepository(storage,fresh);let id=0;const session=new GameSession(await repo.load(),repo,()=>`e-${++id}`,()=>now);return{session,storage,repo};}
async function fill(s:GameSession){const p=getPuzzle(s.state.attempt.puzzleId),answer=solutions[p.puzzleId]!.answer;for(const c of p.cells.filter(c=>c.given===undefined)){if(s.state.attempt.placements[c.id])continue;const used=new Set(Object.values(s.state.attempt.placements)),n=p.tray.findIndex((v,i)=>v===answer[c.id]&&!used.has('t'+i));await s.command({type:'PlaceFromTray',tokenId:'t'+n,cellId:c.id});}}
async function win(s:GameSession){await fill(s);await s.command({type:'SubmitEndless'});expect(s.state.attempt.status).toBe('won');}
async function wrong(s:GameSession){await fill(s);const p=getPuzzle(s.state.attempt.puzzleId),cells=p.cells.filter(c=>c.given===undefined),first=cells[0]!,other=cells.find(c=>solutions[p.puzzleId]!.answer[c.id]!==solutions[p.puzzleId]!.answer[first.id])!;expect(other).toBeDefined();await s.command({type:'MoveCell',from:first.id,to:other.id});await s.command({type:'SubmitEndless'});}

describe('E1 Endless transaction and statistics',()=>{
 it('locks at 14 and preserves a separate slot, identity and active time at 15',async()=>{
  const{session,repo}=await setup(14);expect(await session.openEndless()).toBe('unavailable');session.state.profile.solvedIds.push(boards[14]!.puzzleId);await session.update({},false);
  const campaignId=session.state.attempt.id;expect(await session.openEndless(7)).toBe('opened');const runId=session.state.career.run!.id,attemptId=session.state.attempt.id;expect(session.state.career.modes.campaign.seconds).toBe(7);
  await session.openCampaign(3);expect(session.state.attempt.id).toBe(campaignId);await session.openEndless();expect(session.state.attempt.id).toBe(attemptId);expect(session.state.career.run!.id).toBe(runId);expect(session.state.attempt.elapsedPlaying).toBe(3);expect((await repo.load()).career.modes.endless.seconds).toBe(3);
 });
 it('requires explicit submission, gives one stage score and canonical reward, and restores the same result',async()=>{
  const{session,repo}=await setup();await session.openEndless();await fill(session);expect(session.state.attempt.status).toBe('playing');expect(session.state.career.run!.score).toBe(0);expect(session.state.result).toBeNull();
  const p=getPuzzle(session.state.attempt.puzzleId),points=10*p.equations.length*config.endless.multipliers[p.difficulty];await session.command({type:'SubmitEndless'});expect(session.state.result).toMatchObject({stageScore:points,runScore:points,stageKey:`${session.state.attempt.runId}:0`});expect(session.state.career.run!.solvedStages).toBe(1);
  const balance=session.state.profile.coins,save=await repo.load();expect(settleCompletion(save,now)).toEqual(save);await session.command({type:'SubmitEndless'});expect(session.state.profile.coins).toBe(balance);expect(session.state.career.modes.endless.completions).toBe(1);
 });
 it('charges a wrong changed submission once; incomplete and identical retries are free, undo never refunds',async()=>{
  const{session}=await setup();await session.openEndless();expect((await session.command({type:'SubmitEndless'})).outcome).toBe('unavailable');await wrong(session);expect(session.state.attempt.lives).toBe(2);expect(session.state.career.run!.lives).toBe(2);
  expect((await session.command({type:'SubmitEndless'})).outcome).toBe('no_change');expect(session.state.attempt.lives).toBe(2);await session.command({type:'Undo'});expect(session.state.attempt.lives).toBe(2);await session.command({type:'SubmitEndless'});expect(session.state.attempt.status).toBe('won');expect(session.state.career.modes.endless.mistakes).toBe(1);expect(session.state.career.modes.endless.undos).toBe(1);
  await session.next();expect(session.state.attempt.lives).toBe(2);expect(session.state.career.run!.stage).toBe(1);
 });
 it('fails at zero lives and records only on explicit finish; starting another run does not combine stages',async()=>{
  const{session}=await setup();await session.openEndless();await win(session);await session.next();
  await fill(session);const cells=getPuzzle(session.state.attempt.puzzleId).cells.filter(c=>c.given===undefined);
  for(let i=0;i<3;i++){await session.command({type:'MoveCell',from:cells[0]!.id,to:cells[i+1]!.id});await session.command({type:'SubmitEndless'});}
  expect(session.state.attempt.status).toBe('out-of-lives');expect(session.state.career.run!.status).toBe('failed');expect(session.state.career.records[recordVersion].solo).toBeNull();expect(await session.endRun()).toBe(true);const record=structuredClone(session.state.career.records[recordVersion].solo);expect(record?.boards).toBe(1);expect(await session.endRun()).toBe(false);
  await session.newRun();await win(session);expect(session.state.career.run!.solvedStages).toBe(1);expect(session.state.career.achievements.run3).toBeUndefined();expect(session.state.career.records[recordVersion].solo).toEqual(record);
 });
 it('marks the whole run assisted and keeps solo/assisted records separate, including help retry',async()=>{
  const{session,repo}=await setup();await session.openEndless();await win(session);await session.endRun();const solo=structuredClone(session.state.career.records[recordVersion].solo);
  await session.openEndless();const plan=session.prepareHelp('reveal')!;await session.help('reveal','help-once',0,plan);await session.help('reveal','help-once',0,plan);expect(session.state.career.run!.assisted).toBe(true);expect(session.state.career.modes.endless.reveals).toBe(1);expect(session.state.attempt.status).toBe('playing');
  await win(session);await session.next();expect(session.state.attempt.assisted).toBe(true);await win(session);await session.endRun();expect(session.state.career.records[recordVersion].solo).toEqual(solo);expect(session.state.career.records[recordVersion].assisted?.boards).toBe(2);expect(decodeSave(await repo.load())).toEqual(session.state);
 });
 it('awards run3 for three distinct stages of one run and preserves its original receipt without coins',async()=>{
  const{session}=await setup();await session.openEndless();for(let i=0;i<3;i++){await win(session);if(i<2)await session.next();}
  const badge=structuredClone(session.state.career.achievements.run3);expect(badge).toMatchObject({earnedAt:now,eventId:session.state.result!.id});expect(achievementValue(session.state,'bestBoardsInRun')).toBe(3);await session.endRun();await session.openEndless();await win(session);expect(session.state.career.achievements.run3).toEqual(badge);
 });
 it('rejects replacement until confirmed and finalizes the old run only once',async()=>{
  const{session}=await setup();await session.openEndless();await win(session);const old=session.state.career.run!.id;expect(await session.newRun()).toBe('confirm_replace');expect(session.state.career.run!.id).toBe(old);expect(await session.newRun(true)).toBe('opened');expect(session.state.career.run!.id).not.toBe(old);expect(session.state.career.records[recordVersion].solo?.runId).toBe(old);expect(session.state.career.modes.endless.restarts).toBe(1);
 });
 it('keeps stage, points, completion and achievement receipts atomic before/after a failed acknowledgement',async()=>{
  for(const failure of ['before','after'] as const){const{session,storage,repo}=await setup();await session.openEndless();await fill(session);const command={commandId:'durable-submit',expectedRevision:session.state.attempt.boardRevision};storage.failure=failure;
   if(failure==='before')await expect(session.command({type:'SubmitEndless'},0,command)).rejects.toThrow();else await session.command({type:'SubmitEndless'},0,command);
   storage.failure='none';const loaded=await repo.load();expect(loaded.career.run!.solvedStages).toBe(failure==='before'?0:1);await session.command({type:'SubmitEndless'},0,command);expect(session.state.career.run!.solvedStages).toBe(1);expect(session.state.career.modes.endless.completions).toBe(1);
  }
 });
 it('advances the delivered 225-board route by stage and wraps while each stage remains unique',async()=>{
  const{session}=await setup();await session.openEndless();let score=0;
  for(let stage=0;stage<226;stage++){expect(session.state.attempt.puzzleId).toBe(routes.endlessSequence[stage%225]);expect(session.state.attempt.stageId).toBe(stage);const p=getPuzzle(session.state.attempt.puzzleId);score+=10*p.equations.length*config.endless.multipliers[p.difficulty];await win(session);expect(session.state.career.run!.score).toBe(score);if(stage<225)await session.next();}
  expect(session.state.result!.first).toBe(false);expect(session.state.result!.baseCoins).toBe(0);expect(session.state.career.run!.solvedStages).toBe(226);expect(session.state.career.modes.endless.completions).toBe(226);
 },20_000);
 it('migrates schema2 without fictitious attempt history or coin rewards, granting provable badges once',async()=>{
  const s=createSave('p',now,'UTC','a');s.profile.solvedIds=boards.slice(0,50).map(p=>p.puzzleId);s.profile.rank=5;const raw=JSON.parse(JSON.stringify(s));raw.schemaVersion=2;delete raw.career;
  const{session,storage,repo}=await setup(0,raw);expect(session.state.schemaVersion).toBe(3);expect(session.state.career.partialHistory).toBe(true);expect(session.state.career.modes.campaign.starts).toBe(0);expect(session.state.profile.coins).toBe(120);expect(Object.keys(session.state.career.achievements)).toEqual(['first','bench','journey','rank5']);expect(session.state.career.achievements.run3).toBeUndefined();expect(JSON.parse(storage.data.get(SAVE_KEY)!).schemaVersion).toBe(3);expect(await repo.load()).toEqual(session.state);
 });
 it('rejects a divergent parked run snapshot and resumes the exact current stage after reload',async()=>{
  const{session,repo}=await setup();await session.openEndless();await win(session);await session.next();await session.openCampaign();const save=await repo.load();expect(storedSlot(save,'endless')!.attempt.stageId).toBe(1);expect(decodeSave(save)).toEqual(save);save.career.run!.lives--;expect(()=>decodeSave(save)).toThrow();
 });
 it('provides a <=3-board witness for unlocked Endless with real stage prerequisites',async()=>{
  const{session}=await setup();const goal=(id:string):QuestSlot=>({goalId:id,target:goals.get(id)!.goal,progress:0,paid:false});const slots=['win2','endless','mul1'].map(goal),offers=availableOffers(session.state);const witness=findWitness(slots,offers,'2026-11-19',15)!;expect(witness).not.toBeNull();expect(witness.length).toBeLessThanOrEqual(3);expect(witness.some(o=>o.mode==='endless')).toBe(true);
  const future=offers.filter(o=>o.mode==='endless').slice(1);expect(findWitness([goal('endless')],future,'2026-11-19',15)).toBeNull();expect(findWitness([goal('endless')],future,'2026-11-19',15,[],80_000,1)?.[0]?.endlessStage).toBe(1);
 });
});
