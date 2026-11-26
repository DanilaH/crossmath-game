// Candidate only; run node event-policy.mjs
function compareEvent(){
 const assert=(x,m)=>{if(!x)throw Error(m)};
 const tiers=[3,6,9,12];
 function grant(s,e){
   if(!e.committed||!e.eligible||e.profile!==s.profile||e.event!==s.event||e.day<s.start||e.day>=s.end||s.expired||s.seen.includes(e.puzzle)||s.points>=12)return s;
   const points=s.points+1,receipts=[...s.receipts];for(const t of tiers)if(points>=t&&!receipts.includes(t))receipts.push(t);
   return {...s,points,seen:[...s.seen,e.puzzle],receipts};
 }
 function close(s,now){return now>=s.end&&!s.expired?{...s,expired:true}:s}
 let cases=0;
 for(let count=0;count<=15;count++)for(const committed of [false,true])for(const eligible of [false,true])for(const profile of ["p","q"])for(const event of ["a","b"])for(const day of [-1,0,6,7,8])for(const expired of [false,true]){
   let s={event:"a",profile:"p",start:0,end:7,expired,seen:[],points:0,receipts:[]},other={...s,event:"b"};
   for(let i=0;i<count;i++){const e={committed,eligible,profile,event,day,puzzle:"x"+i};const next=grant(s,e);assert(grant(next,e)===next,"duplicate");s=next}
   const valid=committed&&eligible&&profile==="p"&&event==="a"&&day>=0&&day<7&&!expired,points=valid?Math.min(count,12):0;
   assert(s.points===points&&s.receipts.length===tiers.filter(t=>t<=points).length,"eligibility/receipt");
   const closed=close(s,7);assert(closed.expired&&close(closed,8)===closed&&closed.points===s.points&&JSON.stringify(closed.receipts)===JSON.stringify(s.receipts)&&other.expired===expired,"expiry scope");
   cases++;
 }
 const patterns=Array.from({length:128},(_,mask)=>Array.from({length:7},(_,d)=>Number(Boolean(mask&(1<<d)))));
 const coverage=[1,2,3].map(w=>({distinctPerActiveDay:w,activeDaysFor12:Math.ceil(12/w),activeDaysFor15:Math.ceil(15/w),completeSchedules12:patterns.filter(a=>a.reduce((s,v)=>s+v,0)*w>=12).length,completeSchedules15:patterns.filter(a=>a.reduce((s,v)=>s+v,0)*w>=15).length}));
 return {scope:"synthetic candidate receipt model, not app execution or probability distribution",selectedTiers:tiers,rejectedAlternative:[3,6,10,15],reason:"12 allows one missed day at two distinct wins per active day, 15 cannot be completed in seven days at that pace",cases,patterns:patterns.length,coverage,proposedCoinEmission:0};
}
console.log(JSON.stringify(compareEvent(),null,2));
