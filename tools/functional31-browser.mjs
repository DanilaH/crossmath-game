import {chromium} from '@playwright/test';
import {createServer as viteServer} from 'vite';
import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {serve,episode,ready,tap} from './qa/rc30-harness.mjs';
const out='.test-output/functional31';await mkdir(out,{recursive:true});
const modules=await viteServer({mode:'release-candidate',server:{host:'127.0.0.1',port:0},appType:'custom'});await modules.listen();
const {createSave,decodeSave}=await modules.ssrLoadModule('/src/app/model.ts'),{createAttempt,applyCommand}=await modules.ssrLoadModule('/src/core/engine.ts');
const {getPuzzle,referenceBoards}=await modules.ssrLoadModule('/src/content/catalog.ts'),{readSave}=await modules.ssrLoadModule('/src/app/savePages.ts');
const answers={...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8')),...JSON.parse(await readFile('src/content/additionalAnswers.json','utf8'))};
const stamp=JSON.parse(await readFile('dist/native-build.json','utf8'));assert.equal(stamp.releaseCandidate,true);await cp('dist','.test-output/functional31-dist',{recursive:true});
const now='2026-11-28T12:00:00Z',KEY='crossmath.save.v1',host=await serve('.test-output/functional31-dist'),browser=await chromium.launch(),rows=[],errors=[];
const fresh=()=>createSave('functional31',now,'UTC','initial');
async function snapshot(page){const data=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));return decodeSave(await readSave(data[KEY],{getItem:async k=>data[k]??null}));}
function seed(id,language='ru',theme='light'){
 const s=fresh(),p=getPuzzle(id);s.settings.language=language;s.settings.theme=theme;s.settings.reducedMotion=true;
 s.attempt=createAttempt(p,'new-'+id,p.bucket==='daily'?'daily':'free');s.meta.screen='play';
 if(p.bucket==='daily'){s.meta.activeSlot='daily:2026-11-28';s.attempt.dayKey='2026-11-28';s.meta.assignments[s.attempt.dayKey]={puzzleId:id,calendarVersion:'calendar-v3'};}
 else{s.meta.activeSlot='free';s.attempt.freeTrack='relax';s.attempt.freeIndex=0;s.attempt.freeAssignmentVersion=1;s.meta.freeProgress={relax:0,challenge:0};}return decodeSave(s);
}
try{
 for(const [id,language,theme] of [['cm-own-03-001','ru','light'],['cm-own-03-020','en','dark'],['cm-own-03-041','ru','dark'],['cm-own-03-090','en','light']]){
  const s=seed(id,language,theme),p=getPuzzle(id),target=p.cells.find(c=>c.given===undefined),before=s.profile.coins;
  const {page,context}=await episode(browser,host.url,s,{height:568,video:id==='cm-own-03-001'?out:undefined});page.on('pageerror',e=>errors.push(e.message));
  await tap(page,`#board [data-cell="${target.id}"]`);await tap(page,'#help');await tap(page,'#reveal');await page.locator('#apply-help:enabled').waitFor();
  assert.deepEqual((await snapshot(page)).attempt.placements,{});await page.screenshot({path:`${out}/${id}-preview.png`});
  await tap(page,'#apply-help');await page.locator('#help-dialog').waitFor({state:'hidden'});await page.locator('#help:enabled').waitFor();
  const paid=await snapshot(page);assert.equal(paid.profile.coins,before-60);assert.equal(Object.keys(paid.helpReceipts).length,1);assert.equal(Object.keys(paid.attempt.placements).length,1);const token=paid.attempt.placements[target.id];assert.equal(p.tray[Number(token.slice(1))],answers[id].answer[target.id]);
  await page.screenshot({path:`${out}/${id}-applied.png`});await page.reload();await ready(page);assert.deepEqual((await snapshot(page)).attempt,paid.attempt);assert.equal((await snapshot(page)).profile.coins,before-60);
  await tap(page,'#undo');const undo=await snapshot(page);assert.deepEqual(undo.attempt.placements,{});assert.equal(undo.profile.coins,before-60);assert.equal(undo.attempt.hintsUsed,1);
  const video=page.video();await context.close();if(video)await video.saveAs(out+'/reveal-1x.webm');rows.push({id,language,theme,mode:p.bucket==='daily'?'daily':'relax',reveal:true,localOnly:true,oneCharge:true,coldRestore:true,undoWithoutRefund:true});
 }
 // Two real browser tabs, separate repository instances, actual Web Locks adapter.
 const ctx=await browser.newContext(),qaUrl=modules.resolvedUrls.local[0]+'__functional';
 await ctx.route('**/__functional',async route=>route.fulfill({contentType:'text/html',body:await modules.transformIndexHtml('/__functional',`<script type="module">import {createSave} from '/src/app/model.ts';import {SaveRepository} from '/src/app/saveRepository.ts';import {createStorage} from '/src/app/storage.ts';window.repo=new SaveRepository(createStorage(),()=>createSave('tabs','${now}','UTC','first'));window.base=await repo.load();window.qaReady=true;</script>`)}));
 const a=await ctx.newPage(),b=await ctx.newPage();for(const page of [a,b]){page.on('pageerror',e=>{errors.push(e.message);console.error('QA page error:',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('QA console:',m.text());});page.on('requestfailed',r=>console.error('QA failed request:',r.url(),r.failure()));}await a.goto(qaUrl);await a.waitForFunction(()=>window.qaReady);await b.goto(qaUrl);await b.waitForFunction(()=>window.qaReady);
 const write=(p,setting)=>p.evaluate(async setting=>{const next=structuredClone(window.base);next.revision++;next.settings[setting]=true;try{await window.repo.commit(window.base.revision,next);return 'applied';}catch(e){return e.constructor.name;}},setting);
 const results=await Promise.all([write(a,'sound'),write(b,'vibration')]);assert.deepEqual(results.slice().sort(),['SaveConflict','applied']);
 const loser=results[0]==='applied'?b:a,setting=results[0]==='applied'?'vibration':'sound';await loser.evaluate(async setting=>{const latest=await window.repo.load();latest.revision++;latest.settings[setting]=true;await window.repo.commit(latest.revision-1,latest);},setting);
 const final=await a.evaluate(async()=>await window.repo.load());assert.equal(final.settings.sound,true);assert.equal(final.settings.vibration,true);assert.equal(final.revision,2);rows.push({twoTabs:true,transport:'real navigator.locks/localStorage',results,reloadedRetryPreservesBoth:true});await ctx.close();
 // A legacy root immediately below the unchanged native 4MiB limit; a real UI move crosses it.
 const s=fresh(),p=getPuzzle('cm-own-02-220'),base=createAttempt(p,'long'),target=p.cells.find(c=>c.given===undefined),placed=applyCommand(p,base,{type:'PlaceFromTray',tokenId:'t0',cellId:target.id,commandId:'seed',expectedRevision:0}).state;
 const n=16000;s.attempt={...base,boardRevision:n,history:Array.from({length:n},(_,i)=>({placements:{...(i%2?placed:base).placements},trayOrder:[...base.trayOrder]})),commandIds:Array.from({length:n},(_,i)=>'history-'+String(i).padStart(30,'0'))};
 s.helpReceipts['previous-paid']={kind:'reveal',outcome:'applied',costCoins:60,costCredits:0};
 let bytes=Buffer.byteLength(JSON.stringify(s));assert.ok(bytes<4*1024*1024-100);s.attempt.id+='x'.repeat(4*1024*1024-100-bytes);decodeSave(s);bytes=Buffer.byteLength(JSON.stringify(s));assert.equal(bytes,4*1024*1024-100);
 const {page,context}=await episode(browser,host.url,s,{height:568});page.on('pageerror',e=>errors.push(e.message));
 const value=answers[p.puzzleId].answer[target.id],i=p.tray.indexOf(value);await tap(page,`[data-token="t${i}"]`);await tap(page,`#board [data-cell="${target.id}"]`);
 const after=await snapshot(page),logicalBytes=Buffer.byteLength(JSON.stringify(after));assert.ok(logicalBytes>4*1024*1024);assert.equal(after.attempt.history.length,n+1);assert.equal(after.profile.coins,s.profile.coins);assert.deepEqual(after.helpReceipts,s.helpReceipts);
 const raw=await page.evaluate(()=>localStorage.getItem('crossmath.save.v1'));assert.equal(JSON.parse(raw).storageFormat,'crossmath.pages.v1');assert.ok(raw.length<1024);
 await page.reload();await ready(page);assert.deepEqual((await snapshot(page)).attempt,after.attempt);await tap(page,'#undo');const undo=await snapshot(page);assert.equal(undo.attempt.history.length,n);assert.deepEqual(undo.attempt.placements,{});assert.equal(undo.profile.coins,s.profile.coins);
 await page.reload();await ready(page);assert.deepEqual((await snapshot(page)).attempt,undo.attempt);await page.screenshot({path:out+'/large-history-restored.png'});
 const storage=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('crossmath.save.')).map(k=>[k,localStorage.getItem(k)]))),storedBytes=Object.values(storage).reduce((sum,v)=>sum+Buffer.byteLength(v),0),maxValueBytes=Math.max(...Object.values(storage).map(v=>Buffer.byteLength(v)));
 rows.push({largeHistory:true,synthetic:true,legacyBytes:bytes,logicalBytes,storedBytes,maxValueBytes,history:n,continuedAcrossCap:true,undoAndIdsRetained:true,financialReceiptsRetained:true,coldRestores:2,transport:'scripted native CAS, actual packaged app/codec; not Android device'});await context.close();
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',rows,errors,recording:{speed:'1x',audio:'NOT CAPTURED',device:'Chromium, not Android'},scope:'Actual packaged UI, real two-tab Web Locks, scripted native storage transport. No SDK/device claim.'},null,2));console.log('FUNC31 browser PASS · Reveal Relax/Daily, real two-tab CAS, UI crossing native cap + cold Undo');
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,rows,errors},null,2));throw error;}finally{await browser.close();host.close();await modules.close();}
