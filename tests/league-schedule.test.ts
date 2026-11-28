import {describe,it,expect} from 'vitest';
import {leagueActivityPatterns,leagueActivitySeconds,leagueDayBatches,leagueWindowQuotas} from '../src/meta/leagueSchedule';
import {joinLeague,leagueBotEvents,leagueRows,validateLeague} from '../src/meta/league';
import type {LeagueWeek,LeagueState} from '../src/meta/league';
const now='2026-11-23T00:00:00Z';
const bounds=[[0,100],[100,200],[200,300],[300,400]] as const;
function resign(week:LeagueWeek):void{
 let h=2166136261;for(const c of JSON.stringify([week.id,week.policy,week.seed,week.startDay,week.endDay,week.startAt,week.endAt,week.joinedAt,week.bots,week.activityWindows])){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}week.planHash=h>>>0;
}
describe('Guru Brains exact templates and v3 weighted plans',()=>{
 it('keeps all nine source keys, weights and literal second endpoints',()=>{
  expect(leagueActivityPatterns.map(p=>[p.key,...p.weights])).toEqual([
   ['1&2',.8,.2],['1&3',.7,.3],['1&4',.4,.6],['2&3',.4,.6],['2&4',.2,.8],['3&4',.3,.7],['1&2&3',.5,.2,.3],['1&2&4',.35,.15,.5],['2&3&4',.15,.25,.6],
  ]);
  expect(leagueActivitySeconds).toEqual([[29400,39599],[39600,57599],[57600,68399],[68400,82799]]);
  expect(leagueActivityPatterns.map((_,i)=>leagueWindowQuotas(10,i))).toEqual([[8,2,0,0],[7,0,3,0],[4,0,0,6],[0,4,6,0],[0,2,0,8],[0,0,3,7],[5,2,3,0],[4,2,0,4],[0,2,3,5]]);
 });
 it('matches raw donor ceil/residual for all 387 source-range cases and saturates small own targets',()=>{
  for(let target=0;target<=500;target++)for(const [index,p] of leagueActivityPatterns.entries()){
   const q=leagueWindowQuotas(target,index);expect(q.every(n=>Number.isSafeInteger(n)&&n>=0)).toBe(true);expect(q.reduce((a,b)=>a+b,0)).toBe(target);
   if(target>=5&&target<=47){const expected=[0,0,0,0];let sum=0;for(let i=0;i<p.windows.length;i++){const value=i===p.windows.length-1?target-sum:Math.ceil(target*p.weights[i]!);expected[p.windows[i]!]=value;sum+=value;}expect(q).toEqual(expected);}
  }
  expect(leagueWindowQuotas(1,6)).toEqual([1,0,0,0]);expect(leagueWindowQuotas(1,7)).toEqual([1,0,0,0]);expect(leagueWindowQuotas(1,8)).toEqual([0,1,0,0]);
 });
 it('retries a timestamp collision without consuming points; clamps the final batch',()=>{
  const sequence=[.9,0,.9,0,.2,.01,.3,.02,.5,.03];let draws=0;
  expect(leagueDayBatches(8,0,bounds,()=>sequence[draws++]!)).toEqual([{at:0,points:4},{at:1,points:1},{at:2,points:2},{at:103,points:1}]);expect(draws).toBe(10);
  expect(leagueDayBatches(1,0,bounds,()=>.99999999)).toEqual([{at:99,points:1}]);
  expect(()=>leagueDayBatches(8,0,bounds,()=>0)).toThrow('exhausted');
 });
 it('draws a daily pattern independently of category, freezes all UTC windows and counts weighted batches',()=>{
  const seen=new Set<number>();let multi=0,totalEvents=0,totalPoints=0;
  for(let seed=0;seed<40;seed++){
   const state=joinLeague(undefined,'schedule-'+seed,'UTC',now)!,week=state.active!;validateLeague(state,{id:state.profileId,timeZone:'UTC'});
   expect(week.policy.version).toBe('league-lab-3');expect(week.policy.weekend).toBe('frozen-normal-range');
   for(const bot of week.bots){expect(bot.pattern).toBeUndefined();expect(bot.due).toBeUndefined();expect(bot.dailyPatterns).toHaveLength(7);bot.dailyPatterns!.forEach(p=>seen.add(p));
    const events=leagueBotEvents(bot);expect(new Set(events.map(e=>e.at)).size).toBe(events.length);totalEvents+=events.length;totalPoints+=events.reduce((a,e)=>a+e.points,0);multi+=events.filter(e=>e.points>1).length;
    expect(events.reduce((a,e)=>a+e.points,0)).toBe(bot.dailyTargets.reduce((a,b)=>a+b,0));
    for(const event of events){expect(event.points).toBeGreaterThanOrEqual(1);expect(event.points).toBeLessThanOrEqual(4);expect(week.activityWindows!.some(day=>day.some(([from,to])=>event.at>=from&&event.at<to))).toBe(true);}
   }
   const first=Math.min(...week.bots.flatMap(b=>leagueBotEvents(b).map(e=>e.at))),firstEvent=week.bots.flatMap(leagueBotEvents).find(e=>e.at===first)!;
   expect(leagueRows(week,first).filter(r=>r.id!=='self').reduce((n,r)=>n+r.points,0)).toBe(firstEvent.points);
  }
  expect(seen.size).toBe(9);expect(multi).toBeGreaterThan(0);expect(totalPoints).toBeGreaterThan(totalEvents);
 });
 it('keeps the same full calendar plan for early and late admission without adapting to the player',()=>{
  const early=joinLeague(undefined,'same-player','UTC',now)!,late=joinLeague(undefined,'same-player','UTC','2026-11-29T23:59:59Z')!;
  expect(early.active!.bots).toEqual(late.active!.bots);expect(early.active!.activityWindows).toEqual(late.active!.activityWindows);
 });
 it('checks semantic quotas and unique timestamps even when the checksum is recomputed',()=>{
  const good=joinLeague(undefined,'tamper','UTC',now)!;
  const mutate=[(s:LeagueState)=>{s.active!.bots[0]!.events![0]!.points=5;},(s:LeagueState)=>{const e=s.active!.bots[0]!.events![0]!;e.points=e.points===1?2:e.points-1;},(s:LeagueState)=>{const b=s.active!.bots[0]!;b.events![1]!.at=b.events![0]!.at;},
   (s:LeagueState)=>{s.active!.bots[0]!.events![0]!.at=s.active!.startAt;},(s:LeagueState)=>{s.active!.bots[0]!.dailyPatterns![0]=9;},
   (s:LeagueState)=>{s.active!.bots[0]!.dailyTargets[0]!--;},(s:LeagueState)=>{s.active!.activityWindows![0]![0]=[s.active!.startAt,s.active!.startAt];}];
  for(const change of mutate){const state=structuredClone(good);change(state);resign(state.active!);expect(()=>validateLeague(state,{id:'tamper',timeZone:'UTC'})).toThrow();}
 });
});
