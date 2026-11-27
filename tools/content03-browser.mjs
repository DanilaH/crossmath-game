import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from '@playwright/test';
const root=resolve(process.env.CONTENT03_WEB??'dist'),out=resolve(process.env.CONTENT03_OUTPUT??'.test-output/content03-ui');
const banks=JSON.parse(await readFile('docs/experiments/content03/banks.json','utf8'));
const answers=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  assert.ok(path===root||path.startsWith(root+sep));
  res.setHeader('Content-Type',mime[extname(path)]??'text/html');
  res.end(await readFile(path===root?resolve(root,'index.html'):path));
 }catch{res.writeHead(404).end();}
});
const errors=[],rows=[],key='crossmath.content03.lab.v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const ready=async page=>{
 try{await page.locator('html[data-state=ready]').waitFor();}
 catch(error){throw Error(await page.locator('#startup').innerText(),{cause:error});}
};
const idle=page=>page.locator('#lab-bank:enabled').waitFor();
const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
async function tap(page,selector){
 const point=await page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
  return {x,y,hit:el.contains(document.elementFromPoint(x,y))};
 });
 assert.ok(point.hit,selector);await page.touchscreen.tap(point.x,point.y);await idle(page);
}
async function geometry(page){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const measure=await page.evaluate(()=>{
  const board=document.querySelector('#board'),port=board.parentElement,r=board.getBoundingClientRect(),p=port.getBoundingClientRect();
  const numbers=[...board.querySelectorAll('.given,.placed .tile')].map(node=>{
   const range=document.createRange();range.selectNodeContents(node);
   return {text:node.textContent,width:range.getBoundingClientRect().width,inside:node.clientWidth};
  });
  const cells=[...board.querySelectorAll('[data-cell]')];
  const tappable=cells.every(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
  const button=document.querySelector('#help').getBoundingClientRect();
  return {board:[r.x,r.y,r.width,r.height],port:[p.x,p.y,p.width,p.height],minTarget:Math.min(...cells.map(n=>n.getBoundingClientRect().width)),
   font:getComputedStyle(document.documentElement).fontSize,numbersFit:numbers.every(n=>n.width<=n.inside+1),tappable,
   fits:r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1,
   helpVisible:button.bottom<=innerHeight,pageWidth:document.documentElement.scrollWidth};
 });
 assert.equal(measure.fits,true,JSON.stringify(measure));assert.equal(measure.numbersFit,true,JSON.stringify(measure));
 assert.equal(measure.tappable,true);assert.equal(measure.helpVisible,true);assert.equal(measure.font,'16px');
 return measure;
}
await mkdir(out,{recursive:true});
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const url=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch();
 for(const [width,height] of [[320,480],[320,568],[390,844]])for(const theme of ['light','dark']){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await ready(page);
  await page.locator('#home').tap();await page.locator('#hub[data-screen=home]').waitFor();
  await page.locator('#tab-profile').tap();await page.locator('#extra-fields summary').tap();await page.locator('#content-lab-open:enabled').waitFor();
  const before=await page.evaluate(()=>localStorage.getItem('crossmath.save.v1'));
  await page.locator('#content-lab-open').tap();await ready(page);await idle(page);
  if(theme==='dark'){await tap(page,'#pause');await page.locator('#settings-options summary').tap();await page.locator('#theme').check();await idle(page);await tap(page,'#resume');}
  for(const bank of Object.keys(banks)){
   await page.locator('#lab-bank').selectOption(bank);await idle(page);
   for(let i=0;i<banks[bank].length;i++){
    const p=banks[bank][i];assert.equal((await state(page)).attempt.puzzleId,p.puzzleId);
    rows.push({width,height,theme,bank,id:p.puzzleId,...await geometry(page)});
    if(['easy9','daily','ops'].includes(bank)&&[0,8,19,29,39].includes(i))await page.screenshot({path:resolve(out,`${width}x${height}-${theme}-${bank}-${i+1}.png`)});
    if(i<banks[bank].length-1)await tap(page,'#lab-next');
   }
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('crossmath.save.v1')),before,'Lab never writes the gameplay save');
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:320,height:568}}});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'content-lab.html');await ready(page);await idle(page);
 const p=banks.easy9[0],first=p.cells.find(c=>c.given===undefined),answer=answers[p.puzzleId].answer;
 const wrong=p.tray.findIndex(n=>n!==answer[first.id]);
 await tap(page,`[data-token="t${wrong}"]`);await tap(page,`#board [data-cell="${first.id}"]`);
 await page.screenshot({path:resolve(out,'wrong.png')});
 await tap(page,'#undo');
 // Real drag dispatch uses browser touch events without scrolling the target into view.
 const good=p.tray.findIndex(n=>n===answer[first.id]);
 const from=await page.locator(`[data-token="t${good}"]`).evaluate(rect),to=await page.locator(`#board [data-cell="${first.id}"]`).evaluate(rect);
 const session=await ctx.newCDPSession(page),a={x:from.x+from.width/2,y:from.y+from.height/2},b={x:to.x+to.width/2,y:to.y+to.height/2};
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)/2,y:a.y+(b.y-a.y)/2}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(page);
 assert.equal((await state(page)).attempt.placements[first.id],'t'+good);
 const saved=await state(page);
 await page.reload();await ready(page);await idle(page);assert.deepEqual(await state(page),saved);
 while((await state(page)).attempt.status==='playing'){
  await tap(page,'#help');await page.locator('#help-dialog[open]').waitFor();
  await page.waitForTimeout(160);await tap(page,'#apply-help');
 }
 await page.locator('#result:visible').waitFor();await page.screenshot({path:resolve(out,'win.png')});
 await page.waitForTimeout(700);
 const video=page.video();await ctx.close();await video.saveAs(resolve(out,'easy9-1x.webm'));
 const dailyContext=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,
  recordVideo:{dir:out,size:{width:320,height:568}}});
 const dailyPage=await dailyContext.newPage();dailyPage.on('pageerror',e=>errors.push(e.message));
 await dailyPage.goto(url+'content-lab.html');await ready(dailyPage);await idle(dailyPage);
 await dailyPage.locator('#lab-bank').selectOption('daily');await idle(dailyPage);
 while((await state(dailyPage)).attempt.status==='playing'){
  await tap(dailyPage,'#help');await dailyPage.locator('#help-dialog[open]').waitFor();
  await dailyPage.waitForTimeout(140);await tap(dailyPage,'#apply-help');
 }
 await dailyPage.locator('#result:visible').waitFor();await dailyPage.waitForTimeout(600);
 const dailyVideo=dailyPage.video();await dailyContext.close();await dailyVideo.saveAs(resolve(out,'daily-1x.webm'));
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({status:'PASS',browser:browser.version(),views:rows.length,rows,episode:{tap:true,drag:true,wrong:true,undo:true,explain:true,coldRestore:true}},null,2)+'\n');
 console.log('CONTENT-03 browser PASS · '+rows.length+' boards, touch/drag, error, Undo, Explain, cold restore');
}finally{await browser?.close();server.close();}
