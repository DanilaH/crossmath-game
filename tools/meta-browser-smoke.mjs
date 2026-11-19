import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('dist'),out=resolve('.test-output/meta-ui');await mkdir(out,{recursive:true});
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8'));
const answers=JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8'));
const routes=JSON.parse(await readFile('docs/spec/product/content_v09/routes.json','utf8'));
const epoch=Date.parse(routes.dailyEpoch),start=Date.parse('2026-11-18');
const day=Array.from({length:135},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10)).find(day=>{const id=routes.dailySequence[((Date.parse(day)-epoch)/86400000)%135],p=boards.find(p=>p.puzzleId===id);return p.difficulty==='easy'&&p.equations.length===4&&p.campaignPosition>15;});
assert.ok(day);
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
 const solve=async()=>{const save=await snapshot(),p=boards.find(p=>p.puzzleId===save.attempt.puzzleId),answer=answers[p.puzzleId].answer;for(const cell of p.cells.filter(c=>c.given===undefined)){const s=await snapshot();if(p.tray[Number(s.attempt.placements[cell.id]?.slice(1))]===answer[cell.id])continue;const used=new Set(Object.values(s.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));assert.notEqual(token,-1);await tap(`[data-token="t${token}"]`);await tap(`[data-cell="${cell.id}"]`);}assert.equal((await snapshot()).attempt.status,'won');};
 await page.goto(url);await ready();
 await tap('#home');assert.equal(await page.locator('#free-open').isDisabled(),true);assert.equal(await page.locator('#calendar-open').isDisabled(),true);await tap('#continue-game');
 for(let win=1;win<=5;win++){
  if(win>1)await tap('#next');await solve();const s=await snapshot();
  if([3,4].includes(win))assert.equal(s.profile.fragments,win-2);
  if(win===3){await tap('#home');assert.equal(await page.locator('#free-open').isEnabled(),true);await tap('#free-open');const free=await snapshot();assert.equal(free.attempt.mode,'free');assert.equal(free.meta.inactive.campaign.attempt.status,'won');await tap('#home');await tap('#continue-game');assert.equal((await snapshot()).attempt.id,free.attempt.id);await tap('#home');await tap('#campaign-open');assert.equal((await snapshot()).attempt.mode,'campaign');await solve();win=4;assert.equal((await snapshot()).profile.fragments,2);}
 }
 const fifth=await snapshot();assert.equal(fifth.meta.quests.slots.every(s=>s.progress===0&&!s.paid),true);checks.push('fresh profile: unlocks at 3/5; fifth win creates missions without retroactive credit; Free/campaign slots restore');
 await tap('#home');await page.screenshot({path:out+'/home-five.png',fullPage:true});await tap('#calendar-open');assert.equal(await page.locator('.date-card:disabled').count(),7);await tap(`[data-day="${day}"]`);assert.match(await page.locator('#lives').innerText(),/3\s*\/\s*3/);await solve();
 const daily=await snapshot();assert.equal(daily.result.coins,100);assert.equal(daily.result.dailyCoins,30);assert.equal(daily.result.taskCoins,30);assert.equal(daily.result.setCoins,30);assert.equal(daily.profile.fragments,3);await page.screenshot({path:out+'/daily-100.png',fullPage:true});
 await page.reload();await ready();assert.deepEqual((await snapshot()).result,daily.result);assert.equal((await snapshot()).profile.coins,daily.profile.coins);await tap('#next');assert.match(await page.locator(`[data-day="${day}"]`).innerText(),/Решено/);checks.push('actual UI Daily: +100 breakdown, three lives, dated completion, cold restore pays once');
 await tap('#calendar-back');await tap('#campaign-open');await solve();await tap('#next');await solve();assert.equal((await snapshot()).profile.fragments,4);assert.equal((await snapshot()).result.cardCoins,20);assert.match(await page.locator('#result-detail').innerText(),/Прибор собран/);
 await tap('#home');await tap('#album-open');const first=page.locator('[data-card="abacus"]');assert.match(await first.innerText(),/4 \/ 4/);assert.equal(await first.locator('svg g[display="none"]').count(),0);await first.tap();await page.locator('#card-dialog[open]').waitFor();assert.equal(await page.locator('#card-body .earned').count(),4);await page.keyboard.press('Escape');await page.locator('#card-dialog').waitFor({state:'hidden'});checks.push('eighth distinct win: +20 card receipt, four visible abacus layers and accessible part list');
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){
  await page.setViewportSize({width,height});const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...[...document.querySelectorAll('#hub button')].map(e=>e.getBoundingClientRect().height))}));assert.equal(data.overflow,false);assert.ok(data.minTarget>=48);geometry.push({screen:'album',viewport:[width,height],...data});await page.screenshot({path:out+`/album-${width}.png`,fullPage:true});
 }
 await tap('#album-back');await tap('#rank');await page.locator('#card-dialog[open]').waitFor();assert.match(await page.locator('#card-body').innerText(),/XP/);await tap('#close-card');
 const before=await snapshot();await page.clock.setSystemTime(new Date(new Date(day+'T12:00:00Z').getTime()+3*86400000));await page.reload();await ready();const after=await snapshot();assert.equal(after.meta.issuedDays,before.meta.issuedDays+1);assert.equal(after.meta.completedDates.includes(day),true);await tap('#calendar-open');assert.equal(await page.locator(`[data-day="${day}"]`).isEnabled(),true);assert.equal(await page.locator('.date-card:disabled').count(),7);await page.screenshot({path:out+'/calendar.png',fullPage:true});checks.push('fixed profile zone, three missed days advance one issuance, past/completed/future dates remain distinct');
 // Explicit boundary fixture, not claimed as 228 UI-played wins. Reward arithmetic is covered by whole-bank tests.
 const fixture=await snapshot();fixture.profile.solvedIds=boards.slice(0,228).map(p=>p.puzzleId);fixture.profile.fragments=48;fixture.profile.paidCardIds=JSON.parse(await readFile('docs/spec/product/meta_v08/config.json','utf8')).cards.map(c=>c.id);fixture.meta.screen='album';fixture.meta.quests=null;
 await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal(await page.locator('.collection-card').count(),12);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);assert.match(await page.locator('.hub-heading').innerText(),/Мастерская собрана/);await page.screenshot({path:out+'/album-complete-fixture.png',fullPage:true});
 fixture.profile.solvedIds.push(boards[228].puzzleId);await page.evaluate(save=>localStorage.setItem('crossmath.save.v1',JSON.stringify(save)),fixture);await page.reload();await ready();assert.equal((await snapshot()).profile.fragments,48);assert.equal(await page.locator('.collection-card svg g[display="none"]').count(),0);checks.push('labelled 228/229 fixtures: complete 12-card album stays available, no 49th fragment');
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',source:process.env.GITHUB_SHA??'local',browser:browser.version(),day,checks,geometry,limits:'Headless browser; explicit long-progress fixtures; no Android/device/SDK claim'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,geometry},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),checks,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(done=>server.close(done));}
