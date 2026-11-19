import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('dist'),out=resolve('.test-output/ui');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403).end();return;}const file=path===root||req.url==='/'?root+'/index.html':path;res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
let browser;
const checks=[],errors=[];
try{
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 browser=await chromium.launch({headless:true,...(process.env.CROSSMATH_CHROMIUM_EXECUTABLE?{executablePath:process.env.CROSSMATH_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('html[data-state=ready]').waitFor();
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 const idle=async()=>{await page.waitForFunction(()=>!document.querySelector('#pause-dialog').open&&!document.querySelector('#help-dialog').open);await page.waitForFunction(()=>!document.querySelector('#help').disabled||!document.querySelector('#result').hidden);};
 const tap=async selector=>{await page.locator(selector).tap();};
 const geometry=[];
 const verifyViewport=async (field, won=false)=>{
  const initial=page.viewportSize();
  for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const selectors=won?['#next']:['#board','#tray','#sort','#help','#pause'];
   const bounds=await page.evaluate(selectors=>{
    const result=Object.fromEntries(selectors.map(selector=>{
     const rect=document.querySelector(selector).getBoundingClientRect();
     return [selector,{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}];
    }));
    const squares=new Map([...document.querySelectorAll('.board-square')].map(square=>[
     `${Number(square.style.gridColumn)-1},${Number(square.style.gridRow)-1}`,square.getBoundingClientRect()
    ]));
    const parts=new Map([...document.querySelectorAll('#board .part')].map(part=>[
     `${part.style.getPropertyValue('--x')},${part.style.getPropertyValue('--y')}`,part.getBoundingClientRect()
    ]));
    const connectedGrid=squares.size===parts.size&&[...parts].every(([key,part])=>{
     const square=squares.get(key);
     if(!square)return false;
     const [x,y]=key.split(',').map(Number),right=squares.get(`${x+1},${y}`),below=squares.get(`${x},${y+1}`);
     return Math.abs(square.left+square.width/2-part.left-part.width/2)<.2
      &&Math.abs(square.top+square.height/2-part.top-part.height/2)<.2
      &&(!right||Math.abs(square.right-right.left)<.1)
      &&(!below||Math.abs(square.bottom-below.top)<.1);
    });
    const board=document.querySelector('.board-surface').getBoundingClientRect();
    const dock=document.querySelector('#result').getBoundingClientRect();
    return {controls:result,documentHeight:document.documentElement.scrollHeight,connectedGrid,
     boardClear: dock.width === 0 || dock.top >= board.bottom};
   },selectors);
   if(won)assert.ok(bounds.boardClear,`field ${field} result obscures the solved board`);
   if(!won){
    assert.ok(bounds.documentHeight<=height+1,`field ${field} scrolls at ${width}×${height} (document ${bounds.documentHeight}px)`);
    assert.equal(bounds.connectedGrid,true,`field ${field} has gaps or misaligned grid squares at ${width}×${height}`);
   }
   for(const [selector,rect] of Object.entries(bounds.controls)){
    assert.ok(rect.top>=0&&rect.bottom<=height&&rect.left>=0&&rect.right<=width,`field ${field} ${selector} outside ${width}×${height} ${JSON.stringify(rect)}`);
   }
   geometry.push({field,won,viewport:[width,height],...bounds});
  }
  await page.setViewportSize(initial);
 };
 const place=async(token,cell)=>{await tap(`[data-token="${token}"]`);await tap(`[data-cell="${cell}"]`);await idle();};
 const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')), ...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
 const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')).slice(0,15).concat(JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8')).filter(p=>p.bucket!=='daily').sort((a,b)=>a.campaignPosition-b.campaignPosition));
 const solve=async()=>{const save=await snapshot(),p=boards.find(p=>p.puzzleId===save.attempt.puzzleId),answer=answers[p.puzzleId].answer;
  for(const cell of p.cells.filter(c=>c.given===undefined)){const current=await snapshot();if(p.tray[Number(current.attempt.placements[cell.id]?.slice(1))]===answer[cell.id])continue;const used=new Set(Object.values(current.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has('t'+i));assert.notEqual(token,-1);await place('t'+token,cell.id);}
  assert.equal((await snapshot()).attempt.status,'won');
 };
 // Campaign starts at 1. No diagnostic selector, imported profile or direct engine commands.
 assert.equal((await snapshot()).attempt.puzzleId,'cm-own-01-001');
 assert.ok(await page.locator('#board').evaluate(e=>parseFloat(e.style.getPropertyValue('--step')))>=40,'small boards must use available width instead of collapsing to intrinsic grid width');
 await verifyViewport(1);
 await page.locator('[data-cell="2"]').focus();await page.keyboard.press('Enter');await page.locator('[data-token="t0"]').focus();await page.keyboard.press('Enter');await page.locator('#result').waitFor({state:'visible'});
 await verifyViewport(1,true);
 checks.push('first field: cell-first keyboard interaction and durable result');
 const first=await snapshot();await page.reload();await page.locator('html[data-state=ready]').waitFor();assert.equal((await snapshot()).profile.coins,first.profile.coins);assert.deepEqual((await snapshot()).result,first.result);checks.push('cold reload preserves result and pays once');
 for(let position=1;position<25;position++){
  let save=await snapshot();assert.equal(save.attempt.status,'won');await tap('#next');await page.locator('#result').waitFor({state:'hidden'});await idle();
  const p=boards[position];assert.equal((await snapshot()).attempt.puzzleId,p.puzzleId);
  if(p.campaignPosition===7){
   await place('t0',0);await place('t2',1);const exact=(await snapshot()).attempt.placements;
   await tap('[data-cell="0"]');await tap('[data-cell="1"]');await idle();assert.deepEqual((await snapshot()).attempt.placements,{'0':'t2','1':'t0'});
   await tap('#undo');await idle();assert.deepEqual((await snapshot()).attempt.placements,exact);
   await page.reload();await page.locator('html[data-state=ready]').waitFor();assert.deepEqual((await snapshot()).attempt.placements,exact);checks.push('field 7: distinct fives, atomic swap, exact undo and cold restore');
  }
  if(p.campaignPosition===10){
   const before=await snapshot();await tap('#help');await tap('#explain');await tap('#apply-help');await idle();const helped=await snapshot();assert.equal(helped.profile.coins,before.profile.coins-60);assert.equal(helped.attempt.assisted,true);assert.equal(helped.attempt.hintsUsed,1);assert.match(await page.locator('#note').innerText(),/4, 5.*4, 6/);
   await tap('#undo');await idle();assert.equal((await snapshot()).profile.coins,helped.profile.coins);assert.equal((await snapshot()).attempt.assisted,true);checks.push('field 10: intersection explanation, one charge, undo preserves payment');
  }
  if(p.campaignPosition===12){
   await verifyViewport(12);
   await place('t0',0);await place('t1',1);await place('t2',3);assert.equal((await snapshot()).attempt.status,'playing');assert.match(await page.locator('#note').innerText(),/4 − 5 ≠ 2/);assert.equal(await page.locator('.op.right').count(),1);
   assert.equal(await page.locator('.op.invalid').innerText(),'≠');
   assert.equal(await page.locator('.equation-line[data-axis="column"][data-state="invalid"]').count(),1);
   assert.equal(await page.locator('.equation-line[data-axis="row"][data-state="valid"]').count(),1);
   assert.equal(await page.locator('.cell.invalid,.given.invalid').count(),0);
   await page.screenshot({path:out+'/field12-conflict.png',fullPage:true});
   await tap('[data-cell="0"]');await tap('[data-cell="1"]');await idle();assert.equal((await snapshot()).attempt.status,'won');await verifyViewport(12,true);await page.screenshot({path:out+'/field12-solved.png',fullPage:true});
   await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#restart');await tap('#restart-yes');await idle();
   await place('t2',0);await place('t0',1);
   assert.equal(await page.locator('#note').innerText(),'По горизонтали: 5 + 4 ≠ 11');
   await place('t1',3);
   assert.equal(await page.locator('.op.invalid').count(),2);
   assert.equal(await page.locator('#note').innerText(),'По вертикали: 5 − 7 ≠ 2');
   assert.equal(await page.locator('#note').getAttribute('aria-atomic'),'true');
   await page.screenshot({path:out+'/u2-two-errors.png',fullPage:true});
   await tap('[data-cell="1"]');
   assert.equal(await page.locator('#note').innerText(),'По горизонтали: 5 + 4 ≠ 11');
   checks.push('U2: second conflict is announced with axis and actual values; selecting the earlier line reads that conflict');
   await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#restart');await tap('#restart-yes');await idle();
   await place('t0',0);await place('t1',1);await place('t2',3);const from=await page.locator('[data-cell="0"]').boundingBox(),to=await page.locator('[data-cell="1"]').boundingBox();
   await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:8});await page.mouse.up();await idle();assert.equal((await snapshot()).attempt.status,'won');assert.equal((await snapshot()).result.coins,0);checks.push('field 12: editable valid row, tap/drag swap, repeat pays zero');
  }
  if((await snapshot()).attempt.status!=='won')await solve();
 }
 await verifyViewport(25,true);
 checks.push('first 25 campaign fields completed using real UI interactions');
 // Restart dense board 25 for actual target geometry, without seeding a profile.
 await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#restart');await tap('#restart-yes');await idle();
 await verifyViewport(25);
 checks.push('fields 1/12/25 have connected grids and their Next actions fit 320×568 and 390×844; the final touch does not click through');
 await page.setViewportSize({width:320,height:568});
 const touch=await context.newCDPSession(page);
 const center=async selector=>{const r=await page.locator(selector).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
 const targetSelector = '[data-cell="'+boards[24].cells.find(c=>c.given===undefined).id+'"]';
 const start=await center('[data-token="t0"]'), target=await center(targetSelector);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[target]});
 await page.locator('#ghost.over-cell').waitFor();
 const ghost=await page.locator('#ghost').boundingBox(), cell=await page.locator(targetSelector+' .tile').boundingBox();
 assert.ok(ghost.width<cell.width&&ghost.y+ghost.height<cell.y,'held piece leaves the landing footprint visible');
 assert.equal(await page.locator(targetSelector+'.hover').count(),1);
 await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await touch.detach();
 assert.equal(await page.locator('#ghost').isHidden(),true);
 assert.equal(await page.locator('.cell.hover,.cell.lifted,.token.lifted').count(),0);
 assert.deepEqual((await snapshot()).attempt.placements,{});
 checks.push('dense touch drag shows an unobscured target; cancellation clears the preview and preserves inventory');
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){
  await page.setViewportSize({width,height});
  const data=await page.evaluate(()=>{const boxes=[...document.querySelectorAll('[data-cell]')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});return{minTarget:Math.min(...boxes.map(b=>Math.min(b.w,b.h))),overflow:document.documentElement.scrollWidth>innerWidth,overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.x<b.x+b.w-.1&&b.x<a.x+a.w-.1&&a.y<b.y+b.h-.1&&b.y<a.y+a.h-.1))};});
  assert.ok(data.minTarget>=47.9);assert.equal(data.overflow,false);assert.equal(data.overlap,false);geometry.push({viewport:[width,height],...data});await page.screenshot({path:out+`/dense-${width}x${height}.png`,fullPage:true});
 }
 await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#settings-options summary');await page.locator('#theme').check();await page.locator('#resume:enabled').waitFor();await page.locator('#reduced').check();await page.locator('#resume:enabled').waitFor();await tap('#resume');await idle();assert.equal((await snapshot()).settings.theme,'dark');assert.equal((await snapshot()).settings.reducedMotion,true);checks.push('dark theme and reduced motion settings persist');
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/large-text.png',fullPage:true});
 const tutorialContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const tutorialPage=await tutorialContext.newPage();
 await tutorialPage.goto(`http://127.0.0.1:${server.address().port}/`);await tutorialPage.locator('html[data-state=ready]').waitFor();await tutorialPage.locator('.tutorial-ghost').waitFor({state:'attached',timeout:9000});
 assert.deepEqual(await tutorialPage.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).attempt.placements),{});
 await tutorialPage.locator('[data-token="t0"]').tap();assert.equal(await tutorialPage.locator('.tutorial-ghost').count(),0);checks.push('idle first-move demonstration is presentation-only and cancels on user input');await tutorialContext.close();
 assert.deepEqual(errors,[]);checks.push('no uncaught page errors');
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',scope:'Chromium scripted UI, own campaign data; not Android, TalkBack, live ads or physical feel',source:process.env.GITHUB_SHA??'local',browser:browser.version(),checks,geometry},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,geometry},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),checks,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(done=>server.close(done));}
