import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const root=resolve(process.env.LEAGUE22_WEB??'dist'),out=resolve(process.env.LEAGUE22_OUTPUT??'.test-output/league22-ui');
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')).concat(JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8')));
const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
const checks=[],errors=[];let browser;
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const ready=async page=>{try{await page.locator('html[data-state=ready]').waitFor();}catch(error){await page.screenshot({path:resolve(out,'startup-failure.png')});console.error('STARTUP',await page.locator('body').innerText(),errors);throw error;}};
async function tap(page,selector){await page.locator(selector).tap();await page.locator('#home:enabled').waitFor();}
async function view(page,name){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const v=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize,
  table:[...document.querySelectorAll('.league-row')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};}),
  pointTextFits:[...document.querySelectorAll('.league-points')].every(n=>n.scrollWidth<=n.clientWidth+1),
  tabs:!document.querySelector('#root-tabs').hidden}));
 if(await page.locator('#hub[data-screen=home]').count())assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'Home fits without vertical scroll');
 assert.ok(v.scroll<=v.width+1,JSON.stringify(v));assert.equal(v.font,'16px');assert.equal(v.pointTextFits,true);
 assert.equal(await page.locator('.league-name').filter({hasText:/^Bot$|^Бот$/}).count(),0);
 if(await page.locator('.league-table').count())assert.equal(await page.locator('.league-avatar[style*=background-image]').count(),9);
 assert.ok(v.table.every(r=>r.left>=0&&r.right<=v.width+1));
 await page.screenshot({path:resolve(out,name+'.png'),fullPage:false});checks.push({name,...v});
}
async function solve(page,expectedPoints=1){
 const current=await snapshot(page),p=boards.find(p=>p.puzzleId===current.attempt.puzzleId);
 // Kept outside array predicates because snapshot is asynchronous.
 assert.ok(p);const answer=answers[p.puzzleId].answer;
 for(const cell of p.cells.filter(c=>c.given===undefined)){
  const s=await snapshot(page);if(s.attempt.placements[cell.id]!==undefined)continue;
  const used=new Set(Object.values(s.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));
  await tap(page,`[data-token="t${token}"]`);await tap(page,`#board [data-cell="${cell.id}"]`);
 }
 await page.locator('#result:visible').waitFor();
 assert.equal((await snapshot(page)).result.league.points,expectedPoints);
 const next=await page.locator('#next').boundingBox();assert.ok(next.y+next.height<=page.viewportSize().height+1);
}
await mkdir(out,{recursive:true});
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch();
 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));
  await page.goto(url);await ready(page);await tap(page,'#home');
  if(language==='en'||theme==='dark'){
   await tap(page,'#pause');if(await page.locator('#settings-options summary').isVisible())await page.locator('#settings-options summary').tap();
   if(language==='en'){await page.locator('#language').selectOption('en');await page.locator('#home:enabled').waitFor();}
   if(theme==='dark'){await page.locator('#theme').check();await page.locator('#home:enabled').waitFor();}
   await tap(page,'#resume');
  }
  const name=`${width}x${height}-${language}-${theme}`;
  await view(page,name+'-home');
  const home=await page.evaluate(()=>({height:document.documentElement.scrollHeight,view:innerHeight}));if(home.height>home.view+1)console.error(await page.evaluate(()=>[...document.querySelectorAll('#shell,#shell > *,#hub > *,#hub .resume-card > *')].map(n=>({id:n.id,cls:n.className,y:n.getBoundingClientRect().y,h:n.getBoundingClientRect().height,style:getComputedStyle(n).padding}))));assert.ok(home.height<=home.view+1,JSON.stringify(home));
  await tap(page,'#home-league-open');await view(page,name+'-invite');
  const joinRect=await page.locator('#league-join').boundingBox(),tabs=await page.locator('#root-tabs').boundingBox();assert.ok(joinRect.y+joinRect.height<=tabs.y);
  assert.equal((await snapshot(page)).league,undefined);
  await tap(page,'#home');await page.locator('#hub[data-screen=profile]').waitFor();
  await tap(page,'#league-open');await tap(page,'#league-join');
  const plans=JSON.stringify((await snapshot(page)).league.active.bots);
  assert.equal(await page.locator('.league-row').count(),10);assert.equal(await page.locator('#tab-profile[aria-current=page]').count(),1);
  await tap(page,'#tab-home');await tap(page,'#continue-game');await solve(page);await view(page,name+'-win');
  assert.equal(await page.locator('#root-tabs').isHidden(),true);
  const win=(await snapshot(page)).result,coins=(await snapshot(page)).profile.coins;
  await tap(page,'#home');await tap(page,'#tab-profile');await tap(page,'#league-open');
  await page.clock.setFixedTime(new Date('2026-11-25T16:00:00Z'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.lastSeenAt>=Date.parse('2026-11-25T16:00:00Z'));
  await view(page,name+'-table');assert.equal(JSON.stringify((await snapshot(page)).league.active.bots),plans);
  await page.reload();await ready(page);assert.equal(JSON.stringify((await snapshot(page)).league.active.bots),plans);
  await page.clock.setFixedTime(new Date('2026-11-30T00:00:00Z'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.history.length===1);
  await view(page,name+'-medal');
  const rejoinRect=await page.locator('#league-join').boundingBox(),bar=await page.locator('#root-tabs').boundingBox();assert.ok(rejoinRect.y+rejoinRect.height<=bar.y);
  assert.equal((await snapshot(page)).profile.coins,coins);assert.deepEqual((await snapshot(page)).result,win);
  await page.reload();await ready(page);assert.equal((await snapshot(page)).league.history.length,1);
  await tap(page,'#league-join');assert.equal((await snapshot(page)).league.history.length,1);
  await page.locator('#league-history summary').tap();await view(page,name+'-history');
  assert.equal(await page.locator('#root-tabs').isVisible(),true);
  await context.close();
 }
 {
  const recovery=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC'}),page=await recovery.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));await page.goto(url);await ready(page);
  await tap(page,'#home');await tap(page,'#tab-profile');await tap(page,'#league-open');await tap(page,'#league-join');
  await tap(page,'#tab-home');await tap(page,'#continue-game');await solve(page);await tap(page,'#home');await tap(page,'#tab-profile');await tap(page,'#league-open');
  const before=await snapshot(page);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crossmath.save.v1'));s.league.active.bots[0].due[0]--;localStorage.setItem('crossmath.save.v1',JSON.stringify(s));});
  await page.reload();await ready(page);const after=await snapshot(page);
  assert.deepEqual(after.profile,before.profile);assert.deepEqual(after.attempt,before.attempt);assert.deepEqual(after.result,before.result);
  assert.ok(after.leagueQuarantine);assert.equal(after.league,undefined);assert.equal(await page.locator('#league-join').count(),0);
  await view(page,'320x568-ru-light-recovery');await tap(page,'#home');await tap(page,'#tab-home');await tap(page,'#campaign-primary');
  assert.equal((await snapshot(page)).attempt.status,'playing');assert.ok((await snapshot(page)).leagueQuarantine);await recovery.close();
 }
 {
  const fixture=JSON.parse(await readFile('.test-output/league22/max-profile.json','utf8'));
  const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC'});
  await context.addInitScript(s=>localStorage.setItem('crossmath.save.v1',JSON.stringify(s)),fixture);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));await page.goto(url);await ready(page);
  await view(page,'320x568-ru-light-maximum-points');assert.ok(Number(await page.locator('[data-opponent=self] .league-points').innerText())>999);await context.close();
 }
 for(const fixture of JSON.parse(await readFile('.test-output/league22/rich-wins.json','utf8')))for(const [language,theme] of [['ru','light'],['en','dark']]){
  const s=structuredClone(fixture.save);s.settings.language=language;s.settings.theme=theme;
  const context=await browser.newContext({viewport:{width:320,height:480},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});
  await context.addInitScript(s=>localStorage.setItem('crossmath.save.v1',JSON.stringify(s)),s);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));await page.goto(url);await ready(page);
  await tap(page,'#home');await view(page,`320x480-${language}-${theme}-rich-home-${fixture.milestone}`);
  await page.setViewportSize({width:320,height:568});await view(page,`320x568-${language}-${theme}-rich-home-${fixture.milestone}`);
  await page.setViewportSize({width:320,height:480});await tap(page,'#continue-game');
  await solve(page,fixture.points);await view(page,`320x480-${language}-${theme}-rich-win-${fixture.milestone}`);await context.close();
 }
 for(const language of ['ru','en']){
  const native=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC'});
  await native.addInitScript(()=>{
   window.androidBridge={};const listeners=new Map();
   window.Capacitor={PluginHeaders:[
    {name:'App',methods:[{name:'addListener'},{name:'removeListener'},{name:'getState',rtype:'promise'},{name:'minimizeApp',rtype:'promise'}]},
    {name:'GameStorage',methods:['get','set','remove'].map(name=>({name,rtype:'promise'}))}],
    nativeCallback(_plugin,method,options,callback){if(method==='addListener')listeners.set(options.eventName,callback);if(method==='removeListener')listeners.delete(options.eventName);return options.eventName;},
    async nativePromise(plugin,method,options){if(plugin==='App'){if(method==='minimizeApp')window.minimized=true;return {isActive:true};}if(method==='get')return {value:localStorage.getItem(options.key)};if(method==='set')localStorage.setItem(options.key,options.value);if(method==='remove')localStorage.removeItem(options.key);}};
   window.testBack=()=>listeners.get('backButton')({canGoBack:false});
  });
  const page=await native.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));await page.goto(url);await ready(page);
  assert.equal(await page.locator('html').getAttribute('data-host'),'android');
  await tap(page,'#home');
  if(language==='en'){await tap(page,'#pause');await page.locator('#language').selectOption('en');await page.locator('#home:enabled').waitFor();await page.locator('#theme').check();await page.locator('#home:enabled').waitFor();await tap(page,'#resume');}
  await tap(page,'#tab-profile');await tap(page,'#league-open');await tap(page,'#league-join');
  const before=(await snapshot(page)).league;
  await tap(page,'#pause');await page.evaluate(()=>window.testBack());await page.locator('#pause-dialog').waitFor({state:'hidden'});
  assert.equal((await snapshot(page)).meta.screen,'league');
  await page.evaluate(()=>window.testBack());await page.locator('#hub[data-screen=profile]').waitFor();
  assert.deepEqual((await snapshot(page)).league,before);await native.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({status:'PASS',checks,errors,browser:browser.version(),clock:'CONTROLLED profile clock, no physical Android execution',androidBack:'Capacitor bridge simulation, two contexts'},null,2)+'\n');
 console.log(`LEAGUE-01 browser PASS · ${checks.length} views, 12 full weekly lifecycles, two themes/locales, save/restart, no duplicate medals`);
}finally{await browser?.close();server.close();}
