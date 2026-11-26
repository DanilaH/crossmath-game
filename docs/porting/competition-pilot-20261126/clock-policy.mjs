// Synthetic race clock contract, not product runtime
function clockModel(){
 const assert=(x,m)=>{if(!x)throw Error(m)};
 const init={raceId:"r",profileId:"p",track:"relax",elapsedMs:0,points:0,target:4,seen:[],finishMs:1000,status:"active",receipt:null,lastSequence:0};
 function settle(s,e){
  if(s.status!=="active"||!e.committed||e.raceId!==s.raceId||e.profileId!==s.profileId||e.track!==s.track||
     !Number.isSafeInteger(e.sequence)||e.sequence<=s.lastSequence||!Number.isSafeInteger(e.activeMs)||e.activeMs<s.elapsedMs)return s;
  if(!e.eligibleActive)return s;
  const next={...s,elapsedMs:Math.min(e.activeMs,s.finishMs),lastSequence:e.sequence,seen:[...s.seen]};
  if(e.activeMs<=s.finishMs&&e.win&&typeof e.puzzle==="string"&&e.puzzle&&!next.seen.includes(e.puzzle)&&[1,2].includes(e.weight)){
   next.seen.push(e.puzzle);next.points=Math.min(s.target,s.points+e.weight);
  }
  if(next.points===next.target){next.status="won";next.receipt={raceId:s.raceId,status:"won"}}
  else if(e.activeMs>=s.finishMs){next.status="lost";next.receipt={raceId:s.raceId,status:"lost"}}
  return next;
 }
 const e=(sequence,activeMs,extras={})=>({sequence,activeMs,raceId:"r",profileId:"p",track:"relax",committed:true,eligibleActive:true,win:false,...extras});
 let cases=0;
 for(const t of [0,1,500,999,1000,1001])for(const points of [0,1,2,3])for(const win of [false,true])for(const goodSeq of [false,true])for(const active of [false,true])for(const commit of [false,true]){
   const initial={...init,points,lastSequence:2,elapsedMs:1,seen:[]},evt=e(goodSeq?3:2,t,{eligibleActive:active,committed:commit,win,puzzle:"q",weight:1});
   const result=settle(initial,evt);
   assert(settle(result,evt)===result,"repeat absolute input must be inert");
   const accepted=goodSeq&&active&&commit&&t>=1;
   assert(accepted?result.lastSequence===3:result===initial,"eligibility");
   assert(result.points<=4&&result.elapsedMs<=1000,"bounds");
   if(accepted&&t>=1000){assert(result.status===(t===1000&&points===3&&win?"won":"lost"),"tie boundary")}
   cases++;
 }
 const partial=settle(init,e(1,500,{win:true,puzzle:"a",weight:2}));
 const pause=settle(partial,e(2,800,{eligibleActive:false}));
 assert(pause===partial,"pause must not advance");
 const restored=JSON.parse(JSON.stringify(partial));
 const same=settle(restored,e(1,500,{win:true,puzzle:"a",weight:2}));
 assert(same===restored,"restore duplicate");
 const retry=settle(restored,e(2,800,{committed:false,win:true,puzzle:"b",weight:2}));
 assert(retry===restored,"failed commit");
 const finished=settle(retry,e(2,800,{win:true,puzzle:"b",weight:2}));
 assert(finished.status==="won"&&finished.points===4&&settle(finished,e(3,1000))===finished,"retry terminal");
 return {scope:"synthetic absolute-active-clock input and receipt model, not implementation or OS clock",cases,extraControls:5,decision:"supersedes delta-input settlement pseudocode in earlier pace model for integration; absolute monotonic activeMs and increasing committed event sequence, no replay of delta; terminal tie in same serialized adjudication only"};
}
console.log(JSON.stringify(clockModel(),null,2));
