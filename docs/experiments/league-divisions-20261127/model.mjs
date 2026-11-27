// Research-only model; not game code or donor native execution.
import assert from 'node:assert/strict';
const bands=[[6,11],[6,11],[4,8],[4,8],[3,6],[3,6],[1,4],[1,4],[1,4]];
const templates=[[80,20,0,0],[70,0,30,0],[40,0,0,60],[0,40,60,0],[0,20,0,80],[0,0,30,70],[50,20,30,0],[35,15,0,50],[0,15,25,60]];
const windows=[[490,660],[660,960],[960,1140],[1140,1380]];
const rng=seed=>{let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)|0;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};};
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rand=(r,n)=>Math.floor(r()*n);
const factors=[.5,.75,1,1.5,2,3],scores=[7,18,46,56,140],samples=10000;
const quantile=(xs,q)=>{const a=[...xs].sort((a,b)=>a-b);return a[Math.floor(q*(a.length-1))];};
const spread=xs=>({p10:quantile(xs,.1),p50:quantile(xs,.5),p90:quantile(xs,.9)});
const byFactor=factors.map(f=>({factor:f,up:[],safe:[],first:[],scores:scores.map(points=>({points,top3:0,middle:0,bottom3:0}))}));
for(let seed=0;seed<samples;seed++){
 const r=rng(hash('common:'+seed));
 const daily=bands.map(([min,max])=>Array.from({length:7},()=>min+rand(r,max-min)));
 for(const row of byFactor){
  const totals=daily.map(days=>days.reduce((n,d)=>n+Math.max(1,Math.round(d*row.factor)),0)).sort((a,b)=>b-a);
  row.first.push(totals[0]);row.up.push(totals[2]);row.safe.push(totals[6]);
  for(const s of row.scores){const place=1+totals.filter(n=>n>s.points).length;s[place<=3?'top3':place<=7?'middle':'bottom3']++;}
 }
}
const sensitivity=byFactor.map(row=>({factor:row.factor,first:spread(row.first),top3:spread(row.up),avoidBottom3:spread(row.safe),scores:row.scores.map(s=>({points:s.points,top3:s.top3/samples,middle:s.middle/samples,bottom3:s.bottom3/samples}))}));
function allocate(n,p,bounded){const out=[0,0,0,0],active=p.map((x,i)=>x?i:-1).filter(i=>i>=0);let left=n;for(const i of active){const amount=i===active.at(-1)?left:Math.ceil(n*p[i]/100);out[i]=bounded?Math.min(left,amount):amount;left-=out[i];}return out;}
let rawCases=0,rawNegative=0;
for(const [min,max] of bands)for(let n=min;n<max;n++)for(const p of templates){rawCases++;const a=allocate(n,p,false);if(a.some(v=>v<0))rawNegative++;const b=allocate(n,p,true);assert.equal(b.reduce((x,y)=>x+y,0),n);assert.ok(b.every(v=>v>=0));}
function events(n,r,bounded){const p=templates[rand(r,9)],q=allocate(n,p,bounded),marks=[];for(let w=0;w<4;w++){let left=q[w];const [from,to]=windows[w],seen=new Set();while(left>0){const amount=Math.min(left,1+rand(r,4));let at;do{at=from*60000+rand(r,(to-from)*60000-1000);}while(seen.has(at));seen.add(at);marks.push([at,amount,w]);left-=amount;}}
 assert.equal(marks.reduce((s,x)=>s+x[1],0),n);assert.equal(new Set(marks.map(x=>x[0])).size,marks.length);for(const [at,a,w] of marks){assert.ok(a>=1&&a<=4);assert.ok(at>=windows[w][0]*60000&&at<windows[w][1]*60000-1000);}return marks;}
const eventSamples=Array.from({length:9},()=>({old:[],raw:[],four:[],twoWindowRaw:0,twoWindowFour:0,count:0}));
for(let seed=0;seed<1000;seed++)for(let i=0;i<9;i++){
 const r=rng(hash('event:'+seed+':'+i)),[min,max]=bands[i],target=min+rand(r,max-min);const a=events(target,rng(hash('plan:'+seed+':'+i)),true),b=events(target*4,rng(hash('plan:'+seed+':'+i)),true),s=eventSamples[i];s.old.push(target);s.raw.push(a.length);s.four.push(b.length);s.count++;s.twoWindowRaw+=Number(new Set(a.map(x=>x[2])).size>=2);s.twoWindowFour+=Number(new Set(b.map(x=>x[2])).size>=2);
}
const cadence=eventSamples.map((s,i)=>({bot:i+1,band:bands[i],v2:spread(s.old),guruBatchesBounded:spread(s.raw),unitsTimes4:spread(s.four),activeAtLeastTwoWindows:{raw:s.twoWindowRaw/s.count,x4:s.twoWindowFour/s.count}}));
let transitions=0;for(let tier=0;tier<5;tier++)for(let place=1;place<=10;place++){const next=Math.max(0,Math.min(4,tier+(place<=3?1:place>=8?-1:0)));assert.ok(next>=0&&next<5);assert.ok(Math.abs(next-tier)<=1);transitions++;}
const report={scope:'Synthetic sensitivity/model only; no live player telemetry or donor numeric tier scaling. v2 ordinary score totals drawn from existing report; equal ties favor self. No weekend max applied to active days.',sourceGameHead:'5e465c9a76d951b14fb608ef42feaa9aa878752f',samplesPerFactor:samples,sensitivity,allocation:{rawCases,rawNegative},scheduleCases:18000,cadence,transitionCases:transitions};
assert.deepEqual(sensitivity.map(s=>s.top3.p50),[22,31,40,62,80,120]);assert.deepEqual(report.allocation,{rawCases:297,rawNegative:9});
console.log(JSON.stringify(report,null,2));
