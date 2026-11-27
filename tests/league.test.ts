import {describe,it,expect,vi} from 'vitest';
import {advanceLeague,joinLeague,leagueLocalInstant,leaguePeriod,leagueRows,leagueUpdateDue,recordLeagueWin,validateLeague,leagueRoster,leagueBotEvents} from '../src/meta/league';
import type {LeagueState,LeagueWin} from '../src/meta/league';

const start='2026-11-23T00:00:00Z',end='2026-11-30T00:00:00Z';
const fresh=(now=start,zone='UTC')=>joinLeague(undefined,'profile',zone,now)!;
const win=(s:LeagueState,overrides:Partial<LeagueWin>={}):LeagueWin=>({profileId:s.profileId,weekId:s.active!.id,puzzleId:'puzzle-1',receiptId:'win:attempt-1',mode:'campaign',difficulty:'easy',assisted:false,at:Date.parse(start),...overrides});
describe('LEAGUE-01 deterministic weekly model',()=>{
 it('creates nine different saved schedules, exclusive daily bounds and due-only progress',()=>{
  const s=fresh(),p=s.active!;expect(p.bots).toHaveLength(9);
  expect(new Set(p.bots.map(b=>JSON.stringify(leagueBotEvents(b)))).size).toBe(9);
  for(const [i,bot] of p.bots.entries()){
   expect(bot.dailyTargets).toHaveLength(7);
   expect(bot.dailyTargets.every(v=>v>=p.policy.bands[i]![0]&&v<p.policy.bands[i]![1])).toBe(true);
   expect(leagueBotEvents(bot).reduce((n,e)=>n+e.points,0)).toBe(bot.dailyTargets.reduce((a,b)=>a+b,0));
   expect(leagueBotEvents(bot).every(e=>e.at>=p.startAt&&e.at<p.endAt)).toBe(true);
  }
  const first=Math.min(...p.bots.flatMap(b=>leagueBotEvents(b).map(e=>e.at)));
  expect(leagueRows(p,first-1).every(r=>r.points===0)).toBe(true);
  expect(leagueRows(p,first).some(r=>r.points>=1)).toBe(true);
  expect(leagueUpdateDue(s,new Date(first).toISOString())).toBe(true);
  advanceLeague(s,new Date(first).toISOString());expect(leagueUpdateDue(s,new Date(first).toISOString())).toBe(false);
  validateLeague(JSON.parse(JSON.stringify(s)),{id:'profile',timeZone:'UTC'});
 });
 it('replays incremental catch-up exactly, without reseeding or reacting to player rank',()=>{
  const a=fresh(),b=structuredClone(a),plans=JSON.stringify(a.active!.bots);
  for(let hour=1;hour<168;hour++)advanceLeague(a,new Date(Date.parse(start)+hour*3_600_000).toISOString());
  advanceLeague(b,'2026-11-29T23:00:00Z');
  expect(a).toEqual(b);
  recordLeagueWin(a,win(a,{at:a.lastSeenAt,difficulty:'expert'}),new Date(a.lastSeenAt).toISOString());
  expect(JSON.stringify(a.active!.bots)).toBe(plans);
  expect(joinLeague(a,'profile','UTC','2026-11-29T23:00:00Z')).toBeNull();
  expect(leagueRows(fresh().active!,Date.parse(start))[0]!.id).toBe('self');
 });
 it('validates saved UTC plans without asking the current timezone rules to regenerate them',()=>{
  const s=fresh(),closed=structuredClone(s);advanceLeague(closed,end);
  const spy=vi.spyOn(Intl,'DateTimeFormat').mockImplementation(function(){throw Error('Timezone changed after admission');});
  try{validateLeague(s,{id:'profile',timeZone:'UTC'});validateLeague(closed,{id:'profile',timeZone:'UTC'});}
  finally{spy.mockRestore();}
 });
 it('uses difficulty weights and an explicit equal assisted policy, not ads, first-ever status or mode',()=>{
  const s=fresh();let total=0;
  for(const [i,difficulty] of (['easy','standard','hard','expert'] as const).entries()){
   total+=recordLeagueWin(s,win(s,{difficulty,puzzleId:'p'+i,receiptId:'win:a'+i,assisted:i%2===1,mode:i%2?'daily':'free'}),start);
  }
  expect(total).toBe(10);expect(leagueRows(s.active!,Date.parse(start)).find(r=>r.id==='self')!.points).toBe(10);
  const snapshot=JSON.stringify(s);
  expect(recordLeagueWin(s,win(s,{puzzleId:'p0',receiptId:'win:new'}),start)).toBe(0);
  expect(recordLeagueWin(s,win(s,{puzzleId:'new',receiptId:'win:a0'}),start)).toBe(0);
  expect(recordLeagueWin(s,win(s,{profileId:'other'}),start)).toBe(0);
  expect(recordLeagueWin(s,win(s,{weekId:'old'}),start)).toBe(0);
  expect(recordLeagueWin(s,win(s,{receiptId:'ad:earned'}),start)).toBe(0);
  expect(recordLeagueWin(s,win(s,{mode:'endless'}),start)).toBe(0);
  expect(JSON.stringify(s)).toBe(snapshot);
 });
 it('settles once at the exclusive boundary and accepts the same puzzle next week',()=>{
  const s=fresh();expect(recordLeagueWin(s,win(s),start)).toBe(1);
  advanceLeague(s,end);expect(s.active).toBeNull();expect(s.history).toHaveLength(1);
  const medal=s.history[0]!.medal;expect(medal.place).toBe(s.history[0]!.rank);
  advanceLeague(s,end);advanceLeague(s,'2026-12-20T00:00:00Z');expect(s.history).toHaveLength(1);
  expect(s.history[0]!.medal).toEqual(medal);
  expect(joinLeague(s,'profile','UTC',start)).toBeNull();
  const next=joinLeague(s,'profile','UTC','2026-12-20T12:00:00Z')!;
  expect(recordLeagueWin(next,win(next,{at:Date.parse('2026-12-20T12:00:00Z')}),'2026-12-20T12:00:00Z')).toBe(1);
  const old=s.history[0]!.id;
  expect(recordLeagueWin(next,win(next,{weekId:old,puzzleId:'late',at:Date.parse(start)}),'2026-12-20T12:00:00Z')).toBe(0);
  validateLeague(next,{id:'profile',timeZone:'UTC'});
 });
 it('does not count future, pre-admission, expired or backward-clock wins',()=>{
  const now='2026-11-27T15:00:00Z',s=fresh(now),snapshot=JSON.stringify(s);
  for(const at of [Date.parse(start),Date.parse(end),Date.parse(now)+1])expect(recordLeagueWin(s,win(s,{at}),now)).toBe(0);
  expect(recordLeagueWin(s,win(s,{at:Date.parse(now)}),'2026-11-27T14:59:00Z')).toBe(0);
  expect(recordLeagueWin(s,win(s,{at:Date.parse(now)}),end)).toBe(0);
  advanceLeague(s,start);expect(JSON.stringify(s)).toBe(snapshot);
  expect(s.active!.bots.some(b=>leagueBotEvents(b).some(e=>e.at<Date.parse(now)))).toBe(true);
 });
 it('makes a zero-point result a participation medal, including admission after the last activity window',()=>{
  const s=fresh('2026-11-29T23:59:59Z');expect(s.active!.bots.every(b=>leagueBotEvents(b).reduce((n,e)=>n+e.points,0)>=7)).toBe(true);
  recordLeagueWin(s,win(s,{at:Date.parse('2026-11-29T23:59:59Z')}),'2026-11-29T23:59:59Z');
  expect(leagueRows(s.active!,s.lastSeenAt).find(r=>r.id==='self')!.place).toBe(10);
  s.active!.contributions={};
  advanceLeague(s,end);expect(s.history[0]!.points).toBe(0);expect(s.history[0]!.medal.tier).toBe('participant');
  validateLeague(s,{id:'profile',timeZone:'UTC'});
 });
 it('uses profile weeks and real instants across DST, leap day and non-hour zones',()=>{
  const spring=leaguePeriod('2026-03-04T12:00:00Z','America/New_York');
  const fall=leaguePeriod('2026-10-30T12:00:00Z','America/New_York');
  expect((spring.endAt-spring.startAt)/3_600_000).toBe(167);expect((fall.endAt-fall.startAt)/3_600_000).toBe(169);
  expect(leaguePeriod('2028-02-29T12:00:00Z','Asia/Kathmandu').startDay).toBe('2028-02-28');
  expect(new Date(leagueLocalInstant('2026-11-23',490,'Asia/Kathmandu')).toISOString()).toBe('2026-11-23T02:25:00.000Z');
  const s=fresh('2026-10-26T04:00:00Z','America/New_York');advanceLeague(s,'2026-11-01T05:59:00Z');
  const before=leagueRows(s.active!,s.lastSeenAt);advanceLeague(s,'2026-11-01T06:01:00Z');
  expect(leagueRows(s.active!,s.lastSeenAt)).toEqual(before);validateLeague(s,{id:'profile',timeZone:'America/New_York'});
 });
 it('keeps nine identities and own portraits stable on reload, with disjoint adjacent-week rosters',()=>{
  for(let i=0;i<100;i++){
   const a=leagueRoster(`profile-${i}:2026-11-23:league-lab-2`),b=leagueRoster(`profile-${i}:2026-11-30:league-lab-2`);
   expect(a).toEqual(leagueRoster(`profile-${i}:2026-11-23:league-lab-2`));
   expect(new Set(a.map(r=>r.avatar)).size).toBe(9);
   expect(new Set([...a,...b].map(r=>r.name[0])).size).toBe(18);
  }
 });
 it('rejects malformed plans, awards, policy changes, duplicate history and wrong-profile restores',()=>{
  const valid=fresh();validateLeague(valid,{id:'profile',timeZone:'UTC'});
  const mutations=[(s:LeagueState)=>{s.active!.bots[0]!.events![0]!.at--;},(s:LeagueState)=>{s.active!.policy.weights.easy=9;},
   (s:LeagueState)=>{s.active!.seed++;},(s:LeagueState)=>{s.active!.id='other';}];
  for(const mutate of mutations){const s=structuredClone(valid);mutate(s);expect(()=>validateLeague(s,{id:'profile',timeZone:'UTC'})).toThrow();}
  expect(()=>validateLeague(valid,{id:'other',timeZone:'UTC'})).toThrow();
  const closed=structuredClone(valid);advanceLeague(closed,end);closed.history.push(structuredClone(closed.history[0]!));
  expect(()=>validateLeague(closed,{id:'profile',timeZone:'UTC'})).toThrow();
 });
});
