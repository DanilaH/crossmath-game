import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const root=resolve(process.env.HELP_BROWSER_WEB??'dist'),out=resolve('.test-output/help11-ui');
await mkdir(out,{recursive:true});
const fixtures=JSON.parse(await readFile('tests/fixtures/help11-stops.json','utf8'));
const routes=JSON.parse(await readFile('docs/spec/product/content_v09/routes.json','utf8'));
const legacy=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8'));
const author=JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8'));
const fonts={'.woff2':'font/woff2','.webp':'image/webp'};
const mime={...fonts,'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server=createServer(async(request,response)=>{
 try {
  const path=resolve(root,'.'+new URL(request.url,'http://localhost').pathname);
  assert.ok(path===root||path.startsWith(root+sep));
  const file=path===root?resolve(root,'index.html'):path;
  response.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');
  response.end(await readFile(file));
 } catch { response.writeHead(404).end(); }
});
const clock=new Date('2026-11-25T12:00:00Z');
const key='crossmath.save.v1',errors=[];
let browser,base,url;
const save=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const idle=page=>page.locator('#help:enabled').waitFor();

async function load(context,fixture,language='ru',coins=120){
 if(fixture)await context.addInitScript(({fixture,base,language,coins,key})=>{
  if (location.protocol!=='http:'||localStorage.getItem(key)) return;
  base.settings={...base.settings,language,reducedMotion:true};
  base.profile.coins=coins;
  const {id,placements,trayOrder,contentVersion,rulesetVersion,boardRevision,mode='campaign'}=fixture;
  base.attempt={...base.attempt,id:'tested-'+id,puzzleId:id,placements,trayOrder,contentVersion,rulesetVersion,boardRevision,mode};
  base.meta.activeSlot=mode;
  if(mode==='endless'){
   Object.assign(base.attempt,{runId:'test-run',stageId:0});
   base.career.run={id:'test-run',version:'cm-integer-1/content-v1/score-v1',status:'active',stage:0,
    lives:3,assisted:false,solvedStages:0,score:0};
  }
  localStorage.setItem(key,JSON.stringify(base));
 },{fixture,base,language,coins,key});
 const page=await context.newPage();
 page.setDefaultTimeout(15_000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:clock});
 await page.goto(url);
 await page.locator('html[data-state=ready]').waitFor();
 await idle(page);
 return page;
}

async function tap(page,selector){
 const point=await page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return {x,y,visible:el.contains(document.elementFromPoint(x,y))};
 });
 assert.ok(point.visible,selector+' is reachable without scrolling');
 await page.touchscreen.tap(point.x,point.y);
}

const mobile=(width,height)=>({viewport:{width,height},hasTouch:true,isMobile:true,
 timezoneId:'UTC',reducedMotion:'reduce'});
const proofWords = {
 ru:{propagation:/Равенства|выделенным равенствам/,contradiction:/Если поставить/},
 en:{propagation:/equations/,contradiction:/Trying/},
};
const details=[];
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true});
 const fresh=await browser.newContext(mobile(390,844)),starter=await load(fresh);
 base=await save(starter);
 await fresh.close();

 for(const [width,height] of [[320,480],[390,844]])for(const language of ['ru','en'])for(const fixture of fixtures.slice(0,2)){
  const context=await browser.newContext(mobile(width,height));
  const page=await load(context,fixture,language);
  await tap(page,'#help');
  await page.locator('#explain:enabled').waitFor();
  const before=await save(page);
  await tap(page,'#explain');assert.equal(await page.locator('#apply-help').isEnabled(),true);
  assert.deepEqual(await save(page),before);
  await tap(page,'#close-help');await page.locator('#help-dialog').waitFor({state:'hidden'});
  assert.deepEqual(await save(page),before);
  await tap(page,'#help');await page.locator('#explain:enabled').waitFor();await tap(page,'#explain');
  const ready=await save(page);
  // A second click on the same control must not apply the certificate twice.
  await page.locator('#apply-help').evaluate(button=>{button.click();button.click();});
  await page.locator('#help-dialog').waitFor({state:'hidden'});await idle(page);
  const after=await save(page),message=await page.locator('#note').innerText();
  assert.equal(after.profile.coins,60);
  assert.equal(after.attempt.hintsUsed,1);
  assert.equal(Object.values(after.helpReceipts).filter(x=>x.outcome==='applied').length,1);
  for(const [cell,token] of Object.entries(ready.attempt.placements))assert.equal(after.attempt.placements[cell],token);
  assert.equal(Object.keys(after.attempt.placements).length,fixture.boardRevision+1);
  assert.ok(after.attempt.placements[fixture.cellId]);
  assert.match(message,proofWords[language][fixture.rule]);
  assert.match(message,new RegExp(String(fixture.value)));
  const geometry=await page.evaluate(()=>{
   const note=document.querySelector('#note'),r=note.getBoundingClientRect(),tool=document.querySelector('#help').getBoundingClientRect();
   return {font:getComputedStyle(document.documentElement).fontSize,width:document.documentElement.scrollWidth,
    note:[r.top,r.bottom],help:[tool.top,tool.bottom],highlighted:document.querySelectorAll('#board .linked').length};
  });
  assert.equal(geometry.font,'16px');assert.equal(geometry.width,width);
  assert.ok(geometry.note[0]>=0&&geometry.note[1]<=height&&geometry.help[1]<=height);
  assert.ok(geometry.highlighted>0,JSON.stringify(geometry));
  await page.screenshot({path:resolve(out,`${fixture.rule}-${language}-${width}x${height}.png`)});
  await page.reload();await idle(page);
  const restored=await save(page);
  assert.equal(restored.profile.coins,after.profile.coins);
  assert.deepEqual(restored.attempt.placements,after.attempt.placements);
  assert.deepEqual(restored.helpReceipts,after.helpReceipts);
  details.push({viewport:[width,height],language,fixture:fixture.id,rule:fixture.rule,message,geometry});
  console.log(`${width}×${height} ${language} ${fixture.id} ${fixture.rule} PASS`);
  await context.close();
 }

 const poor=await browser.newContext(mobile(320,480)),cost=await load(poor,fixtures[1],'ru',59);
 await tap(cost,'#help');await cost.locator('#explain:enabled').waitFor();await tap(cost,'#explain');
 assert.equal(await cost.locator('#apply-help').isDisabled(),true);
 assert.equal((await save(cost)).profile.coins,59);
 assert.equal(Object.keys((await save(cost)).helpReceipts).length,0);
 await poor.close();

 const endlessId=routes.endlessSequence[0],puzzle=legacy.find(p=>p.puzzleId===endlessId);
 const trayOrder=puzzle.tray.map((_,i)=>'t'+i),placements={};
 for(const cell of puzzle.cells.filter(c=>c.given===undefined)){
  placements[cell.id]=trayOrder.find(t=>puzzle.tray[Number(t.slice(1))]===author[endlessId].answer[cell.id]&&!Object.values(placements).includes(t));
 }
 const different=Object.keys(placements).find(c=>puzzle.tray[Number(placements[c].slice(1))]!==puzzle.tray[Number(Object.values(placements)[0].slice(1))]);
 assert.ok(different);
 const wrong={...placements},first=Object.keys(placements)[0];
 [wrong[first],wrong[different]]=[wrong[different],wrong[first]];
 const endlessMessages=[];
 for(const position of [placements,wrong]){
  const context=await browser.newContext(mobile(320,480));
  const page=await load(context,{id:endlessId,contentVersion:puzzle.contentVersion,rulesetVersion:puzzle.rulesetVersion,
   trayOrder,placements:position,mode:'endless',boardRevision:trayOrder.length});
  await tap(page,'#help');await page.locator('#explain:enabled').waitFor();
  const before=await save(page);await tap(page,'#explain');
  endlessMessages.push(await page.locator('#help-description').innerText());
  assert.equal(await page.locator('#apply-help').isDisabled(),true);
  assert.deepEqual(await save(page),before);
  await page.keyboard.press('Escape');await page.locator('#help-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#board .right').count(),0);
  assert.equal((await save(page)).career.run.assisted,false);
  await context.close();
 }
 assert.equal(endlessMessages[0],endlessMessages[1]);
 assert.match(endlessMessages[0],/^Сейчас не удалось подготовить объяснение/);

 if(process.env.HELP_BROWSER_RECORD==='1'){
  const size={width:320,height:480};
  const context=await browser.newContext({...mobile(size.width,size.height),recordVideo:{dir:out,size}});
  const page=await load(context,fixtures[1]);await tap(page,'#help');await page.locator('#explain:enabled').waitFor();
  await page.waitForTimeout(400);await tap(page,'#explain');await page.waitForTimeout(750);
  await tap(page,'#apply-help');await page.locator('#help-dialog').waitFor({state:'hidden'});
  await page.waitForTimeout(1875);
  const video=page.video();await context.close();await video.saveAs(resolve(out,'contradiction-ru-320x480.webm'));
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({browser:browser.version(),details,endlessMessages},null,2)+'\n');
 console.log('HELP-02 browser PASS · 8 proof views, insufficient funds, neutral full Endless');
}finally{
 await browser?.close();
 server.close();
}
