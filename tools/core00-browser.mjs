import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const before=process.env.CORE00_BASELINE==='1';
const root=resolve(process.env.CORE00_WEB??'dist');
const out=resolve(process.env.CORE00_OUTPUT??'.test-output/core00');
const config=JSON.parse(await readFile('docs/spec/product/meta_v08/config.json','utf8'));
const readBank=async version=>({
 boards:JSON.parse(await readFile(`docs/spec/product/${version}/boards.json`,'utf8')),
 answers:JSON.parse(await readFile(`docs/spec/product/${version}/author_solutions.json`,'utf8')),
});
const banks=await Promise.all(['content_v09','content_v2'].map(readBank));
const extraAnswers=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));
banks.push({boards:JSON.parse(await readFile('src/content/additionalBoards.json','utf8')),answers:Object.fromEntries(JSON.parse(await readFile('docs/acceptance/release29/content-map.json','utf8')).map(m=>[m.product,extraAnswers[m.source]]))});
const key='crossmath.save.v1',day='2026-11-27',date=day+'T12:00:00Z';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try {
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(path===root || path.startsWith(root+sep));
  res.setHeader('Content-Type',mime[extname(path)]??'text/html');
  res.end(await readFile(path===root?resolve(root,'index.html'):path));
 } catch {res.writeHead(404).end();}
});
const ready=async page=>{
 try {await page.locator('html[data-state=ready]').waitFor();}
 catch(error){throw Error(`${page.url()} · ${await page.locator('#startup').innerText()}`,{cause:error});}
};
const save=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const errors=[],cases=[];
const contextOptions=(width,height)=>({viewport:{width,height},isMobile:true,hasTouch:true,timezoneId:'UTC',reducedMotion:'reduce'});
const browser=await chromium.launch({headless:true});
await mkdir(out,{recursive:true});
try {
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url=`http://127.0.0.1:${server.address().port}/`;
 const open=async(context,seed,path='')=>{
  if(seed)await context.addInitScript(({key,seed})=>{
   if(location.protocol==='http:'&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
  },{key,seed});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date(date));
  await page.goto(url+path);await ready(page);
  return page;
 };
 const tap=async(page,selector)=>{
  const point=await page.locator(selector).evaluate(node=>{
   const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
   return {x,y,hit:node.contains(document.elementFromPoint(x,y))};
  });
  assert.ok(point.hit,selector+' is reachable by touch');
  await page.touchscreen.tap(point.x,point.y);
 };
 const scratch=await browser.newContext(contextOptions(390,844));
 const first=await open(scratch);
 const clean=await save(first);
 assert.equal(clean.attempt.puzzleId,'cm-own-01-001');
 assert.equal(clean.profile.coins,120);
 await scratch.close();
 const oldRun=(language,theme)=>{
  const seed=structuredClone(clean),a=seed.attempt,m=seed.meta,c=seed.career;
  seed.settings={...seed.settings,language,theme,reducedMotion:true};
  seed.profile.solvedIds=Array.from({length:15},(_,i)=>`cm-own-01-${String(i+1).padStart(3,'0')}`);
  seed.profile.coins=389;seed.profile.campaignCursor=15;seed.profile.fragments=5;seed.profile.paidCardIds=['abacus'];
  m.inactive.campaign={attempt:a,result:null};
  m.activeSlot='endless';m.screen='play';m.issuedDays=5;
  m.slotReceipts=[day+':0'];m.setReceipts=['2026-11-26'];
  m.quests={dayKey:day,configVersion:config.configVersion,issueIndex:4,slots:[
   {goalId:'win1',target:1,progress:1,paid:true},
   {goalId:'endless',target:1,progress:0,paid:false},
   {goalId:'eq6',target:6,progress:3,paid:false},
  ],witness:[{mode:'endless',puzzleId:'cm-own-01-016',endlessStage:0}],replacements:[]};
  seed.attempt={...a,id:'park-this-stage',puzzleId:'cm-own-01-016',mode:'endless',runId:'live-run',stageId:0,
   trayOrder:['t0','t1','t2'],placements:{4:'t2'},boardRevision:1,lives:2,elapsedPlaying:4};
  const version='cm-integer-1/content-v1/score-v1';
  c.run={id:'live-run',version,stage:0,solvedStages:0,score:0,lives:2,assisted:false,status:'active'};
  c.records[version].solo={runId:'past-run',score:250,boards:3,endedAt:date};
  c.bestBoardsInRun=3;c.achievements.run3={earnedAt:date,eventId:'win:past'};
  return seed;
 };

 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
  const name=`${language}-${theme}-${width}x${height}`;
  const context=await browser.newContext(contextOptions(width,height));
  const seed=oldRun(language,theme),page=await open(context,seed,'?mode=endless#endless');
  const shot=async scene=>{
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
   await page.screenshot({path:resolve(out,`${name}-${scene}.png`)});
  };
  if(before){
   await page.locator('#submit:visible').waitFor();
   await shot('startup');
   await tap(page,'#home');
  } else{
   await page.locator('#hub[data-screen=home]').waitFor();
   const parked=await save(page);
   assert.deepEqual(parked.meta.inactive.endless,{attempt:seed.attempt,result:null});
   assert.deepEqual(parked.career,seed.career);
   assert.deepEqual(parked.profile,seed.profile);
   assert.deepEqual(parked.meta.slotReceipts,seed.meta.slotReceipts);
   assert.deepEqual(parked.meta.setReceipts,seed.meta.setReceipts);
   assert.equal(parked.meta.quests.slots[1].goalId,'route');
   assert.ok(parked.meta.quests.witness.every(o=>o.mode!=='endless'));
   await shot('startup');
  }
  await page.locator('#hub[data-screen=home]').waitFor();
  await shot('home');
  const nav=await page.locator('#root-tabs').boundingBox();
  assert.ok(nav && nav.y+nav.height<=height+1);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'16px');
  await tap(page,'#new-game');await page.locator('#game-choice[open]').waitFor();await shot('new-game');
  assert.equal(await page.locator('#choice-endless').count(),before?1:0);
  await page.keyboard.press('Escape');await page.locator('#game-choice').waitFor({state:'hidden'});
  await tap(page,'#tab-modes');await page.locator('#hub[data-screen=modes]').waitFor();await shot('modes');
  assert.equal(await page.locator('#endless-open').count(),before?1:0);
  assert.equal(await page.locator('#challenge-open').isEnabled(),true);
  await tap(page,'#tab-calendar');await page.locator('#hub[data-screen=calendar]').waitFor();
  await page.locator('#daily-goals summary').tap();
  await page.locator('[data-quest="1"]').scrollIntoViewIfNeeded();await shot('daily-goals');
  assert.equal(await page.locator('[data-quest="0"]').isDisabled(),true);
  if(!before)assert.doesNotMatch(await page.locator('#daily-goals').innerText(),/Endless|забеге/i);
  await tap(page,'#tab-profile');await page.locator('#hub[data-screen=profile]').waitFor();
  assert.match(await page.locator('.profile-records').innerText(),/250/);
  await page.locator('.profile-records').scrollIntoViewIfNeeded();await shot('profile-history');
  await tap(page,'#tab-home');await page.locator('#hub[data-screen=home]').waitFor();
  if(!before){
   await tap(page,'#continue-game');
   await page.locator('#board:visible').waitFor();
   assert.equal((await save(page)).attempt.mode,'campaign');
   assert.equal(await page.locator('#root-tabs').isHidden(),true);
   await page.reload();await ready(page);
   assert.deepEqual((await save(page)).meta.inactive.endless,{attempt:seed.attempt,result:null});
  }
  cases.push({viewport:[width,height],language,theme,parked:!before});
  await context.close();
 }

 const context=await browser.newContext(contextOptions(320,568));
 const revealSeed=structuredClone(clean);
 revealSeed.settings.reducedMotion=true;
 revealSeed.attempt={...revealSeed.attempt,id:'reveal-playtest',puzzleId:'cm-own-01-025',
  trayOrder:Array.from({length:10},(_,i)=>`t${i}`),placements:{0:'t1',1:'t2',3:'t8'},boardRevision:2};
 const page=await open(context,revealSeed);
 await page.waitForSelector('#help:enabled');
 await tap(page,'#board [data-cell="0"]');
 await tap(page,'#help');await page.locator('#reveal:enabled').waitFor();
 await tap(page,'#reveal');await page.locator('#apply-help:enabled').waitFor();
 assert.deepEqual((await save(page)).attempt.placements,revealSeed.attempt.placements);
 await page.screenshot({path:resolve(out,'reveal-preview.png')});
 await tap(page,'#apply-help');
 await page.locator('#help-dialog').waitFor({state:'hidden'});await page.locator('#help:enabled').waitFor();
 const applied=await save(page);
 assert.equal(applied.profile.coins,60);
 assert.deepEqual(applied.attempt.placements,before?{0:'t8'}:{0:'t8',1:'t2'});
 await page.screenshot({path:resolve(out,'reveal-result.png')});
 await tap(page,'#undo');await page.locator('#help:enabled').waitFor();
 assert.deepEqual((await save(page)).attempt.placements,revealSeed.attempt.placements);
 assert.equal((await save(page)).profile.coins,60);
 await context.close();

 const unlocked=await browser.newContext(contextOptions(390,844));
 const threshold=oldRun('ru','light');
 threshold.profile.solvedIds.pop();threshold.profile.campaignCursor=14;
 threshold.meta={...clean.meta,screen:'play'};threshold.career=structuredClone(clean.career);
 const board15=banks[0].boards[14];
 threshold.attempt={...clean.attempt,puzzleId:board15.puzzleId,trayOrder:board15.tray.map((_,i)=>'t'+i)};
 const thresholdPage=await open(unlocked,threshold);
 const solve=async page=>{
  const {attempt}=await save(page);
  const bank=banks[attempt.contentVersion-1],puzzle=bank.boards.find(p=>p.puzzleId===attempt.puzzleId);
  const answer=bank.answers[puzzle.puzzleId].answer;
  const used=new Set();
  for(const cell of puzzle.cells.filter(c=>c.given===undefined)){
   const index=puzzle.tray.findIndex((n,i)=>n===answer[cell.id]&&!used.has(i));
   assert.notEqual(index,-1);used.add(index);
   await page.locator(`[data-token="t${index}"]:enabled`).tap();
   await page.locator(`#board [data-cell="${cell.id}"]:enabled`).tap();
  }
  await page.locator('#result:visible').waitFor();
  return (await save(page)).result;
 };
 const award=await solve(thresholdPage);
 assert.deepEqual(award.unlockedModes,before?['challenge','endless']:['challenge']);
 assert.equal(award.baseCoins,config.difficultyRewards[board15.difficulty].coins);
 await thresholdPage.screenshot({path:resolve(out,'campaign-15-unlock.png')});
 if(!before){
  await tap(thresholdPage,'#result-unlock');await thresholdPage.locator('#level').filter({hasText:'Испытание'}).waitFor();
  assert.equal((await save(thresholdPage)).attempt.freeTrack,'challenge');
 }
 await unlocked.close();

 const free=await browser.newContext(contextOptions(390,844));
 const freeSeed=oldRun('ru','dark');
 freeSeed.meta={...clean.meta,screen:'modes'};freeSeed.attempt=clean.attempt;freeSeed.career=structuredClone(clean.career);
 const freePage=await open(free,freeSeed);
 await freePage.locator('#free-open:enabled').tap();await freePage.locator('#board:visible').waitFor();
 const freeResult=await solve(freePage);
 assert.equal(freeResult.relaxGoalProgress,1);
 assert.equal(await freePage.locator('#relax-goal-result').isHidden(),!before);
 await freePage.screenshot({path:resolve(out,'relax-first-win.png')});
 await free.close();

 if(!before){
  const android=await browser.newContext(contextOptions(320,568));
  await android.addInitScript(()=>{
   window.androidBridge={};
   const listeners=new Map();
   window.Capacitor={
    PluginHeaders:[
     {name:'App',methods:[{name:'addListener'},{name:'removeListener'},{name:'getState',rtype:'promise'},{name:'minimizeApp',rtype:'promise'}]},
     {name:'GameStorage',methods:['get','set','remove','list','compareAndSet'].map(name=>({name,rtype:'promise'}))},
    ],
    nativeCallback(_plugin,method,options,callback){
     if(method==='addListener')listeners.set(options.eventName,callback);
     if(method==='removeListener')listeners.delete(options.eventName);
     return options.eventName;
    },
    async nativePromise(plugin,method,options){
     if(plugin==='App')return {isActive:true};
     if(method==='list')return {keys:Object.keys(localStorage).filter(k=>k.startsWith(options.prefix))};if(method==='compareAndSet'){for(const [key,value] of Object.entries(options.expected))if(localStorage.getItem(key)!==value)return {applied:false};for(const entry of options.puts)localStorage.setItem(entry.key,entry.value);for(const key of options.remove)localStorage.removeItem(key);return {applied:true};}
     if(method==='get')return {value:localStorage.getItem(options.key)};
     if(method==='set')localStorage.setItem(options.key,options.value);
     if(method==='remove')localStorage.removeItem(options.key);
    },
   };
   window.testBack=()=>listeners.get('backButton')({canGoBack:false});
  });
  const native=await open(android,oldRun('en','dark'));
  assert.equal(await native.locator('html').getAttribute('data-host'),'android');
  const back=()=>native.evaluate(()=>window.testBack());
  await tap(native,'#new-game');await native.locator('#game-choice[open]').waitFor();
  await back();await native.locator('#game-choice').waitFor({state:'hidden'});
  await tap(native,'#tab-modes');await native.locator('#hub[data-screen=modes]').waitFor();
  await back();await native.locator('#hub[data-screen=home]').waitFor();
  await tap(native,'#continue-game');await native.locator('#board:visible').waitFor();
  await back();await native.locator('#pause-dialog[open]').waitFor();
  await back();await native.locator('#pause-dialog').waitFor({state:'hidden'});
  assert.deepEqual((await save(native)).meta.inactive.endless.attempt.placements,{4:'t2'});
  await android.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({browser:browser.version(),before,cases,unlock:award.unlockedModes,
  androidBack:before?'not run':'Capacitor bridge simulation',reveal:{
  original:revealSeed.attempt.placements,applied:applied.attempt.placements,coins:applied.profile.coins}},null,2)+'\n');
 console.log(`CORE-00 ${before?'baseline':'browser PASS'} · ${cases.length} viewport/language/theme combinations, resume, records, Reveal and Undo`);
} finally {await browser.close();server.close();}
