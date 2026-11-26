// Candidate competition model only, from pinned Crossmath checkout.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function model(old,boards,routes,cfg){
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const all=new Map([...old,...boards].map(p=>[p.puzzleId,p])),pools={};for(const p of boards)(pools[p.bucket]??=[]).push(p);assert(all.size===515&&boards.length===275,"catalog identity");
 const weights={easy:1,standard:2,hard:4,expert:6}, donorIntervals={easy:100,standard:120,hard:180,expert:300};
 const rotations={relax:["easy-short","easy-long","normal-short","easy-short","easy-long","normal-long"],challenge:["hard-short","hard-short","expert-short","hard-short","hard-short","hell-short"]};
 const difficulty=b=>pools[b][0].difficulty;
 function route(track,phase,target,intervals=donorIntervals,mult=1){
  const rotation=rotations[track];let score=0,ms=0,steps=[];
  for(let i=0;score<target;i++){
   assert(i<=target,"nonpositive weight");const bucket=rotation[(phase+i)%rotation.length],d=difficulty(bucket),delta=Math.min(target-score,weights[d]);score+=delta;ms+=Math.round(intervals[d]*mult*1000);steps.push({bucket,score,ms,delta});
  }return steps;
 }
 const range=xs=>[Math.min(...xs),Math.max(...xs)];
 const burden=[];
 for(const track of Object.keys(rotations))for(const target of [4,6,10,12,15,20,25,30]){
   const rows=Array.from({length:6},(_,phase)=>route(track,phase,target));
   burden.push({track,target,boards:range(rows.map(r=>r.length)),referenceIntervalSeconds:range(rows.map(r=>r.at(-1).ms/1000)),scope:"sum of donor round1 B interval entries for own rotation, not actual player duration or source bot plan"});
 }
 // Proposed three-win race: own target4 for Relax, target12 for Challenge, same chosen track for both local opponents.
 const targets={relax:4,challenge:12};
 // A and B are independent of actual player actions: frozen cumulative schedules, not reconstructed donor A/B behavior.
 function start(track,phase,pace=1){
   const target=targets[track],plans=[route(track,phase,target,donorIntervals,.9*pace),route(track,phase,target,donorIntervals,1.2*pace)];
   return {raceId:"r",profileId:"p",day:100,track,target,elapsed:0,points:0,seen:[],plans,status:"active",reward:false,receipt:null};
 }
 function projected(plan,ms){return plan.reduce((n,e)=>e.ms<=ms?e.score:n,0);}
 function settle(s,e){
   // Caller supplies delta only for owned eligible active play, with persisted same-race identity.
   if(s.status!=="active"||e.raceId!==s.raceId||e.profileId!==s.profileId||!e.commit||!Number.isSafeInteger(e.delta)||e.delta<0||!e.active||e.track!==s.track)return s;
   const at=s.elapsed+e.delta,botAt=Math.min(...s.plans.map(p=>p.at(-1).ms));const next={...s,elapsed:Math.min(at,botAt),seen:[...s.seen]};
   // A win exactly at bot finish takes precedence; late wins do not change the finished race.
   if(at<=botAt&&e.win&&!next.seen.includes(e.puzzle)){
     next.seen.push(e.puzzle);next.points=Math.min(next.target,next.points+weights[e.difficulty]);
   }
   if(next.points===next.target){next.status="won";next.reward=true;next.receipt={id:"race:"+next.raceId,day:next.day};}
   else if(at>=botAt){next.status="lost";next.receipt={id:"race:"+next.raceId,day:next.day};}
   return next;
 }
 const raceScenarios=[];let tieControls=0,stateControls=0,replayControls=0;
 for(const track of Object.keys(targets))for(let phase=0;phase<6;phase++){
   const s0=start(track,phase),botEnd=s0.plans[0].at(-1).ms;
   const base=route(track,phase,targets[track]);assert(base.length===3,"three-board target");
   for(const pace of [.6,.8,.9,1,1.2,1.5,2]){
     let s=start(track,phase),wonAt=null;let ordinal=0;
     for(const step of base){const d=difficulty(step.bucket),before=s;
       const e={raceId:"r",profileId:"p",delta:Math.round(donorIntervals[d]*pace*1000),active:true,track,commit:true,win:true,puzzle:"id"+ordinal++,difficulty:d};
       s=settle(s,e);
       if(s.status==="won"&&before.status!=="won")wonAt=s.elapsed;
       if(s.status!=="active")break;
     }
     assert(s.status!=="active","race terminal");
     raceScenarios.push({track,phase,playerPaceMultiplier:pace,outcome:s.status,playerPoints:s.points,activeMs:s.elapsed,wonAt,opponentFinishMs:botEnd});
   }
   // Tie boundaries: initial points leave exactly one star-weight; test completion before/at/after first bot.
   const d=difficulty(base.at(-1).bucket),one={...s0,points:s0.target-weights[d],elapsed:botEnd-1};
   for(const offset of [0,1,2]){
     const e={raceId:"r",profileId:"p",delta:offset,active:true,track,commit:true,win:true,puzzle:"last",difficulty:d};
     const after=settle(one,e);assert(after.status===(offset<=1?"won":"lost"),"tie policy");assert(settle(after,e)===after,"terminal idempotency");tieControls++;
   }
   // Compare partitioned vs one-step time projection at 0/boundaries/end for frozen schedule.
   for(const plan of s0.plans)for(const t of [0,...plan.flatMap(p=>[p.ms-1,p.ms,p.ms+1])]){
     const before=projected(plan,t),restored=projected(JSON.parse(JSON.stringify(plan)),t);
     assert(before===restored&&before<=s0.target,"restored projection");replayControls++;
   }
   for(const active of [false,true])for(const commit of [false,true])for(const rightProfile of [false,true])for(const rightRace of [false,true])for(const rightTrack of [false,true])for(const repeat of [false,true]){
     const initial={...s0,seen:repeat?["q"]:[]},evt={raceId:rightRace?"r":"old",profileId:rightProfile?"p":"other",delta:1,active,track:rightTrack?track:"other",commit,win:true,puzzle:"q",difficulty:d};
     const result=settle(initial,evt),eligible=active&&commit&&rightProfile&&rightRace&&rightTrack;
     assert(result.elapsed===(eligible?1:0)&&result.points===(eligible&&!repeat?weights[d]:0),"identity/active/commit/duplicate policy");stateControls++;
   }
 }
 const paceMatrix=[.6,.8,.9,1,1.2,1.5,2].map(p=>({pace:p,scenarios:raceScenarios.filter(r=>r.playerPaceMultiplier===p).length,wins:raceScenarios.filter(r=>r.playerPaceMultiplier===p&&r.outcome==="won").length}));
 // The reference uses a claim-date+round key. Own optional day-budget key is race-start profile date, not claim time.
 let payoutChecks=0;
 for(const won of [false,true])for(const enabled of [false,true])for(const sameProfile of [false,true])for(const prior of [false,true])for(const sameRace of [false,true])for(const delayed of [false,true]){
   const receipt={id:"r",profile:"p",startDay:100,claimDay:delayed?101:100,won},paid=new Set(prior?["p:100"]:[]);
   function award(){const key=receipt.profile+":"+receipt.startDay;if(!enabled||!sameProfile||!sameRace||!receipt.won||paid.has(key))return 0;paid.add(key);return 20;}
   const got=award();assert(got===(enabled&&sameProfile&&sameRace&&won&&!prior?20:0)&&award()===0,"daily budget idempotence");payoutChecks++;
 }
 const sourceRoundCoins=[20,40,80,100,200],sourceRoundHints=[1,1,1,2,2];const sourceCoins=sourceRoundCoins.reduce((a,b)=>a+b,0),sourceHints=sourceRoundHints.reduce((a,b)=>a+b,0);
 const budget={sourceTableCoins:sourceCoins,sourceTableHints:sourceHints,consumerHintCost:cfg.hintCostCoins,sourceTableConsumerHintEquivalents:sourceCoins/cfg.hintCostCoins+sourceHints,consumerFullDailySetCoins:3*cfg.taskRewardCoins+cfg.taskAllBonusCoins,consumerDateAndSetCoins:cfg.dailyBonusCoins+3*cfg.taskRewardCoins+cfg.taskAllBonusCoins,candidateCosmeticPilotCoins:0,alternativeUnapprovedFirstDailyWinCoins:20,sevenDayAlternativeMaxCoins:140};
 // Brains: compare source reward unit to source bot ranges, no copying raw thresholds to own local league.
 const sourceBrains={ordinaryDailyRangeAssumingExclusiveMax:[{label:"A",min:35,max:46},{label:"B",min:31,max:39},{label:"C",min:26,max:29},{label:"D",min:5,max:19}].map(x=>({...x,sevenDays:[7*x.min,7*x.max]})),sevenFullDailySetClaimsHat:70,sevenSetClaimsPlusOneRaceWinEachDayHat:77,scope:"conditional arithmetic; special catchup may use configured max, other hat sources and actual ranking unknown"};
 const weekly=[];let weeklyControls=0;
 for(let sets=0;sets<=7;sets++)for(let raceDays=0;raceDays<=7;raceDays++){
   const points=3*sets+2*raceDays;assert(points>=0&&points<=35,"week cap");weeklyControls++;weekly.push({sets,raceDays,points});
 }
 // Battle M3: own single-op grammar means long expression count=0, source formula used as a pacing anchor.
 const battle=[];for(const [bucket,ps] of Object.entries(pools)){const eq=range(ps.map(p=>p.equations.length)),holes=range(ps.map(p=>p.tray.length));const times={};for(const [level,c] of [[3,5],[6,4],[12,2.5]])times[level]=range(ps.map(p=>p.equations.length*c+1.5*Math.max(0,p.equations.length-12)));battle.push({bucket,n:ps.length,equations:eq,holes,referencePlanSeconds:times});}
 return {scope:"MODEL on pinned own content + previously recovered reference constants; no game runtime, human solve-time distribution, source device or revenue",burden,candidate:{targets,paceAnchors:[.9,1.2],raceScenarios,paceMatrix},budget,sourceBrains,weeklyCandidate:{formula:"3 per unique full-set date, 2 per unique first-race-win date",cap:35,examples:weekly.filter(x=>[0,3,5,7].includes(x.sets)&&[0,3,5,7].includes(x.raceDays))},battle,controls:{raceScenarios:raceScenarios.length,tieControls,stateControls,replayControls,payoutChecks,weeklyControls},limits:"Race model does not implement actual writer, checkpoint persistence, user actions or arbitrary mix. Pace sweep illustrates sensitivity to fixed bot pace, not win-rate forecast. Weekly candidate is score arithmetic only. Monetary scenario unapproved."};
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
const data=inputs.map(({path,gitBlob})=>{const b=readFileSync(path);if(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==gitBlob)throw Error('wrong input '+path);return JSON.parse(b.toString('utf8'));});
console.log(JSON.stringify(model(...data),null,2));
