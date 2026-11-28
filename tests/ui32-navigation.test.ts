import {describe,it,expect} from 'vitest';
import {createSave,decodeSave} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {SaveRepository,SAVE_KEY} from '../src/app/saveRepository';
import {leagueEnabled} from '../src/meta/league';
const now='2026-11-23T12:00:00.000Z';
async function setup(){
 const data=new Map<string,string>();let fail=false;
 const storage={getItem:async(k:string)=>data.get(k)??null,removeItem:async(k:string)=>{data.delete(k);},setItem:async(k:string,v:string)=>{if(fail&&k===SAVE_KEY)throw Error('disk full');data.set(k,v);}};
 const fresh=()=>createSave('ui32','2026-11-01T12:00:00.000Z','UTC','first');const repo=new SaveRepository(storage,fresh);
 let id=0;const session=new GameSession(await repo.load(),repo,()=>`ui32-${++id}`,()=>now);
 await session.refreshDay();
 return {session,repo,fail:()=>{fail=true;}};
}
describe('UX32 durable navigation context',()=>{
 it.skipIf(!leagueEnabled).each(['home','profile'] as const)('retains %s origin through League admission, cold load and workshop navigation',async origin=>{
  const {session,repo}=await setup();await session.navigate(origin);const before=structuredClone(session.state);
  await session.navigate('league');expect(session.state.meta.leagueOrigin).toBe(origin);await session.enterLeague();
  const cold=new GameSession(await repo.load(),repo,()=> 'cold',()=>now);
  expect(cold.state.meta.leagueOrigin).toBe(origin);expect(cold.state.attempt).toEqual(before.attempt);expect(cold.state.profile).toEqual(before.profile);
  await cold.navigate(origin);await cold.navigate('album');expect(cold.state.meta.albumOrigin).toBe(origin);expect(cold.state.meta.leagueOrigin).toBe(origin);
 });
 it('today shortcut selects effective day atomically while root Day keeps archive choice and attempts',async()=>{
  const {session,repo}=await setup();await session.navigate('calendar');await session.selectDailyDay('2026-11-01');
  const before=structuredClone(session.state);await session.navigate('home');await session.navigate('calendar');expect(session.state.meta.calendarSelectedDay).toBe('2026-11-01');
  await session.navigate('home');await session.navigate('calendar',0,undefined,true);
  const loaded=await repo.load();expect(loaded.meta.calendarSelectedDay).toBe('2026-11-23');expect(loaded.attempt).toEqual(before.attempt);expect(loaded.meta.assignments).toEqual(before.meta.assignments);expect(loaded.profile).toEqual(before.profile);
 });
 it('failed today navigation leaves durable archive choice and current chips unchanged',async()=>{
  const {session,repo,fail}=await setup();await session.navigate('calendar');await session.selectDailyDay('2026-11-01');await session.navigate('home');const before=structuredClone(session.state);fail();
  await expect(session.navigate('calendar',0,undefined,true)).rejects.toThrow();expect(session.state).toEqual(before);expect(await repo.load()).toEqual(before);
 });
 it('accepts legacy saves without an origin and rejects an invalid origin without changing progression',async()=>{
  const {session}=await setup();expect(decodeSave(session.state).meta.leagueOrigin).toBeUndefined();
  expect(()=>decodeSave({...session.state,meta:{...session.state.meta,leagueOrigin:'play'}})).toThrow('Corrupt league origin');
 });
});
