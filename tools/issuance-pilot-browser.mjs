import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from '@playwright/test';

const root=resolve(process.env.ISSUANCE_WEB??'dist'),out=resolve(process.env.ISSUANCE_UI_OUTPUT??'.test-output/issuance16');
const stamp=JSON.parse(await readFile(resolve(root,'native-build.json'),'utf8'));
assert.equal(stamp.freeIssuancePolicy,'d4-v2');
const bank=JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try {
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(file===root||file.startsWith(root+sep));
  res.setHeader('Content-Type',types[extname(file)]??'text/html');
  res.end(await readFile(file===root?resolve(root,'index.html'):file));
 } catch {res.writeHead(404).end();}
});
const key='crossmath.save.v1',time=new Date('2026-11-27T12:00:00Z'),errors=[],cases=[];
const save=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const ready=page=>page.locator('html[data-state=ready]').waitFor();
const boardState=({elapsedPlaying,...board})=>board;
const snapshot=async(page,n)=>page.screenshot({path:resolve(out,n+'.png')});
const context=(browser,width,height)=>browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'UTC'});
const tab=async(page,id)=>{
 await page.locator('#tab-'+id).tap();
 await page.locator('#hub[data-screen="'+id+'"]').waitFor();
};
const modal=async(page,button)=>{
 await page.locator('#replace-dialog[open]').waitFor();
 await page.locator('#'+button).tap();
 await page.locator('#replace-dialog').waitFor({state:'hidden'});
};
let browser;
try {
 await mkdir(out,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch();
 const open=async(ctx,seed)=>{
  if(seed)await ctx.addInitScript(({key,seed})=>{
   if(location.protocol==='http:'&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
  },{key,seed});
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(time);
  await page.goto(url);await ready(page);
  return page;
 };
 const freshContext=await context(browser,390,844),fresh=await open(freshContext);
 const clean=await save(fresh);
 assert.equal(clean.attempt.puzzleId,'cm-own-01-001');
 await freshContext.close();
 for(const [width,height,language,theme] of [[320,568,'ru','light'],[390,844,'en','dark']]){
  const seed=structuredClone(clean);
  seed.settings={...seed.settings,language,theme,reducedMotion:true};
  seed.profile.solvedIds=Array.from({length:15},(_,i)=>`cm-own-01-${String(i+1).padStart(3,'0')}`);
  seed.profile.campaignCursor=15;seed.meta.screen='modes';
  if(language==='ru'){
   const old=bank.find(p=>p.puzzleId==='cm-own-02-001');
   const cell=old.cells.find(c=>c.given===undefined);
   seed.meta.inactive.free={attempt:{...seed.attempt,id:'before-pilot',mode:'free',contentVersion:2,
    puzzleId:old.puzzleId,freeTrack:'relax',freeIndex:0,freeAssignmentVersion:1,boardRevision:1,
    placements:{[cell.id]:'t0'},trayOrder:old.tray.map((_,i)=>'t'+i)},result:null};
  }
  const ctx=await context(browser,width,height),page=await open(ctx,seed),prefix=`${width}x${height}-${language}-${theme}`;
  await page.locator('#free-open:enabled').tap();
  await page.locator('#board:visible').waitFor();
  if(language==='ru')assert.deepEqual((await save(page)).attempt,seed.meta.inactive.free.attempt);
  else{
   await page.locator('#tray [data-token]:enabled').first().tap();
   await page.locator('#board .cell.empty:enabled').first().tap();
   await page.waitForFunction(key=>Object.keys(JSON.parse(localStorage.getItem(key)).attempt.placements).length===1,key);
  }
  const relax=(await save(page)).attempt;
  await snapshot(page,prefix+'-relax');
  await page.locator('#home').tap();
  await tab(page,'calendar');await page.locator('#daily-play:enabled').tap();
  await page.locator('#board:visible').waitFor();
  const daily=await save(page);
  assert.equal(daily.attempt.mode,'daily');
  assert.deepEqual(boardState(daily.meta.inactive.free.attempt),boardState(relax));
  await page.locator('#home').tap();await tab(page,'modes');
  await page.locator('#challenge-open:enabled').tap();
  await modal(page,'keep-board');
  assert.deepEqual((await save(page)).meta.inactive.free.attempt,daily.meta.inactive.free.attempt);
  await page.locator('#challenge-open:enabled').tap();
  await modal(page,'replace-board');
  const challenge=await save(page);
  assert.equal(challenge.attempt.freeTrack,'challenge');
  assert.equal(challenge.meta.freeIssuance.relax.pin.puzzleId,relax.puzzleId);
  assert.equal(challenge.meta.freeIssuance.challenge.pin.policy,'d4-v2');
  assert.equal(challenge.meta.freeIssuance.challenge.issued[challenge.attempt.puzzleId].count,1);
  await snapshot(page,prefix+'-challenge');
  await page.reload();await ready(page);
  assert.deepEqual(boardState((await save(page)).attempt),boardState(challenge.attempt));
  await page.locator('#home').tap();await tab(page,'modes');
  await page.locator('#free-open:enabled').tap();
  await modal(page,'replace-board');
  const restored=await save(page);
  assert.equal(restored.attempt.puzzleId,relax.puzzleId);
  assert.equal(restored.attempt.freeIndex,0);
  assert.deepEqual(restored.attempt.placements,{});
  assert.deepEqual(restored.meta.freeIssuance,challenge.meta.freeIssuance);
  assert.equal(restored.profile.coins,clean.profile.coins);
  assert.deepEqual(restored.meta.assignments,daily.meta.assignments);
  await snapshot(page,prefix+'-relax-return');
  cases.push({viewport:[width,height],language,theme,relax:relax.puzzleId,challenge:challenge.attempt.puzzleId,
   resumed:restored.attempt.puzzleId,oldAssignmentRestored:language==='ru',coins:restored.profile.coins});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'browser.json'),JSON.stringify({status:'PASS',browser:browser.version(),stamp,cases},null,2)+'\n');
 console.log('ISSUE-01 browser PASS · old layout, Daily, cancel/replace, cold restore and stable Free pins');
}finally{await browser?.close();server.close();}
