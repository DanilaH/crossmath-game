import {describe,it,expect} from 'vitest';
import {createSave,decodeSave,settleCompletion} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {SaveRepository} from '../src/app/saveRepository';
import {joinLeague,leagueEnabled} from '../src/meta/league';

const now='2026-11-23T09:00:00Z';
describe.runIf(!leagueEnabled)('LEAGUE-01 production admission guard',()=>{
 it('keeps the ordinary profile outside the experiment',async()=>{
  const data=new Map<string,string>(),fresh=()=>createSave('normal',now,'UTC','attempt');
  const repo=new SaveRepository({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}},fresh);
  const session=new GameSession(await repo.load(),repo,()=> 'op',()=>now);
  expect(await session.enterLeague()).toBe(false);expect(await session.navigate('league')).toBe(false);
  expect(session.state.league).toBeUndefined();expect(session.state.profile.coins).toBe(120);
 });
 it('round-trips an experimental save without settling or erasing it in an ordinary build',()=>{
  const save=createSave('normal',now,'UTC','attempt');save.league=joinLeague(undefined,'normal','UTC',now)!;
  const loaded=decodeSave(JSON.parse(JSON.stringify(save))),before=JSON.stringify(loaded.league);
  const next=settleCompletion(loaded,'2026-12-01T00:00:00Z');
  expect(JSON.stringify(next.league)).toBe(before);expect(next.profile).toEqual(save.profile);
 });
});
