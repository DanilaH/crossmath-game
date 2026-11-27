import { describe, expect, it } from 'vitest';
import { createSave, settleCompletion } from '../src/app/model';
import type { Save } from '../src/app/model';
import { SAVE_KEY, SaveRepository } from '../src/app/saveRepository';
import { GameSession, storedSlot } from '../src/app/session';
import { boards, config, getPuzzle, routes } from '../src/content/catalog';
import { createAttempt } from '../src/core/engine';
import { materializeHelp, reveal } from '../src/help/reveal';
import { recordVersion } from '../src/meta/career';
import { availableOffers, findWitness } from '../src/meta/missions';
import answers from '../docs/spec/product/content_v09/author_solutions.json';

const now='2026-11-27T12:00:00Z';
const fresh=()=>createSave('old-profile',now,'UTC','campaign-attempt');

async function open(save:Save){
  const data=new Map([[SAVE_KEY,JSON.stringify(save)]]);
  let rejectWrite=false,serial=0;
  const repo=new SaveRepository({
    async getItem(key){return data.get(key)??null;},
    async removeItem(key){data.delete(key);},
    async setItem(key,value){if(rejectWrite&&key===SAVE_KEY)throw Error('disk write');data.set(key,value);},
  },fresh);
  const session=new GameSession(await repo.load(),repo,()=>`core-${++serial}`,()=>now);
  return {repo,session,failWrites:(fail:boolean)=>{rejectWrite=fail;}};
}

function legacyRun(won=false):Save {
  const save=fresh(),puzzle=getPuzzle(routes.endlessSequence[0]!);
  save.profile.solvedIds=boards.slice(0,15).map(p=>p.puzzleId);
  save.profile.campaignCursor=15;
  save.profile.coins=389;
  save.meta.inactive.campaign={attempt:save.attempt,result:null};
  save.meta.activeSlot='endless';
  save.attempt={...createAttempt(puzzle,'old-stage','endless'),runId:'old-run',stageId:0,lives:2,
    placements:{4:'t2'},history:[{placements:{},trayOrder:['t0','t1','t2']}],commandIds:['old-move'],boardRevision:1,
    status:won?'won':'playing',elapsedPlaying:9,userPaused:!won};
  save.career.run={id:'old-run',version:recordVersion,stage:0,solvedStages:0,score:0,lives:2,assisted:false,status:'active'};
  save.career.records[recordVersion].solo={runId:'prior',score:250,boards:3,endedAt:now};
  save.career.achievements.run3={earnedAt:now,eventId:'win:prior'};
  save.career.bestBoardsInRun=3;
  if(!won)return save;
  const answer=(answers as Record<string,{answer:number[]}>)[puzzle.puzzleId]!.answer;
  for(const cell of puzzle.cells.filter(c=>c.given===undefined))save.attempt.placements[cell.id]=`t${puzzle.tray.indexOf(answer[cell.id]!)}`;
  return settleCompletion(save,now);
}

describe('CORE-00 suspension',()=>{
  it.each([false,true])('parks the old stage without finalizing or modifying it (won=%s)',async won=>{
    const old=legacyRun(won),{session,repo}=await open(old);
    const expected=storedSlot(old,'endless');
    if(won)expect(await session.next()).toBe(false);
    expect(await session.navigate('play')).toBe(false);
    expect(await session.endRun()).toBe(false);
    expect((await session.command({type:'SubmitEndless'})).outcome).toBe('unavailable');
    await session.restore();
    const parked=await repo.load();
    expect(parked.meta.screen).toBe('home');
    expect(parked.attempt).toEqual(old.meta.inactive.campaign!.attempt);
    expect(parked.meta.inactive.endless).toEqual(expected);
    expect(parked.career).toEqual(old.career);
    expect(parked.profile).toEqual(old.profile);
    expect(parked.ads).toEqual(old.ads);
    expect(await session.openEndless()).toBe('unavailable');
    expect(await session.newRun(true)).toBe('unavailable');
    expect(await session.newGame('endless',true)).toBe('unavailable');
    expect(await session.openOffer({mode:'endless',puzzleId:old.attempt.puzzleId},true,0,true)).toBe('unavailable');
    expect(await session.openFreeTrack('challenge')).toBe('opened');
    expect(storedSlot(await repo.load(),'endless')).toEqual(expected);
    const reloaded=new GameSession(await repo.load(),repo,()=> 'unused',()=>now);
    await reloaded.restore();
    expect(reloaded.state.meta.screen).toBe('play');
    expect(storedSlot(reloaded.state,'endless')).toEqual(expected);
  });

  it('retries a failed startup write with the original profile and placements intact',async()=>{
    const old=legacyRun(),{repo,session,failWrites}=await open(old);
    failWrites(true);
    await expect(session.restore()).rejects.toThrow('disk write');
    expect(await repo.load()).toEqual(old);
    failWrites(false);
    await session.restore();
    expect((await repo.load()).meta.inactive.endless).toEqual(storedSlot(old,'endless'));
  });

  it('keeps an already parked run and preserves earned goal receipts during replacement',async()=>{
    const old=legacyRun();
    old.meta.inactive.endless=storedSlot(old,'endless')!;
    old.attempt=old.meta.inactive.campaign!.attempt;
    delete old.meta.inactive.campaign;
    old.meta.activeSlot='campaign';
    old.meta.screen='calendar';
    old.meta.issuedDays=5;
    old.meta.slotReceipts=['2026-11-27:0'];
    old.meta.setReceipts=['2026-11-26'];
    old.meta.quests={dayKey:'2026-11-27',configVersion:config.configVersion,issueIndex:4,slots:[
      {goalId:'win1',target:1,progress:1,paid:true},
      {goalId:'endless',target:1,progress:0,paid:false},
      {goalId:'eq6',target:6,progress:3,paid:false},
    ],witness:[{mode:'endless',puzzleId:routes.endlessSequence[0]!}],replacements:[]};
    const {repo,session}=await open(old);
    await session.restore();
    const state=await repo.load(),quest=state.meta.quests!;
    expect(state.meta.screen).toBe('calendar');
    expect(state.profile).toEqual(old.profile);
    expect(state.meta.inactive.endless).toEqual(old.meta.inactive.endless);
    expect(state.meta.slotReceipts).toEqual(old.meta.slotReceipts);
    expect(state.meta.setReceipts).toEqual(old.meta.setReceipts);
    expect(state.meta.issuedDays).toBe(old.meta.issuedDays);
    expect(quest.slots).toEqual([old.meta.quests.slots[0],{goalId:'route',target:1,progress:0,paid:false},old.meta.quests.slots[2]]);
    expect(quest.witness).toEqual(findWitness(quest.slots,availableOffers(state),quest.dayKey,15,[]));
    expect(quest.witness.every(offer=>offer.mode!=='endless')).toBe(true);
    expect(session.questOffer(1)?.mode).toBe('campaign');
    await session.restore();
    expect(await repo.load()).toEqual(state);
  });
});

describe('CORE-00 local Reveal',()=>{
  const puzzle=getPuzzle('cm-own-01-025');
  it('clears only the target if a matching token is free',()=>{
    const attempt={...createAttempt(puzzle,'local'),placements:{0:'t1',1:'t2',3:'t9'}};
    const plan=reveal(puzzle,attempt,0)!;
    expect(plan.returns).toEqual([0]);
    expect(materializeHelp(puzzle,attempt,plan)).toEqual({placements:{0:'t8',1:'t2',3:'t9'},trayOrder:attempt.trayOrder});
    expect(materializeHelp(puzzle,attempt,{...plan,returns:[0,1]})).toBeNull();
  });

  it('keeps a correctly placed duplicate and chooses one misplaced source only',()=>{
    const attempt={...createAttempt(puzzle,'duplicates'),placements:{9:'t0',1:'t4',11:'t5',3:'t8'}};
    const plan=reveal(puzzle,attempt,11)!;
    expect(plan.returns).toEqual([11,1]);
    expect(materializeHelp(puzzle,attempt,plan)?.placements).toEqual({9:'t0',11:'t4',3:'t8'});
    expect(materializeHelp(puzzle,attempt,{...plan,returns:[11,9]})).toBeNull();
    const emptyTarget={...attempt,placements:{9:'t0',1:'t4',3:'t8'}};
    expect(reveal(puzzle,emptyTarget,11)?.returns).toEqual([1]);
  });

  it('previews without a write and charges one receipt for one local undoable change',async()=>{
    const save=fresh();
    save.attempt={...createAttempt(puzzle,'reveal'),placements:{0:'t1',1:'t2',3:'t8'},boardRevision:2};
    const {repo,session}=await open(save);
    const plan=session.prepareHelp('reveal',0)!;
    expect(await repo.load()).toEqual(save);
    expect(await session.help('reveal','invalid',2,{...plan,returns:[0,3,1]})).toMatchObject({outcome:'invalid_proof',costCoins:0});
    expect(await session.help('reveal','stale',1,plan)).toMatchObject({outcome:'stale_snapshot',costCoins:0});
    expect(await session.help('reveal','no-step',2,null)).toMatchObject({outcome:'no_step',costCoins:0});
    expect((await repo.load()).profile.coins).toBe(120);
    const result=await session.help('reveal','valid',2,plan);
    expect(await session.help('reveal','valid',2,plan)).toEqual(result);
    expect(result).toMatchObject({outcome:'applied',costCoins:60});
    const persisted=await repo.load();
    expect(persisted.profile.coins).toBe(60);
    expect(persisted.attempt.placements).toEqual({0:'t8',1:'t2'});
    expect(persisted.attempt.history.at(-1)?.placements).toEqual(save.attempt.placements);
    await session.command({type:'Undo'});
    expect(session.state.attempt.placements).toEqual(save.attempt.placements);
    expect(session.state.profile.coins).toBe(60);
  });
});
