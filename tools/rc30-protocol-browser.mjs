import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {serve,episode,save,ready,tap} from './qa/rc30-harness.mjs';
const rcStamp=JSON.parse(await readFile('dist/native-build.json','utf8'));assert.equal(rcStamp.releaseCandidate,true);assert.equal(rcStamp.freeIssuancePolicy,'d4-v2');assert.equal(rcStamp.contentLab,false);
const out='.test-output/rc30-protocol';await mkdir(out,{recursive:true});
const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
const boards=[...JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8'))];
const answers={...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8'))};
const host=await serve(),browser=await chromium.launch(),rows=[],errors=[];
const last=s=>Object.values(s.ads.requests).at(-1);
const journal=p=>p.evaluate(()=>window.rc30.journal());
async function ask(page){await tap(page,'#help');await tap(page,'#ad-hint');await page.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).length>0);}
async function waitSettlement(page,outcome){await page.waitForFunction(outcome=>Object.values(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).at(-1)?.settlement===outcome,outcome);}
async function finishBoard(page){
 const s=await save(page),p=boards.find(p=>p.puzzleId===s.attempt.puzzleId);
 for(const cell of p.cells.filter(c=>c.given===undefined)){
  const s=await save(page);if(s.attempt.placements[cell.id])continue;
  const used=new Set(Object.values(s.attempt.placements)),i=p.tray.findIndex((v,i)=>v===answers[p.puzzleId].answer[cell.id]&&!used.has('t'+i));
  await tap(page,`[data-token="t${i}"]`);await tap(page,`#board [data-cell="${cell.id}"]`);
 }
 await page.locator('#next:enabled').waitFor();
}
try{
 for(const fault of ['absent','prepared','admitted','cancelled-late-earned','ack-rejected','ack-lost-reply']){
  const seed=structuredClone(fixtures['before-8']);seed.meta.screen='play';
  const config=fault==='absent'?{show:'reject-before-prepare',proof:'reject'}:fault==='prepared'?{show:'hold-prepared'}:fault==='ack-rejected'?{ack:'reject-before'}:fault==='ack-lost-reply'?{ack:'lost-reply'}:{};
  const {page,context}=await episode(browser,host.url,seed,{config});page.on('pageerror',e=>errors.push(e.message));
  await ask(page);
  if(fault==='absent')await page.waitForFunction(()=>window.rc30.journal().calls.some(c=>c.format==='rewarded'));
  else await page.waitForFunction(f=>Object.values(window.rc30.journal().records).some(r=>r.phase===(f==='prepared'?'prepared':'admitted')),fault);
  const requested=await save(page),request=last(requested).request;
  if(fault==='admitted'){
   await page.evaluate(id=>window.rc30.duplicate(id),request.id);assert.equal((await journal(page)).admissions,1);assert.equal((await journal(page)).duplicates,1);
  }
  if(fault==='cancelled-late-earned'){
   await page.evaluate(()=>window.rc30.finish('cancelled'));await waitSettlement(page,'cancelled');
   await page.evaluate(id=>window.rc30.lateEarn(id),request.id);await waitSettlement(page,'earned');
  }
  if(fault==='ack-rejected'||fault==='ack-lost-reply'){
   await page.evaluate(()=>window.rc30.finish('earned'));await waitSettlement(page,'earned');
  }
  const before=await save(page);
  await page.evaluate(()=>window.rc30.configure({show:'normal',proof:'ok',ack:'ok'}));
  await page.reload();await ready(page);
  if(fault==='absent'||fault==='prepared')await waitSettlement(page,'cancelled');
  if(fault==='admitted'){
   assert.equal(last(await save(page)).settlement,undefined);
   await page.clock.install({time:new Date(seed.meta.effectiveDay+'T12:00:00Z')});await page.clock.fastForward(600000);
   assert.equal(last(await save(page)).settlement,undefined,'Unknown admitted request cannot expire by time');
   await tap(page,'#help');assert.equal(await page.locator('#ad-hint:visible').count(),0);await tap(page,'#close-help');
   await finishBoard(page);await tap(page,'#next');await page.locator('#result').waitFor({state:'hidden'});
   assert.equal((await journal(page)).calls.filter(c=>c.format==='interstitial').length,0,'Unknown request blocks competing interstitial');
   await page.evaluate(id=>window.rc30.lateEarn(id),request.id);await waitSettlement(page,'earned');
   await page.clock.resume();
  }
  const earned=['admitted','cancelled-late-earned','ack-rejected','ack-lost-reply'].includes(fault);
  const settled=await save(page);assert.equal(settled.profile.hintCredits,seed.profile.hintCredits+(earned?1:0));
  assert.deepEqual(settled.attempt.placements,fault==='admitted'?{}:before.attempt.placements);
  if(fault!=='admitted')assert.equal(settled.profile.coins,seed.profile.coins);
  for(let n=0;n<2;n++){
   if(earned)await page.evaluate(id=>window.rc30.replay(id),request.id);
   await page.reload();await ready(page);assert.equal((await save(page)).profile.hintCredits,settled.profile.hintCredits);
  }
  await tap(page,'#help');await page.locator('#ad-hint:enabled').waitFor();await tap(page,'#close-help');
  if(!earned){
   await finishBoard(page);await tap(page,'#next');await page.waitForFunction(()=>window.rc30.live?.rewarded===false);
   await page.evaluate(()=>window.rc30.finish(null));await page.locator('#result').waitFor({state:'hidden'});
   assert.equal((await journal(page)).calls.filter(c=>c.format==='interstitial').length,1,'Interstitial eligibility returns after safe cancellation');
  }
  const after=await save(page);await page.screenshot({path:out+'/'+fault+'.png'});
  rows.push({fault,request,before,after,journal:await journal(page),rewardAvailableAgain:true,duplicateReloads:2});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',protocol:3,cases:rows,errors,scope:'Scripted native protocol via packaged androidAds adapter + game UI. NOT SDK/device proof.'},null,2));
 console.log('RC-03 PASS · six failure/restart cases, durable fencing, unknown admission, duplicate show, late earned, lost ACK, repeated reloads, eligibility');
}finally{await browser.close();host.close();}
