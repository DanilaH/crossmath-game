/** Guru 4.17.0/26101374, NATIVE_STATIC: exact PP 0xed90/0xed98 tables.
 * Source: mini-games-kit@5cee4ac7/research/games/crossmath/porting/guru-brains-plan-20261127.
 * Our RNG, calendar policy and small-target saturation are explicit adaptations. */
export const leagueActivityPatterns=[
 {key:'1&2',windows:[0,1],weights:[.8,.2]},
 {key:'1&3',windows:[0,2],weights:[.7,.3]},
 {key:'1&4',windows:[0,3],weights:[.4,.6]},
 {key:'2&3',windows:[1,2],weights:[.4,.6]},
 {key:'2&4',windows:[1,3],weights:[.2,.8]},
 {key:'3&4',windows:[2,3],weights:[.3,.7]},
 {key:'1&2&3',windows:[0,1,2],weights:[.5,.2,.3]},
 {key:'1&2&4',windows:[0,1,3],weights:[.35,.15,.5]},
 {key:'2&3&4',windows:[1,2,3],weights:[.15,.25,.6]},
] as const;
/** Literal HH:mm:ss endpoints; the terminal second is excluded, as in nextInt(end-start). */
export const leagueActivitySeconds=[[29400,39599],[39600,57599],[57600,68399],[68400,82799]] as const;
export type LeagueWindow=readonly [number,number];
export interface LeagueBatch {at:number;points:number}
export function leagueWindowQuotas(target:number,patternIndex:number):number[]{
 const pattern=leagueActivityPatterns[patternIndex];
 if(!Number.isSafeInteger(target)||target<0||!pattern)throw Error('Invalid league allocation');
 const quotas=[0,0,0,0];let remaining=target;
 pattern.windows.forEach((window,index)=>{
  // Source ceil(target*weight), then residual. Saturation avoids a negative
  // residual at our valid 1-point targets; for source targets >=5 it is identical.
  const amount=index===pattern.windows.length-1?remaining:Math.min(remaining,Math.ceil(target*pattern.weights[index]!));
  quotas[window]=amount;remaining-=amount;
 });return quotas;
}
export function leagueDayBatches(target:number,pattern:number,bounds:readonly LeagueWindow[],rng:()=>number):LeagueBatch[]{
 if(bounds.length!==4)throw Error('Invalid league windows');
 const quotas=leagueWindowQuotas(target,pattern),events=new Map<number,number>();
 quotas.forEach((quota,window)=>{
  const [from,to]=bounds[window]!;if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||to<=from||quota>to-from)throw Error('Invalid league window capacity');
  let remaining=quota,tries=0;
  while(remaining){
   if(++tries>10_000)throw Error('League random source exhausted');
   const points=Math.min(remaining,1+Math.floor(rng()*4)),at=from+Math.floor(rng()*(to-from));
   if(!Number.isSafeInteger(at)||at<from||at>=to||points<1||points>4)throw Error('Invalid league random draw');
   if(events.has(at))continue; // A collision consumes no quota; retry the entire event.
   events.set(at,points);remaining-=points;
  }
 });return [...events].sort((a,b)=>a[0]-b[0]).map(([at,points])=>({at,points}));
}
