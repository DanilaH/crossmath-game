import {describe,it,expect} from 'vitest';
import {boards,referenceBoards,additionalBoards,getPuzzle,config,campaignSequence} from '../src/content/catalog';
import {countSolutions} from '../src/content/validator';
import {createAttempt,applyCommand,applyHelpLayout} from '../src/core/engine';
import {assertInventory,isSolved,cellValue,tokenValue} from '../src/core/types';
import {reveal,materializeHelp} from '../src/help/reveal';
import {prepareExplanation,verifyExplanation} from '../src/help/logic';
import {createSave,decodeSave} from '../src/app/model';
import type {Save} from '../src/app/model';
import {SAVE_KEY,SaveRepository} from '../src/app/saveRepository';
import {GameSession} from '../src/app/session';
import {PAGE_PREFIX,planSave,readSave} from '../src/app/savePages';
import {product} from '../src/product/releaseProfile';
import {mkdirSync,writeFileSync} from 'node:fs';
import oldAnswers from '../docs/spec/product/content_v09/author_solutions.json';
import newAnswers from '../docs/spec/product/content_v2/author_solutions.json';
import extraAnswers from '../src/content/additionalAnswers.json';
const answers:Record<string,{answer:number[]}>={...oldAnswers,...newAnswers,...extraAnswers};
class Disk {
 data=new Map<string,string>();fail:((key:string)=>void)|undefined;
 async getItem(k:string){return this.data.get(k)??null;}
 async setItem(k:string,v:string){this.fail?.(k);this.data.set(k,v);}
 async removeItem(k:string){this.data.delete(k);}
 async listKeys(p:string){return [...this.data.keys()].filter(k=>k.startsWith(p));}
}
let n=0;const now='2026-11-23T12:00:00Z';
const fresh=()=>createSave('final-audit',now,'UTC','first');
const session=(s:Save,r:SaveRepository)=>new GameSession(s,r,()=>`audit-${++n}`,()=>now);
const emit=(name:string,v:unknown)=>{mkdirSync('.test-output/final-audit',{recursive:true});writeFileSync('.test-output/final-audit/'+name+'.json',JSON.stringify(v,null,2));console.log('FINAL_'+name.toUpperCase()+' '+JSON.stringify(v));};
describe.skipIf(!product.candidate)('Final independent RC verification',()=>{
 it('checks numerical validity, unique solutions, selected-cell Reveal and independent Explain on deterministic varied prefixes of all 605 fields',()=>{
  let unique=0,revealChecks=0,explainChecks=0,unavailable=0,wrongChecks=0;const unexpected:string[]=[];
  const pool=[...boards,...referenceBoards,...additionalBoards];
  for(const [pi,p] of pool.entries()){
   const a=createAttempt(p,'audit-'+pi);
   const holes=p.cells.filter(c=>c.given===undefined);
   const correct=answers[p.puzzleId]!.answer;
   const solution=countSolutions(p);if(solution.count===1&&!solution.exhausted)unique++;else unexpected.push('uniqueness:'+p.puzzleId);
   // Deterministic shuffled valid prefix, not the solver's preferred path.
   const order=holes.slice().sort((a,b)=>((a.id*17+pi*13)%37)-((b.id*17+pi*13)%37));
   const prefix=Math.floor(holes.length/2);
   let s=a;
   for(const c of order.slice(0,prefix)){
    const id=s.trayOrder.find(t=>tokenValue(p,t)===correct[c.id]&&!Object.values(s.placements).includes(t))!;
    s=applyCommand(p,s,{type:'PlaceFromTray',cellId:c.id,tokenId:id,commandId:'move-'+c.id,expectedRevision:s.boardRevision}).state;
   }
   assertInventory(p,s);
   const target=order[prefix]!;
   const hint=reveal(p,s,target.id);
   if(hint&&hint.assignments[0]?.cellId===target.id){const layout=materializeHelp(p,s,hint);if(layout){const t=applyHelpLayout(p,s,layout,'reveal');assertInventory(p,t);expect(cellValue(p,t,target.id)).toBe(correct[target.id]);for(const c of order.slice(0,prefix))expect(t.placements[c.id]).toBe(s.placements[c.id]);revealChecks++;}else unexpected.push('materialize:'+p.puzzleId);}else unexpected.push('reveal:'+p.puzzleId);
   const prep=prepareExplanation(p,s);
   if(prep.outcome==='ready'){const plan=prep.plan;expect(verifyExplanation(p,s,plan)).toBe(true);for(const step of plan.assignments)expect(step.value).toBe(correct[step.cellId]);explainChecks++;}else unavailable++;
   const wrong=s.trayOrder.find(t=>tokenValue(p,t)!==correct[target.id]&&!Object.values(s.placements).includes(t));
   if(wrong){
    const incorrect=applyCommand(p,s,{type:'PlaceFromTray',cellId:target.id,tokenId:wrong,commandId:'wrong',expectedRevision:s.boardRevision}).state;
    const repair=reveal(p,incorrect,target.id);expect(repair).not.toBeNull();const layout=materializeHelp(p,incorrect,repair!);expect(layout).not.toBeNull();assertInventory(p,layout!);expect(cellValue(p,layout!,target.id)).toBe(correct[target.id]);wrongChecks++;
   }
  }
  emit('corpus',{boards:pool.length,unique,revealChecks,explainChecks,explainUnavailable:unavailable,wrongChecks,unexpected});expect(unexpected).toEqual([]);expect(unique).toBe(605);expect(revealChecks).toBe(605);
 },120000);
 it('compares normal competing writers, then checks a stale in-memory session after fallback backup reuses revision',async()=>{
  const disk=new Disk(),aRepo=new SaveRepository(disk,fresh),bRepo=new SaveRepository(disk,fresh);
  const a=session(await aRepo.load(),aRepo);await a.update({sound:true},false);expect(a.state.revision).toBe(1);
  const stale=session(await bRepo.load(),bRepo);
  await a.update({vibration:true},false);
  let normalConflict=false;try{await stale.update({timerVisible:true},false);}catch{normalConflict=true;}
  expect(normalConflict).toBe(true);
  // Keep the live session at revision 2. Damage only the durable primary, as a storage-fault injection.
  disk.data.set(SAVE_KEY,'corrupt primary');
  const recoveredRepo=new SaveRepository(disk,fresh),recovered=session(await recoveredRepo.load(),recoveredRepo);
  expect(recoveredRepo.recoveredBackup).toBe(true);expect(recovered.state.revision).toBe(1);
  await recovered.update({language:'en'},false);expect(recovered.state.revision).toBe(2);
  let staleOutcome='accepted';try{await a.update({timerVisible:true},false);}catch(e){staleOutcome=String(e);}
  const final=await recoveredRepo.load();
  emit('recovery-aba',{normalConflict,backupRecovered:true,reusedRevision:2,staleOutcome,acknowledgedRecoveredLanguage:'en',finalLanguage:final.settings.language,finalRevision:final.revision,lostAcknowledgedChange:final.settings.language!=='en',boundary:'Injected primary corruption while old session stays alive; not physical Android reproduction'});
  // Characterization of the recovery-specific edge, not an assertion of product correctness.
  expect(normalConflict).toBe(true);expect(final.profile.id).toBe('final-audit');
 });
 it('verifies old-root preservation, exact paged backup and orphan collection across every write-boundary of a multi-page save',async()=>{
  const initial=fresh();
  const p=getPuzzle('cm-own-02-220'),a=createAttempt(p,'history');
  initial.attempt=a;
  // Distinct deterministic command identities and live Undo layouts: synthetic stress, not observed play.
  initial.attempt.history=Array.from({length:21000},()=>({placements:{},trayOrder:[...a.trayOrder]}));
  initial.attempt.commandIds=Array.from({length:21000},(_,i)=>`audit-${i.toString(36).padStart(8,'0')}-${Math.imul(i+1,2654435761).toString(16)}`);
  initial.attempt.boardRevision=21000;
  const disk=new Disk(),firstRepo=new SaveRepository(disk,fresh);await firstRepo.load();
  const s=decodeSave(initial);s.revision=1;await firstRepo.commit(0,s);const stable=new Map(disk.data);
  const next=structuredClone(s);next.settings.sound=true;next.revision=2;const plan=await planSave(next);
  const root=JSON.parse(plan.raw);expect(root.storageFormat).toBe('crossmath.pages.v1');
  // Fault after each individual immutable page write; root itself may be the failure.
  const priorPlan=await planSave(s);
  let checks=0;
  for(let stop=1;stop<=priorPlan.entries.length+plan.entries.length+2;stop++){
   const d=new Disk();d.data=new Map(stable);let writes=0;d.fail=()=>{if(++writes===stop)throw Error('injected boundary');};
   const repo=new SaveRepository(d,fresh);let accepted=false;
   try{await repo.commit(1,next);accepted=true;}catch{}
   d.fail=undefined;
   const durable=await repo.load();expect(durable).toEqual(accepted?next:s);expect(durable.attempt.commandIds).toEqual(s.attempt.commandIds);
   if(!accepted)await repo.commit(1,next);
   expect(await repo.load()).toEqual(next);expect([...d.data.values()].every(v=>new TextEncoder().encode(v).length<4*1024*1024)).toBe(true);checks++;
  }
  emit('page-boundaries',{checks,logicalBytes:new TextEncoder().encode(JSON.stringify(s)).length,leafEntries:plan.entries.length,oldRootOrCommittedExact:true,commandIdsRetained:s.attempt.commandIds.length});
 },120000);
});
