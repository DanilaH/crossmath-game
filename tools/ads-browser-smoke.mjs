import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// This module replaces the native adapter only in the Playwright server.
const scriptedAdapter=`
export function androidAdsProvider() {
 const control={queue:[],calls:[],unresolved:0,peak:0,rewardOpen:false};
 window.bannerTest=control;
 let dismiss;
 control.dismiss=()=>dismiss();
 control.background=hidden=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:hidden});
  Object.defineProperty(document,'visibilityState',{configurable:true,value:hidden?'hidden':'visible'});
  document.dispatchEvent(new Event('visibilitychange'));
 };
 return {
  availability:async()=>({banner:true,rewarded:true,interstitial:false}),
  watchAvailability:async()=>()=>{},
  watchRewards:async()=>()=>{},
  pendingRewards:async()=>[],
  acknowledge:async()=>{},
  showInterstitial:async()=> 'unavailable',
  showRewarded:(_,presentation)=>{
   control.rewardOpen=true;
   presentation.opened();
   return new Promise(resolve=>{dismiss=()=>{control.rewardOpen=false;resolve('shown');};});
  },
  async setBanner(visible){
   const event={visible,result:'pending',at:Date.now()};
   control.calls.push(event);
   control.peak=Math.max(control.peak,++control.unresolved);
   try {
    const action=control.queue.shift();
    if(action==='reject')throw Error('Scripted bridge rejected');
    if(action==='hold')await new Promise(resolve=>{control.release=resolve;});
    event.result='fulfilled';
   } catch(error){
    event.result='rejected';throw error;
   } finally{control.unresolved--;}
  }
 };
}`;

const server=await createServer({server:{host:'127.0.0.1',port:0,watch:null},plugins:[{
 name:'scripted-banner-browser-provider',enforce:'pre',
 transform(code,id){
  if(id===resolve('src/platform/androidAds.ts'))return scriptedAdapter;
  if(id===resolve('src/main.ts'))return code.replace('if(import.meta.env.DEV)','if(false)');
 },
}]});
const sleep=()=>new Promise(resolve=>setTimeout(resolve,20));
const result=[];
let browser;

async function tap(page,selector){
 await page.locator(selector+':enabled').waitFor();
 const point=await page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return {x,y,hit:el.contains(document.elementFromPoint(x,y))};
 });
 assert.ok(point.hit,selector+' is reachable by touch');
 await page.touchscreen.tap(point.x,point.y);
}
async function expectCalls(page,expected){
 const read=()=>page.evaluate(()=>window.bannerTest.calls.map(c=>[c.visible,c.result]));
 for(let i=0;i<45;i++){if(JSON.stringify(await read())===JSON.stringify(expected))return;await sleep();}
 assert.deepEqual(await read(),expected);
}
const arrange=(page,action)=>page.evaluate(action=>window.bannerTest.queue.push(action),action);
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const shown=[true,'fulfilled'],hidden=[false,'fulfilled'],showError=[true,'rejected'],hideError=[false,'rejected'];

try{
 await server.listen();
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,480],[320,568],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce',timezoneId:'UTC'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-11-24T12:00:00Z')});
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('html[data-state=ready]').waitFor();
  await expectCalls(page,[shown]);
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+20));
  assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).fontSize),'16px');
  assert.equal(await page.locator('[data-debug-panel]').count(),0);
  let events=[shown];

  await arrange(page,'reject');
  await tap(page,'#help');
  await expectCalls(page,events=[...events,hideError]);
  await tap(page,'#explain');
  await expectCalls(page,events);
  await page.clock.runFor(2000);
  await expectCalls(page,events=[...events,hidden]);
  await arrange(page,'reject');
  await tap(page,'#close-help');
  await expectCalls(page,events=[...events,showError]);
  await page.clock.runFor(2000);
  await expectCalls(page,events=[...events,shown]);

  await tap(page,'#help');await expectCalls(page,events=[...events,hidden]);
  await tap(page,'#ad-hint');
  await page.waitForFunction(()=>window.bannerTest.rewardOpen,null,{polling:25});
  await page.evaluate(()=>window.bannerTest.background(true));
  await page.evaluate(()=>window.bannerTest.dismiss());
  await page.locator('#close-help:enabled').waitFor();
  await page.clock.runFor(2000);await expectCalls(page,events);
  await page.evaluate(()=>window.bannerTest.background(false));
  await page.clock.runFor(2000);await expectCalls(page,events);
  assert.equal((await save(page)).profile.hintCredits,0,'closing fullscreen did not award a credit');
  await tap(page,'#close-help');await expectCalls(page,events=[...events,shown]);

  await arrange(page,'hold');
  await tap(page,'#pause');await expectCalls(page,[...events,[false,'pending']]);
  await tap(page,'#resume');await page.locator('#pause-dialog').waitFor({state:'hidden'});
  await tap(page,'[data-token="t0"]');await tap(page,'[data-cell="2"]');
  await page.locator('#result:visible').waitFor();
  assert.equal((await save(page)).profile.coins,130);
  await tap(page,'#next');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).attempt.puzzleId==='cm-own-01-002',null,{polling:25});
  await tap(page,'#home');
  await page.locator('#hub[data-screen=home]').waitFor();
  await page.clock.runFor(4000);await expectCalls(page,[...events,[false,'pending']]);
  await page.evaluate(()=>window.bannerTest.release());
  await expectCalls(page,events=[...events,hidden]);
  await tap(page,'#continue-game');
  await expectCalls(page,[...events,shown]);
  const provider=await page.evaluate(()=>({calls:window.bannerTest.calls,peak:window.bannerTest.peak,width:document.documentElement.scrollWidth}));
  assert.equal(provider.peak,1);
  assert.equal(provider.width,width);
  assert.deepEqual(errors,[]);
  result.push({viewport:[width,height],provider,coins:(await save(page)).profile.coins});
  await context.close();
 }
 const out=resolve('.test-output/ads-banner');
 await mkdir(out,{recursive:true});
 await writeFile(resolve(out,'report.json'),JSON.stringify({source:process.env.GITHUB_SHA,browser:browser.version(),provider:'scripted',result},null,2)+'\n');
 console.log('ADS-01 · 3 Chromium touch routes PASS');
}finally{
 await browser?.close();
 await server.close();
}
