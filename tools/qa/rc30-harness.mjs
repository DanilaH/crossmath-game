import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

export const save=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
export const ready=p=>p.locator('html[data-state=ready]').waitFor();
export async function serve(initial='dist'){
 let root=resolve(initial);
 const server=createServer(async(req,res)=>{try{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(file===root||file.startsWith(root+sep));
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'})[extname(file)]??'text/html');
  res.end(await readFile(file===root?root+'/index.html':file));
 }catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}/`,use:path=>{root=resolve(path);},close:()=>server.close()};
}
// Never scroll the document on behalf of the player. Tray arrows are real UI actions.
export async function tap(page,selector){
 const l=page.locator(selector);await l.waitFor();
 for(let n=0;n<100&&!await l.isEnabled();n++)await page.waitForTimeout(20);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const hit=()=>l.evaluate(n=>{const r=n.getBoundingClientRect();return !n.disabled&&r.y>=0&&r.bottom<=innerHeight+1&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
 if(selector.startsWith('[data-token'))for(let i=0;i<16&&!await hit();i++){
  const above=await l.evaluate(n=>n.getBoundingClientRect().top<document.querySelector('#tray').getBoundingClientRect().top);
  const arrow=page.locator(above?'#tray-prev':'#tray-next');assert.ok(await arrow.isEnabled(),'Tray arrow reaches '+selector);
  await arrow.tap();await page.waitForTimeout(100);
 }
 if(!await hit()){await page.screenshot({path:'.test-output/rc30-hit-failure.png'});console.error(selector,await l.evaluate(n=>({disabled:n.disabled,rect:n.getBoundingClientRect().toJSON(),hit:document.elementFromPoint(n.getBoundingClientRect().x+n.clientWidth/2,n.getBoundingClientRect().y+n.clientHeight/2)?.outerHTML.slice(0,250)})));}
 assert.ok(await hit(),'Reachable touch target '+selector);await l.tap();
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
 // Ordinary commands own the shared writer until the navigation control is enabled again.
 // Fullscreen calls deliberately stay pending so the test can deliver their native callbacks.
 if(!['#ad-hint','#ad-continue','#next'].includes(selector))await page.locator('#pause:not([disabled])').waitFor({state:'attached'});
}
export async function episode(browser,url,seed,{height=568,protocol=3,banner=false,config={},video}={}){
 const context=await browser.newContext({viewport:{width:320,height},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce',...(video?{recordVideo:{dir:video,size:{width:320,height}}}:{})});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.exposeFunction('__rc30Resize',visible=>banner?page.setViewportSize({width:320,height:height-(visible?50:0)}):undefined);
 await context.addInitScript(({seed,protocol,config})=>{
  const key='crossmath.save.v1',journalKey='test.rc30.native',configKey='test.rc30.config';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
  if(!localStorage.getItem(configKey))localStorage.setItem(configKey,JSON.stringify(config));
  const read=()=>JSON.parse(localStorage.getItem(journalKey)??'{"records":{},"calls":[],"acks":[],"admissions":0,"duplicates":0}');
  const write=j=>localStorage.setItem(journalKey,JSON.stringify(j));
  const control=()=>JSON.parse(localStorage.getItem(configKey));
  const listeners=new Map();let serial=0;
  if(config.layoutGate){
   // Fault injection: a native viewport change is applied but resize notifications arrive late.
   const OriginalObserver=window.ResizeObserver;
   window.ResizeObserver=class extends OriginalObserver{constructor(callback){super((entries,observer)=>{if(!control().holdLayout)callback(entries,observer);});}};
   const add=window.addEventListener,remove=window.removeEventListener,wrapped=new Map();
   window.addEventListener=function(type,listener,options){
    if(type==='resize'&&listener){const original=listener;listener=function(event){if(!control().holdLayout){if(typeof original==='function')original.call(this,event);else original.handleEvent(event);}};wrapped.set(original,listener);}
    return add.call(this,type,listener,options);
   };
   window.removeEventListener=function(type,listener,options){return remove.call(this,type,type==='resize'?(wrapped.get(listener)??listener):listener,options);};
  }
  const emit=(event,value)=>{for(const e of listeners.values())if(e.event===event)e.callback(value);};
  const receipt=r=>({id:r.id,profileId:r.profileId,outcome:r.outcome});
  const c=window.rc30={journal:read,config:control,live:null,events:[],
   configure:values=>localStorage.setItem(configKey,JSON.stringify({...control(),...values})),
   background:active=>emit('appStateChange',{isActive:active}),back:()=>emit('backButton',{canGoBack:false}),
   finish(outcome='earned'){
    const j=read(),live=c.live,r=live?.rewarded?j.records[live.options.id]:null;
    if(r){r.phase='admitted';r.closed=true;if(outcome){r.outcome=outcome;r.acked=false;}}write(j);
    if(r?.outcome)emit('rewardSettled',receipt(r));
    if(live){c.live=null;emit('fullscreenClosed',{presentationId:live.options.presentationId,result:'shown'});live.resolve({result:'shown'});}
   },
   lateEarn(id){const j=read(),r=j.records[id];if(!r||r.phase!=='admitted')throw Error('Never admitted');r.outcome='earned';r.acked=false;r.closed=true;write(j);emit('rewardSettled',receipt(r));},
   replay(id){const r=read().records[id];if(r?.outcome)emit('rewardSettled',receipt(r));},
   duplicate(id){const r=read().records[id];return window.Capacitor.nativePromise('CrossmathAds','showRewarded',{...r,startBefore:Date.now()+1000});},
  };
  for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{c.events.push({type,target:e.target.id||e.target.className,x:e.clientX,y:e.clientY});if(c.events.length>30)c.events.shift();},true);
  function status(){return {protocolVersion:protocol,rewarded:!control().offline,interstitial:!control().offline,banner:!control().offline,rewardKinds:['hint','continue']};}
  const methods=['availability','pendingRewards','acknowledge','showRewarded','showInterstitial','cancelUnopened','reconcileReward','setBanner'];
  window.androidBridge={};window.Capacitor={
   PluginHeaders:[{name:'CrossmathAds',methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener'},{name:'removeListener'}]},
    {name:'GameStorage',methods:['get','set','remove','list'].map(name=>({name,rtype:'promise'}))},
    {name:'App',methods:[{name:'addListener'},{name:'removeListener'},...['getState','minimizeApp'].map(name=>({name,rtype:'promise'}))]}],
   nativeCallback(plugin,method,options,callback){const id=String(++serial);if(method==='addListener')listeners.set(id,{event:options.eventName,callback});if(method==='removeListener')listeners.delete(options.callbackId);return id;},
   async nativePromise(plugin,method,options){
    if(plugin==='GameStorage'){
     if(method==='get')return {value:localStorage.getItem(options.key)};
     if(method==='set')localStorage.setItem(options.key,options.value);
     if(method==='remove')localStorage.removeItem(options.key);if(method==='list')return {keys:[]};return;
    }
    if(method==='removeListener'){listeners.delete(options.callbackId);return;}
    if(plugin==='App'){if(method==='getState')return {isActive:true};return;}
    const j=read(),cfg=control();
    if(method==='availability')return status();
    if(method==='pendingRewards')return {receipts:Object.values(j.records).filter(r=>r.outcome&&!r.acked).map(receipt)};
    if(method==='acknowledge'){
     j.acks.push(options);const r=j.records[options.id];
     if(cfg.ack==='reject-before'){write(j);throw Error('Injected ACK failure before commit');}
     if(r?.outcome===options.outcome)r.acked=true;write(j);
     if(cfg.ack==='lost-reply')return new Promise(()=>{});return;
    }
    if(method==='reconcileReward'){
     if(cfg.proof==='reject')throw Error('Injected proof transport failure');
     let r=j.records[options.id];
     if(r&&r.profileId!==options.profileId)throw Error('Wrong profile');
     if(!r||r.phase==='prepared'){
      r=j.records[options.id]={...options,phase:'closed',outcome:'cancelled',acked:false,closed:true};write(j);
      return {state:'closed',receipt:receipt(r)};
     }
     if(r.outcome)return {state:'closed',receipt:receipt(r)};
     return {state:c.live?.options.id===r.id?'opened':'unknown'};
    }
    if(method==='cancelUnopened')return {state:c.live?'opened':'closed'};
    if(method==='setBanner'){j.calls.push({format:'banner',visible:options.visible});write(j);await window.__rc30Resize(options.visible);return;}
    const rewarded=method==='showRewarded';j.calls.push({format:rewarded?'rewarded':'interstitial',id:options.id});
    if(rewarded){
     const entry=JSON.parse(localStorage.getItem(key)).ads.requests[options.id];
     if(!entry||entry.request.profileId!==options.profileId)throw Error('Show before durable game reservation');
     if(j.records[options.id]){j.duplicates++;write(j);return {result:'unavailable'};}
    }
    write(j);
    if(cfg.show==='reject-before-prepare')throw Error('Injected dispatch transport failure');
    if(rewarded){j.records[options.id]={...options,phase:'prepared',acked:false};write(j);}
    if(cfg.show==='hold-prepared')return new Promise(()=>{});
    if(Date.now()>=options.startBefore||cfg.offline)return {result:'unavailable'};
    if(rewarded)j.records[options.id].phase='admitted';j.admissions++;write(j);
    emit('fullscreenOpened',{presentationId:options.presentationId});
    return new Promise(resolve=>{c.live={options,resolve,rewarded};});
   },
  };
 },{seed,protocol,config});
 await page.clock.setFixedTime(new Date(seed.meta.effectiveDay+'T12:00:00Z'));
 await page.goto(url);await ready(page);return {page,context};
}
