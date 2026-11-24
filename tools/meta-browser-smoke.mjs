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
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
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
  await tap('#tab-modes');
  await page.locator('#hub[data-screen=modes]').waitFor();
 };
 const solve=async()=>{const save=await snapshot(),p=boards.find(p=>p.puzzleId===save.attempt.puzzleId),answer=answers[p.puzzleId].answer;for(const cell of p.cells.filter(c=>c.given===undefined)){const s=await snapshot();if(p.tray[Number(s.attempt.placements[cell.id]?.slice(1))]===answer[cell.id])continue;const used=new Set(Object.values(s.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));assert.notEqual(token,-1);await tap(`[data-token="t${token}"]`);await tap(`[data-cell="${cell.id}"]`);}assert.equal((await snapshot()).attempt.status,'won');};
 await page.goto(url);await ready();
 await tap('#home');
 assert.equal(await page.locator('.resume-card h1').innerText(),'Поле 1');
 assert.equal(await page.locator('#hub .primary').count(),1);
 assert.equal(await page.locator('#new-game').isEnabled(),true);
 await tap('#tab-calendar');
 assert.equal(await page.locator('#daily-play').isDisabled(),true);
 await openModes();
 assert.equal(await page.locator('#free-open').isDisabled(),true);
 await tap('#tab-home');
 const beforeSheet=await snapshot();
 await tap('#new-game');
 await page.locator('#game-choice[open]').waitFor();
 assert.equal(await page.locator('#game-choice-options button').count(),1);
 await page.keyboard.press('Escape');
 await page.locator('#game-choice').waitFor({state:'hidden'});
 assert.deepEqual(await snapshot(),beforeSheet);
 await page.waitForFunction(()=>document.activeElement?.id==='new-game');
 await tap('#continue-game');
 for(let win=1;win<=5;win++){
  if(win>1)await tap('#next');await solve();const s=await snapshot();
  if([3,4].includes(win))assert.equal(s.profile.fragments,win-2);
  if(win===3){
   const frame=page.locator('#instrument-reward');
   assert.equal(await frame.innerText(),'Рамка счётов · 1/4');
   assert.equal(await page.locator('#result-unlock').innerText(),'Попробовать спокойную игру');
   await page.locator('#workshop-award [data-part="1"]:visible').waitFor();
   assert.equal(await page.locator('#next').isEnabled(),true);
   for (const [width,height] of [[320,568],[390,844]]) {
    await page.setViewportSize({width,height});
    const box=await frame.boundingBox();
    assert.ok(box && box.height>=48 && box.y>=0 && box.y+box.height<=height);
   }
   await page.setViewportSize({width:320,height:568});
   const milestone = await page.evaluate(() => {
    const bounds = id => document.getElementById(id).getBoundingClientRect();
    const next = document.getElementById('next'), button = next.getBoundingClientRect();
    return {partBottom:bounds('instrument-reward').bottom, progressBottom:bounds('workshop-award').bottom,
     labelWidth:bounds('result-detail').width, buttonBottom:button.bottom,
     hit:next.contains(document.elementFromPoint(button.x + button.width / 2, button.y + button.height / 2))};
   });
   assert.ok(milestone.hit && milestone.buttonBottom <= 568 && milestone.labelWidth > 200
    && milestone.partBottom <= 568 && milestone.partBottom > milestone.progressBottom, JSON.stringify(milestone));
   await page.setViewportSize({width:390,height:844});
   await frame.tap();
   await page.locator('#card-dialog[open]').waitFor();
   assert.equal(await page.locator('#card-title').innerText(),'Счёты');
   assert.match(await page.locator('#card-body .next-part').innerText(),/1\/4/);
   assert.equal(await page.locator('#card-body .earned').count(),1);
   await tap('#close-card');
   await page.waitForFunction(()=>document.activeElement?.id==='instrument-reward');
   await page.reload();await ready();
   assert.equal(await frame.isVisible(),true);
   assert.equal(await page.locator('#instrument-reward.arrived').count(),0);
   const restored=await snapshot();
   assert.deepEqual(restored.result,s.result);
   assert.equal(restored.profile.fragments,1);
   assert.equal(restored.profile.coins,s.profile.coins);
   await tap('#result-details summary');
   assert.match(await page.locator('#reward-breakdown').innerText(),/Новый режим · Спокойная игра/);
   await tap('#result-details summary');
   checks.push('frame in tray, direct abacus inspection, same result on close and cold reload; no duplicate grant');
   await tap('#home');await openModes();assert.equal(await page.locator('#free-open').isEnabled(),true);await tap('#free-open');const free=await snapshot();assert.equal(free.attempt.mode,'free');assert.equal(free.meta.inactive.campaign.attempt.status,'won');await tap('#home');await page.reload();await ready();await tap('#continue-game');assert.equal((await snapshot()).attempt.id,free.attempt.id);await tap('#home');await openModes();await tap('#campaign-continue');assert.equal((await snapshot()).attempt.mode,'campaign');await solve();win=4;assert.equal((await snapshot()).profile.fragments,2);}
 }
 assert.equal(await page.locator('#result-unlock').innerText(),'Открыть задачу дня');
 const fifth=await snapshot();assert.equal(fifth.meta.quests.slots.every(s=>s.progress===0&&!s.paid),true);checks.push('fresh profile: unlocks at 3/5; fifth win creates missions without retroactive credit; Free/campaign slots restore');
 await tap('#home');
 assert.equal(await page.locator('.resume-card h1').innerText(),'Поле 6');
 assert.equal(await page.locator('#game-choice').isHidden(),true);
 for (const [width,height] of [[320,480],[320,568],[360,640],[390,844]]) {
  await page.setViewportSize({width,height});
  await page.evaluate(async () => {
   await document.fonts.ready;
   window.scrollTo(0,0);
  });
  const data=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   const tabTop=rect('#root-tabs').top;
   const panels=['.resume-card','#daily-primary','#album-open'].map(rect);
   const controls=['#campaign-primary','#new-game','#daily-primary','#album-open','#tab-modes'].map(rect);
   return {panelBottoms:panels.map(r=>r.bottom),tabTop,minTarget:Math.min(...controls.map(r=>Math.min(r.width,r.height))),
     firstViewport:panels.every(r=>r.top>=0&&r.bottom<=tabTop&&r.left>=0&&r.right<=innerWidth),
     documentHeight:document.documentElement.scrollHeight,scrollY};
  });
  assert.ok(data.firstViewport, JSON.stringify(data));
  assert.equal(data.documentHeight,height);
  assert.equal(data.scrollY,0);
  assert.ok(data.minTarget>=48);
  geometry.push({screen:'home',viewport:[width,height],...data});
  await page.screenshot({path:out+`/home-five-${width}x${height}.png`});
 }
 await openModes();
 await page.screenshot({path:out+'/modes-five.png'});
 await tap('#tab-home');
 await tap('#daily-primary');
 await tap('#daily-play');
 assert.equal((await snapshot()).attempt.dayKey,day);
 assert.match(await page.locator('#lives').innerText(),/3\s*\/\s*3/);
 await solve();
 checks.push('one campaign CTA after five wins; direct Daily opens today; home actions fit on 320×568 and 390×844');
 const daily=await snapshot();assert.equal(daily.result.coins,105);assert.equal(daily.result.baseCoins,15);assert.equal(boards.find(p=>p.puzzleId===daily.attempt.puzzleId).bucket,'daily');assert.equal(daily.result.dailyCoins,30);assert.equal(daily.result.taskCoins,30);assert.equal(daily.result.setCoins,30);assert.equal(daily.profile.fragments,3);await page.screenshot({path:out+'/daily-v2.png',fullPage:true});
 await page.reload();await ready();assert.deepEqual((await snapshot()).result,daily.result);assert.equal((await snapshot()).profile.coins,daily.profile.coins);await tap('#next');assert.match(await page.locator(`.month-day[data-day="${day}"]`).getAttribute('aria-label'),/Решено/);assert.equal(await page.locator('#hub [data-quest]:visible').count(),0);await tap('#daily-goals summary');assert.equal(await page.locator('#hub [data-quest]:visible').count(),3);assert.equal(await page.locator('.month-day[data-state=future]:enabled').count(),0);
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>scrollTo(0,0));
 const ticket=await page.locator('.daily-selection').boundingBox();
 const goals=await page.locator('.daily-month').boundingBox();
 assert.ok(ticket && goals && ticket.y+ticket.height<goals.y && ticket.y+ticket.height<=568);
 await page.setViewportSize({width:390,height:844});checks.push('actual UI Daily v2: +105 breakdown, three lives, dated completion, cold restore pays once');
 await tap('#tab-home');await tap('#campaign-primary');await solve();await tap('#next');await solve();assert.equal((await snapshot()).profile.fragments,4);assert.equal((await snapshot()).result.cardCoins,20);assert.match(await page.locator('#instrument-reward').innerText(),/Счёты · собрано 4\/4/);
 assert.equal(await page.locator('#instrument-reward[data-complete="true"] .fitted-now[data-part="4"]').count(),1);
 await tap('#instrument-reward');await page.locator('#card-dialog[open]').waitFor();
 assert.equal(await page.locator('#card-body .earned').count(),4);
 await tap('#close-card');
 await tap('#home');await tap('#album-open');
 assert.match(await page.locator('#workbench').innerText(),/Счётные палочки/);
 assert.equal(await page.locator('#workbench .unearned-part[data-part="1"]').count(),1);
 assert.equal(await page.locator('[data-card="weights"][data-assembly="pending"] .unearned-part').count(),4);
 await tap('#workbench');await page.locator('#card-dialog[open]').waitFor();
 assert.equal(await page.locator('#card-title').innerText(),'Счётные палочки');
 await tap('#close-card');await page.waitForFunction(()=>document.activeElement?.id==='workbench');
 const first=page.locator('[data-card="abacus"]');assert.match(await first.innerText(),/4 \/ 4/);assert.equal(await first.locator('svg g[display="none"]').count(),0);await first.tap();await page.locator('#card-dialog[open]').waitFor();assert.equal(await page.locator('#card-body .earned').count(),4);await page.keyboard.press('Escape');await page.locator('#card-dialog').waitFor({state:'hidden'});checks.push('eighth distinct win: +20 card receipt, four visible abacus layers and accessible part list');
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){
  await page.setViewportSize({width,height});const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...[...document.querySelectorAll('#hub button')].map(e=>e.getBoundingClientRect().height))}));assert.equal(data.overflow,false);assert.ok(data.minTarget>=48);geometry.push({screen:'album',viewport:[width,height],...data});await page.screenshot({path:out+`/album-${width}.png`,fullPage:true});
 }
 await tap('#home');await tap('#tab-profile');await tap('#profile-rank');await page.locator('#card-dialog[open]').waitFor();assert.match(await page.locator('#card-body').innerText(),/XP/);await tap('#close-card');await tap('#tab-home');
 await page.setViewportSize({width:320,height:568});
 const expectWidth = () => page.evaluate(() => ({
  layout:document.documentElement.scrollWidth, visual:Math.round(visualViewport.width), scale:visualViewport.scale,
 }));
 const visibleTap = async selector => {
  const point = await page.locator(selector).evaluate(el => {
   const box = el.getBoundingClientRect();
   const x = (box.left + box.right) / 2;
   const y = (Math.max(0, box.top) + Math.min(visualViewport.height, box.bottom)) / 2;
   return {x,y, hit:el.contains(document.elementFromPoint(x,y))};
  });
  assert.ok(point.hit, selector);
  await page.touchscreen.tap(point.x,point.y);
  await page.locator('#home:enabled').waitFor();
 };
 await visibleTap('#album-open');
 assert.deepEqual(await expectWidth(),{layout:320,visual:320,scale:1});
 await visibleTap('#home');
 await page.locator('#hub[data-screen=home]').waitFor();
 assert.deepEqual(await expectWidth(),{layout:320,visual:320,scale:1});
 assert.equal(await page.locator('#tab-home[aria-current=page]').isVisible(),true);
 const modesBox = await page.locator('#tab-modes').boundingBox();
 assert.ok(modesBox && modesBox.y + modesBox.height <= 568 && modesBox.height >= 48);
 await visibleTap('#tab-modes');
 await page.locator('#hub[data-screen=modes]').waitFor();
 assert.equal(await page.locator('#game-choice').isHidden(),true);
 await page.locator('#free-open').evaluate(node=>node.scrollIntoView({block:'center'}));
 await visibleTap('#free-open');
 await page.waitForFunction(() => document.querySelector('#hub').hidden);
 assert.equal((await snapshot()).attempt.freeTrack,'relax');
 await tap('#home');
 await page.reload(); await ready();
 await page.setViewportSize({width:390,height:844});
 await openModes();
 await tap('.campaign-history summary');
 assert.equal(await page.getByRole('button',{name:'Открыть поле 1',exact:true}).isVisible(),true);
 assert.equal(await page.locator('#last-result').isVisible(),true);
 await tap('#tab-home');
 checks.push('320×568: direct touches open Workshop, return to Home and open Relax from Modes; campaign owns its history and receipt');

 const durationFixture = await snapshot();
 for (const [seconds, expected] of [[0,'0 с'],[5.64890000000596,'5 с'],[59.99,'59 с'],[60.01,'1 мин 0 с'],[3600,'60 мин 0 с']]) {
  durationFixture.career.modes.campaign.seconds = seconds;
  await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),durationFixture);
  await page.reload(); await ready(); await tap('#tab-profile');await tap('#profile-statistics summary');
  const row = page.locator('[data-stats=campaign] .stat-rows > div').filter({hasText:'Активное время'});
  assert.equal(await row.locator('dd').innerText(),expected);
  assert.equal((await snapshot()).career.modes.campaign.seconds,seconds);
 }
 await tap('#tab-home');
 checks.push('profile: active duration floors total seconds for display and leaves saved precision intact');
 const before=await snapshot();await page.clock.setSystemTime(new Date(new Date(day+'T12:00:00Z').getTime()+3*86400000));await page.reload();await ready();const after=await snapshot();assert.equal(after.meta.issuedDays,before.meta.issuedDays+1);assert.equal(after.meta.completedDates.includes(day),true);await tap('#tab-calendar');assert.equal(await page.locator(`.month-day[data-day="${day}"]`).isEnabled(),true);assert.equal(await page.locator('.month-day[data-state=future]:enabled').count(),0);await page.screenshot({path:out+'/calendar.png',fullPage:true});checks.push('fixed profile zone, three missed days advance one issuance, past/completed/future dates remain distinct');
 // Explicit boundary fixture, not claimed as 228 UI-played wins. Reward arithmetic is covered by whole-bank tests.
 const fixture=await snapshot();fixture.profile.solvedIds=[...new Set([...fixture.profile.solvedIds,...boards.map(p=>p.puzzleId)])].slice(0,228);fixture.profile.fragments=48;fixture.profile.paidCardIds=JSON.parse(await readFile('docs/spec/product/meta_v08/config.json','utf8')).cards.map(c=>c.id);fixture.meta.screen='album';fixture.meta.quests=null;
 await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal(await page.locator('.collection-card').count(),12);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);assert.match(await page.locator('.collection-summary').innerText(),/Мастерская собрана/);await page.screenshot({path:out+'/album-complete-fixture.png',fullPage:true});
 fixture.profile.solvedIds.push(boards.find(board=>!fixture.profile.solvedIds.includes(board.puzzleId)).puzzleId);await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal((await snapshot()).profile.fragments,48);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);checks.push('labelled 228/229 fixtures: complete 12-card album stays available, no 49th fragment');
 // The labelled 229-win fixture above gives access to both Free tracks.
 await page.setViewportSize({width:390,height:844});
 await tap('#home');await openModes();await tap('#free-open');
 const free = (await snapshot()).attempt;
 const editable = boards.find(board=>board.puzzleId===free.puzzleId).cells.find(cell=>cell.given===undefined);
 await tap('[data-token="t0"]');await tap(`[data-cell="${editable.id}"]`);await tap('#home');
 await page.reload();await ready();
 await openModes();await tap('#challenge-open');
 await page.locator('#replace-dialog[open]').waitFor();
 assert.equal(await page.locator('#game-choice').isHidden(),true);
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
 await tap('#home');await tap('#pause');
 assert.equal(await page.locator('#pause-title').innerText(),'Настройки');
 await page.selectOption('#language','en');await page.locator('#resume:enabled').waitFor();await tap('#resume');
 assert.equal((await snapshot()).attempt.userPaused,false);
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
 const hell=releaseBoards.find(board=>board.campaignPosition===147);
 const dense=await snapshot();
 dense.profile.campaignCursor=hell.campaignPosition-1;
 dense.meta.screen='play';dense.meta.activeSlot='campaign';delete dense.meta.inactive.campaign;dense.result=null;
 dense.attempt={...dense.attempt,id:'dense-v2-check',puzzleId:hell.puzzleId,mode:'campaign',placements:{},trayOrder:hell.tray.map((_,i)=>'t'+i),history:[],commandIds:[],boardRevision:0};
 delete dense.attempt.freeTrack;delete dense.attempt.freeIndex;delete dense.attempt.freeAssignmentVersion;
 await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),dense);await page.reload();await ready();
 assert.equal((await snapshot()).attempt.id,dense.attempt.id);
 for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const measures=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,boardWidth:document.querySelector('.board-scroll').scrollWidth,minTarget:Math.min(...[...document.querySelectorAll('button[data-cell]')].map(el=>el.getBoundingClientRect().width))}));
   assert.ok(measures.pageWidth<=width);assert.ok(measures.minTarget>=48);
   const tray=await page.locator('#tray').boundingBox();
   assert.ok(tray && tray.y+tray.height<=height);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),height);
   assert.equal(await page.locator('#tray-nav').isVisible(),width===320);
   geometry.push({screen:'v2 Hell fixture',viewport:[width,height],...measures});
   await page.screenshot({path:out+`/hell-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:320,height:568});
 await tap('#tray-next');
 const trayOffset=await page.locator('#tray').evaluate(e=>e.scrollTop);
 assert.ok(trayOffset>0);
 const chip=await page.locator('#tray').evaluate(e=>[...e.querySelectorAll('button')].find(chip=>{
   const port=e.getBoundingClientRect();
   const box=chip.getBoundingClientRect();
   return box.top>=port.top && box.bottom<=port.bottom;
 }).dataset.token);
 await tap(`[data-token="${chip}"]`);
 await page.locator('.board-scroll').evaluate(e=>e.scrollTo(e.scrollWidth,e.scrollHeight));
 assert.equal(await page.locator(`[data-token="${chip}"]`).getAttribute('aria-pressed'),'true');
 const destination=await page.locator('.board-scroll').evaluate(e=>[...e.querySelectorAll('button[data-cell]')].find(cell=>{
   const port=e.getBoundingClientRect();
   const box=cell.getBoundingClientRect();
   return box.left>=port.left && box.top>=port.top && box.right<=port.right && box.bottom<=port.bottom;
 }).dataset.cell);
 await tap(`[data-cell="${destination}"]`);
 assert.equal((await snapshot()).attempt.placements[destination],chip);
 assert.equal(await page.locator('#tray').evaluate(e=>e.scrollTop),trayOffset);
 checks.push('field 147: board scroll stays inside the play area, all 28 numbers on tall screen, tray paging + pan preserves token selection and order');
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',source:process.env.GITHUB_SHA??'local',browser:browser.version(),day,checks,geometry,limits:'Headless browser; explicit long-progress fixtures; no Android/device/SDK claim'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,geometry},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),checks,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(done=>server.close(done));}
