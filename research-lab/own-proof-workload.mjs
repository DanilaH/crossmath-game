import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parsePuzzle,countSolutions}=require('../.research-compiled/src/content/validator.js');
const {prepareExplanation,verifyExplanation}=require('../.research-compiled/src/help/logic.js');
const {createAttempt,applyHelpLayout}=require('../.research-compiled/src/core/engine.js');
const {tokenValue,cellValue,isSolved}=require('../.research-compiled/src/core/types.js');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const ensure=(ok,why)=>{if(!ok)throw Error(why)};
const direct=r=>r==='direct_result'||r==='direct_inverse';
function structural(p){
  const holes=new Set(p.cells.filter(c=>c.given===undefined).map(c=>c.id));
  const initial=p.equations.filter(e=>e.cells.filter(x=>holes.has(x)).length===1).length;
  let rounds=0;
  while(true){
    const next=new Set();
    for(const e of p.equations){const h=e.cells.filter(x=>holes.has(x));if(h.length===1)next.add(h[0]);}
    if(!next.size)break;
    rounds++;for(const h of next)holes.delete(h);
  }
  return {initialSingleEquations:initial,peelResidual:holes.size,peelRounds:rounds};
}
function trace(p,tag){
  const s=structural(p), counts={}, rules=[], units=[], proofReductions=[], exclusions=[];
  let a=createAttempt(p,'lab:'+tag);
  const unique=countSolutions(p,500000);
  const result={id:p.puzzleId,tag,bucket:p.bucket??('legacy-'+p.difficulty),version:p.contentVersion,
    holes:p.tray.length,equations:p.equations.length,distinctTray:new Set(p.tray).size,mulDiv:p.equations.filter(e=>e.op==='*'||e.op==='/').length,...s,
    unique,counts,rules,units,proofReductions,exclusions};
  if(unique.exhausted||unique.count!==1)return {result:{...result,status:unique.exhausted?'UNIQUENESS_BUDGET':'NON_UNIQUE'},solved:null};
  for(let n=0;n<=p.tray.length&&a.status==='playing';n++){
    const x=prepareExplanation(p,a);
    if(x.outcome!=='ready')return {result:{...result,status:x.outcome,phase:x.phase??null},solved:null};
    const plan=x.plan;ensure(verifyExplanation(p,a,plan),'unverified '+tag);
    ensure(plan.kind==='explain'&&plan.returns.length===0&&plan.assignments.length===1,'unexpected plan '+tag);
    const {cellId,value}=plan.assignments[0], used=new Set(Object.values(a.placements));
    const token=a.trayOrder.find(t=>!used.has(t)&&tokenValue(p,t)===value);
    ensure(token!==undefined&&cellValue(p,a,cellId)===undefined,'invalid step '+tag);
    rules.push(plan.rule);counts[plan.rule]=(counts[plan.rule]??0)+1;units.push(x.proofSearchUnits??null);
    proofReductions.push(plan.proof?.steps.length??0);
    exclusions.push(plan.proof?.steps.filter(s=>s.type==='exclude').length??0);
    a=applyHelpLayout(p,a,{placements:{...a.placements,[cellId]:token},trayOrder:[...a.trayOrder]},'lab-step-'+n);
  }
  ensure(a.status==='won'&&isSolved(p,a)&&rules.length===p.tray.length,'not solved '+tag);
  let run=0,maxRun=0;for(const r of rules){run=direct(r)?0:run+1;maxRun=Math.max(maxRun,run);}
  return {result:{...result,status:'SOLVED',nonDirect:rules.filter(r=>!direct(r)).length,advanced:rules.filter(r=>r==='propagation'||r==='contradiction').length,
    maxNonDirectRun:maxRun,firstNonDirect:rules.findIndex(r=>!direct(r)),proofUnitsSum:units.reduce((n,u)=>n+(u??0),0),proofUnitsMax:Math.max(0,...units.filter(u=>u!==null))},
    solved:p.cells.map(c=>cellValue(p,a,c.id))};
}
const sources=['docs/spec/product/content_v09/boards.json','docs/spec/product/content_v2/boards.json'];
const boards=sources.flatMap(path=>read(path).map(parsePuzzle));
ensure(boards.length===515&&new Set(boards.map(p=>p.puzzleId)).size===515,'bank count');
const baseline=[], solved=new Map();
for(const p of boards){const {result,solved:v}=trace(p,p.puzzleId);ensure(result.status==='SOLVED','baseline '+p.puzzleId+' '+result.status);baseline.push(result);solved.set(p.puzzleId,v);}
const groups=new Map();for(const p of boards.filter(p=>p.contentVersion===2)){if(!groups.has(p.bucket))groups.set(p.bucket,[]);groups.get(p.bucket).push(p);}
const masks=[], bases=[];
for(const [bucket,ps] of groups){
  const selected=[...ps].sort((a,b)=>sha('own-mask-v1|'+a.puzzleId).localeCompare(sha('own-mask-v1|'+b.puzzleId))).slice(0,2);
  for(const p of selected){
    const base=solved.get(p.puzzleId),h=p.tray.length,old=p.cells.filter(c=>c.given===undefined).map(c=>c.id).join(',');
    bases.push(p.puzzleId);const seen=new Set([old]);
    for(let attempt=0,kept=0;attempt<128&&kept<8;attempt++){
      const ids=p.cells.map(c=>c.id).sort((a,b)=>sha(p.puzzleId+'|'+attempt+'|'+a).localeCompare(sha(p.puzzleId+'|'+attempt+'|'+b))).slice(0,h).sort((a,b)=>a-b);
      const sig=ids.join(',');if(seen.has(sig))continue;seen.add(sig);kept++;
      const masked=new Set(ids), q=parsePuzzle({...p,cells:p.cells.map(c=>({id:c.id,x:c.x,y:c.y,...(!masked.has(c.id)?{given:base[c.id]}:{})})),tray:ids.map(i=>base[i])});
      const {result}=trace(q,p.puzzleId+':mask:'+attempt);masks.push({...result,baseId:p.puzzleId,maskSha:sha(sig)});
    }
  }
}
ensure(bases.length===16,'bases');
const files=['src/core/types.ts','src/core/engine.ts','src/content/validator.ts','src/content/rotation.ts','src/help/logic.ts','src/help/propagate.ts','src/help/verifyDomainProof.ts','src/help/domainProof.ts',...sources];
const output={evidence:'PRODUCT_CODE_TEST (offline exact own bank + synthetic same-base masks, not Android or Guru)',gameHead:'e06f448f173635e68260dac14aa89bf7c1d4d5a7',sourceSha256:Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(p))])),baseline,masks,bases,limits:'All baseline steps exact game proposer and independent verifier. Synthetic masks retain base geometry, values, hole count; no author solution imported or runtime bank edited. proofSearchUnits omits compatibility cost and direct fast path; not human duration.'};
fs.mkdirSync('output',{recursive:true});
fs.writeFileSync('output/OWN_PROOF_WORKLOAD.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({baseline:baseline.length,steps:baseline.reduce((n,r)=>n+r.rules.length,0),masks:masks.length,status:masks.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),bases:bases.length},null,2));
