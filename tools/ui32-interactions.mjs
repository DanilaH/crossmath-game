import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createServer as viteServer} from 'vite';
import {chromium} from '@playwright/test';
import {episode,tap,save as snapshot} from './qa/rc30-harness.mjs';
const root=resolve('dist'),out=resolve('.test-output/ui32-interactions');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(path===root||path.startsWith(root+sep));const file=path===root?root+'/index.html':path;res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const vite=await viteServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
const {createAttempt}=await vite.ssrLoadModule('/src/core/engine.ts'),{getPuzzle}=await vite.ssrLoadModule('/src/content/catalog.ts');
const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
const browser=await chromium.launch(),results=[],errors=[];
async function visible(page,selector){const b=await page.locator(selector).boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=page.viewportSize().height,selector+' visible');if(await page.locator(selector).isEnabled())assert.ok(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),selector+' centre hit');}
const back=async page=>{await page.evaluate(()=>window.rc30.back());await page.waitForTimeout(100);await page.locator('#pause:enabled').waitFor();};
try{
 for(const height of (process.env.UI32_HEIGHT?[Number(process.env.UI32_HEIGHT)]:[430,480,568,844]))for(const [language,theme] of [['ru','light'],['en','dark']]){
  const seed=structuredClone(fixtures['after-15']);seed.meta.screen='home';seed.result=null;
  const puzzle=getPuzzle('cm-own-02-220');seed.attempt=createAttempt(puzzle,'ux32-'+height);seed.attempt.trayOrder.reverse();
  Object.assign(seed.settings,{language,theme,reducedMotion:false,sound:true,vibration:true});
  const {page,context}=await episode(browser,url,seed,{height,video:height===568&&language==='ru'?out:undefined});
  const instrument=()=>{window.ux32Input=[];document.addEventListener('click',event=>{const id=event.target.closest?.('button')?.id;if(!id)return;const start=performance.now();requestAnimationFrame(function available(){if(document.querySelector('#pause')?.disabled){requestAnimationFrame(available);return;}window.ux32Input.push({id,ms:performance.now()-start});});},true);};
  await context.addInitScript(instrument);await page.evaluate(instrument);
  page.on('pageerror',e=>errors.push(e.message));if(height===844)await page.setViewportSize({width:390,height});await page.emulateMedia({reducedMotion:'no-preference'});
  const key=`${page.viewportSize().width}x${height}-${language}-${theme}`;
  try{
   for(const origin of ['home','profile']){
    await tap(page,'#tab-'+origin);await tap(page,origin==='home'?'#home-league-open':'#league-open');
    await page.reload();await page.locator('html[data-state=ready]').waitFor();assert.equal((await snapshot(page)).meta.leagueOrigin,origin);
    await back(page);assert.equal((await snapshot(page)).meta.screen,origin);
   }
   // Root Day retains archive selection; the explicitly dated home shortcut selects today.
   await tap(page,'#tab-calendar');await page.locator('.month-day:not(:disabled)').first().tap();await page.locator('#pause:enabled').waitFor();
   const day=(await snapshot(page)).meta.calendarSelectedDay;await tap(page,'#tab-home');await tap(page,'#tab-calendar');assert.equal((await snapshot(page)).meta.calendarSelectedDay,day);
   await tap(page,'#tab-home');await tap(page,'#daily-primary');assert.equal((await snapshot(page)).meta.calendarSelectedDay,(await snapshot(page)).meta.effectiveDay);
   await tap(page,'#tab-profile');await page.locator('#profile-statistics summary').scrollIntoViewIfNeeded();await tap(page,'#profile-statistics summary');await page.locator('#profile-statistics').scrollIntoViewIfNeeded();
   await page.locator('#stats-filter-campaign').focus();const stable=await page.evaluate(()=>{window.ux32Hub=document.querySelector('#hub').firstElementChild;return {scroll:scrollY,focus:document.activeElement.id};});
   await page.waitForTimeout(4200);assert.ok(await page.evaluate(()=>window.ux32Hub===document.querySelector('#hub').firstElementChild),'Unchanged availability polls retain DOM');
   assert.equal(await page.evaluate(()=>document.activeElement.id),stable.focus);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-stable.scroll)<2,'Polling retains scroll');
   await tap(page,'#tab-home');await tap(page,'#continue-game');await visible(page,'#return');assert.equal(await page.locator('#return').isDisabled(),true);
   for(const id of ['undo','sort','return','help']){await visible(page,'#'+id);assert.ok(await page.locator('#'+id).evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=11));}
   assert.ok(await page.locator('#tray .token-face').first().evaluate(e=>getComputedStyle(e).backgroundImage.includes('linear-gradient')&&getComputedStyle(e).pointerEvents==='none'),'Full chip artwork moves independently of its hit target');
   const before=await snapshot(page);await tap(page,'#sort');const sorted=await snapshot(page);
   const motion=await page.evaluate(()=>document.querySelector('#tray').getAnimations({subtree:true}).map(a=>a.effect.getTiming().duration));
   assert.ok(motion.length&&motion.every(t=>t===140),'Committed sort uses bounded FLIP');
   // Tap the final slot during motion. Targets stay at final layout; a second action cancels presentation.
   const target=page.locator('#tray [data-token]:not([hidden])').first();const chosen=await target.getAttribute('data-token');await target.tap();
   assert.equal(await page.locator(`[data-token="${chosen}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#tray').evaluate(e=>e.getAnimations({subtree:true}).length),0);
   await tap(page,'#undo');assert.deepEqual((await snapshot(page)).attempt.trayOrder,before.attempt.trayOrder);assert.deepEqual((await snapshot(page)).attempt.placements,before.attempt.placements);
   const sortedRevision=(await snapshot(page)).attempt.boardRevision;
   await page.emulateMedia({reducedMotion:'reduce'});await tap(page,'#sort');assert.equal(await page.locator('#tray').evaluate(e=>e.getAnimations({subtree:true}).length),0);
   const revision=(await snapshot(page)).attempt.boardRevision;await tap(page,'#sort');assert.equal((await snapshot(page)).attempt.boardRevision,revision,'Already sorted has no fake command');
   assert.equal(revision,sortedRevision+1);assert.equal(sorted.attempt.boardRevision,before.attempt.boardRevision+1);
   await tap(page,'#pause');await tap(page,'#settings-options summary');await page.locator('#restart').scrollIntoViewIfNeeded();await tap(page,'#restart');
   for(const id of ['restart-warning','restart-no','restart-yes'])await visible(page,'#'+id);
   await page.screenshot({path:out+'/'+key+'-restart.png'});await back(page);assert.equal(await page.locator('#pause-dialog').isVisible(),true);assert.equal(await page.locator('#restart-confirm').isVisible(),false);
   await back(page);assert.equal(await page.locator('#pause-dialog').isVisible(),false);assert.deepEqual((await snapshot(page)).attempt.placements,before.attempt.placements);
   await tap(page,'#help');await tap(page,'#explain');for(const id of ['help-title','close-help','apply-help'])await visible(page,'#'+id);
   await back(page);const inputTiming=await page.evaluate(()=>window.ux32Input);await page.reload();await page.locator('html[data-state=ready]').waitFor();assert.deepEqual((await snapshot(page)).attempt.trayOrder,sorted.attempt.trayOrder);
   results.push({key,status:'PASS',originBack:['home','profile'],archiveDay:day,sortDuration:140,sortUndo:true,reducedMotion:true,restartBack:true,helpTitle:true,pollingStable:true,inputTiming});
  }catch(error){await page.screenshot({path:out+'/'+key+'-failure.png'});console.error(key,await page.evaluate(()=>({state:document.documentElement.dataset.state,text:document.body.innerText.slice(0,1800)})));throw error;}finally{const video=page.video();await context.close();if(video)await video.saveAs(out+'/'+key+'-1x.webm');}
 }
 assert.deepEqual(errors,[]);console.log('UX32 interactions PASS '+results.length+' native-bridge scenarios');
}finally{await writeFile(out+'/report.json',JSON.stringify({results,errors,scope:'Actual RC web + scripted Capacitor host, not physical Android'},null,2));await browser.close();server.close();await vite.close();}
