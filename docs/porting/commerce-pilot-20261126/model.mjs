// Pure policy experiment; no runtime imports or provider simulation.
function model(){
 let assertions=0;
 const eq=(a,b,label)=>{assertions++;if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label+": "+JSON.stringify(a)+" != "+JSON.stringify(b))};
 const economics=[];
 for(const amount of [10,30,60])for(const cap of [0,1,2]) economics.push({amount,cap,sevenDayMaximum:amount*cap*7,helpEquivalent:amount*cap*7/60});
 const make=(cap,amount)=>({cap,amount,day:0,coins:120,req:{},claimed:{},profile:"P"});
 const reserve=(s,id)=>{if(s.req[id])return false;const taken=Object.values(s.req).filter(r=>r.day===s.day&&(r.status==="pending"||r.status==="earned"));if(taken.length>=s.cap)return false;let slot=0;while(taken.some(r=>r.slot===slot))slot++;s.req[id]={profile:s.profile,day:s.day,slot,amount:s.amount,status:"pending"};return true};
 const deliver=(s,id,outcome,profile="P")=>{let r=s.req[id];if(!r||r.profile!==profile||r.status!=="pending"||!["earned","failed","cancelled"].includes(outcome))return false;let key=r.day+":"+r.slot;if(outcome==="earned"){if(s.claimed[key])return false;s.claimed[key]=id;s.coins+=r.amount;}r.status=outcome;return true};
 let cases=0;
 for(let cap of [1,2])for(let amount of [10,30,60])for(let terminal of ["earned","cancelled","failed"])for(let cold of [false,true]){
  let s=make(cap,amount);eq(reserve(s,"a"),true,"reserve a");
  for(let j=1;j<cap;j++)eq(reserve(s,"a"+j),true,"fill pending cap");
  eq(reserve(s,"over"),false,"pending cap");
  eq(deliver(s,"a","dismissed"),false,"dismissal not earned");
  eq(deliver(s,"a","earned","WRONG"),false,"wrong profile");
  eq(s.coins,120,"no unauthorized reward");
  if(cold)s=JSON.parse(JSON.stringify(s));
  s.day=1;eq(reserve(s,"b"),true,"new day separate from reserved day");
  eq(deliver(s,"a",terminal),true,"late terminal");
  eq(deliver(s,"a","earned"),false,"duplicate/contradictory terminal");
  eq(s.coins,120+(terminal==="earned"?amount:0),"prior day settlement");
  eq(deliver(s,"b","earned"),true,"new day award");
  eq(s.coins,120+amount+(terminal==="earned"?amount:0),"sum");
  eq(deliver(s,"b","earned"),false,"duplicate new-day earned");
  eq(Object.keys(s.claimed).length,1+(terminal==="earned"?1:0),"distinct semantic day keys");
  s.day=0;eq(reserve(s,"retry"),terminal!=="earned","slot only released on trusted terminal failure");
  if(terminal!=="earned"){eq(deliver(s,"retry","earned"),true,"retry earns");eq(deliver(s,"a","earned"),false,"old cancelled/failed no grant");}
  cases++;
 }
 // Fault control: a UI-only cap (ignores pending) admits excess reservations; must be rejected.
 const s=make(1,10);reserve(s,"a");const badCount=Object.values(s.req).filter(r=>r.status==="earned").length;
 eq(badCount<s.cap,true,"negative control demonstrates earned-only admission bug");
 eq(reserve(s,"b"),false,"correct pending-aware cap blocks");
 // Fixed values, not predictions.
 eq(60/10,6,"coin/credit ratio");eq([10,15,20,25].map(x=>2*x),[20,30,40,50],"win delta");
 return {evidence:"MODEL_TEST; pure proposed state machine and arithmetic; no Android, SDK, original code, implementation or demand",inputs:{helpCost:60,startingCoins:120,baseCoins:[10,15,20,25],existingRewardedHintCredits:1,proposedStoreAmounts:[10,30,60],proposedCaps:[0,1,2],days:7},economics,cases,assertions,negativeControls:1,excluded:"presentation single-flight, provider terminal trust, save failure/ack/native entitlement not modeled; test in implementation; not a current cap"};
}
console.log(JSON.stringify(model(),null,2));
