import {describe,it,expect} from 'vitest';
import {createSave,decodeSave} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {SaveRepository,SAVE_KEY} from '../src/app/saveRepository';
import {getPuzzle} from '../src/content/catalog';
import {leagueEnabled,leagueBotEvents} from '../src/meta/league';
import answers from '../docs/spec/product/content_v09/author_solutions.json';

const start='2026-11-23T09:00:00.000Z';
async function setup(coins=120){
 const data=new Map<string,string>();let now=start,serial=0,fail=false,ackLost=false,hold:Promise<void>|undefined;
 const storage={getItem:async(k:string)=>data.get(k)??null,removeItem:async(k:string)=>{data.delete(k);},
  setItem:async(k:string,v:string)=>{if(k===SAVE_KEY){if(fail)throw Error('disk full');if(hold)await hold;}data.set(k,v);if(k===SAVE_KEY&&ackLost)throw Error('ack lost');}};
 const fresh=()=>{const save=createSave('league-player',start,'UTC','first');save.profile.coins=coins;return save;};
 const repo=new SaveRepository(storage,fresh),session=new GameSession(await repo.load(),repo,()=>`league-op-${++serial}`,()=>now);
 return {session,repo,data,fresh,storage,setTime:(value:string)=>{now=value;},setFail:(value:boolean)=>{fail=value;},setHold:(value:Promise<void>|undefined)=>{hold=value;},setAckLost:(value:boolean)=>{ackLost=value;}};
}
async function solve(session:GameSession){
 const p=getPuzzle(session.state.attempt.puzzleId),answer=(answers as Record<string,{answer:number[]}>)[p.puzzleId]!.answer;
 for(const cell of p.cells.filter(c=>c.given===undefined)){
  const used=new Set(Object.values(session.state.attempt.placements));
  const token=p.tray.findIndex((value,index)=>value===answer[cell.id]&&!used.has('t'+index));
  if(session.state.attempt.placements[cell.id]===undefined)await session.command({type:'PlaceFromTray',tokenId:'t'+token,cellId:cell.id});
 }
}
describe.runIf(leagueEnabled)('LEAGUE-01 single save writer integration',()=>{
 it('loads the old profile without joining or changing coins and restores a partially filled ordinary board',async()=>{
  const {session,repo}=await setup(),before=structuredClone(session.state);
  expect(session.state.league).toBeUndefined();
  await session.navigate('profile');await session.navigate('league');await session.navigate('profile');
  expect(session.state.league).toBeUndefined();expect(session.state.profile).toEqual(before.profile);
  await solve(session);await session.next();
  const coinsBeforeJoin=session.state.profile.coins;
  const p=getPuzzle(session.state.attempt.puzzleId),cell=p.cells.find(c=>c.given===undefined)!;
  expect((await session.command({type:'PlaceFromTray',cellId:cell.id,tokenId:'t0'})).outcome).toBe('applied');
  const layout=structuredClone(session.state.attempt);
  await session.enterLeague();await session.navigate('league');
  const loaded=await repo.load();expect(loaded.attempt.placements).toEqual(layout.placements);
  expect(loaded.attempt.history).toEqual(layout.history);expect(loaded.profile.coins).toBe(coinsBeforeJoin);expect(loaded.attempt.status).toBe('playing');
  expect(loaded.league!.active!.contributions).toEqual({});
  expect(loaded.league).toEqual(session.state.league);expect(decodeSave(loaded)).toEqual(loaded);
 });
 it('commits win, base payment and league contribution together; repeat and ad callbacks cannot repeat it',async()=>{
  const {session,repo}=await setup();await session.enterLeague();await solve(session);
  expect(session.state.result?.league?.points).toBe(1);
  expect(Object.keys(session.state.league!.active!.contributions)).toEqual([session.state.attempt.puzzleId]);
  const points=session.state.result!.league!,coins=session.state.profile.coins;
  await session.refreshDay();await session.navigate('home');await session.navigate('play');
  expect(session.state.result!.league).toEqual(points);expect(session.state.profile.coins).toBe(coins);
  await session.restart();await solve(session);
  expect(session.state.result!.league?.points).toBe(0);expect(session.state.profile.coins).toBe(coins);
  expect(Object.keys((await repo.load()).league!.active!.contributions)).toHaveLength(1);
  await expect(session.acceptReward({id:'not-reserved',profileId:'league-player',outcome:'earned'},()=>true)).rejects.toThrow();
  expect(Object.keys(session.state.league!.active!.contributions)).toHaveLength(1);
 });
 it('includes an actual Explain-assisted win with its normal atomic help cost',async()=>{
  const {session}=await setup(1200);await session.enterLeague();
  while(session.state.attempt.status==='playing'){
   const plan=session.prepareHelp('explain')!;
   expect((await session.help('explain','help-'+session.state.attempt.boardRevision,session.state.attempt.boardRevision,plan)).outcome).toBe('applied');
  }
  expect(session.state.result?.league?.points).toBe(1);
  const contribution=Object.values(session.state.league!.active!.contributions)[0]!;
  expect(contribution.assisted).toBe(true);expect(session.state.profile.coins).toBeLessThan(1200);
 });
 it('never exposes a joined week or a medal when its write fails, then retries once',async()=>{
  const f=await setup();f.setFail(true);
  await expect(f.session.enterLeague()).rejects.toThrow();expect(f.session.state.league).toBeUndefined();
  f.setFail(false);await f.session.enterLeague();const before=structuredClone(f.session.state);
  f.setTime('2026-11-30T00:00:00.000Z');f.setFail(true);
  await expect(f.session.refreshDay()).rejects.toThrow();expect(f.session.state).toEqual(before);
  f.setFail(false);await f.session.refreshDay();expect(f.session.state.league!.history).toHaveLength(1);
  const cold=new GameSession(await f.repo.load(),f.repo,()=>crypto.randomUUID(),()=> '2026-11-30T00:00:00.000Z');
  await cold.restore();expect(cold.state.league!.history).toHaveLength(1);expect(cold.state.profile.coins).toBe(before.profile.coins);
 });
 it('does not publish a last-move contribution or ordinary reward on failed persistence',async()=>{
  const f=await setup();await f.session.enterLeague();
  const p=getPuzzle(f.session.state.attempt.puzzleId),answer=(answers as Record<string,{answer:number[]}>)[p.puzzleId]!.answer;
  const cells=p.cells.filter(c=>c.given===undefined);
  for(const cell of cells.slice(0,-1)){
   const used=new Set(Object.values(f.session.state.attempt.placements)),index=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));
   await f.session.command({type:'PlaceFromTray',cellId:cell.id,tokenId:'t'+index});
  }
  const cell=cells.at(-1)!,used=new Set(Object.values(f.session.state.attempt.placements)),index=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));
  const command={type:'PlaceFromTray' as const,cellId:cell.id,tokenId:'t'+index},before=structuredClone(f.session.state);
  f.setFail(true);await expect(f.session.command(command)).rejects.toThrow();expect(f.session.state).toEqual(before);
  expect((await f.repo.load()).league!.active!.contributions).toEqual({});
  f.setFail(false);await f.session.command(command);expect(f.session.state.result!.league!.points).toBe(1);
 });
 it('reads back a lost write acknowledgement and never repeats the combined win or league points',async()=>{
  const f=await setup();await f.session.enterLeague();f.setAckLost(true);await solve(f.session);
  expect(f.session.state.result!.league!.points).toBe(1);expect(f.session.state.profile.coins).toBe(130);
  await f.session.navigate('home');const cold=await f.repo.load();
  expect(cold.profile.coins).toBe(130);expect(Object.keys(cold.league!.active!.contributions)).toHaveLength(1);
  expect(cold.result!.league!.points).toBe(1);
 });
 it('freezes the transaction time across a delayed acknowledgement and settles the committed result once',async()=>{
  const f=await setup();f.setTime('2026-11-29T23:59:59.000Z');await f.session.enterLeague();
  // A valid completed fixture exercises exactly the same persist/settle path as the last command.
  const p=getPuzzle(f.session.state.attempt.puzzleId),answer=(answers as Record<string,{answer:number[]}>)[p.puzzleId]!.answer,used=new Set<number>();
  for(const cell of p.cells.filter(c=>c.given===undefined)){
   const index=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));used.add(index);f.session.state.attempt.placements[cell.id]='t'+index;
  }
  f.session.state.attempt.status='won';
  let release!:()=>void;f.setHold(new Promise<void>(done=>{release=done;}));
  const operation=f.session.navigate('home');await new Promise(resolve=>setTimeout(resolve,0));
  expect(f.session.state.result).toBeNull();f.setTime('2026-11-30T00:00:01.000Z');release();await operation;f.setHold(undefined);
  expect(f.session.state.result?.league?.points).toBe(1);await f.session.refreshDay();
  expect(f.session.state.league!.history).toHaveLength(1);expect(f.session.state.league!.history[0]!.points).toBe(1);
 });
 it('keeps old bank assignments and can count an already globally solved ID in the next week',async()=>{
  const f=await setup();await f.session.enterLeague();await solve(f.session);
  const first=f.session.state.attempt.puzzleId,coins=f.session.state.profile.coins;
  f.setTime('2026-11-30T09:00:00.000Z');await f.session.refreshDay();await f.session.enterLeague();
  await f.session.restart();await solve(f.session);
  expect(f.session.state.attempt.puzzleId).toBe(first);expect(f.session.state.result!.first).toBe(false);
  expect(f.session.state.result!.league?.points).toBe(1);expect(f.session.state.profile.coins).toBe(coins);
  expect(f.session.state.league!.history).toHaveLength(1);expect(f.session.state.league!.active!.policy.weights.easy).toBe(1);
 });
 it('presents a newly saved medal once, in the same write, and never grants currency for it',async()=>{
  const f=await setup();await f.session.enterLeague();await f.session.navigate('league');
  const coins=f.session.state.profile.coins;f.setTime('2026-11-30T00:00:00.000Z');
  f.setFail(true);await expect(f.session.refreshDay()).rejects.toThrow();expect(f.session.takeLeagueMedalReveal()).toBeUndefined();
  f.setFail(false);f.setAckLost(true);await f.session.refreshDay();
  const medal=f.session.state.league!.history[0]!;expect(medal.presented).toBe(true);
  expect(f.session.takeLeagueMedalReveal()).toBe(medal.id);expect(f.session.takeLeagueMedalReveal()).toBeUndefined();
  const cold=new GameSession(await f.repo.load(),f.repo,()=>crypto.randomUUID(),()=> '2026-11-30T00:00:00.000Z');
  await cold.restore();expect(cold.takeLeagueMedalReveal()).toBeUndefined();expect(cold.state.profile.coins).toBe(coins);
 });
 it('saves the actual points and place transition with the ordinary win',async()=>{
  const f=await setup();f.setTime('2026-11-23T00:00:00.000Z');await f.session.enterLeague();
  const first=Math.min(...f.session.state.league!.active!.bots.flatMap(b=>leagueBotEvents(b).map(e=>e.at)));f.setTime(new Date(first).toISOString());
  await f.session.refreshDay();await solve(f.session);
  expect(f.session.state.result!.league).toMatchObject({points:1,fromPoints:0,toPoints:1,fromPlace:2,toPlace:f.session.state.league!.active!.bots.some(b=>leagueBotEvents(b).some(e=>e.at===first&&e.points>1))?2:1});
  expect((await f.repo.load()).result!.league).toEqual(f.session.state.result!.league);
 });
 it('isolates a broken league without rolling the wallet, ordinary victory or board back to the older backup',async()=>{
  const f=await setup();await f.session.enterLeague();await solve(f.session);
  const durable=JSON.parse(f.data.get(SAVE_KEY)!),league=structuredClone(durable.league);
  league.active.bots[0].events[0].at--;
  durable.league=league;f.data.set(SAVE_KEY,JSON.stringify(durable));
  const repo=new SaveRepository(f.storage,f.fresh),loaded=await repo.load();
  expect(repo.recoveredBackup).toBe(false);expect(loaded.profile).toEqual(durable.profile);
  expect(loaded.attempt).toEqual(durable.attempt);expect(loaded.result).toEqual(durable.result);
  expect(loaded.league).toBeUndefined();expect(loaded.leagueQuarantine!.raw).toEqual(league);
  expect(JSON.parse(f.data.get(SAVE_KEY)!).leagueQuarantine.raw).toEqual(league);
  const cold=new GameSession(loaded,repo,()=>crypto.randomUUID(),()=>start);
  expect(await cold.enterLeague()).toBe(false);await cold.next();await solve(cold);
  expect(cold.state.result!.league).toBeUndefined();expect(cold.state.leagueQuarantine!.raw).toEqual(league);
  expect((await repo.load()).leagueQuarantine!.raw).toEqual(league);
 });
});
