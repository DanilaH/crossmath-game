import {leagueActivitySeconds,leagueActivityPatterns,leagueWindowQuotas,leagueDayBatches} from './leagueSchedule';
import type {LeagueBatch,LeagueWindow} from './leagueSchedule';
import {calendarDayIndex,dayFromIndex,profileDay} from './calendar';
import type {Difficulty,Mode} from '../core/types';

/** LEAGUE-01 experimental calibration, never a live Guru configuration. */
export const leagueEnabled=import.meta.env.MODE==='league-lab'||import.meta.env.MODE==='win-rv-lab';
export interface LeaguePolicy {
 version:'league-lab-1'|'league-lab-2'|'league-lab-3'; planner?:'guru-batches-v1';weekend?:'frozen-normal-range'; weights:Record<Difficulty,number>; assisted:'include'; tie:'self-first';
 bands:readonly (readonly [number,number])[];medals:{gold:number;silver:number;bronze:number;minimumPoints:number};
}
export const legacyLeaguePolicy:LeaguePolicy={version:'league-lab-1',weights:{easy:1,standard:2,hard:3,expert:4},
 assisted:'include',tie:'self-first',medals:{gold:1,silver:2,bronze:3,minimumPoints:1},bands:[[6,11],[6,11],[4,8],[4,8],[3,6],[3,6],[1,4],[1,4],[1,4]]};
export const v2LeaguePolicy:LeaguePolicy={...legacyLeaguePolicy,version:'league-lab-2'};
export const leaguePolicy:LeaguePolicy={...legacyLeaguePolicy,version:'league-lab-3',planner:'guru-batches-v1',weekend:'frozen-normal-range',bands:[[5,10],[5,10],[3,8],[3,8],[2,6],[2,6],[1,4],[1,4],[1,4]]};
const policyFor=(version:string)=>version==='league-lab-1'?legacyLeaguePolicy:version==='league-lab-2'?v2LeaguePolicy:version==='league-lab-3'?leaguePolicy:undefined;
// Frozen approximation used ONLY to keep existing v1/v2 plans compatible.
const windows=[[490,660],[660,960],[960,1140],[1140,1380]] as const;
const patterns=[[4,0,0,6],[0,5,5,0],[2,2,2,4],[0,3,3,4],[5,5,0,0],[0,0,4,6],[1,1,3,5],[4,2,4,0],[2,4,0,4]];
export const botNames=[['Латунь','Brass'],['Графит','Graphite'],['Искра','Spark'],['Компас','Compass'],['Кедр','Cedar'],['Кварц','Quartz'],['Штрих','Stroke'],['Ритм','Rhythm'],['Линза','Lens']] as const;
export interface BotPlan {avatar?:number;id:string;name:readonly [string,string];pattern?:number;dailyTargets:number[];due?:number[];dailyPatterns?:number[];events?:LeagueBatch[]}
export interface LeagueContribution {receiptId:string;at:number;points:number;assisted:boolean;difficulty:Difficulty}
export interface LeagueWeek {
 id:string;policy:LeaguePolicy;seed:number;startDay:string;endDay:string;startAt:number;endAt:number;joinedAt:number;
 activityWindows?:LeagueWindow[][];planHash:number;bots:BotPlan[];contributions:Record<string,LeagueContribution>;
}
export interface LeagueRow {avatar?:number;id:string;name:readonly [string,string];points:number;place:number}
export interface LeagueResult {
 id:string;startDay:string;endDay:string;endAt:number;policyVersion:LeaguePolicy['version'];settledAt:number;
 presented?:boolean;rows:LeagueRow[];rank:number;points:number;medal:{id:string;place:number;tier:'gold'|'silver'|'bronze'|'participant'};
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
export const leagueNicknames=[
 ['Мира','Mira'],['Alex_R','Alex_R'],['Ника','Nika'],['Sova','Sova'],['ДанФокс','DanFox'],['Tanya_M','Tanya_M'],['Макс77','Max77'],['Кира','Kira'],
 ['GreyCat','GreyCat'],['Агата','Agata'],['Leon','Leon'],['Sasha','Sasha'],['Лея','Leia'],['Никита','Nikita'],['Owliver','Owliver'],['Arty','Arty'],
 ['Лисёна','Foxie'],['June','June'],['Виктор','Victor'],['Mila','Mila'],['Romio','Romio'],['Eva_N','Eva_N'],['Тим','Tim'],['Лана','Lana'],
 ['Ilya_K','Ilya_K'],['Марта','Marta'],['Samwise','Samwise'],['Rita','Rita'],['Raven','Raven'],['Алиса','Alice'],['Den_88','Den_88'],['Юна','Yuna'],
 ['Loki','Loki'],['Вера','Vera'],['AnyaBee','AnyaBee'],['Марк','Mark'],['Fenix','Fenix'],['Нора','Nora'],['Boris_B','Boris_B'],['Olga','Olga'],
 ['Felix','Felix'],['Dasha','Dasha'],['Эмиль','Emil'],['Kat_22','Kat_22'],['Рен','Ren'],['Sonya','Sonya'],['Nemo','Nemo'],['Валери','Valerie'],
] as const;
function shuffled<T>(values:readonly T[],rng:()=>number):T[]{const list=[...values];for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j]!,list[i]!];}return list;}
/** Adjacent weeks select disjoint nine-person windows from a profile-specific pool. */
export function leagueRoster(scope:string){
 const match=scope.match(/^(.*):(\d{4}-\d{2}-\d{2}):league-lab-[123]$/);if(!match)throw Error('Invalid roster scope');
 const profile=match[1]!,week=Math.floor(calendarDayIndex(match[2]!)/7),pool=shuffled(leagueNicknames,random(hash('roster:'+profile)));
 const offset=((week*11)%pool.length+pool.length)%pool.length,avatars=shuffled(Array.from({length:16},(_,i)=>i),random(hash('portraits:'+scope)));
 return Array.from({length:9},(_,i)=>({name:pool[(offset+i)%pool.length]!,avatar:avatars[i]!}));
}
export function leagueDisplayRow(row:LeagueRow,scope:string):LeagueRow{
 if(row.id==='self'||row.avatar!==undefined)return row;
 const index=Number(row.id.slice(4)),identity=leagueRoster(scope)[index];return identity?{...row,...identity}:row;
}
function generateBots(week:Omit<LeagueWeek,'planHash'|'bots'|'contributions'>,zone:string):BotPlan[]{
 const roster=week.policy.version==='league-lab-1'?botNames.map(name=>({name})):leagueRoster(week.id);
 return roster.map((identity,index)=>{
  const {name}=identity;
  const rng=random(hash(`${week.seed}:${index}`)),dailyTargets:number[]=[],due:number[]=[];
  const [min,max]=week.policy.bands[index]!,pattern=index;
  if(week.policy.version==='league-lab-3'){
   const dailyPatterns:number[]=[],events:LeagueBatch[]=[];
   for(let day=0;day<7;day++){
    const target=min+Math.floor(rng()*(max-min)),selected=Math.floor(rng()*leagueActivityPatterns.length);
    dailyTargets.push(target);dailyPatterns.push(selected);events.push(...leagueDayBatches(target,selected,week.activityWindows![day]!,rng));
   }
   return {id:`bot-${index}`,...identity,dailyTargets,dailyPatterns,events};
  }
  for(let d=0;d<7;d++){
   const target=min+Math.floor(rng()*(max-min));dailyTargets.push(target);
   const day=dayFromIndex(calendarDayIndex(week.startDay)+d),weights=patterns[pattern]!;
   // Allocate a fixed daily target over activity windows, then retain every due mark.
   for(let n=0;n<target;n++){
    let selection=rng()*10,window=0;
    for(;window<3;window++){selection-=weights[window]!;if(selection<0)break;}
    const [from,to]=windows[window]!;
    const at=leagueLocalInstant(day,from,zone)+Math.floor(rng()*(to-from)*60_000);
    if(at>=(week.policy.version==='league-lab-1'?week.joinedAt:week.startAt)&&at<week.endAt)due.push(at);
   }
  }
  due.sort((a,b)=>a-b);return {id:`bot-${index}`,...identity,pattern,dailyTargets,due};
 });
}
function makeWeek(profileId:string,zone:string,now:string):LeagueWeek{
 const period=leaguePeriod(now,zone),id=`${profileId}:${period.startDay}:${leaguePolicy.version}`;
 const activityWindows=Array.from({length:7},(_,day)=>{const civil=dayFromIndex(calendarDayIndex(period.startDay)+day);return leagueActivitySeconds.map(([from,to])=>[leagueLocalInstant(civil,Math.floor(from/60),zone)+from%60*1000,leagueLocalInstant(civil,Math.floor(to/60),zone)+to%60*1000] as LeagueWindow);});
 const base={...period,id,policy:structuredClone(leaguePolicy),seed:hash(id),joinedAt:instant(now),activityWindows};
 const week={...base,bots:generateBots(base,zone),contributions:{},planHash:0};week.planHash=planHash(week);return week;
}
function planHash(week:LeagueWeek):number{
 const data:unknown[]=[week.id,week.policy,week.seed,week.startDay,week.endDay,week.startAt,week.endAt,week.joinedAt,week.bots];if(week.policy.version==='league-lab-3')data.push(week.activityWindows);return hash(JSON.stringify(data));
}
export function leagueBotEvents(bot:BotPlan):readonly LeagueBatch[]{return bot.events??bot.due!.map(at=>({at,points:1}));}
export function leagueRows(week:LeagueWeek,at:number):LeagueRow[]{
 const rows=[{id:'self',name:['Вы','You'] as const,points:Object.values(week.contributions).reduce((n,c)=>n+c.points,0)},
  ...week.bots.map(bot=>({...(bot.avatar===undefined?{}:{avatar:bot.avatar}),id:bot.id,name:bot.name,points:leagueBotEvents(bot).reduce((n,event)=>n+(event.at<=at?event.points:0),0)}))];
 return rows.map((row,index)=>({...row,index})).sort((a,b)=>b.points-a.points||a.index-b.index).map((row,index)=>({...(row.avatar===undefined?{}:{avatar:row.avatar}),id:row.id,name:row.name,points:row.points,place:index+1}));
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
   settledAt:at,presented:false,rows,rank:self.place,points:self.points,medal:{id:`medal:${week.id}`,place:self.place,tier:medalTier(week.policy,self.points,self.place)}});
  state.active=null;
 }
 return at!==previous;
}
export function joinLeague(previous:LeagueState|undefined,profileId:string,zone:string,now:string):LeagueState|null{
 const next=previous?structuredClone(previous):{version:1 as const,profileId,timeZone:zone,lastSeenAt:instant(now),active:null,history:[]};
 if(next.profileId!==profileId||next.timeZone!==zone||instant(now)<next.lastSeenAt)return null;
 advanceLeague(next,now);if(next.active)return null;
 const week=makeWeek(profileId,zone,now);
 if(next.history.some(result=>result.startDay===week.startDay)||week.endAt<=next.lastSeenAt)return null;
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
 return at>=state.active.endAt||state.active.bots.some(b=>leagueBotEvents(b).some(event=>event.at>state.lastSeenAt&&event.at<=at));
}
export function validateLeague(state:LeagueState|undefined,profile:{id:string;timeZone:string}):void{
 if(state===undefined)return;
 const fail=()=>{throw Error('Corrupt league state');},finite=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 if(!state||state.version!==1||state.profileId!==profile.id||state.timeZone!==profile.timeZone||!finite(state.lastSeenAt)||!Array.isArray(state.history))return fail();
 const ids=new Set<string>();let lastEnd=0;
 for(const result of state.history){
  if(!result||ids.has(result.id)||!policyFor(result.policyVersion)||result.id!==`${profile.id}:${result.startDay}:${result.policyVersion}`||result.presented!==undefined&&typeof result.presented!=='boolean'||
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
   if(row.avatar!==undefined&&(!finite(row.avatar)||row.avatar>15))return fail();
   rowIds.add(row.id);
  });
  const self=result.rows.find(r=>r.id==='self')!;
  if(result.rank!==self.place||result.points!==self.points||!result.medal||result.medal.id!==`medal:${result.id}`||result.medal.place!==result.rank||
   result.medal.tier!==medalTier(policyFor(result.policyVersion)!,result.points,result.rank))return fail();
 }
 const week=state.active;if(week===null)return;
 if(!week||!finite(week.joinedAt)||week.joinedAt>state.lastSeenAt||week.endAt<=state.lastSeenAt||ids.has(week.id)||
  JSON.stringify(week.policy)!==JSON.stringify(policyFor(week.policy?.version)))return fail();
 if(week.id!==`${profile.id}:${week.startDay}:${week.policy.version}`||week.seed!==hash(week.id)||
  !finite(week.startAt)||!finite(week.endAt)||week.startAt>week.joinedAt||week.joinedAt>=week.endAt||
  calendarDayIndex(week.endDay)-calendarDayIndex(week.startDay)!==7||
  new Date(calendarDayIndex(week.startDay)*dayMs).getUTCDay()!==1||
  !Array.isArray(week.bots)||week.bots.length!==9||!finite(week.planHash)||week.planHash!==planHash(week))return fail();
 if(week.policy.version==='league-lab-3'){
  if(!Array.isArray(week.activityWindows)||week.activityWindows.length!==7)return fail();
  let previous=week.startAt;
  for(const bounds of week.activityWindows){
   if(!Array.isArray(bounds)||bounds.length!==4)return fail();
   for(const range of bounds){if(!Array.isArray(range)||range.length!==2||!range.every(finite)||range[0]!<previous||range[0]!>=range[1]!||range[1]!>=week.endAt)return fail();previous=range[1]!;}
  }
 }else if(week.activityWindows!==undefined)return fail();
 for(const [index,bot] of week.bots.entries()){
  const [min,max]=week.policy.bands[index]!,isLegacy=week.policy.version==='league-lab-1';
  if(!bot||bot.id!==`bot-${index}`||(isLegacy?JSON.stringify(bot.name)!==JSON.stringify(botNames[index]):!leagueNicknames.some(name=>JSON.stringify(name)===JSON.stringify(bot.name))||!finite(bot.avatar)||Number(bot.avatar)>15)||
   !Array.isArray(bot.dailyTargets)||bot.dailyTargets.length!==7||bot.dailyTargets.some(n=>!finite(n)||n<min||n>=max))return fail();
  if(week.policy.version==='league-lab-3'){
   if(bot.pattern!==undefined||bot.due!==undefined||!Array.isArray(bot.dailyPatterns)||bot.dailyPatterns.length!==7||bot.dailyPatterns.some(p=>!finite(p)||p>8)||!Array.isArray(bot.events)||bot.events.length>bot.dailyTargets.reduce((a,b)=>a+b,0))return fail();
   const sums=Array.from({length:7},()=>[0,0,0,0]);
   bot.events.forEach((event,i)=>{
    if(!event||!finite(event.at)||!finite(event.points)||event.points<1||event.points>4||i>0&&event.at<=bot.events![i-1]!.at)return fail();
    let found=false;
    for(const [day,bounds] of week.activityWindows!.entries())for(const [window,[from,to]] of bounds.entries())if(event.at>=from&&event.at<to){sums[day]![window]!+=event.points;found=true;}
    if(!found)return fail();
   });
   if(sums.some((sum,day)=>JSON.stringify(sum)!==JSON.stringify(leagueWindowQuotas(bot.dailyTargets[day]!,bot.dailyPatterns![day]!))))return fail();
  }else if(bot.pattern!==index||bot.events!==undefined||bot.dailyPatterns!==undefined||!Array.isArray(bot.due)||bot.due.length>bot.dailyTargets.reduce((a,b)=>a+b,0)||bot.due.some((at,i)=>!finite(at)||at<(isLegacy?week.joinedAt:week.startAt)||at>=week.endAt||i>0&&at<bot.due![i-1]!))return fail();
 }
 if(new Set(week.bots.map(b=>JSON.stringify(b.name))).size!==9||week.policy.version!=='league-lab-1'&&new Set(week.bots.map(b=>b.avatar)).size!==9)return fail();
 if(!week.contributions||Array.isArray(week.contributions))return fail();
 const receipts=new Set<string>();
 for(const [puzzleId,c] of Object.entries(week.contributions)){
  if(!puzzleId||!c||!c.receiptId.startsWith('win:')||receipts.has(c.receiptId)||!finite(c.at)||c.at<week.joinedAt||c.at>=week.endAt||c.at>state.lastSeenAt||
   typeof c.assisted!=='boolean'||!Object.keys(leaguePolicy.weights).includes(c.difficulty)||c.points!==week.policy.weights[c.difficulty])return fail();
  receipts.add(c.receiptId);
 }
}
