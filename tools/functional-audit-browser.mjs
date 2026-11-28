import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {createServer as viteServer} from 'vite';
const root=resolve('dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
const v=await viteServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
const {createSave,decodeSave}=await v.ssrLoadModule('/src/app/model.ts'),{createAttempt}=await v.ssrLoadModule('/src/core/engine.ts'),{getPuzzle,campaignSequence}=await v.ssrLoadModule('/src/content/catalog.ts');
const now='2026-11-28T12:00:00Z';
function seed(id){const s=createSave('browser-audit',now,'UTC','initial');s.profile.solvedIds=campaignSequence('content-v2').slice(0,15);s.profile.campaignCursor=15;s.profile.coins=1000;s.settings.reducedMotion=true;
 if(id){s.attempt=createAttempt(getPuzzle(id),'audit-board','free');Object.assign(s.attempt,{freeTrack:'relax',freeIndex:0,freeAssignmentVersion:1});s.meta.activeSlot='free';s.meta.screen='play';s.meta.freeProgress={relax:0,challenge:0};}else s.meta.screen='home';return decodeSave(s);}
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch();
async function episode(s,native){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});
 await c.addInitScript(({s,native})=>{
  if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));
  if(!native)return;
  const listeners=new Map();let serial=0;
  const status=()=>({protocolVersion:3,rewarded:false,interstitial:false,banner:false,rewardKinds:[]});
  window.auditEmit=()=>{for(const {event,callback} of listeners.values())if(event==='availabilityChanged')callback(status());};
  window.androidBridge={};window.Capacitor={
   PluginHeaders:[{name:'CrossmathAds',methods:[...['availability','pendingRewards','acknowledge','showRewarded','showInterstitial','cancelUnopened','reconcileReward','setBanner'].map(name=>({name,rtype:'promise'})),{name:'addListener'},{name:'removeListener'}]},{name:'GameStorage',methods:['get','set','remove','list'].map(name=>({name,rtype:'promise'}))},{name:'App',methods:[{name:'addListener'},{name:'removeListener'},{name:'getState',rtype:'promise'},{name:'minimizeApp',rtype:'promise'}]}],
   nativeCallback(plugin,method,options,callback){const id=String(++serial);if(method==='addListener')listeners.set(id,{event:options.eventName,callback});if(method==='removeListener')listeners.delete(options.callbackId);return id;},
   async nativePromise(plugin,method,options){if(plugin==='GameStorage'){if(method==='get')return{value:localStorage.getItem(options.key)};if(method==='set')localStorage.setItem(options.key,options.value);if(method==='remove')localStorage.removeItem(options.key);return{};}if(method==='removeListener'){listeners.delete(options.callbackId);return;}if(plugin==='App')return{isActive:true};if(method==='availability')return status();if(method==='pendingRewards')return{receipts:[]};if(method==='reconcileReward')return{state:'unknown'};return{};}
  };
 },{s,native});
 const page=await c.newPage();await page.clock.setFixedTime(new Date(now));await page.goto(url);await page.locator('html[data-state=ready]').waitFor();return {c,page};
}
try{
 const rows=[];
 for(const id of ['cm-own-03-001','cm-own-03-020']){
  const {c,page}=await episode(seed(id),false);
  await page.locator('#help').tap();await page.locator('#reveal').tap();
  const revealDisabled=await page.locator('#apply-help').isDisabled(),message=await page.locator('#help-description').textContent();
  await page.locator('#explain').tap();const explainDisabled=await page.locator('#apply-help').isDisabled();
  rows.push({id,revealDisabled,explainDisabled,message});await c.close();
 }
 console.log('AUDIT_BROWSER_REVEAL '+JSON.stringify(rows));
 const {c,page}=await episode(seed(),true);await page.locator('#new-game').waitFor();await page.waitForTimeout(400);
 await page.evaluate(()=>{window.auditOld=document.querySelector('#new-game');});
 await page.waitForTimeout(2300);const periodicReplacement=await page.evaluate(()=>window.auditOld!==document.querySelector('#new-game'));
 const box=await page.locator('#new-game').boundingBox();assert.ok(box);
 const x=box.x+box.width/2,y=box.y+box.height/2,cdp=await c.newCDPSession(page);
 await page.evaluate(()=>{window.auditOld=document.querySelector('#new-game');});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await page.evaluate(()=>window.auditEmit());await page.waitForTimeout(100);
 const replacedDuringTouch=await page.evaluate(()=>window.auditOld!==document.querySelector('#new-game'));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
 const dialogAfterInterruptedTap=await page.locator('#game-choice').evaluate(e=>e.open);
 if(!dialogAfterInterruptedTap)await page.locator('#new-game').tap();
 const dialogAfterControlTap=await page.locator('#game-choice').evaluate(e=>e.open);
 console.log('AUDIT_BROWSER_TOUCH '+JSON.stringify({periodicReplacement,replacedDuringTouch,dialogAfterInterruptedTap,dialogAfterControlTap,scope:'scripted native availability; real chromium touch events'}));await c.close();
}finally{await browser.close();server.close();await v.close();}
