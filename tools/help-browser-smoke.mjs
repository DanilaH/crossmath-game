import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root=resolve(process.env.CROSSMATH_TEST_ROOT ?? '.');
const baseline=process.env.CROSSMATH_HELP_BASELINE==='1';
const out=resolve('.test-output/help-preparation',baseline?'before':'after');
await mkdir(out,{recursive:true});
const {puzzles,cases}=JSON.parse(await readFile('tests/fixtures/help-preparation.json','utf8'));
const fixtures=Object.fromEntries(cases.map(example=>[example.id,{...example,board:puzzles[example.puzzle]}]));
const selectFixture=`(${JSON.stringify(fixtures)})[new URLSearchParams(location.search).get('fixture') ?? '']`;
const server=await createServer({root,server:{host:'127.0.0.1',port:0,watch:null},plugins:[{
 name:'help-preparation-browser-fixtures',
 enforce:'pre',
 transform(code,id){
  if(id===resolve(root,'src/main.ts'))return code.replace('if(import.meta.env.DEV)', 'if(false)');
  if(id===resolve(root,'src/content/catalog.ts')){
   return code.replace('const latestCampaign',`
    const fixture = ${selectFixture};
    if (fixture) {
     const puzzleId = fixture.mode === 'endless' ? routes.endlessSequence[0] : fixture.board.puzzleId;
     byId.set(puzzleId, parsePuzzle({...fixture.board,puzzleId}));
    }
    const latestCampaign`);
  }
  if(id===resolve(root,'src/app/session.ts')){
   // Only the test server supplies an explicit search limit.
   return code.replace(baseline?'explain(p,a)':'prepareExplanation(getPuzzle(attempt.puzzleId),attempt)',
    baseline?`explain(p,a,${selectFixture}?.budget)`:`prepareExplanation(getPuzzle(attempt.puzzleId),attempt,${selectFixture}?.budget)`);
  }
  if(id===resolve(root,'src/help/reveal.ts')){
   return code.replace('{...answers, ...newAnswers}',
    "{...answers, ...newAnswers, 'cm-own-01-902': {answer:[5,4,1,2,2]}}");
  }
 },
}]});
let browser;
let seed;
const report=[];
const day='2026-11-24T12:00:00Z';

async function ready(page){
 await page.locator('html[data-state=ready]').waitFor();
 await page.locator('#help:enabled').waitFor();
 assert.equal(await page.locator('[data-debug-panel]').count(),0);
}

async function fixturePage(context,example,language='ru',theme='light'){
 if(example)await context.addInitScript(({example,language,theme,seed})=>{
  const {save,recordVersion,endlessPuzzleId}=seed,mode=example.mode,runId='fixture-run';
  save.settings={...save.settings,language,theme,reducedMotion:true};
  Object.assign(save.attempt,{id:'fixture-attempt',mode,puzzleId:mode==='endless'?endlessPuzzleId:example.board.puzzleId,
   contentVersion:example.board.contentVersion,rulesetVersion:example.board.rulesetVersion,
   trayOrder:example.board.tray.map((_,index)=>'t'+index),
   placements:Object.fromEntries(example.placements.map(p=>[p.cellId,p.tokenId]))});
  save.meta.activeSlot=mode;
  if(mode==='endless'){
   Object.assign(save.attempt,{runId,stageId:0});
   save.career.run={id:runId,version:recordVersion,status:'active',stage:0,lives:3,assisted:false,solvedStages:0,score:0};
  }
  localStorage.setItem('crossmath.save.v1',JSON.stringify(save));
 },{example,language,theme,seed});
 const page=await context.newPage();
 await page.clock.install({time:new Date(day)});
 await page.goto(new URL(example?`?fixture=${example.id}`:'',server.resolvedUrls.local[0]).href);
 await ready(page);
 return page;
}

async function visibleTap(page,selector){
 const point=await page.locator(selector).evaluate(el=>{
  const rect=el.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const hit=document.elementFromPoint(x,y);
  return {x,y,hit:el.contains(hit),target:hit?.outerHTML.slice(0,150)};
 });
 assert.equal(point.hit,true,selector+' is reachable before scrolling: '+JSON.stringify(point));
 await page.touchscreen.tap(point.x,point.y);
}

const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const expected={
 ready:['Применим доказуемый ход','Place a number and see why'],
 incompatible_position:['С текущей расстановкой поле нельзя завершить','The board cannot be completed with these placements'],
 no_supported_step:['Для этой расстановки пока нет готового объяснения','There is no explanation available for this layout yet'],
 check_incomplete:['Проверка хода не завершилась','The move check did not finish'],
 neutral_no_plan:['Сейчас не удалось подготовить объяснение','An explanation is not available right now'],
};

try{
 await server.listen();
 browser=await chromium.launch({headless:true});
 const seedContext=await browser.newContext({timezoneId:'UTC'});
 const seedPage=await fixturePage(seedContext,null);
 seed=await seedPage.evaluate(async()=>{
  const {routes}=await import('/src/content/catalog.ts');
  const {recordVersion}=await import('/src/meta/career.ts');
  return {save:JSON.parse(localStorage.getItem('crossmath.save.v1')),recordVersion,endlessPuzzleId:routes.endlessSequence[0]};
 });
 await seedContext.close();
 const errors=[];
 const format=baseline?[[320,568,'ru','light']]:[[320,480],[320,568],[390,844]].flatMap(([width,height])=>
  ['ru','en'].map(language=>[width,height,language,language==='ru'?'light':'dark']));
 const selected=baseline?['incompatible_partial','unique_no_supported_step','compatibility_budget_zero']:
  cases.filter(c=>c.expectedFutureOutcome!=='unavailable').map(c=>c.id);
 for(const [width,height,language,theme] of format){
  for(const id of selected){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,timezoneId:'UTC',reducedMotion:'reduce'});
   const example=fixtures[id],page=await fixturePage(context,example,language,theme);
   page.on('pageerror',error=>errors.push(error.message));
   await visibleTap(page,'#help');
   await page.locator('#help-dialog[open]').waitFor();
   const description=page.locator('#help-description');
   assert.equal(await description.isHidden(),true);
   assert.equal(await page.locator('#apply-help').isDisabled(),true);
   await page.locator('#close-help:enabled').waitFor();
   const before=await snapshot(page);
   await visibleTap(page,'#explain');
   const projection=example.expectedUiProjection,message=await description.innerText();
   assert.ok(message.startsWith(baseline?'Сейчас нет доказуемого хода':expected[projection][Number(language==='en')]),message);
   assert.equal(await page.locator('#apply-help').isEnabled(),projection==='ready');
   assert.equal(await page.locator('#reveal').getAttribute('aria-pressed'),'false');
   const bounds=await page.evaluate(()=>{
    const rect=id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return {
     left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
     hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),
    };};
    const content=document.getElementById('help-content'),limits=content.getBoundingClientRect(),description=rect('help-description');
    return {dialog:rect('help-dialog'),actions:[rect('close-help'),rect('apply-help')],
     width:document.documentElement.scrollWidth,root:getComputedStyle(document.documentElement).fontSize,
     description:getComputedStyle(document.getElementById('help-description')).fontSize,
     fitsMessage:description.top>=limits.top-1&&description.bottom<=limits.bottom+1,
     content:{width:content.clientWidth,scrollWidth:content.scrollWidth,height:content.clientHeight,scrollHeight:content.scrollHeight}};
   });
   assert.equal(bounds.root,'16px');
   assert.equal(bounds.width,width);
   assert.equal(bounds.content.scrollWidth,bounds.content.width);
   if(!baseline)assert.ok(bounds.fitsMessage,JSON.stringify(bounds));
   assert.ok(bounds.actions.every(a=>a.width>=48&&a.height>=48&&a.hit&&a.top>=0&&a.bottom<=height));
   if(width===320&&height===568&&language==='ru'&&['incompatible_partial','unique_no_supported_step','compatibility_budget_zero'].includes(id)){
    await page.screenshot({path:resolve(out,id+'.png')});
   }
   if(!baseline&&id==='unique_no_supported_step'){
    await visibleTap(page,'#reveal');
    assert.notEqual(await description.innerText(),message);
    assert.equal(await page.locator('#apply-help').isEnabled(),true);
    await visibleTap(page,'#explain');
    assert.equal(await description.innerText(),message);
    assert.equal(await page.locator('#apply-help').isDisabled(),true);
   }
   assert.deepEqual(await snapshot(page),before,'Help preview is read-only');
   if(id==='incompatible_partial')await page.keyboard.press('Escape');
   else await visibleTap(page,'#close-help');
   await page.locator('#help-dialog').waitFor({state:'hidden'});
   assert.deepEqual(await snapshot(page),before,'Leaving Help is read-only');
   assert.equal(await page.locator('#board .right').count(),0,'preview did not mark a correct equation');
   report.push({id,width,height,language,theme,mode:example.mode,projection,message,bounds});
   await context.close();
  }
 }
 if(!baseline){
  const size={width:320,height:568};
  const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'UTC'});
  const page=await fixturePage(context,null);
  await visibleTap(page,'#help');await page.locator('#close-help:enabled').waitFor();
  const before=await snapshot(page);
  await visibleTap(page,'#explain');await visibleTap(page,'#apply-help');
  await page.locator('#result:visible').waitFor();
  const after=await snapshot(page);
  assert.equal(after.attempt.hintsUsed,1);
  assert.equal(after.profile.coins,before.profile.coins-60+10);
  assert.equal(Object.values(after.helpReceipts).filter(r=>r.outcome==='applied').length,1);
  await page.reload();
  await page.locator('#result:visible').waitFor();
  assert.deepEqual(await snapshot(page),after);
  await context.close();
  if(process.env.CROSSMATH_HELP_RECORD==='1'){
   const clip=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'UTC',
    recordVideo:{dir:out,size}});
   const page=await fixturePage(clip,fixtures.unique_no_supported_step);
   await visibleTap(page,'#help');await page.locator('#close-help:enabled').waitFor();
   await page.waitForTimeout(500);
   await visibleTap(page,'#explain');
   await page.waitForTimeout(1650);
   await visibleTap(page,'#close-help');
   await page.waitForTimeout(650);
   const video=page.video();await clip.close();
   await video.saveAs(resolve(out,'help-route.webm'));
  }
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({baseline,source:process.env.GITHUB_SHA,browser:browser.version(),report},null,2)+'\n');
 console.log(`HELP-01 ${baseline?'baseline':'implementation'} · ${report.length} Chromium cases PASS`);
}finally{
 await browser?.close();
 await server.close();
}
