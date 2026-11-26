import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const root=resolve(process.env.FEEL_WEB??'dist');
const out=resolve(process.env.FEEL_OUT??'.test-output/feel');
const baseline=process.env.FEEL_BASELINE==='1', capture=process.env.FEEL_CAPTURE==='1';
await mkdir(out,{recursive:true});
const sources=['v09','v2'];
const puzzles=new Map(), answers={};
for(const version of sources){
 const path='docs/spec/product/content_'+version;
 for(const puzzle of JSON.parse(await readFile(path+'/boards.json','utf8')))puzzles.set(puzzle.puzzleId,puzzle);
 Object.assign(answers,JSON.parse(await readFile(path+'/author_solutions.json','utf8')));
}
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(path===root||path.startsWith(root+sep));
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port;
let browser;
const traces={}, errors=[], clips=[];
const key='crossmath.save.v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const log=page=>page.evaluate(()=>window.feelEvents.slice());
const current=page=>page.locator('html[data-state=ready]').waitFor();
const settle=page=>page.waitForFunction(()=>!document.querySelector('#pause').disabled);
const delay=(page,ms=capture?235:120)=>page.waitForTimeout(ms);

async function tap(page,selector){
 const target=page.locator(selector);
 await target.waitFor({state:'visible'});
 const pt=await target.evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return {x,y,hit:el.contains(document.elementFromPoint(x,y)),enabled:!el.disabled};
 });
 assert.ok(pt.hit&&pt.enabled,selector+' is visible, enabled and reachable: '+JSON.stringify(pt));
 await page.touchscreen.tap(pt.x,pt.y);
 await settle(page);
}
const cell=id=>'[data-cell="'+id+'"]', token=id=>'[data-token="'+id+'"]';
function solution(p,exclude=[]){
 const placements={};
 for(const position of p.cells.filter(c=>c.given===undefined&&!exclude.includes(c.id))){
  const value=answers[p.puzzleId].answer[position.id];
  const serial=p.tray.findIndex((v,i)=>v===value&&!Object.values(placements).includes('t'+i));
  assert.notEqual(serial,-1);
  placements[position.id]='t'+serial;
 }
 return placements;
}
async function fill(page,pace=false){
 const p=puzzles.get((await state(page)).attempt.puzzleId);
 for(const [id,chip] of Object.entries(solution(p))){
  const placed=(await state(page)).attempt.placements[id];
  if(placed===chip)continue;
  const button=page.locator(token(chip));
  await button.scrollIntoViewIfNeeded();
  await tap(page,token(chip));
  if(pace)await delay(page,76);
  await tap(page,cell(id));
  if(pace)await delay(page,99);
 }
}
function profileWith(base,settings={}){
 const copy=structuredClone(base);
 Object.assign(copy.settings,{sound:true,vibration:true},settings);
 return copy;
}
async function pageFor(seed,name,viewport={width:390,height:844},noVibration=false){
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,timezoneId:'UTC'});
 // Observe actual browser audio starts and landing WAAPI completion. Vibration is a stubbed API, not a motor measurement.
 await context.addInitScript(({seed,key,noVibration})=>{
  if(seed&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
  const now=()=>performance.timeOrigin+performance.now();
  window.feelEvents=[];
  const trace=(type,extra={})=>window.feelEvents.push({type,at:now(),...extra});
  window.addEventListener('pointerdown',event=>{
   const item=event.target.closest?.('button');
   trace('input',{target:item?.id||item?.dataset.cell||item?.dataset.token||null});
  },true);
  Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:noVibration?undefined:pattern=>{
   if(pattern!==0)trace('vibration',{pattern});return true;
  }});
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){
   trace('audio',{duration:this.buffer.duration});
   return start.apply(this,args);
  };
  const play=Animation.prototype.play;
  Animation.prototype.play=function(){
   const result=play.call(this);
   const target=this.effect?.target,duration=this.effect?.getTiming().duration;
   if(target?.classList.contains('tile')&&[42,82].includes(duration)){
    this.finished.then(()=>trace('contact',{cell:target.parentElement?.dataset.cell}),()=>{});
   }
   if(target?.classList.contains('equation-line')&&duration===230)trace('line');
   return result;
  };
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){
   const result=connect.call(this,destination,...args);
   if(window.feelCapture&&destination===this.context.destination){
    const capture=window.feelCapture;
    if(!capture.recorder){
     capture.bus=this.context.createMediaStreamDestination();
     const recorder=new MediaRecorder(capture.bus.stream,{mimeType:'audio/webm;codecs=opus'});
     capture.recorder=recorder;
     recorder.ondataavailable=event=>capture.chunks.push(event.data);
     capture.started=now();
     recorder.start();
    }
    connect.call(this,capture.bus);
   }
   return result;
  };
  window.endFeelAudio=async()=>{
   const capture=window.feelCapture;
   if(!capture?.recorder)return null;
   await new Promise(done=>{capture.recorder.onstop=done;capture.recorder.stop();});
   const bytes=new Uint8Array(await new Blob(capture.chunks).arrayBuffer());
   let data='';
   for(let index=0;index<bytes.length;index+=16384)data+=String.fromCharCode(...bytes.subarray(index,index+16384));
   return {started:capture.started,data:btoa(data)};
  };
 },{seed,key,noVibration});
 const page=await context.newPage();
 page.setDefaultTimeout(8000);
 page.on('pageerror',error=>errors.push({scene:name,message:error.message}));
 await page.goto(url);
 try { await current(page); }
 catch(error){
  console.error(name,errors,await page.locator('#startup').innerText(),await page.locator('html').getAttribute('data-state'));
  throw error;
 }
 return {context,page};
}

async function record(page,name){
 if(!capture)return async()=>{};
 const directory=resolve(out,name);
 await mkdir(directory,{recursive:true});
 const frames=[];
 const session=await page.context().newCDPSession(page);
 session.on('Page.screencastFrame',frame=>{
  frames.push({at:frame.metadata.timestamp,data:frame.data});
  void session.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});
 });
 await page.evaluate(()=>{window.feelCapture={chunks:[]};});
 await session.send('Page.startScreencast',{format:'jpeg',quality:90,everyNthFrame:1});
 await page.waitForTimeout(180);
 return async()=>{
  await page.waitForTimeout(170);
  const audio=await page.evaluate(()=>window.endFeelAudio());
  await session.send('Page.stopScreencast');
  await session.detach();
  assert.ok(frames.length>8&&audio,name+' captured video and real Web Audio');
  const order=frames.filter((f,i)=>Number.isFinite(f.at)&&(!i||f.at>frames[i-1].at));
  assert.ok(order.length>8&&order.at(-1).at>order[0].at);
  const entries=await Promise.all(order.map(async(frame,index)=>{
   const file=String(index).padStart(5,'0')+'.jpg';
   await writeFile(resolve(directory,file),Buffer.from(frame.data,'base64'));
   return 'file '+file+'\nduration '+Math.max(.001,(order[index+1]?.at??frame.at+.250)-frame.at).toFixed(5);
  }));
  await writeFile(resolve(directory,'frames.txt'),entries.join('\n')+'\nfile '+String(entries.length-1).padStart(5,'0')+'.jpg\n');
  await writeFile(resolve(directory,'audio.webm'),Buffer.from(audio.data,'base64'));
  const timing={firstFrame:order[0].at*1000,audioStart:audio.started,frames:order.length,seconds:order.at(-1).at-order[0].at+.25};
  await writeFile(resolve(directory,'timing.json'),JSON.stringify(timing,null,2)+'\n');
  clips.push({name,...timing});
 };
}
async function checkpoint(page,name){
 const saved=await state(page);
 const bounds=await page.evaluate(()=>{
  const rect=id=>{
   const node=document.querySelector(id);
   if(!node||node.hidden)return null;
   const r=node.getBoundingClientRect();
   return [r.x,r.y,r.width,r.height];
  };
  return {board:rect('#board'),next:rect('#next'),score:rect('#run-status'),font:getComputedStyle(document.documentElement).fontSize,
   width:document.documentElement.scrollWidth,viewport:[innerWidth,innerHeight]};
 });
 if(bounds.next){
  const [x,y,w,h]=bounds.next;
  assert.ok(x>=0&&y>=0&&x+w<=bounds.viewport[0]+1&&y+h<=bounds.viewport[1]+1,JSON.stringify(bounds));
 }
 assert.equal(bounds.font,'16px');assert.equal(bounds.width,bounds.viewport[0]);
 traces[name]={bounds,result:saved.result,revision:saved.revision,hints:saved.profile.hintCredits,coins:saved.profile.coins,
  score:saved.career.run?.score,lives:saved.attempt.lives};
}
async function dragOff(page,selector){
 const from=await page.locator(selector).boundingBox();
 const session=await page.context().newCDPSession(page);
 const touch=(type,touchPoints)=>session.send('Input.dispatchTouchEvent',{type,touchPoints});
 await touch('touchStart',[{x:from.x+from.width/2,y:from.y+from.height/2}]);
 await touch('touchMove',[{x:155,y:Math.max(8,from.y-65)}]);
 await delay(page);
 await touch('touchMove',[{x:2,y:3}]);
 await delay(page);
 await touch('touchCancel',[]);
 await session.detach();
 await page.locator('#ghost').waitFor({state:'hidden'});
}
function seedBoard(base,p,placements={}){
 const seeded=profileWith(base);
 Object.assign(seeded.attempt,{id:'feel-'+p.puzzleId,puzzleId:p.puzzleId,contentVersion:p.contentVersion,
  rulesetVersion:p.rulesetVersion,placements,trayOrder:p.tray.map((_,i)=>'t'+i)});
 return seeded;
}
const audioCount=events=>events.filter(e=>e.type==='audio').length;

try{
 browser=await chromium.launch({headless:true});
 const blank=await pageFor(null,'initial');
 const base=await state(blank.page);
 await blank.context.close();

 const campaign=await pageFor(profileWith(base),'campaign');
 const endCampaign=await record(campaign.page,'campaign');
 for(let field=1;field<=8;field++){
  if(field>1){await tap(campaign.page,'#next');await delay(campaign.page);}
  await fill(campaign.page,true);
  await campaign.page.locator('#result:visible').waitFor();
  await checkpoint(campaign.page,'field-'+field);
  const withPart=[3,8].includes(field);
  if(withPart&&capture)await campaign.page.waitForTimeout(1480);
  else await delay(campaign.page,530);
 }
 const campaignEvents=await log(campaign.page);
 const eighth=await state(campaign.page);
 if(!baseline){
  const positive=campaignEvents.filter(e=>e.type==='vibration');
  assert.ok(positive.some(e=>e.pattern===5));
  const contact=campaignEvents.find(e=>e.type==='contact');
  assert.ok(contact,JSON.stringify(campaignEvents.slice(0,12)));
  const impact=campaignEvents.find(e=>e.type==='audio'&&e.at>=contact.at);
  assert.ok(impact&&impact.at-contact.at<=17.5,JSON.stringify({contact,impact}));
 }
 await endCampaign();
 traces.campaignEvents=campaignEvents;
 await campaign.context.close();

 const second=puzzles.get('cm-own-01-002');
 const drillSeed=seedBoard(base,second);
 drillSeed.attempt.trayOrder.reverse();
 const drill=await pageFor(drillSeed,'wrong-tools');
 const endDrill=await record(drill.page,'wrong-tools');
 const before=await state(drill.page);
 await dragOff(drill.page,token('t0'));
 assert.equal((await state(drill.page)).attempt.boardRevision,before.attempt.boardRevision);
 await tap(drill.page,token('t0'));await tap(drill.page,cell(2));await delay(drill.page);
 assert.ok(await drill.page.locator('#note').evaluate(el=>el.classList.contains('problem')));
 await tap(drill.page,'#sort');await delay(drill.page);
 await tap(drill.page,'#undo');await delay(drill.page);
 await tap(drill.page,cell(2));await tap(drill.page,'#return');await delay(drill.page);
 traces.toolEvents=await log(drill.page);
 if(!baseline){
  const durations=traces.toolEvents.filter(e=>e.type==='audio').map(e=>Math.round(e.duration*1000));
  for(const duration of [107,81,77,66])assert.ok(durations.includes(duration),JSON.stringify(durations));
 }
 await endDrill();await drill.context.close();

 let crossing;
 for(const puzzle of puzzles.values()){
  const blanks=puzzle.cells.filter(c=>c.given===undefined);
  const cross=blanks.find(c=>puzzle.equations.filter(e=>e.cells.includes(c.id)).length===2);
  const other=cross&&blanks.find(c=>c!==cross&&!puzzle.equations.some(e=>e.cells.includes(c.id)&&e.cells.includes(cross.id)));
  if(other&&puzzle.width<=9&&puzzle.height<=9){crossing={puzzle,cross,other};break;}
 }
 assert.ok(crossing);
 const {puzzle,cross,other}=crossing;
 const crossLayout=solution(puzzle,[cross.id,other.id]);
 const between=await pageFor(seedBoard(base,puzzle,crossLayout),'crossing-exchange');
 const endCross=await record(between.page,'crossing-exchange');
 let currentEvents=await log(between.page);
 const chip=solution(puzzle)[cross.id];
 await tap(between.page,token(chip));await delay(between.page,100);
 await tap(between.page,cell(cross.id));await delay(between.page,270);
 const lines=(await log(between.page)).slice(currentEvents.length).filter(e=>e.type==='line');
 assert.equal(lines.length,2);
 const source=Object.keys(crossLayout)[0];
 currentEvents=await log(between.page);
 await tap(between.page,cell(source));await tap(between.page,cell(cross.id));await delay(between.page,320);
 const exchanged=await state(between.page);
 assert.equal(exchanged.attempt.placements[source],chip);
 assert.equal(exchanged.attempt.placements[cross.id],crossLayout[source]);
 traces.crossingExchange={board:puzzle.puzzleId,cell:cross.id,lines:lines.length,events:await log(between.page),coins:exchanged.profile.coins};
 await endCross();await between.context.close();

 const dailySeed=profileWith(eighth);
 dailySeed.meta.screen='home';
 const daily=await pageFor(dailySeed,'daily');
 const endDaily=await record(daily.page,'daily');
 await tap(daily.page,'#daily-primary');
 await tap(daily.page,'#daily-play');
 const day=await state(daily.page);
 assert.equal(day.attempt.mode,'daily');
 const dailyPuzzle=puzzles.get(day.attempt.puzzleId);
 const dailySolution=solution(dailyPuzzle);
 const entries=Object.entries(dailySolution);
 const first=entries[0], secondDifferent=entries.find(([,id])=>dailyPuzzle.tray[Number(id.slice(1))]!==dailyPuzzle.tray[Number(first[1].slice(1))]);
 assert.ok(secondDifferent);
 for(const [id,chip] of entries){
  const swap=id===first[0]?secondDifferent[1]:id===secondDifferent[0]?first[1]:chip;
  await daily.page.locator(token(swap)).scrollIntoViewIfNeeded();
  await tap(daily.page,token(swap));await tap(daily.page,cell(id));
  if((await state(daily.page)).attempt.lives<3)break;
 }
 assert.equal((await state(daily.page)).attempt.lives,2);
 await checkpoint(daily.page,'daily-error');await delay(daily.page,420);
 while(Object.keys((await state(daily.page)).attempt.placements).length)await tap(daily.page,'#undo');
 await fill(daily.page,false);
 await daily.page.locator('#result:visible').waitFor();
 await checkpoint(daily.page,'daily-win');traces.dailyEvents=await log(daily.page);
 await delay(daily.page,750);
 await endDaily();await daily.context.close();

 const endlessSeed=profileWith(base);
 endlessSeed.profile.solvedIds=[...puzzles.keys()].slice(0,15);
 endlessSeed.meta.screen='home';
 const endless=await pageFor(endlessSeed,'endless');
 const endEndless=await record(endless.page,'endless');
 await tap(endless.page,'#tab-modes');await tap(endless.page,'#endless-open');
 await fill(endless.page,false);
 const stage=await state(endless.page);
 const stageBoard=puzzles.get(stage.attempt.puzzleId);
 const stageLayout=Object.entries(stage.attempt.placements);
 const [a,b]=[stageLayout[0],stageLayout.find(([,id])=>stageBoard.tray[Number(id.slice(1))]!==stageBoard.tray[Number(stageLayout[0][1].slice(1))])];
 assert.ok(b);
 await tap(endless.page,cell(a[0]));await tap(endless.page,cell(b[0]));
 assert.equal(await endless.page.locator('#board .op.right,#board .op.invalid').count(),0);
 await tap(endless.page,'#submit');await delay(endless.page,270);
 assert.equal((await state(endless.page)).attempt.lives,2);
 const n=audioCount(await log(endless.page));
 await tap(endless.page,'#submit');await delay(endless.page);
 assert.equal(audioCount(await log(endless.page)),n);
 await tap(endless.page,'#undo');await delay(endless.page,190);
 await tap(endless.page,'#submit');
 await checkpoint(endless.page,'endless-win');
 if(!baseline)assert.equal(await endless.page.locator('#run-status[data-counting]').count(),1);
 await delay(endless.page,680);
 await checkpoint(endless.page,'endless-settled');
 assert.deepEqual(traces['endless-win'].bounds,traces['endless-settled'].bounds);
 assert.ok((await state(endless.page)).career.run.score>0);
 await endEndless();traces.endlessEvents=await log(endless.page);await endless.context.close();

 if(capture){
  const rankSeed=profileWith(base);
  rankSeed.profile.xp=99;
  const rank=await pageFor(rankSeed,'rank');
  const endRank=await record(rank.page,'rank');
  await tap(rank.page,token('t0'));await delay(rank.page);
  await tap(rank.page,cell(2));
  await checkpoint(rank.page,'rank-recording');
  assert.equal((await state(rank.page)).result.rankUps,1);
  await delay(rank.page,920);
  await endRank();traces.rankEvents=await log(rank.page);await rank.context.close();
 }

 if(!baseline){
  for(const [width,height] of [[320,480],[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark']){
   const rankSeed=profileWith(base,{language,theme,sound:false,vibration:false});
   rankSeed.profile.xp=99; // Rank 1 threshold is 100; the real committed win triggers rank-up.
   const view=await pageFor(rankSeed,'rank-'+language+'-'+theme,{width,height});
   await tap(view.page,token('t0'));await tap(view.page,cell(2));
   await view.page.locator('#result:visible').waitFor();
   const name='rank-'+width+'x'+height+'-'+language+'-'+theme;
   await checkpoint(view.page,name+'-start');
   assert.ok((await state(view.page)).result.rankUps>0);
   await delay(view.page,660);
   await checkpoint(view.page,name+'-end');
   assert.deepEqual(traces[name+'-start'].bounds,traces[name+'-end'].bounds);
   assert.equal(traces[name+'-start'].revision,traces[name+'-end'].revision);
   await view.page.screenshot({path:resolve(out,name+'.png')});
   await view.context.close();
  }
  for(const [sound,vibration,noMotor] of [[false,false,false],[true,false,false],[false,true,false],[true,true,false],[true,true,true]]){
   const view=await pageFor(profileWith(base,{sound,vibration,reducedMotion:true}),'settings',undefined,noMotor);
   await tap(view.page,token('t0'));await tap(view.page,cell(2));await delay(view.page);
   const events=await log(view.page);
   assert.equal(events.some(e=>e.type==='audio'),sound);
   assert.equal(events.some(e=>e.type==='vibration'),vibration&&!noMotor);
   assert.equal(await view.page.locator('#result-rewards[data-counting]').count(),0);
   const won=await state(view.page);
   await view.page.reload();await current(view.page);await delay(view.page);
   assert.equal((await log(view.page)).length,0);
   assert.deepEqual((await state(view.page)).result,won.result);
   await view.context.close();
  }
  const retry=await pageFor(profileWith(base,{reducedMotion:true}),'retry');
  await tap(retry.page,token('t0'));
  const before=await state(retry.page);
  await retry.page.evaluate(key=>{
   const set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){
    if(name===key&&window.breakSave)throw Error('scripted write error');
    return set.call(this,name,value);
   };
   window.breakSave=true;
  },key);
  await retry.page.locator(cell(2)).tap();
  await retry.page.locator('#save-error:visible').waitFor();
  assert.equal((await state(retry.page)).revision,before.revision);
  assert.ok(!(await log(retry.page)).some(e=>e.type==='audio'&&e.duration>.2));
  await retry.page.evaluate(()=>{window.breakSave=false;});
  await retry.page.locator('#retry').tap();
  await retry.page.locator('#result:visible').waitFor();
  await delay(retry.page);
  assert.equal((await log(retry.page)).filter(e=>e.type==='audio'&&e.duration>.2).length,1);
  assert.equal((await state(retry.page)).profile.coins,before.profile.coins+10);
  await retry.context.close();

  const interrupted=await pageFor(profileWith(base),'interruption-and-skip');
  await tap(interrupted.page,token('t0'));await tap(interrupted.page,cell(2));
  assert.equal(await interrupted.page.locator('#result-rewards[data-counting]').count(),1);
  const settled=await state(interrupted.page);
  await interrupted.page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await interrupted.page.locator('#result-rewards[data-counting]').count(),0);
  const count=audioCount(await log(interrupted.page));
  await interrupted.page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:false});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await delay(interrupted.page,500);
  assert.equal(audioCount(await log(interrupted.page)),count);
  assert.deepEqual((await state(interrupted.page)).result,settled.result);
  await tap(interrupted.page,'#next');
  const played=await state(interrupted.page);
  assert.equal(played.attempt.puzzleId,'cm-own-01-002');
  assert.equal(played.profile.coins,settled.profile.coins);
  traces.interruptionEvents=await log(interrupted.page);
  await interrupted.context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({source:process.env.GITHUB_SHA,baseline,browser:browser.version(),traces,clips},null,2)+'\n');
 console.log('FEEL-01 browser PASS · '+(baseline?'baseline comparison':'campaign, tools, crossing, Daily, Endless, layout, settings and save retry'));
}finally{
 await browser?.close();
 server.close();
}
