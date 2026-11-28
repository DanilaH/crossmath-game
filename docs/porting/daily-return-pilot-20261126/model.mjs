// Reproduction model only. Run from pinned Crossmath game checkout.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function model(old,boards,routes,cfg){
 const assert=(x,m)=>{if(!x)throw Error(m)};
 const all=new Map([...old,...boards].map(p=>[p.puzzleId,p])),pools={};for(const p of boards)(pools[p.bucket]??=[]).push(p);
 const rotations={relax:['easy-short','easy-long','normal-short','easy-short','easy-long','normal-long'],challenge:['hard-short','hard-short','expert-short','hard-short','hard-short','hell-short']},primes=[383,571,677,269,347,499,673,761,809,877];
 const bucketTurn=(track,i)=>{const s=rotations[track],p=i%s.length,k=s[p];return {k,turn:Math.floor(i/s.length)*s.filter(x=>x===k).length+s.slice(0,p).filter(x=>x===k).length}};
 const base=(track,i)=>{const {k,turn}=bucketTurn(track,i),p=pools[k],pass=Math.floor(turn/p.length),index=turn<p.length?turn:(turn%p.length)*primes[(pass-1)%primes.length]%p.length;return p[index]};
 const campaign=[...routes.campaignSequence.slice(0,15),...Array.from({length:120},(_,i)=>base("relax",i).puzzleId),...Array.from({length:105},(_,i)=>base("challenge",i).puzzleId)];
 assert(all.size===515&&campaign.length===240,"identity");
 const goals=new Map(cfg.goals.map(g=>[g.id,g]));
 const extra=[
  {id:"medium1",metric:"difficulty",goal:1,match:"standard"},{id:"hard1",metric:"difficulty",goal:1,match:"hard"},{id:"expert1",metric:"difficulty",goal:1,match:"expert"},
  {id:"eq12",metric:"equations",goal:12,match:null},{id:"eq20",metric:"equations",goal:20,match:null},{id:"win3",metric:"boards",goal:3,match:null}
 ];for(const x of extra)goals.set(x.id,x);
 const additional=[["win2","daily","eq12"],["win2","free","medium1"],["win3","route","eq12"],["win2","endless","hard1"],["win1","daily","mul1"],["win3","free","eq20"],["win2","route","expert1"],["win2","daily","div1"],["win3","endless","eq20"]];
 const candidate=[...cfg.rotation,...additional];const day="2026-11-26";
 const contribution=(goalId,offer)=>{const g=goals.get(goalId),p=all.get(offer.puzzleId);switch(g.metric){case"boards":return 1;case"mode":return Number(offer.mode===g.match);case"today":return Number(offer.mode==="daily"&&offer.dayKey===day);case"difficulty":return Number(p.difficulty===g.match);case"op":return p.equations.filter(e=>e.op===g.match).length;case"equations":return p.equations.length;default:throw Error("unknown metric");}};
 function available(prefix,phase,dailyIndex,dailyDone){
   const solved=new Set(campaign.slice(0,prefix)),offers=[];
   for(let i=0;i<Math.min(prefix+3,campaign.length);i++)offers.push({puzzleId:campaign[i],mode:"campaign",campaignPosition:i});
   for(const track of ["relax","challenge"]){if(prefix<(track==="relax"?3:15))continue;const {k}=bucketTurn(track,phase),u=pools[k].filter(p=>!solved.has(p.puzzleId));const p=u.length?u.reduce((a,b)=>a.campaignPosition>b.campaignPosition?a:b):base(track,phase);offers.push({puzzleId:p.puzzleId,mode:"free",freeTrack:track});}
   if(prefix>=5&&!dailyDone)offers.push({puzzleId:pools.daily[dailyIndex].puzzleId,mode:"daily",dayKey:day});
   const endlessCursor=phase;if(prefix>=15)for(let i=endlessCursor;i<endlessCursor+3;i++)offers.push({puzzleId:routes.endlessSequence[i%routes.endlessSequence.length],mode:"endless",endlessStage:i});
   return {offers,endlessCursor};
 }
 // Mirrors current findWitness / resolveQuests for declared fresh daily sets and v2 no-playing-slot snapshots.
 function witness(slots,available,cursor,endlessCursor,seen=[]){
   const complete=p=>slots.every((s,i)=>p[i]>=s.target);
   if(complete(slots.map(s=>s.progress)))return [];
   const groups=new Map();
   for(const o of available){const prereq=o.campaignPosition!==undefined&&o.campaignPosition>=cursor||o.endlessStage!==undefined;if(seen.includes(o.puzzleId)&&!prereq)continue;const vector=slots.map(s=>seen.includes(o.puzzleId)?0:Math.min(s.target,contribution(s.id,o)));if(vector.every(v=>!v)&&!prereq)continue;const key=JSON.stringify([vector,o.campaignPosition!==undefined&&o.campaignPosition>=cursor?o.campaignPosition:null,o.endlessStage??null,o.requiresSolved??[]]);const group=groups.get(key)??[];if(group.length<3&&!group.some(x=>x.puzzleId===o.puzzleId))group.push(o);groups.set(key,group);}
   const candidates=[...groups.values()].flat();let visits=0;
   if(slots.some(s=>s.progress+Math.max(0,...candidates.filter(o=>!seen.includes(o.puzzleId)).map(o=>contribution(s.id,o)))*3<s.target))return null;
   function search(path,progress,cp,ep,depth){if(++visits>80000)return null;if(complete(progress))return path;if(path.length===depth)return null;for(const o of candidates){if(path.some(p=>p.puzzleId===o.puzzleId)||o.campaignPosition!==undefined&&o.campaignPosition>cp||o.endlessStage!==undefined&&o.endlessStage!==ep)continue;const next=slots.map((s,i)=>Math.min(s.target,progress[i]+(seen.includes(o.puzzleId)?0:contribution(s.id,o))));if(next.every((v,i)=>v===progress[i])&&o.campaignPosition!==cp&&o.endlessStage!==ep)continue;const result=search([...path,o],next,cp+Number(o.campaignPosition===cp),ep+Number(o.endlessStage===ep),depth);if(result)return result;}return null;}
   for(let depth=1;depth<=3;depth++){const r=search([],slots.map(s=>s.progress),cursor,endlessCursor,depth);if(r!==null)return r;if(visits>80000)return null;}return null;
 }
 function resolve(ids,offers,cursor,endlessCursor){
   const alternatives=cfg.missionRules.fallbackOrder.alternativesBySlot,original=ids.map(id=>({id,target:goals.get(id).goal,progress:0,paid:false}));
   const masks=Array.from({length:8},(_,i)=>i).sort((a,b)=>a.toString(2).replaceAll("0","").length-b.toString(2).replaceAll("0","").length||a-b);
   for(const mask of masks){const slots=original.map((s,i)=>mask&(1<<(2-i))?{id:alternatives[i],target:1,progress:0,paid:false}:s);const w=witness(slots,offers,cursor,endlessCursor);if(w!==null)return {slots,w,replaced:slots.filter((s,i)=>s.id!==original[i].id).length};}return null;
 }
 const samples=[];
 for(const prefix of [5,15,60,135,240])for(const phase of [0,2,5])for(const dailyIndex of [0,17,49])for(const dailyDone of [false,true]){
  const {offers,endlessCursor}=available(prefix,phase,dailyIndex,dailyDone);
  const rows=candidate.map(ids=>resolve(ids,offers,prefix,endlessCursor));
  assert(rows.every(r=>r&&r.w.length<=3),"missing model witness");
  samples.push({prefix,phase,dailyIndex,dailyDone,rows:rows.map(r=>({boards:r.w.length,replaced:r.replaced}))});
 }
 const aggregate=(indices,filter=()=>true)=>{const rows=samples.filter(filter).flatMap(s=>indices.map(i=>s.rows[i]));return {cases:rows.length,one:rows.filter(x=>x.boards===1).length,two:rows.filter(x=>x.boards===2).length,three:rows.filter(x=>x.boards===3).length,anyReplacement:rows.filter(x=>x.replaced>0).length,meanWitness:rows.reduce((a,r)=>a+r.boards,0)/rows.length};};
 const oldAgg=aggregate(Array.from({length:7},(_,i)=>i)),newAgg=aggregate(Array.from({length:9},(_,i)=>i+7)),groups=candidate.map((ids,i)=>({activeDay:i+1,goals:ids,...aggregate([i])}));
 const sameGroups=cfg.rotation.map(x=>x.join(",")).filter((v,i,a)=>a.indexOf(v)===i).length;
 const dailySolo=pools.daily.map(p=>{const o={puzzleId:p.puzzleId,mode:"daily",dayKey:day};return cfg.rotation[0].every(id=>contribution(id,o)>=goals.get(id).goal);});
 assert(dailySolo.every(Boolean),"daily solo baseline");
 // Separate candidate offline weekly postcard; proof-of-policy state model, not production runtime.
 function settleEvent(s,{period,puzzle,committed,eligible}){
   if(!committed||!eligible||s.period!==period||s.expired||s.seen.includes(puzzle)||s.points>=15)return s;
   const next={...s,seen:[...s.seen,puzzle],points:s.points+1,receipts:[...s.receipts]};
   for(const threshold of [3,6,10,15])if(next.points>=threshold&&!next.receipts.includes(threshold))next.receipts.push(threshold);
   return next;
 }
 let eventChecks=0;
 for(let n=0;n<=20;n++)for(const committed of [true,false])for(const eligible of [true,false])for(const expired of [true,false])for(const samePeriod of [true,false]){
   let s={period:"P1",expired,points:0,seen:[],receipts:[]};
   for(let i=0;i<n;i++){const next=settleEvent(s,{period:samePeriod?"P1":"P2",puzzle:"p"+i,committed,eligible});assert(settleEvent(next,{period:samePeriod?"P1":"P2",puzzle:"p"+i,committed,eligible})===next,"duplicate event");s=next;}
   const expected=committed&&eligible&&!expired&&samePeriod?Math.min(15,n):0;assert(s.points===expected&&s.receipts.length===[3,6,10,15].filter(t=>t<=expected).length,"event point/receipt");eventChecks++;
 }
 const weekly=[1,2,3,4,5].map(w=>({eligibleDistinctWinsPerDay:w,pointsAtSevenDays:Math.min(15,w*7),tiers:[3,6,10,15].filter(t=>t<=w*7),daysToComplete:Math.ceil(15/w)}));
 const budgets={normalSetCoins:3*cfg.taskRewardCoins+cfg.taskAllBonusCoins,dailyPlusFullSet:cfg.dailyBonusCoins+3*cfg.taskRewardCoins+cfg.taskAllBonusCoins,sevenDailyPlusSets:7*(cfg.dailyBonusCoins+3*cfg.taskRewardCoins+cfg.taskAllBonusCoins),proposedEventMoney:0,alternativeUnapprovedEventCoins:[10,10,20,20].reduce((a,b)=>a+b,0)};
 return {scope:"MODEL; pinned v2 content and current witness approximation, fresh sets only, no live session, no source runtime, no predicted retention",inputsCount:all.size,baseline:{configuredGroups:cfg.rotation.length,distinctGroups:sameGroups,day1DailySolo:pools.daily.length,day1DailySoloPass:dailySolo.filter(Boolean).length,oldAgg},candidate:{groups:16,additional:9,post16Policy:"repeat groups 8..16 (proposed, active issue index not calendar)",newAgg,groups},snapshots:samples.length,controls:{witnessCases:samples.length*candidate.length,eventPolicyCases:eventChecks},samples,weekly,budgets};
}
const inputs=[
  {
    "path": "docs/spec/product/content_v09/boards.json",
    "gitBlob": "b6476924ddf5805ab007976c689faf23459df2a4"
  },
  {
    "path": "docs/spec/product/content_v2/boards.json",
    "gitBlob": "f8fd69fb1e93f5b54207b0c66623023d5dc9d087"
  },
  {
    "path": "docs/spec/product/content_v09/routes.json",
    "gitBlob": "6e42a2548f63336fed07295e826deff3f7fc73a4"
  },
  {
    "path": "docs/spec/product/meta_v08/config.json",
    "gitBlob": "baf68899c51ad3810a7cdbc363e02174014c70e4"
  }
];
const data=inputs.map(({path,gitBlob})=>{const bytes=readFileSync(path);if(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==gitBlob)throw Error('wrong input '+path);return JSON.parse(bytes.toString('utf8'));});
console.log(JSON.stringify(model(...data),null,2));
