import {chromium} from '@playwright/test';
import {createServer as viteServer} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {serve,episode,save,ready,tap} from './qa/rc30-harness.mjs';
const rcStamp=JSON.parse(await readFile('dist/native-build.json','utf8'));assert.equal(rcStamp.releaseCandidate,true);assert.equal(rcStamp.freeIssuancePolicy,'d4-v2');assert.equal(rcStamp.contentLab,false);
const out='.test-output/rc30-banner';await mkdir(out,{recursive:true});
const banks=JSON.parse(await readFile('src/content/additionalBoards.json','utf8'));
const map=JSON.parse(await readFile('docs/acceptance/release29/content-map.json','utf8'));
const raw=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));
const answers=Object.fromEntries(map.map(m=>[m.product,raw[m.source].answer]));
const modules=await viteServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
const {createSave,decodeSave}=await modules.ssrLoadModule('/src/app/model.ts'),{createAttempt}=await modules.ssrLoadModule('/src/core/engine.ts');
function seed(p,language,theme){
 const s=createSave('rc30-banner','2026-11-28T12:00:00Z','UTC','initial');s.settings={...s.settings,language,theme};s.profile.coins=1234;
 s.attempt=createAttempt(p,'touch-'+p.puzzleId,p.bucket==='daily'?'daily':'free');s.meta.screen='play';s.meta.activeSlot=p.bucket==='daily'?'daily:2026-11-28':'free';
 if(p.bucket==='daily'){s.attempt.dayKey='2026-11-28';s.meta.assignments['2026-11-28']={puzzleId:p.puzzleId,calendarVersion:'calendar-v3'};}
 else{s.attempt.freeTrack='relax';s.attempt.freeIndex=0;s.attempt.freeAssignmentVersion=1;s.meta.freeProgress={relax:0,challenge:0};}
 return decodeSave(s);
}
async function measure(page){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const data=await page.evaluate(()=>{
  const board=document.querySelector('#board'),port=board.parentElement,b=board.getBoundingClientRect(),v=port.getBoundingClientRect(),rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
  const numbers=[...board.querySelectorAll('.given,.placed .tile')];
  return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize,
   board:rect(board),port:rect(port),tray:rect(document.querySelector('#traybox')),tools:rect(document.querySelector('.tools')),
   fits:b.left>=v.left-1&&b.right<=v.right+1&&b.top>=v.top-1&&b.bottom<=v.bottom+1,
   numbersFit:numbers.every(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().width<=n.clientWidth+1;}),
   cellsHit:[...board.querySelectorAll('[data-cell]')].every(n=>{const r=n.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),
   controls:['#help','#pause','#sort','#undo'].every(id=>{const r=document.querySelector(id).getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight+1;})};
 });
 if(!data.fits||!data.cellsHit){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({puzzleId:(await save(page)).attempt.puzzleId,...data},null,2));}
 assert.equal(data.font,'16px');for(const k of ['fits','numbersFit','cellsHit','controls'])assert.ok(data[k],k+': '+JSON.stringify(data));assert.ok(data.pageWidth<=321);return data;
}
const host=await serve(),browser=await chromium.launch(),rows=[],errors=[];
try{
 const tuples=[480,568].flatMap(height=>['ru','en'].flatMap(language=>['light','dark'].map(theme=>({height,language,theme}))));
 async function runTuple({height,language,theme}){
  const {page,context}=await episode(browser,host.url,seed(banks[0],language,theme),{height,banner:true});
  page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);
  for(const p of banks){

   await page.evaluate(s=>localStorage.setItem('crossmath.save.v1',JSON.stringify(s)),seed(p,language,theme));await page.reload();await ready(page);
   await page.waitForFunction(h=>innerHeight===h,height-50);const geometry=await measure(page);
   const cell=p.cells.find(c=>c.given===undefined),i=p.tray.findIndex(v=>v===answers[p.puzzleId][cell.id]),token=`[data-token="t${i}"]`,target=`#board [data-cell="${cell.id}"]`;
   // Reach even the last tray item with the player's paging arrows, then return to the chosen tile.
   await tap(page,`[data-token="t${p.tray.length-1}"]`);if(i!==p.tray.length-1)await tap(page,token);await tap(page,target);await page.locator('#undo:enabled').waitFor();
   assert.equal((await save(page)).attempt.placements[cell.id],'t'+i);await tap(page,'#undo');await page.locator('#help:enabled').waitFor();
   assert.equal((await save(page)).attempt.placements[cell.id],undefined);
   await tap(page,token);const a=await page.locator(token).boundingBox(),b=await page.locator(target).boundingBox(),from={x:a.x+a.width/2,y:a.y+a.height/2},to={x:b.x+b.width/2,y:b.y+b.height/2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   await page.waitForTimeout(40);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:(from.x+to.x)/2,y:(from.y+to.y)/2}]});
   await page.waitForTimeout(40);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#undo:enabled').waitFor();
   const played=await save(page);assert.equal(played.attempt.placements[cell.id],'t'+i);
   await page.waitForTimeout(350);await tap(page,'#pause');await page.waitForFunction(h=>innerHeight===h,height).catch(async e=>{await page.screenshot({path:out+'/pause-failure.png'});console.error(p.puzzleId);console.error(JSON.stringify(await page.evaluate(()=>({events:window.rc30.events,height:innerHeight,pause:document.querySelector('#pause-dialog').open,journal:window.rc30.journal(),paused:JSON.parse(localStorage.getItem('crossmath.save.v1')).attempt.userPaused})),null,2));throw e;});await tap(page,'#resume');await page.waitForFunction(h=>innerHeight===h,height-50);
   assert.deepEqual((await save(page)).attempt.placements,played.attempt.placements);assert.equal((await save(page)).profile.coins,1234);
   await measure(page);
   if(p===banks[0]||p===banks[40]||p===banks.at(-1)){
    await page.screenshot({path:`${out}/${p.puzzleId}-${height}-${language}-${theme}.png`});await page.reload();await ready(page);await page.waitForFunction(h=>innerHeight===h,height-50);
    assert.deepEqual((await save(page)).attempt.placements,played.attempt.placements);
   }
   rows.push({puzzleId:p.puzzleId,fullHeight:height,language,theme,geometry,tap:true,drag:true,undo:true,lastTrayItem:true,bannerHideShowRetained:true});
  }
  await context.close();console.log(`RC-02 ${height} ${language} ${theme}: 90 fields PASS`);
 }
 for(let i=0;i<tuples.length;i+=4)await Promise.all(tuples.slice(i,i+4).map(runTuple));
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',cases:rows.length,rows,errors,scope:'All 90 integrated fields, 50px scripted native sibling reservation; viewport430/518. Actual UI + touch/drag. NOT rendered SDK banner or device proof.'},null,2));
}finally{await browser.close();host.close();await modules.close();}
