// Standalone candidate model: run from the exact game checkout; no author answers.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function model(old,b,routes){
 const check=(x,m)=>{if(!x)throw Error(m)}, pools={}, all=new Map([...old,...b].map(p=>[p.puzzleId,p]));
 for(const p of b)(pools[p.bucket]??=[]).push(p);
 check(old.length===240&&b.length===275&&all.size===515,"catalog identity");
 const rotations={relax:['easy-short','easy-long','normal-short','easy-short','easy-long','normal-long'],challenge:['hard-short','hard-short','expert-short','hard-short','hard-short','hell-short']};
 const primes=[383,571,677,269,347,499,673,761,809,877];
 const bucketTurn=(t,i)=>{const seq=rotations[t],pos=i%seq.length,k=seq[pos],turn=Math.floor(i/seq.length)*seq.filter(x=>x===k).length+seq.slice(0,pos).filter(x=>x===k).length;return {k,turn};};
 function base(t,i){const {k,turn}=bucketTurn(t,i),p=pools[k],size=p.length,idx=turn<size?turn:(turn%size)*primes[(Math.floor(turn/size)-1)%primes.length]%size;return p[idx];}
 const campaign=[...routes.campaignSequence.slice(0,15).map(id=>all.get(id)),...Array.from({length:120},(_,i)=>base("relax",i)),...Array.from({length:105},(_,i)=>base("challenge",i))];
 check(new Set(campaign.map(p=>p.puzzleId)).size===240,"campaign identity");
 function shape(p,mask=false,transforms=8){
   const keys=[];
   for(let t=0;t<transforms;t++){
     const cells=p.cells.map(c=>{let x=c.x,y=c.y;if(t&1)[x,y]=[y,x];if(t&2)x=-x;if(t&4)y=-y;return {x,y,h:c.given===undefined};});
     const mx=Math.min(...cells.map(c=>c.x)),my=Math.min(...cells.map(c=>c.y));
     keys.push(cells.map(c=>`${c.x-mx},${c.y-my}${mask?(c.h?":h":":g"):""}`).sort().join(";"));
   }
   return keys.sort()[0];
 }
 const shapes=new Map([...all.values()].map(p=>[p.puzzleId,shape(p)]));
 function peel(p){let h=new Set(p.cells.filter(c=>c.given===undefined).map(c=>c.id)),initial=p.equations.filter(e=>e.cells.filter(c=>h.has(c)).length===1).length,rounds=0;
   while(h.size){const a=p.equations.map(e=>e.cells.filter(c=>h.has(c))).filter(a=>a.length===1).map(a=>a[0]);if(!a.length)break;for(const c of a)h.delete(c);rounds++;}
   return {initial,remaining:h.size,rounds};
 }
 const stats=ps=>{const group=new Map(),ops={"+":0,"-":0,"*":0,"/":0};for(const p of ps){const key=shapes.get(p.puzzleId);group.set(key,(group.get(key)??0)+1);for(const e of p.equations)ops[e.op]++;}
   const rem=ps.map(peel);return {n:ps.length,exactShapes:new Set(ps.map(p=>shape(p,false,1))).size,d4Shapes:group.size,d4ShapeMasks:new Set(ps.map(p=>shape(p,true))).size,largestD4Group:Math.max(...group.values()),ops,mulDivRatio:(ops["*"]+ops["/"])/Object.values(ops).reduce((a,b)=>a+b,0),singletonPeelFinishes:rem.filter(x=>x.remaining===0).length,initialSingletonMin:Math.min(...rem.map(x=>x.initial)),peelResidualRange:[Math.min(...rem.map(x=>x.remaining)),Math.max(...rem.map(x=>x.remaining))],equationRange:[Math.min(...ps.map(p=>p.equations.length)),Math.max(...ps.map(p=>p.equations.length))],holeRange:[Math.min(...ps.map(p=>p.tray.length)),Math.max(...ps.map(p=>p.tray.length))]};
 };
 function repeatStats(h){const d=[],ds=[],last=new Map(),ls=new Map(),examples=[];for(let i=0;i<h.length;i++){const id=h[i].puzzleId,s=shapes.get(id);if(last.has(id)){const gap=i-last.get(id);d.push(gap);if(gap<=12)examples.push({puzzleId:id,from:last.get(id)+1,to:i+1,gap});}if(ls.has(s))ds.push(i-ls.get(s));last.set(id,i);ls.set(s,i);}
   return {unique:last.size,repeatId:d.length,minIdGap:d.length?Math.min(...d):null,idGapLE12:d.filter(x=>x<=12).length,idGapLE50:d.filter(x=>x<=50).length,shapeGap1:ds.filter(x=>x===1).length,shapeGapLE3:ds.filter(x=>x<=3).length,shapeGapLE6:ds.filter(x=>x<=6).length,shortRepeatExamples:examples};
 }
 // Selection is a pure function; a committed new track-position assignment would update counts and recency.
 function selectCandidate(eligible,i,last,counts,ls,window){
   if(!eligible.length)return null;
   const min=Math.min(...eligible.map(x=>counts.get(x.puzzleId)??0));
   let tier=eligible.filter(x=>(counts.get(x.puzzleId)??0)===min);
   const key=p=>shapes.get(p.puzzleId),age=p=>i-(ls.get(key(p))??-1000000);
   const novel=tier.filter(p=>age(p)>window);
   if(novel.length)tier=novel;else{const max=Math.max(...tier.map(age));tier=tier.filter(p=>age(p)===max);}
   const freq=new Map();for(const p of tier)freq.set(key(p),(freq.get(key(p))??0)+1);
   return tier.slice().sort((a,b)=>freq.get(key(b))-freq.get(key(a))||(last.get(a.puzzleId)??-1)-(last.get(b.puzzleId)??-1)||b.campaignPosition-a.campaignPosition||(a.puzzleId<b.puzzleId?-1:a.puzzleId>b.puzzleId?1:0))[0];
 }
 let validatedSteps=0;
 function sim(t,n,initial,window=0){const solved=new Set(initial),h=[],last=new Map(),counts=new Map(),ls=new Map();let earlyBucketRepeat=0,shapeRelaxations=0;
   for(let i=0;i<n;i++){
     const {k}=bucketTurn(t,i),p=pools[k],unsolved=p.filter(x=>!solved.has(x.puzzleId)),eligible=unsolved.length?unsolved:p;
     const chosen=window?selectCandidate(eligible,i,last,counts,ls,window):unsolved.length?unsolved.reduce((a,b)=>a.campaignPosition>b.campaignPosition?a:b):base(t,i);
     check(chosen&&chosen.bucket===k&&(!unsolved.length||!solved.has(chosen.puzzleId)),"bucket or unsolved-first violation");validatedSteps++;
     if(window){check(selectCandidate(eligible,i,last,counts,ls,window).puzzleId===chosen.puzzleId,"determinism");if(i-(ls.get(shapes.get(chosen.puzzleId))??-1000000)<=window)shapeRelaxations++;}
     if(counts.has(chosen.puzzleId)&&p.some(x=>!counts.has(x.puzzleId)))earlyBucketRepeat++;
     h.push(chosen);solved.add(chosen.puzzleId);last.set(chosen.puzzleId,i);ls.set(shapes.get(chosen.puzzleId),i);counts.set(chosen.puzzleId,(counts.get(chosen.puzzleId)??0)+1);
   }
   const firstCycleLength=t==="relax"?120:105, firstCycleUnique=new Set(h.slice(0,firstCycleLength).map(p=>p.puzzleId)).size;
   if(window){check(earlyBucketRepeat===0&&firstCycleUnique===firstCycleLength,"early repeat in simulated completed stream");}
   return {...repeatStats(h),firstCycleLength,firstCycleUnique,earlyBucketRepeat,shapeRelaxations:window?shapeRelaxations:null};
 }
 const scenarios=[];
 for(const track of ["relax","challenge"])for(const prefix of [0,60,240]){
   const initial=campaign.slice(0,prefix).map(p=>p.puzzleId);
   scenarios.push({track,initialCampaignWins:prefix===0?"no v2 ID solved (unlock tutorial excluded)":prefix,completedTrackPositions:360,baseline:sim(track,360,initial),candidate3:sim(track,360,initial,3),alternative6:sim(track,360,initial,6)});
 }
 const stress=[];for(const track of ["relax","challenge"])for(const prefix of [15,30,90,135,150,200]){
   const p=sim(track,360,campaign.slice(0,prefix).map(x=>x.puzzleId),3);
   stress.push({track,prefix,minIdGap:p.minIdGap,idGapLE12:p.idGapLE12,idGapLE50:p.idGapLE50,earlyBucketRepeat:p.earlyBucketRepeat,firstCycleUnique:p.firstCycleUnique,shapeGapLE3:p.shapeGapLE3,shapeGapLE6:p.shapeGapLE6});
 }
 check(selectCandidate([],0,new Map(),new Map(),new Map(),3)===null,"empty pool safe");
 const single=pools["easy-short"][0],last=new Map([[single.puzzleId,0]]),counts=new Map([[single.puzzleId,1]]),ls=new Map([[shapes.get(single.puzzleId),0]]);
 check(selectCandidate([single],1,last,counts,ls,3).puzzleId===single.puzzleId&&last.get(single.puzzleId)===0&&counts.get(single.puzzleId)===1,"one candidate fallback or mutation");
 return {scope:"MODEL on exact public consumer data and inspected selector; all modeled offered puzzles are won, no actual app session, no source APK execution or player behavior",
   bank:stats(b),buckets:Object.fromEntries(Object.entries(pools).map(([k,ps])=>[k,stats(ps)])),campaign:{...repeatStats(campaign),first20:campaign.slice(0,20).map((p,i)=>({position:i+1,id:p.puzzleId,bucket:p.bucket??"tutorial",equations:p.equations.length,holes:p.tray.length,peelResidual:peel(p).remaining})),transition:campaign.slice(130,144).map((p,i)=>({position:i+131,bucket:p.bucket,equations:p.equations.length,holes:p.tray.length,peelResidual:peel(p).remaining}))},
   daily150:repeatStats(Array.from({length:150},(_,i)=>pools.daily[i%50])),
   endless:stats(routes.endlessSequence.map(id=>all.get(id))),scenarios,stress,
   controls:{validatedSteps,repeatSelectionDeterministicForCandidate:true,emptyPoolSafe:true,singletonFallbackPure:true},definitions:{D4:"normalized occupied numeric-cell coordinate pattern modulo four rotations and reflections; ignores operators, values and mask, does not equate actual puzzles",D4ShapeMask:"same geometry canonicalization with hidden/given bit; still ignores values/operators",peelResidual:"remaining hidden cells after iterated simultaneous singleton-equation removal, purely structural; not Guru stuck, not solve time",shapeGap:"distance to last occurrence of same D4 class within the modeled track, not calendar dates",repeatId:"distance to previous exact puzzleId within stream, not similarity or an observed session"}};
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
  }
];
const data=inputs.map(({path,gitBlob})=>{const bytes=readFileSync(path);const got=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(got!==gitBlob)throw Error('wrong input '+path);return JSON.parse(bytes.toString('utf8'));});
console.log(JSON.stringify(model(...data),null,2));
