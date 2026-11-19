import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('dist'),out=resolve('.test-output/meta-ui');await mkdir(out,{recursive:true});
const releaseBoards=JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8'));
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')).concat(releaseBoards);
const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')), ...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
const day='2026-11-18';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);assert.ok(path===root||path.startsWith(root+'/'));res.setHeader('Content-Type',mime[extname(path)]??'text/html');res.end(await readFile(path===root?root+'/index.html':path));}catch{res.writeHead(404).end();}});
let browser;const checks=[],errors=[],geometry=[];
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'UTC'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date(day+'T12:00:00Z')});
 const url=`http://127.0.0.1:${server.address().port}/`;
 const ready=()=>page.locator('html[data-state=ready]').waitFor();
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 const tap=async(selector)=>{await page.locator(selector).tap();await page.locator('#home:enabled').waitFor();};
 const openModes = async () => {
  await tap('#modes-open');
  await page.locator('#mode-dialog[open]').waitFor();
 };
 const solve=async()=>{const save=await snapshot(),p=boards.find(p=>p.puzzleId===save.attempt.puzzleId),answer=answers[p.puzzleId].answer;for(const cell of p.cells.filter(c=>c.given===undefined)){const s=await snapshot();if(p.tray[Number(s.attempt.placements[cell.id]?.slice(1))]===answer[cell.id])continue;const used=new Set(Object.values(s.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));assert.notEqual(token,-1);await tap(`[data-token="t${token}"]`);await tap(`[data-cell="${cell.id}"]`);}assert.equal((await snapshot()).attempt.status,'won');};
 await page.goto(url);await ready();
 await tap('#home');
 assert.equal(await page.locator('#continue-game').innerText(),'Продолжить · Поле 1');
 assert.equal(await page.locator('#hub .primary').count(),1);
 assert.equal(await page.locator('#daily-primary').isDisabled(),true);
 await openModes();
 assert.equal(await page.locator('#free-open').isDisabled(),true);
 assert.equal(await page.locator('#calendar-open').isDisabled(),true);
 await page.keyboard.press('Escape');
 await page.locator('#mode-dialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'modes-open');
 await tap('#continue-game');
 for(let win=1;win<=5;win++){
  if(win>1)await tap('#next');await solve();const s=await snapshot();
  if([3,4].includes(win))assert.equal(s.profile.fragments,win-2);
  if(win===3){
   const frame=page.locator('#first-fragment');
   assert.equal(await frame.innerText(),'Рамка счётов · 1/4');
   assert.equal(await frame.locator('[data-part="1"]:visible').count(),1);
   assert.equal(await page.locator('#next').isEnabled(),true);
   for (const [width,height] of [[320,568],[390,844]]) {
    await page.setViewportSize({width,height});
    const box=await frame.boundingBox();
    assert.ok(box && box.height>=48 && box.y>=0 && box.y+box.height<=height);
   }
   await frame.tap();
   await page.locator('#card-dialog[open]').waitFor();
   assert.equal(await page.locator('#card-title').innerText(),'Счёты');
   assert.equal(await page.locator('#card-body .unearned-part[data-part="2"]:visible').count(),1);
   assert.equal(await page.locator('#card-body .earned').count(),1);
   await tap('#close-card');
   await page.waitForFunction(()=>document.activeElement?.id==='first-fragment');
   await page.reload();await ready();
   assert.equal(await frame.isVisible(),true);
   assert.equal(await page.locator('#first-fragment.arrived').count(),0);
   const restored=await snapshot();
   assert.deepEqual(restored.result,s.result);
   assert.equal(restored.profile.fragments,1);
   assert.equal(restored.profile.coins,s.profile.coins);
   await tap('#result-details summary');
   assert.match(await page.locator('#reward-breakdown').innerText(),/Открыта свободная игра/);
   await tap('#result-details summary');
   checks.push('frame in tray, direct abacus inspection, same result on close and cold reload; no duplicate grant');
   await tap('#home');await openModes();assert.equal(await page.locator('#free-open').isEnabled(),true);await tap('#free-open');const free=await snapshot();assert.equal(free.attempt.mode,'free');assert.equal(free.meta.inactive.campaign.attempt.status,'won');await tap('#home');await page.reload();await ready();await tap('#continue-game');assert.equal((await snapshot()).attempt.id,free.attempt.id);await tap('#home');await openModes();await tap('#campaign-open');assert.equal((await snapshot()).attempt.mode,'campaign');await solve();win=4;assert.equal((await snapshot()).profile.fragments,2);}
 }
 const fifth=await snapshot();assert.equal(fifth.meta.quests.slots.every(s=>s.progress===0&&!s.paid),true);checks.push('fresh profile: unlocks at 3/5; fifth win creates missions without retroactive credit; Free/campaign slots restore');
 await tap('#home');
 assert.equal(await page.locator('#campaign-primary').innerText(),'Продолжить · Поле 6');
 assert.equal(await page.locator('#mode-dialog').isHidden(),true);
 for (const [width,height] of [[320,568],[390,844]]) {
  await page.setViewportSize({width,height});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const data=await page.evaluate(()=>{
   const rects=['#campaign-primary','#daily-primary','#album-open','#modes-open'].map(s=>document.querySelector(s).getBoundingClientRect());
   return {minTarget:Math.min(...rects.map(r=>Math.min(r.width,r.height))),
     firstViewport:rects.every(r=>r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth),
     documentHeight:document.documentElement.scrollHeight};
  });
  assert.ok(data.firstViewport);assert.ok(data.minTarget>=48);
  geometry.push({screen:'home',viewport:[width,height],...data});
  await page.screenshot({path:out+`/home-five-${width}.png`});
 }
 await openModes();
 await page.screenshot({path:out+'/modes-five.png'});
 await tap('#close-modes');
 await tap('#daily-primary');
 assert.equal((await snapshot()).attempt.dayKey,day);
 assert.match(await page.locator('#lives').innerText(),/3\s*\/\s*3/);
 await solve();
 checks.push('one campaign CTA after five wins; direct Daily opens today; home actions fit on 320×568 and 390×844');
 const daily=await snapshot();assert.equal(daily.result.coins,105);assert.equal(daily.result.baseCoins,15);assert.equal(boards.find(p=>p.puzzleId===daily.attempt.puzzleId).bucket,'daily');assert.equal(daily.result.dailyCoins,30);assert.equal(daily.result.taskCoins,30);assert.equal(daily.result.setCoins,30);assert.equal(daily.profile.fragments,3);await page.screenshot({path:out+'/daily-v2.png',fullPage:true});
 await page.reload();await ready();assert.deepEqual((await snapshot()).result,daily.result);assert.equal((await snapshot()).profile.coins,daily.profile.coins);await tap('#next');assert.match(await page.locator(`[data-day="${day}"]`).innerText(),/Решено/);assert.equal(await page.locator('#hub [data-quest]:visible').count(),0);await tap('#daily-goals summary');assert.equal(await page.locator('#hub [data-quest]:visible').count(),3);assert.equal(await page.locator('.date-card:disabled').count(),7);checks.push('actual UI Daily v2: +105 breakdown, three lives, dated completion, cold restore pays once');
 await tap('#calendar-back');await tap('#campaign-primary');await solve();await tap('#next');await solve();assert.equal((await snapshot()).profile.fragments,4);assert.equal((await snapshot()).result.cardCoins,20);assert.match(await page.locator('#result-detail').innerText(),/Прибор собран/);
 await tap('#home');await tap('#album-open');const first=page.locator('[data-card="abacus"]');assert.match(await first.innerText(),/4 \/ 4/);assert.equal(await first.locator('svg g[display="none"]').count(),0);await first.tap();await page.locator('#card-dialog[open]').waitFor();assert.equal(await page.locator('#card-body .earned').count(),4);await page.keyboard.press('Escape');await page.locator('#card-dialog').waitFor({state:'hidden'});checks.push('eighth distinct win: +20 card receipt, four visible abacus layers and accessible part list');
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){
  await page.setViewportSize({width,height});const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...[...document.querySelectorAll('#hub button')].map(e=>e.getBoundingClientRect().height))}));assert.equal(data.overflow,false);assert.ok(data.minTarget>=48);geometry.push({screen:'album',viewport:[width,height],...data});await page.screenshot({path:out+`/album-${width}.png`,fullPage:true});
 }
 await tap('#album-back');await tap('#rank');await page.locator('#card-dialog[open]').waitFor();assert.match(await page.locator('#card-body').innerText(),/XP/);await tap('#close-card');
 const before=await snapshot();await page.clock.setSystemTime(new Date(new Date(day+'T12:00:00Z').getTime()+3*86400000));await page.reload();await ready();const after=await snapshot();assert.equal(after.meta.issuedDays,before.meta.issuedDays+1);assert.equal(after.meta.completedDates.includes(day),true);await openModes();await tap('#calendar-open');assert.equal(await page.locator(`[data-day="${day}"]`).isEnabled(),true);assert.equal(await page.locator('.date-card:disabled').count(),7);await page.screenshot({path:out+'/calendar.png',fullPage:true});checks.push('fixed profile zone, three missed days advance one issuance, past/completed/future dates remain distinct');
 // Explicit boundary fixture, not claimed as 228 UI-played wins. Reward arithmetic is covered by whole-bank tests.
 const fixture=await snapshot();fixture.profile.solvedIds=[...new Set([...fixture.profile.solvedIds,...boards.map(p=>p.puzzleId)])].slice(0,228);fixture.profile.fragments=48;fixture.profile.paidCardIds=JSON.parse(await readFile('docs/spec/product/meta_v08/config.json','utf8')).cards.map(c=>c.id);fixture.meta.screen='album';fixture.meta.quests=null;
 await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal(await page.locator('.collection-card').count(),12);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);assert.match(await page.locator('.hub-heading').innerText(),/Мастерская собрана/);await page.screenshot({path:out+'/album-complete-fixture.png',fullPage:true});
 fixture.profile.solvedIds.push(boards.find(board=>!fixture.profile.solvedIds.includes(board.puzzleId)).puzzleId);await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal((await snapshot()).profile.fragments,48);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);checks.push('labelled 228/229 fixtures: complete 12-card album stays available, no 49th fragment');
 // The labelled 229-win fixture above gives access to both Free tracks.
 await page.setViewportSize({width:390,height:844});
 await tap('#album-back');await openModes();await tap('#free-open');
 const free = (await snapshot()).attempt;
 const editable = boards.find(board=>board.puzzleId===free.puzzleId).cells.find(cell=>cell.given===undefined);
 await tap('[data-token="t0"]');await tap(`[data-cell="${editable.id}"]`);await tap('#home');
 await page.reload();await ready();
 await openModes();await tap('#challenge-open');
 await page.locator('#replace-dialog[open]').waitFor();
 await page.waitForFunction(()=>document.activeElement.id==='keep-board');
 const beforeReplace=await snapshot();
 assert.equal(beforeReplace.attempt.id,free.id);
 assert.equal(Object.keys(beforeReplace.attempt.placements).length,1);
 await page.screenshot({path:out+'/u1-ru-dialog.png'});
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('#replace-dialog').open&&document.activeElement.id==='challenge-open');
 assert.deepEqual((await snapshot()).attempt,beforeReplace.attempt);
 await page.screenshot({path:out+'/u1-ru-cancel.png'});
 await tap('#challenge-open');await page.waitForFunction(()=>document.activeElement.id==='keep-board');
 await page.evaluate(()=>{
   const persist=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='crossmath.save.v1'&&window.failReplace)throw Error('scripted primary write failure');return persist.call(this,key,value);};
   window.failReplace=true;
 });
 await page.locator('#replace-board').tap();await page.locator('#replace-error').waitFor({state:'visible'});
 assert.deepEqual((await snapshot()).attempt,beforeReplace.attempt);
 await page.evaluate(()=>{window.failReplace=false;});
 await tap('#replace-board');await page.locator('#replace-dialog').waitFor({state:'hidden'});
 assert.equal((await snapshot()).attempt.freeTrack,'challenge');
 assert.notEqual((await snapshot()).attempt.id,free.id);
 await page.screenshot({path:out+'/u1-ru-confirm.png'});
 await tap('#home');await tap('#pause');await page.selectOption('#language','en');await page.locator('#resume:enabled').waitFor();await tap('#resume');
 await page.reload();await ready();await openModes();await tap('#free-open');
 await page.waitForFunction(()=>document.activeElement.id==='keep-board');
 assert.equal(await page.locator('#replace-title').innerText(),'Start another Free Play board?');
 const challenge=(await snapshot()).attempt;
 await page.screenshot({path:out+'/u1-en-dialog.png'});
 await page.locator('#keep-board').tap();
 await page.waitForFunction(()=>!document.querySelector('#replace-dialog').open&&document.activeElement.id==='free-open');
 assert.deepEqual((await snapshot()).attempt,challenge);
 await page.screenshot({path:out+'/u1-en-cancel.png'});
 await tap('#free-open');await page.waitForFunction(()=>document.activeElement.id==='keep-board');
 await tap('#replace-board');await page.locator('#replace-dialog').waitFor({state:'hidden'});
 assert.equal((await snapshot()).attempt.freeTrack,'relax');
 assert.deepEqual((await snapshot()).attempt.placements,{});
 await page.screenshot({path:out+'/u1-en-confirm.png'});
 checks.push('U1: Russian and English cold starts, safe default focus, Escape and Keep restore trigger and tokens, confirmed replacement, failed write and explicit retry');
 const hell=releaseBoards.find(board=>board.bucket==='hell-short');
 const dense=await snapshot();
 dense.profile.campaignCursor=hell.campaignPosition-1;
 dense.meta.screen='play';dense.meta.activeSlot='campaign';delete dense.meta.inactive.campaign;dense.result=null;
 dense.attempt={...dense.attempt,id:'dense-v2-check',puzzleId:hell.puzzleId,mode:'campaign',placements:{},trayOrder:hell.tray.map((_,i)=>'t'+i),history:[],commandIds:[],boardRevision:0};
 delete dense.attempt.freeTrack;delete dense.attempt.freeIndex;
 await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),dense);await page.reload();await ready();
 for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});
   const measures=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,boardWidth:document.querySelector('.board-scroll').scrollWidth,minTarget:Math.min(...[...document.querySelectorAll('button[data-cell]')].map(el=>el.getBoundingClientRect().width))}));
   assert.ok(measures.pageWidth<=width);assert.ok(measures.minTarget>=48);
   geometry.push({screen:'v2 Hell fixture',viewport:[width,height],...measures});
   await page.screenshot({path:out+`/hell-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',source:process.env.GITHUB_SHA??'local',browser:browser.version(),day,checks,geometry,limits:'Headless browser; explicit long-progress fixtures; no Android/device/SDK claim'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,geometry},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),checks,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(done=>server.close(done));}
