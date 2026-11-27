import {calendarDayIndex,dayFromIndex,profileDay} from './calendar';
import type {Difficulty,Mode} from '../core/types';

/** LEAGUE-01 experimental calibration, never a live Guru configuration. */
export const leagueEnabled=import.meta.env.MODE==='league-lab';
export interface LeaguePolicy {
 version:'league-lab-1'; weights:Record<Difficulty,number>; assisted:'include'; tie:'self-first';
 bands:readonly (readonly [number,number])[];medals:{gold:number;silver:number;bronze:number;minimumPoints:number};
}
export const leaguePolicy:LeaguePolicy={version:'league-lab-1',weights:{easy:1,standard:2,hard:3,expert:4},
 assisted:'include',tie:'self-first',medals:{gold:1,silver:2,bronze:3,minimumPoints:1},bands:[[6,11],[6,11],[4,8],[4,8],[3,6],[3,6],[1,4],[1,4],[1,4]]};
// Brains' four local windows and nine weighted templates. Only [0.4,0,0,0.6]
// is documented verbatim. The other weights below are OUR provisional calibration.
const windows=[[490,660],[660,960],[960,1140],[1140,1380]] as const;
const patterns=[[4,0,0,6],[0,5,5,0],[2,2,2,4],[0,3,3,4],[5,5,0,0],[0,0,4,6],[1,1,3,5],[4,2,4,0],[2,4,0,4]];
export const botNames=[['Латунь','Brass'],['Графит','Graphite'],['Искра','Spark'],['Компас','Compass'],['Кедр','Cedar'],['Кварц','Quartz'],['Штрих','Stroke'],['Ритм','Rhythm'],['Линза','Lens']] as const;
export interface BotPlan {id:string;name:readonly [string,string];pattern:number;dailyTargets:number[];due:number[]}
export interface LeagueContribution {receiptId:string;at:number;points:number;assisted:boolean;difficulty:Difficulty}
export interface LeagueWeek {
 id:string;policy:LeaguePolicy;seed:number;startDay:string;endDay:string;startAt:number;endAt:number;joinedAt:number;
 planHash:number;bots:BotPlan[];contributions:Record<string,LeagueContribution>;
}
export interface LeagueRow {id:string;name:readonly [string,string];points:number;place:number}
export interface LeagueResult {
 id:string;startDay:string;endDay:string;endAt:number;policyVersion:LeaguePolicy['version'];settledAt:number;
 rows:LeagueRow[];rank:number;points:number;medal:{id:string;place:number;tier:'gold'|'silver'|'bronze'|'participant'};
}
export interface LeagueState {version:1;profileId:string;timeZone:string;lastSeenAt:number;active:LeagueWeek|null;history:LeagueResult[]}
export interface LeagueWin {profileId:string;weekId:string;receiptId:string;puzzleId:string;mode:Mode;difficulty:Difficulty;assisted:boolean;at:number}
const dayMs=86_400_000;
const instant=(value:string)=>{const n=Date.parse(value);if(!Number.isFinite(n))throw Error('Invalid league time');return n;};
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function random(seed:number){let x=seed;return ()=>{x=(x+0x6d2b79f5)|0;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
const formatters=new Map<string,Intl.DateTimeFormat>();
function localCivil(at:number,zone:string):number {
 let formatter=formatters.get(zone);
 if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(zone,formatter);}
 const parts=formatter.formatToParts(at),part=(key:string)=>Number(parts.find(p=>p.type===key)!.value);
 return Date.UTC(part('year'),part('month')-1,part('day'),part('hour'),part('minute'),part('second'))+((at%1000)+1000)%1000;
}
/** Resolve local midnight/window time once. Actual UTC instants keep DST out of elapsed arithmetic. */
export function leagueLocalInstant(day:string,minute:number,zone:string):number {
 const target=calendarDayIndex(day)*dayMs+minute*60_000;
 if(zone==='UTC'||zone==='Etc/UTC')return target;
 let estimate=target;
 for(let i=0;i<6;i++){const difference=target-localCivil(estimate,zone);if(!difference)return estimate;estimate+=difference;}
 // A nonexistent local midnight resolves to the first actual instant of that day.
 let low=target-36*3_600_000,high=target+36*3_600_000;
 while(high-low>1){const mid=Math.floor((low+high)/2);if(localCivil(mid,zone)>=target)high=mid;else low=mid;}
 return high;
}
export function leaguePeriod(now:string,zone:string){
 const day=profileDay(now,zone),index=calendarDayIndex(day),weekday=new Date(index*dayMs).getUTCDay();
 const startDay=dayFromIndex(index-(weekday+6)%7),endDay=dayFromIndex(calendarDayIndex(startDay)+7);
 return {startDay,endDay,startAt:leagueLocalInstant(startDay,0,zone),endAt:leagueLocalInstant(endDay,0,zone)};
}
function generateBots(week:Omit<LeagueWeek,'planHash'|'bots'|'contributions'>,zone:string):BotPlan[]{
 return botNames.map((name,index)=>{
  const rng=random(hash(`${week.seed}:${index}`)),dailyTargets:number[]=[],due:number[]=[];
  const [min,max]=week.policy.bands[index]!,pattern=index;
  for(let d=0;d<7;d++){
   const target=min+Math.floor(rng()*(max-min));dailyTargets.push(target);
   const day=dayFromIndex(calendarDayIndex(week.startDay)+d),weights=patterns[pattern]!;
   // Allocate a fixed daily target over activity windows, then retain every due mark.
   for(let n=0;n<target;n++){
    let selection=rng()*10,window=0;
    for(;window<3;window++){selection-=weights[window]!;if(selection<0)break;}
    const [from,to]=windows[window]!;
    const at=leagueLocalInstant(day,from,zone)+Math.floor(rng()*(to-from)*60_000);
    if(at>=week.joinedAt&&at<week.endAt)due.push(at);
   }
  }
  due.sort((a,b)=>a-b);return {id:`bot-${index}`,name,pattern,dailyTargets,due};
 });
}
function makeWeek(profileId:string,zone:string,now:string):LeagueWeek{
 const period=leaguePeriod(now,zone),id=`${profileId}:${period.startDay}:${leaguePolicy.version}`;
 const base={...period,id,policy:structuredClone(leaguePolicy),seed:hash(id),joinedAt:instant(now)};
 const week={...base,bots:generateBots(base,zone),contributions:{},planHash:0};week.planHash=planHash(week);return week;
}
function planHash(week:LeagueWeek):number{
 return hash(JSON.stringify([week.id,week.policy,week.seed,week.startDay,week.endDay,week.startAt,week.endAt,week.joinedAt,week.bots]));
}
export function leagueRows(week:LeagueWeek,at:number):LeagueRow[]{
 const rows=[{id:'self',name:['Вы','You'] as const,points:Object.values(week.contributions).reduce((n,c)=>n+c.points,0)},
  ...week.bots.map(bot=>({id:bot.id,name:bot.name,points:bot.due.filter(mark=>mark<=at).length}))];
 return rows.map((row,index)=>({...row,index})).sort((a,b)=>b.points-a.points||a.index-b.index).map((row,index)=>({id:row.id,name:row.name,points:row.points,place:index+1}));
}
function medalTier(policy:LeaguePolicy,points:number,place:number):LeagueResult['medal']['tier']{
 const m=policy.medals;return points<m.minimumPoints?'participant':place<=m.gold?'gold':place<=m.silver?'silver':place<=m.bronze?'bronze':'participant';
}
export function advanceLeague(state:LeagueState,now:string):boolean {
 const at=instant(now);if(at<state.lastSeenAt)return false;
 const previous=state.lastSeenAt;state.lastSeenAt=at;
 const week=state.active;
 if(week&&at>=week.endAt){
  const rows=leagueRows(week,week.endAt-1),self=rows.find(r=>r.id==='self')!;
  if(state.history.some(result=>result.id===week.id))throw Error('League already settled');
  state.history.push({id:week.id,startDay:week.startDay,endDay:week.endDay,endAt:week.endAt,policyVersion:week.policy.version,
   settledAt:at,rows,rank:self.place,points:self.points,medal:{id:`medal:${week.id}`,place:self.place,tier:medalTier(week.policy,self.points,self.place)}});
  state.active=null;
 }
 return at!==previous;
}
export function joinLeague(previous:LeagueState|undefined,profileId:string,zone:string,now:string):LeagueState|null{
 const next=previous?structuredClone(previous):{version:1 as const,profileId,timeZone:zone,lastSeenAt:instant(now),active:null,history:[]};
 if(next.profileId!==profileId||next.timeZone!==zone||instant(now)<next.lastSeenAt)return null;
 advanceLeague(next,now);if(next.active)return null;
 const week=makeWeek(profileId,zone,now);
 if(next.history.some(result=>result.id===week.id)||week.endAt<=next.lastSeenAt)return null;
 next.active=week;return next;
}
export function recordLeagueWin(state:LeagueState,win:LeagueWin,now:string):number{
 const at=instant(now),week=state.active;
 if(!week||win.profileId!==state.profileId||win.weekId!==week.id||!['campaign','free','daily'].includes(win.mode)||
  !win.receiptId.startsWith('win:')||!win.puzzleId||!Number.isFinite(win.at)||at<state.lastSeenAt||
  at>=week.endAt||win.at<week.joinedAt||win.at>=week.endAt||win.at>at||week.contributions[win.puzzleId]||Object.values(week.contributions).some(c=>c.receiptId===win.receiptId))return 0;
 const points=week.policy.weights[win.difficulty];if(!points)return 0;
 state.lastSeenAt=at;
 week.contributions[win.puzzleId]={receiptId:win.receiptId,at:win.at,points,assisted:win.assisted,difficulty:win.difficulty};return points;
}
export function leagueUpdateDue(state:LeagueState|undefined,now:string):boolean{
 if(!state?.active)return false;const at=instant(now);if(at<=state.lastSeenAt)return false;
 return at>=state.active.endAt||state.active.bots.some(b=>b.due.some(mark=>mark>state.lastSeenAt&&mark<=at));
}
export function validateLeague(state:LeagueState|undefined,profile:{id:string;timeZone:string}):void{
 if(state===undefined)return;
 const fail=()=>{throw Error('Corrupt league state');},finite=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 if(!state||state.version!==1||state.profileId!==profile.id||state.timeZone!==profile.timeZone||!finite(state.lastSeenAt)||!Array.isArray(state.history))return fail();
 const ids=new Set<string>();let lastEnd=0;
 for(const result of state.history){
  if(!result||ids.has(result.id)||result.id!==`${profile.id}:${result.startDay}:league-lab-1`||result.policyVersion!=='league-lab-1'||
   !finite(result.settledAt)||result.settledAt>state.lastSeenAt||!Array.isArray(result.rows)||result.rows.length!==10)return fail();
  const startIndex=calendarDayIndex(result.startDay);
  if(new Date(startIndex*dayMs).getUTCDay()!==1||calendarDayIndex(result.endDay)-startIndex!==7||result.startDay<dayFromIndex(Math.floor(lastEnd/dayMs)))return fail();
  lastEnd=calendarDayIndex(result.endDay)*dayMs;ids.add(result.id);
  if(!finite(result.endAt)||result.settledAt<result.endAt)return fail();
  const rowIds=new Set<string>();
  result.rows.forEach((row,index)=>{
   if(row.place!==index+1||!finite(row.points)||rowIds.has(row.id)||!['self',...botNames.map((_,i)=>`bot-${i}`)].includes(row.id)||
    !Array.isArray(row.name)||row.name.length!==2||row.name.some(n=>typeof n!=='string'||n.length>60)||index>0&&row.points>result.rows[index-1]!.points)return fail();
   if(index>0&&row.points===result.rows[index-1]!.points){
    const order=(id:string)=>id==='self'?0:Number(id.slice(4))+1;
    if(order(row.id)<order(result.rows[index-1]!.id))return fail();
   }
   rowIds.add(row.id);
  });
  const self=result.rows.find(r=>r.id==='self')!;
  if(result.rank!==self.place||result.points!==self.points||!result.medal||result.medal.id!==`medal:${result.id}`||result.medal.place!==result.rank||
   result.medal.tier!==medalTier(leaguePolicy,result.points,result.rank))return fail();
 }
 const week=state.active;if(week===null)return;
 if(!week||!finite(week.joinedAt)||week.joinedAt>state.lastSeenAt||week.endAt<=state.lastSeenAt||ids.has(week.id)||
  JSON.stringify(week.policy)!==JSON.stringify(leaguePolicy))return fail();
 if(week.id!==`${profile.id}:${week.startDay}:league-lab-1`||week.seed!==hash(week.id)||
  !finite(week.startAt)||!finite(week.endAt)||week.startAt>week.joinedAt||week.joinedAt>=week.endAt||
  calendarDayIndex(week.endDay)-calendarDayIndex(week.startDay)!==7||
  new Date(calendarDayIndex(week.startDay)*dayMs).getUTCDay()!==1||
  !Array.isArray(week.bots)||week.bots.length!==9||!finite(week.planHash)||week.planHash!==planHash(week))return fail();
 for(const [index,bot] of week.bots.entries()){
  const [min,max]=week.policy.bands[index]!;
  if(bot.id!==`bot-${index}`||JSON.stringify(bot.name)!==JSON.stringify(botNames[index])||bot.pattern!==index||
   !Array.isArray(bot.dailyTargets)||bot.dailyTargets.length!==7||bot.dailyTargets.some(n=>!finite(n)||n<min||n>=max)||
   !Array.isArray(bot.due)||bot.due.length>bot.dailyTargets.reduce((a,b)=>a+b,0)||
   bot.due.some((at,i)=>!finite(at)||at<week.joinedAt||at>=week.endAt||i>0&&at<bot.due[i-1]!))return fail();
 }
 if(!week.contributions||Array.isArray(week.contributions))return fail();
 const receipts=new Set<string>();
 for(const [puzzleId,c] of Object.entries(week.contributions)){
  if(!puzzleId||!c||!c.receiptId.startsWith('win:')||receipts.has(c.receiptId)||!finite(c.at)||c.at<week.joinedAt||c.at>=week.endAt||c.at>state.lastSeenAt||
   typeof c.assisted!=='boolean'||!Object.keys(leaguePolicy.weights).includes(c.difficulty)||c.points!==week.policy.weights[c.difficulty])return fail();
  receipts.add(c.receiptId);
 }
}
