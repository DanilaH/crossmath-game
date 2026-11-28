import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
// This test-only native transport exercises the actual packaged androidAds.ts bridge.
// It is never imported by the game. No provider SDK, painted ad or impression is claimed.
const root=resolve(process.env.MON27_WEB??'dist'),out=resolve(process.env.MON27_OUT??'.test-output/mon27-ui');
const stamp=JSON.parse(await readFile(root+'/native-build.json','utf8')),candidate=stamp.winBonusCandidate===true;
const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')).concat(JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8')));
const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
let browser,url;const rows=[],errors=[];await mkdir(out,{recursive:true});
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const ready=page=>page.locator('html[data-state=ready]').waitFor();
async function tap(page,selector){
 const locator=page.locator(selector);await locator.waitFor();await locator.scrollIntoViewIfNeeded();
 const p=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,ok:!el.disabled&&el.contains(document.elementFromPoint(x,y))};});
 assert.ok(p.ok,selector+' actual touch hit');await page.touchscreen.tap(p.x,p.y);
}
async function finishBoard(page){
 const s=await save(page),p=boards.find(p=>p.puzzleId===s.attempt.puzzleId);
 for(const cell of p.cells.filter(c=>c.given===undefined&&!s.attempt.placements[c.id])){
  const current=await save(page),used=new Set(Object.values(current.attempt.placements));
  const i=p.tray.findIndex((value,i)=>value===answers[p.puzzleId].answer[cell.id]&&!used.has('t'+i));
  await tap(page,'[data-token="t'+i+'"]');await tap(page,'#board [data-cell="'+cell.id+'"]');
 }
 await page.locator('#result:visible').waitFor();await page.locator('#next:enabled').waitFor();return save(page);
}
async function view(page,name){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
 const v=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize,
  controls:[...document.querySelectorAll('button')].filter(n=>n.getClientRects().length&&n.checkVisibility()).map(n=>({id:n.id,width:n.clientWidth,scroll:n.scrollWidth})).filter(n=>n.scroll>n.width+2)}));
 assert.equal(v.font,'16px');assert.ok(v.scroll<=v.width+1,name);assert.deepEqual(v.controls,[],name);await page.screenshot({path:out+'/'+name+'.png'});rows.push({name,...v});
}
async function episode(seed,viewport,options={}){
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:options.reduce?'reduce':'no-preference',...(options.video?{recordVideo:{dir:out,size:viewport}}:{})});
 await context.addInitScript(({seed,offline,capability})=>{
  if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(seed));
  const listeners=new Map();let serial=0;
  const emit=(event,value)=>{for(const entry of listeners.values())if(entry.event===event)entry.callback(value);};
  const pending=()=>JSON.parse(localStorage.getItem('test.mon27.receipts')??'{}');
  const c=window.adsProtocolTest={calls:[],acks:[],open:false,offline,capability,mode:'hold',background:false};
  c.receipt=(id,profileId,outcome)=>{const r={id,profileId,outcome},p=pending();p[id]=r;localStorage.setItem('test.mon27.receipts',JSON.stringify(p));emit('rewardSettled',r);};
  c.finish=(outcome='earned')=>{if(!c.current)return;const {options,resolve,rewarded}=c.current;if(rewarded&&outcome)c.receipt(options.id,options.profileId,outcome);c.current=null;c.open=false;resolve({result:'shown'});};
  c.setOffline=value=>{c.offline=value;emit('availabilityChanged',status());};
  c.setBackground=value=>{c.background=value;emit('appStateChange',{isActive:!value});};
  c.back=()=>emit('backButton',{canGoBack:false});
  function status(){return {protocolVersion:2,rewarded:!c.offline,interstitial:!c.offline,banner:!c.offline,rewardKinds:c.capability?['hint','continue','win-bonus']:['hint','continue']};}
  const methods=['availability','pendingRewards','acknowledge','showRewarded','showInterstitial','cancelUnopened','setBanner'];
  window.androidBridge={};window.Capacitor={
   PluginHeaders:[{name:'CrossmathAds',methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener'},{name:'removeListener'}]},
    {name:'GameStorage',methods:['get','set','remove','list','compareAndSet'].map(name=>({name,rtype:'promise'}))},
    {name:'App',methods:[{name:'addListener'},{name:'removeListener'},...['getState','minimizeApp'].map(name=>({name,rtype:'promise'}))]}],
   nativeCallback(plugin,method,options,callback){const id=String(++serial);if(method==='addListener')listeners.set(id,{event:options.eventName,callback});if(method==='removeListener')listeners.delete(options.callbackId);return id;},
   async nativePromise(plugin,method,options){
    if(plugin==='GameStorage'){
     if(method==='compareAndSet'){for(const [key,value] of Object.entries(options.expected))if(localStorage.getItem(key)!==value)return {applied:false};for(const entry of options.puts)localStorage.setItem(entry.key,entry.value);for(const key of options.remove)localStorage.removeItem(key);return {applied:true};}
     if(method==='get')return {value:localStorage.getItem(options.key)};
     if(method==='set')localStorage.setItem(options.key,options.value);
     if(method==='remove')localStorage.removeItem(options.key);if(method==='list')return {keys:Object.keys(localStorage).filter(k=>k.startsWith(options.prefix))};return;
    }
    if(method==='removeListener'){listeners.delete(options.callbackId);return;}
    if(plugin==='App'){if(method==='getState')return {isActive:!c.background};if(method==='minimizeApp')c.minimized=true;return;}
    if(method==='availability')return status();
    if(method==='cancelUnopened')return {state:c.open?'opened':'closed'};
    if(method==='pendingRewards')return {receipts:Object.values(pending())};
    if(method==='acknowledge'){const p=pending();c.acks.push(options);if(p[options.id]?.outcome===options.outcome)delete p[options.id];localStorage.setItem('test.mon27.receipts',JSON.stringify(p));return;}
    if(method==='setBanner'){c.calls.push({format:'banner',visible:options.visible});return;}
    const rewarded=method==='showRewarded';c.calls.push({format:rewarded?'rewarded':'interstitial'});
    if(rewarded){const entry=JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests[options.id];if(!entry||entry.request.profileId!==options.profileId)throw Error('Native show preceded game reservation');}
    if(c.offline||Date.now()>=options.startBefore)return {result:'unavailable'};
    if(c.mode==='no-fill'){if(rewarded)c.receipt(options.id,options.profileId,'failed');c.setOffline(true);return {result:'unavailable'};}
    c.open=true;emit('fullscreenOpened',{presentationId:options.presentationId});
    return new Promise(resolve=>{c.current={options,resolve,rewarded};});
   }
  };
 },{seed,offline:options.offline??false,capability:options.capability??true});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date(seed.meta.effectiveDay+'T12:00:00Z'));await page.goto(url);await ready(page);return {context,page};
}
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch();
 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
  const seed=structuredClone(fixtures.new);seed.settings={...seed.settings,language,theme};seed.meta.screen='play';
  const {context,page}=await episode(seed,{width,height},{reduce:true});
  await tap(page,'#help');await tap(page,'#explain');await page.locator('#ad-hint:visible').waitFor();await view(page,`${width}-${height}-${language}-${theme}-help-offer`);
  const before=await save(page);await tap(page,'#ad-hint');await page.waitForFunction(()=>window.adsProtocolTest.open);
  assert.equal((await save(page)).profile.hintCredits,before.profile.hintCredits);
  await page.evaluate(()=>window.adsProtocolTest.finish('earned'));
  await page.waitForFunction(n=>JSON.parse(localStorage.getItem('crossmath.save.v1')).profile.hintCredits===n,before.profile.hintCredits+1);
  await page.locator('#apply-help:enabled').waitFor();await view(page,`${width}-${height}-${language}-${theme}-earned-credit`);
  assert.equal((await save(page)).profile.coins,before.profile.coins);
  await tap(page,'#apply-help');await page.locator('#result:visible').waitFor();assert.equal((await save(page)).profile.coins,before.profile.coins+10);
  assert.equal(await page.locator('#win-rv-bonus:visible').count(),0,'No offer at first protected victory');
  await context.close();
 }
 // Protocol recovery: native receipt exists before reload, game has not consumed it yet.
 {
  const seed=structuredClone(fixtures.new);seed.meta.screen='play';const {context,page}=await episode(seed,{width:320,height:568});
  await tap(page,'#help');await tap(page,'#ad-hint');await page.waitForFunction(()=>window.adsProtocolTest.open);
  const requested=await save(page),request=Object.values(requested.ads.requests).at(-1).request;
  await page.evaluate(r=>{localStorage.setItem('test.mon27.receipts',JSON.stringify({[r.id]:{id:r.id,profileId:r.profileId,outcome:'earned'}}));},request);
  await page.reload();await ready(page);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).profile.hintCredits===1);
  const committed=await save(page);await page.reload();await ready(page);assert.equal((await save(page)).profile.hintCredits,1);assert.equal((await save(page)).profile.coins,120);assert.deepEqual((await save(page)).attempt,committed.attempt);
  await view(page,'receipt-cold-recovery');await context.close();
 }
 // No-fill resolves only a failed receipt, keeps normal paid help free from ad gating.
 {
  const seed=structuredClone(fixtures.new);seed.meta.screen='play';const {context,page}=await episode(seed,{width:320,height:568});
  await tap(page,'#help');await tap(page,'#explain');await page.evaluate(()=>window.adsProtocolTest.mode='no-fill');await tap(page,'#ad-hint');
  await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).some(r=>r.settlement==='failed'));
  const failed=await save(page);assert.equal(failed.profile.hintCredits,0);assert.equal(failed.profile.coins,120);
  assert.equal(await page.locator('#ad-hint:visible').count(),0);await tap(page,'#apply-help');await page.locator('#result:visible').waitFor();assert.equal((await save(page)).profile.coins,70);
  assert.equal(await page.evaluate(()=>window.adsProtocolTest.calls.filter(c=>c.format==='interstitial').length),0);
  await view(page,'no-fill-normal-help');await context.close();
 }
 // Calendar actual browser hit areas; no physical finger/safe-bar claim.
 for(const height of [480,568]){
  const seed=structuredClone(fixtures.archive);seed.meta.screen='calendar';const {context,page}=await episode(seed,{width:320,height},{offline:true,reduce:true});
  const geometry=await page.locator('#calendar-prev-month').evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};});
  await tap(page,'#calendar-prev-month');await page.locator('.month-day[data-day="2026-10-31"]:enabled').waitFor();
  await tap(page,'#calendar-next-month');await tap(page,'.month-day[data-day="2026-11-15"]');
  assert.equal((await save(page)).meta.calendarSelectedDay,'2026-11-15');
  await view(page,'calendar-hit-320x'+height);rows.push({name:'calendar-arrow-hit-area',viewport:[320,height],geometry,physical:'NOT RUN'});await context.close();
 }
 for(const theme of ['light','dark'])for(const language of ['ru','en']){
  const seed=structuredClone(fixtures['after-228']);seed.settings={...seed.settings,theme,language};seed.meta.screen='album';
  const {context,page}=await episode(seed,{width:320,height:568},{offline:true});
  const text=await page.locator('.collection-summary').innerText();assert.equal(text,language==='ru'?'Мастерская собрана':'Workshop complete');assert.equal(await page.locator('#workbench').count(),0);
  await view(page,`complete-collection-${language}-${theme}`);await context.close();
 }
 // Usable WebView sizes after a native sibling reservation; no mock creative is painted.
 for(const height of [430,518]){
  const seed=structuredClone(fixtures['after-15']),p=boards.find(p=>p.campaignPosition===25&&p.contentVersion===1);
  const a=seed.attempt;a.puzzleId=p.puzzleId;a.id='banner-field25';a.status='playing';a.placements={};a.history=[];a.commandIds=[];a.trayOrder=p.tray.map((_,i)=>'t'+i);a.boardRevision=0;a.contentVersion=p.contentVersion;a.rulesetVersion=p.rulesetVersion;a.userPaused=false;
  seed.meta.activeSlot='campaign';seed.profile.campaignCursor=24;seed.result=null;seed.meta.screen='play';
  const {context,page}=await episode(seed,{width:320,height},{reduce:true});await view(page,'native-usable-320x'+height);
  const geometry=await page.evaluate(()=>{const r=n=>{const b=document.querySelector(n).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};return {board:r('#board'),tray:r('#traybox'),tools:r('.tools'),height:innerHeight};});
  assert.ok(geometry.tools.bottom<=height+1);assert.ok(geometry.board.right<=320+1);assert.ok(geometry.board.bottom<=geometry.tray.y+1);
  rows.push({name:'native-sibling-layout',geometry});await context.close();
 }
 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
  const seed=structuredClone(fixtures['before-8']);seed.settings={...seed.settings,language,theme};
  const {context,page}=await episode(seed,{width,height},{reduce:true});const victory=await finishBoard(page);
  if(candidate){
   await page.locator('#win-rv-bonus:visible').waitFor();const base=await page.locator('#win-rv-bonus').boundingBox(),next=await page.locator('#next').boundingBox();
   assert.ok(base.y>=next.y+next.height-1,'Voluntary bonus is below the ordinary action');assert.ok(base.y+base.height<=height+1&&next.y+next.height<=height+1,'Both actions visible');await view(page,`win-bonus-${width}-${height}-${language}-${theme}`);
   await page.locator('#win-rv-bonus:enabled').waitFor();await tap(page,'#win-rv-bonus');await page.waitForFunction(()=>window.adsProtocolTest.open);
   const request=Object.values((await save(page)).ads.requests).at(-1).request;const delta=request.win.delta;
   await page.evaluate(()=>window.adsProtocolTest.finish('earned'));
   await page.waitForFunction(coins=>JSON.parse(localStorage.getItem('crossmath.save.v1')).profile.coins===coins,victory.profile.coins+delta);
   const earned=await save(page);assert.deepEqual(earned.result,{...victory.result,interstitialRequested:true});assert.equal(earned.profile.hintCredits,victory.profile.hintCredits);
   await page.evaluate(r=>window.adsProtocolTest.receipt(r.id,r.profileId,'earned'),request);await page.waitForTimeout(120);assert.equal((await save(page)).profile.coins,earned.profile.coins);
   await tap(page,'#next');await page.locator('#result').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>window.adsProtocolTest.calls.filter(c=>c.format==='interstitial').length),0);
  }else{
   assert.equal(await page.locator('#win-rv-bonus').count(),0);await tap(page,'#next');await page.waitForFunction(()=>window.adsProtocolTest.open);
   await page.evaluate(()=>window.adsProtocolTest.finish(null));await page.locator('#result').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>window.adsProtocolTest.calls.filter(c=>c.format==='interstitial').length),1);
   const advanced=await save(page);assert.ok(advanced.ads.interstitialGate.nextEligibleAtMs>=180000);
   await page.reload();await ready(page);assert.deepEqual((await save(page)).ads.interstitialGate,advanced.ads.interstitialGate);
  }
  await context.close();
 }
 if(candidate){
  for(const capability of [true,false]){
   const seed=structuredClone(fixtures['before-8']),{context,page}=await episode(seed,{width:320,height:568},{capability,offline:capability});
   await finishBoard(page);assert.equal(await page.locator('#win-rv-bonus:visible').count(),0);await tap(page,'#next');
   if(!capability){await page.waitForFunction(()=>window.adsProtocolTest.open);await page.evaluate(()=>window.adsProtocolTest.finish(null));}
   await page.locator('#result').waitFor({state:'hidden'});await context.close();
  }
 }
 if(candidate){
  for(const fixture of ['before-10','before-228'])for(const language of ['ru','en']){
   const seed=structuredClone(fixtures[fixture]);seed.settings.language=language;seed.settings.theme=language==='ru'?'light':'dark';
   const {context,page}=await episode(seed,{width:320,height:480},{reduce:true});const before=await finishBoard(page);
   await page.locator('#win-rv-bonus:visible').waitFor();const next=await page.locator('#next').boundingBox();assert.ok(next.y>=0&&next.y+next.height<=480,'Milestone ordinary continuation stays visible');
   await view(page,fixture+'-'+language+'-bonus');await page.locator('#win-rv-bonus:enabled').waitFor();await tap(page,'#win-rv-bonus');await page.waitForFunction(()=>window.adsProtocolTest.open);
   await page.evaluate(()=>window.adsProtocolTest.finish('cancelled'));await page.locator('#next:enabled').waitFor();
   assert.equal((await save(page)).profile.coins,before.profile.coins);await tap(page,'#next');await page.locator('#result').waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>window.adsProtocolTest.calls.filter(c=>c.format==='interstitial').length),0);await context.close();
  }
 }
 if(candidate){
  const seed=structuredClone(fixtures['before-8']),{context,page}=await episode(seed,{width:390,height:844});
  const before=await finishBoard(page);await page.locator('#win-rv-bonus:disabled').waitFor();
  const p=await page.locator('#win-rv-bonus').boundingBox();await page.touchscreen.tap(p.x+p.width/2,p.y+p.height/2);
  assert.equal(await page.evaluate(()=>window.adsProtocolTest.calls.filter(c=>c.format==='rewarded').length),0,'No ad may interrupt committed reward animations');
  await page.locator('#win-rv-bonus:enabled').waitFor();assert.equal(await page.locator('#workshop-award').getAttribute('data-phase'),'done');
  await page.locator('#result [data-counting=true]').waitFor({state:'hidden'});
  assert.equal((await save(page)).profile.coins,before.profile.coins);await view(page,'candidate-after-natural-reward-animation');await context.close();
 }
 const recordings=[];
 if(process.env.MON27_RECORD==='1'){
  const seed=structuredClone(fixtures.new);seed.meta.screen='play';
  const {context,page}=await episode(seed,{width:390,height:844},{video:true});
  await page.waitForTimeout(650);await tap(page,'#help');await tap(page,'#explain');await page.waitForTimeout(600);await tap(page,'#ad-hint');
  await page.waitForFunction(()=>window.adsProtocolTest.open);await page.waitForTimeout(800);await page.evaluate(()=>window.adsProtocolTest.finish('earned'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).profile.hintCredits===1);await page.waitForTimeout(850);await tap(page,'#apply-help');
  await page.locator('#result:visible').waitFor();await page.waitForTimeout(1800);const path=await page.video().path();await context.close();await rename(path,out+'/help-credit-1x.webm');recordings.push({file:'help-credit-1x.webm',fixture:'new',transport:'scripted native, actual JS bridge',audio:false,speed:1});
  if(candidate){
   const seed=structuredClone(fixtures['before-8']);const {context,page}=await episode(seed,{width:390,height:844},{video:true});
   await page.waitForTimeout(600);await finishBoard(page);await page.waitForTimeout(1200);await page.locator('#win-rv-bonus:enabled').waitFor();await tap(page,'#win-rv-bonus');await page.waitForFunction(()=>window.adsProtocolTest.open);
   await page.waitForTimeout(800);await page.evaluate(()=>window.adsProtocolTest.finish('earned'));await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).some(r=>r.request.kind==='win-bonus'&&r.settlement==='earned'));
   await page.waitForTimeout(1200);await tap(page,'#next');await page.locator('#result').waitFor({state:'hidden'});await page.waitForTimeout(700);
   const path=await page.video().path();await context.close();await rename(path,out+'/victory-candidate-1x.webm');recordings.push({file:'victory-candidate-1x.webm',fixture:'before-8',transport:'scripted native, candidate only',audio:false,speed:1});
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',candidate,stamp,views:rows.length,rows,errors,recordings,proof:'Exact web payload with actual Capacitor JS adapter and scripted native transport, prepared valid profile fixtures and real touch moves. Native SDK/device/creative/impression NOT RUN.'},null,2)+'\n');console.log('MON27 browser PASS · '+rows.length+' views · candidate='+candidate);
}finally{await browser?.close();server.close();}
