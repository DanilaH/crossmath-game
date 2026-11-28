import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.env.META18_WEB??'dist'),out=resolve(process.env.META18_OUTPUT??'.test-output/meta18-ui'),baseline=process.env.META18_BASELINE==='1';
const {fixtures,provenance}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
await mkdir(out,{recursive:true});let browser;const rows=[],errors=[];
const ready=page=>page.locator('html[data-state=ready]').waitFor();
const tap=async(page,selector)=>{await page.locator(selector).tap();await page.locator('#home:enabled').waitFor();};
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')).concat(JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8')));
const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
async function finishBoard(page){
 const s=await snapshot(page),p=boards.find(p=>p.puzzleId===s.attempt.puzzleId),answer=answers[p.puzzleId].answer;
 for(const cell of p.cells.filter(c=>c.given===undefined&&!s.attempt.placements[c.id])){
  const now=await snapshot(page),used=new Set(Object.values(now.attempt.placements)),i=p.tray.findIndex((n,i)=>n===answer[cell.id]&&!used.has('t'+i));assert.ok(i>=0);
  await tap(page,`[data-token="t${i}"]`);await tap(page,`#board [data-cell="${cell.id}"]`);
 }
 await page.locator('#result:visible').waitFor();return snapshot(page);
}
async function view(page,name){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize,open:document.querySelector('dialog[open]')?.id,
  clipped:[...document.querySelectorAll('#hub button,#hub strong,#card-body p,#card-title')].filter(n=>n.getClientRects().length).filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>({id:n.id,text:n.textContent?.slice(0,90),width:n.clientWidth,scroll:n.scrollWidth}))}));
 assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));assert.equal(geometry.font,'16px');
 if(!baseline)assert.deepEqual(geometry.clipped,[],name);
 await page.screenshot({path:resolve(out,name+'.png'),fullPage:false});rows.push({name,...geometry});
}
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const url=`http://127.0.0.1:${server.address().port}/`;browser=await chromium.launch();
 for(const [width,height] of (baseline?[[320,568],[390,844]]:[[320,480],[320,568],[390,844]]))for(const language of (baseline?['ru']:['ru','en']))for(const theme of ['light','dark'])for(const [name,fixture,screen] of [['home','after-8','home'],['profile','after-8','profile'],['workshop','after-8','album'],['calendar','after-15','calendar'],['trophy','trophy-calendar','calendar']]){
  const s=structuredClone(fixtures[fixture]);s.settings.language=language;s.settings.theme=theme;s.meta.screen=screen;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});
  await context.addInitScript(s=>{if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));},s);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(s.meta.effectiveDay+'T12:00:00Z'));await page.goto(url);await ready(page);
  const key=`${width}x${height}-${language}-${theme}-${name}`;await view(page,key);
  if(!baseline&&name==='calendar'){
   const calendar=await page.evaluate(()=>({end:[...document.querySelectorAll('.month-day')].at(-1).getBoundingClientRect().bottom,tab:document.querySelector('#root-tabs').getBoundingClientRect().top,play:document.querySelector('#daily-play').getBoundingClientRect().bottom}));
   assert.ok(calendar.play<=height-50,'Daily action starts in view');
   if(height>=568&&height<=620)assert.ok(calendar.end<=calendar.tab+1,'All calendar dates fit above navigation '+JSON.stringify(calendar));
  }
  if(!baseline){
   const before=await snapshot(page);
   if(name==='profile'){
    await tap(page,'#profile-rank');await view(page,key+'-rank');await tap(page,'#close-card');
    await tap(page,'#profile-badges summary');await page.locator('#profile-badges').scrollIntoViewIfNeeded();await view(page,key+'-badges');
    await tap(page,'#profile-statistics summary');await tap(page,'#stats-filter-free');await view(page,key+'-stats');
   }else if(name==='workshop'){
    for(const selector of ['#workbench','[data-card=abacus]','[data-card=weights]']){await tap(page,selector);await view(page,key+'-'+(selector==='#workbench'?'bench':selector.includes('abacus')?'earned':'future'));await tap(page,'#close-card');}
   }else if(name==='calendar'){
    await tap(page,'#daily-goals summary');await page.locator('#daily-goals').scrollIntoViewIfNeeded();await view(page,key+'-goals');
   }else if(name==='trophy'){
    assert.equal(await page.locator('#month-trophy[data-status=earned]').count(),1);
    await tap(page,'#daily-today');assert.equal((await snapshot(page)).meta.calendarTrophyMonth,undefined);
    await view(page,key+'-today');
   }else{
    const home=await page.evaluate(()=>{const tab=document.querySelector('#root-tabs').getBoundingClientRect().top;return {height:document.documentElement.scrollHeight,view:innerHeight,fit:['#campaign-primary','#new-game','#daily-primary','#album-open'].every(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.top>=0&&r.bottom<=tab;})};});
    assert.equal(home.height,home.view);assert.equal(home.fit,true);
   }
   const after=await snapshot(page);assert.deepEqual(after.profile,before.profile);assert.deepEqual(after.career,before.career);assert.deepEqual(after.result,before.result);
  }
  await context.close();
 }
 if(!baseline){
  async function episode(fixture,options={}){
   const s=structuredClone(fixtures[fixture]),context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC',...options});
   await context.addInitScript(s=>{if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));},s);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(s.meta.effectiveDay+'T12:00:00Z'));await page.goto(url);await ready(page);return {context,page};
  }
  {
   const {context,page}=await episode('archive');const before=await snapshot(page);
   await tap(page,'#trophy-archive summary');await tap(page,'[data-trophy="2026-10"]');
   assert.match(await page.locator('#calendar-month').innerText(),/Октябрь/i);assert.equal(await page.locator('#month-trophy').getAttribute('data-month'),'2026-10');
   assert.equal(await page.locator('.month-day').count(),31);await view(page,'archive-october');await page.reload();await ready(page);
   assert.equal((await snapshot(page)).meta.calendarTrophyMonth,'2026-10');await tap(page,'#daily-today');assert.equal((await snapshot(page)).meta.calendarTrophyMonth,undefined);
   assert.equal(await page.locator('#daily-play').isVisible(),true);assert.deepEqual((await snapshot(page)).profile,before.profile);assert.deepEqual((await snapshot(page)).career,before.career);await context.close();
  }
  {
   const {context,page}=await episode('maximum');await view(page,'maximum-profile');await tap(page,'#profile-rank');await view(page,'maximum-rank');await tap(page,'#close-card');
   await tap(page,'#profile-statistics summary');await page.locator('#profile-statistics').scrollIntoViewIfNeeded();await view(page,'maximum-statistics');await context.close();
  }
  for(const fixture of ['before-8','before-10','before-228','trophy-before','past-trophy-before']){
   const {context,page}=await episode(fixture,{viewport:{width:320,height:480},recordVideo:{dir:out,size:{width:320,height:480}}});
   const before=await snapshot(page);await page.waitForTimeout(350);const after=await finishBoard(page);await page.waitForTimeout(900);await view(page,fixture+'-win');
   assert.equal(after.profile.coins-before.profile.coins,after.result.coins);
   const next=await page.locator('#next').boundingBox();assert.ok(next&&next.y>=0&&next.y+next.height<=480,'Continuation stays visible '+fixture);
   if(fixture.includes('trophy-before'))assert.equal(after.result.dailyTrophyMonth,'2026-11');
   if(fixture==='before-10')assert.equal(after.result.rankUps,1);
   if(fixture==='before-228')assert.equal(after.profile.fragments,48);
   await page.reload();await ready(page);assert.deepEqual((await snapshot(page)).result,after.result);assert.equal((await snapshot(page)).profile.coins,after.profile.coins);
   if(fixture.includes('trophy-before')){
    assert.equal(await page.locator('#daily-trophy-result').evaluate(n=>n.getAnimations({subtree:true}).length),0);
    await tap(page,'#next');assert.equal(await page.locator('#month-trophy[data-status=earned]').count(),1);await page.waitForTimeout(500);await view(page,fixture+'-after-next');
    await tap(page,'#daily-today');assert.equal((await snapshot(page)).meta.calendarTrophyMonth,undefined);
   }else {await tap(page,'#home');await tap(page,'#tab-profile');await tap(page,'#profile-workshop');await page.waitForTimeout(500);await view(page,fixture+'-collection');}
   const video=page.video();await context.close();await video.saveAs(resolve(out,fixture+'-1x.webm'));
  }
  for(const fixture of ['partial','missed','history1100']){
   const {context,page}=await episode(fixture);const before=await snapshot(page);
   if(fixture==='history1100'){
    assert.equal(before.meta.completedDates.length,1100);await tap(page,'#trophy-archive summary');
    const first=await page.locator('[data-trophy]').first().getAttribute('data-trophy');await tap(page,'[data-trophy="'+first+'"]');
   }else assert.equal(await page.locator('#month-trophy').getAttribute('data-status'),fixture);
   await view(page,fixture);await page.reload();await ready(page);assert.deepEqual((await snapshot(page)).profile,before.profile);assert.deepEqual((await snapshot(page)).career,before.career);await context.close();
  }
  for(const language of ['ru','en']){
   const seed=structuredClone(fixtures['after-8']);seed.settings.language=language;seed.settings.theme=language==='ru'?'light':'dark';
   const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC'});
   await context.addInitScript(s=>{
    if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));
    window.androidBridge={};const listeners=new Map();
    window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'addListener'},{name:'removeListener'},{name:'getState',rtype:'promise'},{name:'minimizeApp',rtype:'promise'}]},{name:'GameStorage',methods:['get','set','remove','list','compareAndSet'].map(name=>({name,rtype:'promise'}))}],
     nativeCallback(_plugin,method,options,callback){if(method==='addListener')listeners.set(options.eventName,callback);if(method==='removeListener')listeners.delete(options.eventName);return options.eventName;},
     async nativePromise(plugin,method,options){if(plugin==='App'){if(method==='minimizeApp')window.minimized=true;return {isActive:true};}if(method==='list')return {keys:Object.keys(localStorage).filter(k=>k.startsWith(options.prefix))};if(method==='compareAndSet'){for(const [key,value] of Object.entries(options.expected))if(localStorage.getItem(key)!==value)return {applied:false};for(const entry of options.puts)localStorage.setItem(entry.key,entry.value);for(const key of options.remove)localStorage.removeItem(key);return {applied:true};}
     if(method==='get')return {value:localStorage.getItem(options.key)};if(method==='set')localStorage.setItem(options.key,options.value);if(method==='remove')localStorage.removeItem(options.key);}};
    window.testBack=()=>listeners.get('backButton')({canGoBack:false});
   },seed);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(seed.meta.effectiveDay+'T12:00:00Z'));await page.goto(url);await ready(page);
   assert.equal(await page.locator('html').getAttribute('data-host'),'android');const before=await snapshot(page);
   for(let repeat=0;repeat<3;repeat++){await tap(page,'#profile-rank');await page.evaluate(()=>window.testBack());await page.locator('#card-dialog').waitFor({state:'hidden'});}
   await tap(page,'#profile-workshop');await tap(page,'#workbench');await page.evaluate(()=>window.testBack());await page.locator('#card-dialog').waitFor({state:'hidden'});
   await page.evaluate(()=>window.testBack());await page.locator('#hub[data-screen=profile]').waitFor();
   await page.evaluate(()=>window.testBack());await page.locator('#hub[data-screen=home]').waitFor();
   assert.deepEqual((await snapshot(page)).profile,before.profile);assert.deepEqual((await snapshot(page)).result,before.result);await view(page,'native-back-'+language);await context.close();
  }
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({status:'PASS',baseline,provenance,views:rows.length,rows,errors},null,2)+'\n');console.log('META browser PASS · '+rows.length+' views');
}finally{await browser?.close();server.close();}
