import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {createServer as viteServer} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='.test-output/release29-ui';await mkdir(out,{recursive:true});
const banks=JSON.parse(await readFile('src/content/additionalBoards.json','utf8'));
const map=JSON.parse(await readFile('docs/acceptance/release29/content-map.json','utf8'));
const rawAnswers=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));
const answers=Object.fromEntries(map.map(m=>[m.product,rawAnswers[m.source].answer]));
const stamp=JSON.parse(await readFile('dist/native-build.json','utf8'));assert.equal(stamp.releaseCandidate,true);assert.equal(stamp.contentLab,false);assert.equal(stamp.leagueEnabled,true);assert.equal(stamp.winBonusCandidate,false);
const modules=await viteServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
const {createSave,decodeSave}=await modules.ssrLoadModule('/src/app/model.ts'),{createAttempt}=await modules.ssrLoadModule('/src/core/engine.ts');
const now='2026-11-28T12:00:00Z';
function seed(p,language,theme){
 const s=createSave('release29-proof',now,'UTC','initial');s.settings.language=language;s.settings.theme=theme;s.profile.coins=1234;
 s.attempt=createAttempt(p,'touch-'+p.puzzleId,p.bucket==='daily'?'daily':'free');s.meta.screen='play';s.meta.activeSlot=p.bucket==='daily'?'daily:2026-11-28':'free';
 if(p.bucket==='daily'){s.attempt.dayKey='2026-11-28';s.meta.assignments['2026-11-28']={puzzleId:p.puzzleId,calendarVersion:'calendar-v3'};}
 else{s.attempt.freeTrack='relax';s.attempt.freeIndex=0;s.attempt.freeAssignmentVersion=1;s.meta.freeProgress={relax:0,challenge:0};}
 return decodeSave(s);
}
const root=resolve('dist'),mime={'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(file===root||file.startsWith(root+'/'));res.setHeader('Content-Type',mime[extname(file)]??'text/html');res.end(await readFile(file===root?root+'/index.html':file));}catch{res.writeHead(404).end();}});
let browser;const rows=[],errors=[];
const current=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const ready=p=>p.locator('html[data-state=ready]').waitFor();
async function measure(page,name){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const data=await page.evaluate(()=>{
  const board=document.querySelector('#board'),port=board.parentElement,b=board.getBoundingClientRect(),v=port.getBoundingClientRect();
  const cells=[...board.querySelectorAll('[data-cell]')],numbers=[...board.querySelectorAll('.given,.placed .tile')];
  return {font:getComputedStyle(document.documentElement).fontSize,width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,
   fits:b.left>=v.left-1&&b.right<=v.right+1&&b.top>=v.top-1&&b.bottom<=v.bottom+1,
   numbersFit:numbers.every(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().width<=n.clientWidth+1;}),
   allCellsHit:cells.every(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),
   controls:['#help','#pause','#sort'].every(id=>{const r=document.querySelector(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),
   labs:document.querySelectorAll('#content-lab-open,#extra-fields,[data-debug-panel]').length};
 });
 assert.equal(data.font,'16px');for(const key of ['fits','numbersFit','allCellsHit','controls'])assert.equal(data[key],true,name+': '+key+' '+JSON.stringify(data));assert.equal(data.labs,0);assert.ok(data.pageWidth<=data.width+1);rows.push({name,...data});
}
async function touch(page,selector){
 const l=page.locator(selector);
 const hit=()=>l.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
 if(selector.startsWith('[data-token'))for(let i=0;i<12&&!await hit();i++){
  const above=await l.evaluate(n=>n.getBoundingClientRect().top<document.querySelector('#tray').getBoundingClientRect().top);
  const arrow=page.locator(above?'#tray-prev':'#tray-next');assert.equal(await arrow.isEnabled(),true,'Tray arrow reaches '+selector);
  await arrow.tap();await page.waitForTimeout(180);
 }
 assert.ok(await hit(),selector);await l.tap();await page.locator('#help:enabled').waitFor();
}

try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;browser=await chromium.launch();
 for(const theme of ['light','dark']){
  const ctx=await browser.newContext({viewport:{width:320,height:480},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(now));
  await page.goto(url);await ready(page);
  for(const p of banks){
   const s=seed(p,theme==='light'?'ru':'en',theme);await page.evaluate(s=>localStorage.setItem('crossmath.save.v1',JSON.stringify(s)),s);await page.reload();await ready(page);await measure(page,p.puzzleId+'-'+theme);
   const cell=p.cells.find(c=>c.given===undefined),i=p.tray.findIndex(v=>v===answers[p.puzzleId][cell.id]);
   await touch(page,`[data-token="t${i}"]`);await touch(page,`#board [data-cell="${cell.id}"]`);const after=await current(page);assert.equal(after.attempt.placements[cell.id],'t'+i);assert.equal(after.profile.coins,1234);
   if(p===banks[0]||p===banks[40]){await page.screenshot({path:out+'/'+p.puzzleId+'-'+theme+'.png'});await page.reload();await ready(page);const restored=await current(page);assert.deepEqual(restored.attempt.placements,after.attempt.placements);assert.equal(restored.profile.coins,after.profile.coins);}
  }await ctx.close();
 }
 const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});const page=await ctx.newPage();await page.clock.setFixedTime(new Date(fixtures['after-15'].meta.effectiveDay+'T12:00:00Z'));
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await ready(page);
  for(const screen of ['home','modes','profile']){const s=structuredClone(fixtures['after-15']);s.settings.language=language;s.settings.theme=theme;s.meta.screen=screen;await page.evaluate(s=>localStorage.setItem('crossmath.save.v1',JSON.stringify(s)),s);await page.reload();await ready(page);
   assert.equal(await page.locator('#content-lab-open,#extra-fields').count(),0);assert.equal(await page.locator('#root-tabs button').count(),4);
   assert.equal(await page.locator('body').evaluate(()=>getComputedStyle(document.documentElement).fontSize),'16px');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
   const name=`${width}x${height}-${language}-${theme}-${screen}`;await page.screenshot({path:out+'/'+name+'.png'});rows.push({name,labs:0,tabs:4});
  }await ctx.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',views:rows.length,rows,errors,provenance:'Actual packaged RC UI; labelled valid synthetic old profiles and integrated-board snapshots; physical Android/SDK NOT RUN'},null,2));console.log('RELEASE-01 browser PASS · '+rows.length+' views, 180 touch placements, 4 cold restores');
}finally{await browser?.close();server.close();await modules.close();}
