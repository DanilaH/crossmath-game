import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const currentVersion=JSON.parse(await readFile('android-project.json','utf8'));
const baseline=resolve(process.env.RELEASE29_BASELINE??'../baseline526');
const oldStamp=JSON.parse(await readFile(baseline+'/dist/native-build.json','utf8'));assert.equal(oldStamp.freeIssuancePolicy,'legacy');assert.equal(oldStamp.leagueLab,false);
const {fixtures}=JSON.parse(await readFile(baseline+'/.test-output/meta18/fixtures.json','utf8'));
let root=baseline+'/dist';const rc=resolve('dist'),out='.test-output/release29-update';await mkdir(out,{recursive:true});
const boards=JSON.parse(await readFile(baseline+'/docs/spec/product/content_v2/boards.json','utf8'));const answers=JSON.parse(await readFile(baseline+'/docs/spec/product/content_v2/author_solutions.json','utf8'));
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+'/'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'})[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
let browser;const checks=[];
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;browser=await chromium.launch();
 for(const fixture of ['after-15','history1100','maximum']){
  root=baseline+'/dist';const s=structuredClone(fixtures[fixture]);s.meta.screen='home';
  const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});await context.addInitScript(s=>{if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));},s);
  const page=await context.newPage();await page.clock.setFixedTime(new Date(s.meta.effectiveDay+'T12:00:00Z'));const ready=()=>page.locator('html[data-state=ready]').waitFor(),save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
  const tap=async id=>{await page.locator(id).tap();await page.locator('#home:enabled').waitFor();};
  await page.goto(url);await ready();
  if(fixture==='after-15'){
   await tap('#new-game');await tap('#choice-relax');await page.locator('#help:enabled').waitFor();let before=await save(),p=boards.find(p=>p.puzzleId===before.attempt.puzzleId),cell=p.cells.find(c=>c.given===undefined),i=p.tray.findIndex(v=>v===answers[p.puzzleId].answer[cell.id]);
   await tap(`[data-token="t${i}"]`);await tap(`#board [data-cell="${cell.id}"]`);
   await tap('#home');await tap('#tab-calendar');await tap('#daily-play');await page.locator('#help:enabled').waitFor();before=await save();p=boards.find(p=>p.puzzleId===before.attempt.puzzleId);cell=p.cells.find(c=>c.given===undefined);i=p.tray.findIndex(v=>v===answers[p.puzzleId].answer[cell.id]);
   const tile=page.locator(`[data-token="t${i}"]`);await tile.scrollIntoViewIfNeeded();await tile.tap();await tap(`#board [data-cell="${cell.id}"]`);
   await tap('#pause');await page.locator('#settings-options summary').tap();await page.locator('#language').selectOption('en');await page.locator('#resume:enabled').waitFor();await page.locator('#theme').check();await page.locator('#resume:enabled').waitFor();await tap('#resume');
  }
  const before=await save();root=rc;await page.reload();await ready();const after=await save();
  for(const key of ['profile','attempt','result','settings','career','ads'])assert.deepEqual(after[key],before[key],fixture+': '+key);
  for(const key of ['assignments','inactive','completedDates','freeProgress','freeIssuance','archivedDailyResults'])assert.deepEqual(after.meta[key],before.meta[key],fixture+': '+key);
  await page.screenshot({path:out+'/'+fixture+'-after-update.png'});checks.push({fixture,profile:true,chipsHistory:true,slots:true,calendarDates:after.meta.completedDates.length,theme:after.settings.theme,language:after.settings.language,oldVersion:'0.5.26/31 d91b5bf',newVersion:currentVersion.versionName+'/'+currentVersion.versionCode});await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',checks,scope:'Same-origin real old packaged web to new packaged web with retained storage and actual touches; NOT Android APK installation/signing acceptance'},null,2));console.log('RELEASE-01 web update PASS · active/parked touched boards, 1100 dates, maximum profile, RU/EN/theme');
}finally{await browser?.close();server.close();}
