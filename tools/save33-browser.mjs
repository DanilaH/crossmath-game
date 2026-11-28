import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='.test-output/save33';await mkdir(out,{recursive:true});
const server=await createServer({mode:'release-candidate',server:{host:'127.0.0.1',port:0},appType:'custom'});await server.listen();
const browser=await chromium.launch(),rows=[],errors=[];
const html=`<script type="module">
import {createSave} from '/src/app/model.ts';
import {SaveRepository,SAVE_KEY} from '/src/app/saveRepository.ts';
import {GameSession} from '/src/app/session.ts';
import {createStorage} from '/src/app/storage.ts';
import {createAttempt} from '/src/core/engine.ts';
import {getPuzzle} from '/src/content/catalog.ts';
const now='2026-11-23T12:00:00Z';let n=0;
const fresh=()=>{const s=createSave('save33-tabs',now,'UTC','first');
 if(window.save33Paged){
  s.attempt=createAttempt(getPuzzle('cm-own-02-220'),'long');s.attempt.boardRevision=900;
  s.attempt.history=Array.from({length:900},()=>({placements:{},trayOrder:[...s.attempt.trayOrder]}));
  s.attempt.commandIds=Array.from({length:900},(_,i)=>'save33-'+i);
 }return s;};
window.repo=new SaveRepository(createStorage(),fresh);
window.make=state=>new GameSession(state,window.repo,()=> 'tab-'+(++n),()=>now);
window.current=window.original=window.make(await window.repo.load());window.qaReady=true;
</script>`;
try{
 for(const paged of [false,true])for(const sharedRepository of [false,true]){
  const context=await browser.newContext();
  await context.addInitScript(value=>{window.save33Paged=value;},paged);
  await context.route('**/__save33',async route=>route.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/__save33',html)}));
  const a=await context.newPage();a.on('pageerror',e=>errors.push(e.message));
  const url=server.resolvedUrls.local[0]+'__save33';
  await a.goto(url);await a.waitForFunction(()=>window.qaReady);
  const before=await a.evaluate(async()=>{
   const seed=structuredClone(window.original.state);
   await window.original.update({sound:true},false);await window.original.update({vibration:true},false);
   const primary=localStorage.getItem('crossmath.save.v1');
   localStorage.setItem('crossmath.save.v1','injected corrupt primary');
   return {seed,old:structuredClone(window.original.state),paged:Object.hasOwn(JSON.parse(primary),'storageFormat')};
  });assert.equal(before.paged,paged);
  let b;
  if(sharedRepository){b=a;await a.evaluate(async()=>{window.current=window.make(await window.repo.load());});}
  else{b=await context.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(url);await b.waitForFunction(()=>window.qaReady);}
  const recovered=await b.evaluate(async()=>{
   const revision=window.current.state.revision,recoveredBackup=window.repo.recoveredBackup;
   await window.current.update({language:'en'},false);
   return {revision,recoveredBackup,confirmed:structuredClone(window.current.state)};
  });assert.equal(recovered.revision,1);assert.equal(recovered.recoveredBackup,true);assert.equal(recovered.confirmed.revision,2);
  const blocked=await a.evaluate(async()=>{
   const root=localStorage.getItem('crossmath.save.v1');let outcome='accepted';
   try{await window.original.update({timerVisible:true},false);}catch(e){outcome=e.constructor.name;}
   return {outcome,rootUnchanged:root===localStorage.getItem('crossmath.save.v1'),memory:structuredClone(window.original.state),durable:await window.repo.load()};
  });assert.equal(blocked.outcome,'SaveConflict');assert.equal(blocked.rootUnchanged,true);assert.deepEqual(blocked.memory,before.old);assert.deepEqual(blocked.durable,recovered.confirmed);
  const final=await a.evaluate(async()=>{const retry=window.make(await window.repo.load());await retry.update({timerVisible:true},false);return await window.repo.load();});
  assert.equal(final.revision,3);assert.equal(final.settings.language,'en');assert.equal(final.settings.timerVisible,true);assert.deepEqual(final.attempt,before.seed.attempt);assert.deepEqual(final.profile,before.seed.profile);
  await a.reload();await a.waitForFunction(()=>window.qaReady);assert.deepEqual(await a.evaluate(()=>window.current.state),final);
  rows.push({paged,sharedRepository,status:'PASS',reusedRevision:2,staleOutcome:blocked.outcome,lostAcknowledgedChange:false,reloadedRetry:true,coldRestore:true});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/browser.json',JSON.stringify({status:'PASS',rows,errors,scope:'Actual GameSession/SaveRepository and real origin-wide navigator.locks/localStorage, same-repository and two-tab cases; injected primary corruption, not physical Android'},null,2));
 console.log('FINAL-SAVE-01 browser PASS · 4 exact-base ABA/recovery/retry/cold-restore cases');
}catch(error){await writeFile(out+'/browser-failure.json',JSON.stringify({error:String(error),stack:error.stack,rows,errors},null,2));throw error;}
finally{await browser.close();await server.close();}
