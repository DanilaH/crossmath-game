import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createServer as viteServer} from 'vite';
const root=resolve('dist'),out=resolve('.test-output/ui32');await mkdir(out,{recursive:true});
const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(p!==root&&!p.startsWith(root+sep))throw Error('path');const f=p===root?root+'/index.html':p;res.setHeader('Content-Type',mime[extname(f)]??'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}});
const vite=await viteServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
const {createAttempt}=await vite.ssrLoadModule('/src/core/engine.ts');
const {decodeSave}=await vite.ssrLoadModule('/src/app/model.ts');
const {getPuzzle,referenceBoards,additionalBoards,campaignSequence}=await vite.ssrLoadModule('/src/content/catalog.ts');
const {joinLeague}=await vite.ssrLoadModule('/src/meta/league.ts');
const browser=await chromium.launch();const rows=[],probes=[],errors=[],failures=[];
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const ready=p=>p.locator('html[data-state=ready]').waitFor({timeout:8000});
const snapshot=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
const waitScreen=(p,s)=>p.waitForFunction(s=>JSON.parse(localStorage.getItem('crossmath.save.v1')).meta.screen===s,s);
async function tap(p,sel){const l=p.locator(sel).first();await l.waitFor({state:'visible',timeout:4000});await l.tap({timeout:4000});await p.waitForTimeout(120);}
async function episode(seed,w,h,lang,theme,record=false){const s=structuredClone(seed);Object.assign(s.settings,{language:lang,theme,reducedMotion:false,sound:false,vibration:false});const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'no-preference',...(record?{recordVideo:{dir:out,size:{width:w,height:h}}}:{})});await context.addInitScript(s=>{if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));},s);const p=await context.newPage();p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push({message:e.message,scene:seed.meta.screen}));await p.clock.setFixedTime(new Date(s.meta.effectiveDay+'T12:00:00Z'));await p.goto(url);await ready(p);return{context,p};}
function homeSeed(){const s=structuredClone(fixtures['after-15']);s.attempt=createAttempt(getPuzzle(campaignSequence('content-v2')[15]),'audit-playing');s.result=null;s.meta.screen='home';s.meta.activeSlot='campaign';return decodeSave(s);}
function playSeed(puzzle){const s=homeSeed();s.meta.screen='play';s.attempt=createAttempt(puzzle,'audit-play-'+puzzle.puzzleId);s.attempt.trayOrder.reverse();return decodeSave(s);}
async function view(p,name,capture=false){await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.querySelector('#tray').getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect.getTiming().iterations)).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const row=await p.evaluate(()=>{
 const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getClientRects().length>0;
 const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
 const active=dialog??document.querySelector('#shell')??document.body;
 const overlap=[],clipped=[],off=[],small=[],stats={};
 const rect=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}};
 const title=e=>e.id||e.dataset.cell&&'cell-'+e.dataset.cell||e.dataset.token&&'token-'+e.dataset.token||e.className?.baseVal||String(e.className)||e.tagName;
 const selected=['#sort','#undo','#return','#help','#pause','#home','#rank','#daily-play','#calendar-prev-month','#calendar-next-month','#tab-home','#new-game','#home-league-open','#league-join','#close-help','#apply-help','#resume','#next'];
 const tabs=document.querySelector('#root-tabs'),tr=tabs&&!tabs.hidden?tabs.getBoundingClientRect():null;
 for(const e of [...active.querySelectorAll('button,summary,select,label')].filter(visible)){
   const b=e.getBoundingClientRect(),c=getComputedStyle(e),id=title(e);
   if(e.id&&selected.includes('#'+e.id)){stats[e.id]={...rect(e),font:c.fontSize,disabled:!!e.disabled,text:e.innerText?.slice(0,60),color:c.color};const span=e.querySelector('span:not([aria-hidden])');if(span)stats[e.id].labelFont=getComputedStyle(span).fontSize;}
   if(!e.disabled&&!e.closest('#board,#tray')&&b.width>0&&b.height>0&&(b.width<44||b.height<44))small.push({id,w:+b.width.toFixed(1),h:+b.height.toFixed(1),text:e.innerText?.slice(0,35)});
   if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&e.innerText?.trim())clipped.push({id,type:'scrollWidth',w:e.clientWidth,scroll:e.scrollWidth,text:e.innerText.slice(0,100)});
   const tw=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){
    if(!n.textContent.trim()||!visible(n.parentElement)||n.parentElement.closest('svg'))continue;
    const r=document.createRange();r.selectNodeContents(n);
    for(const q of r.getClientRects()){
     if(q.left<b.left-1.5||q.right>b.right+1.5||q.top<b.top-2||q.bottom>b.bottom+2)clipped.push({id,type:'range',text:n.textContent.trim().slice(0,90),b:rect(e),q:[+q.left.toFixed(1),+q.top.toFixed(1),+q.right.toFixed(1),+q.bottom.toFixed(1)]});
    }
   }
   if(b.left<-1||b.right>innerWidth+1)off.push({id,...rect(e)});
   if(!e.disabled&&b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth&&b.width>0&&b.height>0){
    const at=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
    if(at&&!e.contains(at)&&!at.contains(e)&&!e.closest('#board,#tray')&&(!tr||b.bottom<tr.top||tabs.contains(e)))overlap.push({id,by:title(at),...rect(e)});
   }
 }
 // Check every rendered label/text run for clipping against explicit non-scroll clip ancestors.
 const walker=document.createTreeWalker(active,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){
  const e=n.parentElement;if(!e||!n.textContent.trim()||!visible(e)||e.closest('svg,button,summary,select,style,script,#board,#tray,.sr-only,.readout-accessible,.league-page.is-active>.hub-heading'))continue;
  const rr=document.createRange();rr.selectNodeContents(n);
  for(const a of rr.getClientRects()){
   for(let c=e;c&&c!==active.parentElement;c=c.parentElement){const st=getComputedStyle(c),b=c.getBoundingClientRect();
    if(c===document.body||c===document.documentElement)break;
    const x=['hidden','clip'].includes(st.overflowX)&&(a.left<b.left-2||a.right>b.right+2);
    const y=['hidden','clip'].includes(st.overflowY)&&(a.top<b.top-2||a.bottom>b.bottom+2);
    if(x||y){clipped.push({id:title(c),type:'overflow',text:n.textContent.trim().slice(0,90),axis:x?'x':'y'});break;}
   }
  }
 }
 const digits=[...document.querySelectorAll('#board .given,#board .placed .tile')].filter(visible).map(e=>parseFloat(getComputedStyle(e).fontSize));
 const cells=[...document.querySelectorAll('#board [data-cell]')].filter(visible).map(e=>{const b=e.getBoundingClientRect();return Math.min(b.width,b.height)});
 const cal=[...document.querySelectorAll('.month-day:not(:disabled)')].filter(visible).map(e=>{const b=e.getBoundingClientRect();return [b.width,b.height]});
 return {screen:document.querySelector('#hub')?.dataset.screen,dialog:dialog?.id??null,viewport:[innerWidth,innerHeight],rootWidth:document.documentElement.scrollWidth,rootHeight:document.documentElement.scrollHeight,stats,small,clipped,off,overlap,boardDigitMin:digits.length?+Math.min(...digits).toFixed(1):null,cellMin:cells.length?+Math.min(...cells).toFixed(1):null,calendarMin:cal.length?[+Math.min(...cal.map(x=>x[0])).toFixed(1),+Math.min(...cal.map(x=>x[1])).toFixed(1)]:null};
 });rows.push({name,...row});if(capture)await p.screenshot({path:out+'/'+name+'.png'});return row;}
async function assertInView(p,selectors){for(const selector of selectors){const b=await p.locator(selector).boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=p.viewportSize().height,selector+' reachable without hidden confirmation');}}
const sizes=[[320,480],[320,568],[390,844]];
try{
 for(const [w,h] of sizes)for(const lang of ['ru','en'])for(const theme of ['light','dark']){
  const key=w+'x'+h+'-'+lang+'-'+theme;const capture=(w===390&&lang==='ru'&&theme==='light')||(w===320&&h===480&&lang==='en'&&theme==='dark')||(w===320&&h===568&&lang==='ru'&&theme==='light');
  const {context,p}=await episode(homeSeed(),w,h,lang,theme);
  try{
   await view(p,key+'-home',capture);
   await tap(p,'#new-game');await view(p,key+'-choice',capture);await tap(p,'#game-choice-close');
   await tap(p,'#home-league-open');await waitScreen(p,'league');await view(p,key+'-league-invite',capture);
   await tap(p,'#home');const backFromHome=(await snapshot(p)).meta.screen;probes.push({name:key+'-league-back',from:'home',actual:backFromHome});
   assert.equal(backFromHome,'home');
   await tap(p,'#tab-profile');await tap(p,'#league-open');await waitScreen(p,'league');await tap(p,'#league-join');await view(p,key+'-league-active',capture);
   await tap(p,'#league-rules summary');await p.locator('#league-rules').scrollIntoViewIfNeeded();await view(p,key+'-league-rules',capture);
   await tap(p,'#tab-home');await waitScreen(p,'home');
   await tap(p,'#daily-primary');await waitScreen(p,'calendar');await view(p,key+'-calendar',capture);
   const old=p.locator('.month-day:not(:disabled)').first();await old.tap();await p.waitForTimeout(120);
   const oldDay=(await snapshot(p)).meta.calendarSelectedDay;await tap(p,'#tab-home');await tap(p,'#daily-primary');await waitScreen(p,'calendar');
   probes.push({name:key+'-daily-entry',today:(await snapshot(p)).meta.effectiveDay,previous:oldDay,selected:(await snapshot(p)).meta.calendarSelectedDay});
   assert.equal((await snapshot(p)).meta.calendarSelectedDay,(await snapshot(p)).meta.effectiveDay);
   await tap(p,'#daily-goals summary');await p.locator('#daily-goals').scrollIntoViewIfNeeded();await view(p,key+'-goals',capture);
   await tap(p,'#tab-modes');await waitScreen(p,'modes');await view(p,key+'-modes',capture);
   await tap(p,'#tab-profile');await waitScreen(p,'profile');await view(p,key+'-profile',capture);
   await tap(p,'#profile-rank');await view(p,key+'-rank',capture);await tap(p,'#close-card');
   await tap(p,'#profile-statistics summary');await p.locator('#profile-statistics').scrollIntoViewIfNeeded();await view(p,key+'-stats',capture);
   await tap(p,'#profile-workshop');await waitScreen(p,'album');await view(p,key+'-workshop',capture);
   await tap(p,'#workbench');await view(p,key+'-instrument',capture);await tap(p,'#close-card');
   await tap(p,'#home');await tap(p,'#tab-home');await tap(p,'#continue-game');await waitScreen(p,'play');
   await view(p,key+'-play',capture);await tap(p,'#pause');await view(p,key+'-pause',capture);
   await tap(p,'#settings-options summary');await view(p,key+'-settings',capture);
   await tap(p,'#restart');await view(p,key+'-restart',capture);await assertInView(p,['#restart-warning','#restart-no','#restart-yes']);await tap(p,'#restart-no');await tap(p,'#resume');
   await tap(p,'#help');await tap(p,'#explain');await view(p,key+'-help',capture);await assertInView(p,['#help-title','#close-help','#apply-help']);await tap(p,'#close-help');
  }catch(e){failures.push({key,step:'navigation',error:String(e).slice(0,900)});try{await p.screenshot({path:out+'/'+key+'-failure.png'});}catch{}}
  finally{await context.close();}
 }
 const medium=referenceBoards.find(p=>p.width===9&&p.height===9&&p.tray.length>=8&&p.tray.length<=13)??referenceBoards.find(p=>p.tray.length>=8);
 const dense=getPuzzle('cm-own-02-220');
 for(const [w,h] of [[320,430],[320,480],[320,568],[390,844]])for(const [lang,theme] of [['ru','light'],['en','dark']])for(const [label,puzzle] of [['medium',medium],['dense',dense]]){
  const key=w+'x'+h+'-'+lang+'-'+theme+'-'+label;const {context,p}=await episode(playSeed(puzzle),w,h,lang,theme);
  try{await view(p,key,true);const before=await snapshot(p);
   await tap(p,'#sort');const after=await snapshot(p);
   const val=id=>puzzle.tray[Number(id.slice(1))];
   probes.push({name:key+'-sort',before:before.attempt.trayOrder.map(val),after:after.attempt.trayOrder.map(val),revision:after.attempt.boardRevision-before.attempt.boardRevision});
   await view(p,key+'-sorted',false);await tap(p,'#undo');await view(p,key+'-undo',false);
   await tap(p,'#help');await tap(p,'#explain');await view(p,key+'-help',true);
  }catch(e){failures.push({key,error:String(e).slice(0,900)});}finally{await context.close();}
 }
 for(const [w,h] of sizes)for(const [lang,theme] of [['ru','light'],['en','dark']])for(const fixture of ['maximum','after-228','trophy-result']){
  const seed=structuredClone(fixtures[fixture]);seed.meta.screen=fixture==='maximum'?'profile':fixture==='after-228'?'album':'play';
  const key=w+'x'+h+'-'+lang+'-'+theme+'-'+fixture;
  const {context,p}=await episode(seed,w,h,lang,theme);
  try{await view(p,key,true);if(fixture==='maximum'){await tap(p,'#profile-rank');await view(p,key+'-rank',true);}if(fixture==='trophy-result'){await p.locator('#result-details summary').tap();await view(p,key+'-details',true);}}
  catch(e){failures.push({key,error:String(e).slice(0,900)});}finally{await context.close();}
 }
 // Continuous normal-motion browser recording; seeded actual game state, real tap events.
 {
  const {context,p}=await episode(homeSeed(),390,844,'ru','light',true);
  try{await p.waitForTimeout(300);await tap(p,'#new-game');await p.waitForTimeout(300);await tap(p,'#game-choice-close');await tap(p,'#home-league-open');await tap(p,'#league-join');await p.waitForTimeout(350);await tap(p,'#tab-home');await tap(p,'#continue-game');await p.waitForTimeout(350);await tap(p,'#sort');await p.waitForTimeout(400);await tap(p,'#help');await tap(p,'#explain');await p.waitForTimeout(400);await tap(p,'#close-help');await tap(p,'#home');await p.waitForTimeout(300);}
  catch(e){failures.push({key:'recording',error:String(e).slice(0,900)});}
  const v=p.video();await context.close();await v?.saveAs(out+'/navigation-1x.webm');
 }
}finally{await writeFile(out+'/report.json',JSON.stringify({baseline:'4a76f388f9582c15d7f264914042b8a16c092706',portedFrom:'research/ui-feel-audit-20261128@c1260ac124e7435c6142ae51c572cd70ad26b0ac',status:failures.length||errors.length||rows.length!==310||probes.length!==40||rows.some(r=>r.clipped.length||r.off.length||r.overlap.length||r.rootWidth>r.viewport[0]+1)?'FAIL':'PASS',scope:'actual packaged RC web, synthetic valid seeds, browser CSS pixels, no physical phone or native SDK',rows,probes,errors,failures},null,2));const flat=rows.flatMap(r=>r.clipped.map(x=>({name:r.name,...x})));const off=rows.flatMap(r=>r.off.map(x=>({name:r.name,...x})));console.log('UI_SUMMARY '+JSON.stringify({views:rows.length,clipped:flat.length,off:off.length,overflow:rows.filter(r=>r.rootWidth>r.viewport[0]+1).map(r=>r.name),errors,failures}));console.log('UI_CLIPPED '+JSON.stringify(flat.slice(0,12)));console.log('UI_OFF '+JSON.stringify(off.slice(0,25)));console.log('UI_SMALL '+JSON.stringify(rows.filter(r=>/320x480-ru-light-(home|calendar|play|settings|help|profile|league-active)$/.test(r.name)).map(r=>({name:r.name,small:r.small.slice(0,35),stats:r.stats,calendarMin:r.calendarMin,cellMin:r.cellMin,boardDigitMin:r.boardDigitMin}))));console.log('UI_DENSE '+JSON.stringify(rows.filter(r=>/^(320x430|320x480|390x844)-ru-light-(dense|medium)$/.test(r.name)).map(r=>({name:r.name,stats:r.stats,cellMin:r.cellMin,boardDigitMin:r.boardDigitMin}))));console.log('UI_PROBES '+JSON.stringify(probes));await browser.close();server.close();await vite.close();}

assert.equal(rows.length,310,'Full original state matrix');assert.equal(probes.length,40,'Full original probe matrix');assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
assert.deepEqual(rows.filter(r=>r.rootWidth>r.viewport[0]+1||r.overlap.length||r.off.length),[],'No horizontal overflow or enabled centre occlusion');
for(const probe of probes){if(probe.name.endsWith('league-back'))assert.equal(probe.actual,'home');else if(probe.name.endsWith('daily-entry'))assert.equal(probe.selected,probe.today);else{assert.equal(probe.revision,1);assert.deepEqual(probe.after,[...probe.before].sort((a,b)=>a-b));}}
assert.deepEqual(rows.flatMap(r=>r.clipped.map(x=>({name:r.name,...x}))),[],'No unintended text clipping');

for(const before of JSON.parse(await readFile('docs/acceptance/ui32/layout-baseline.json','utf8')).rows){const after=rows.find(r=>r.name===before.name);assert.ok(after&&after.cellMin>=before.cellMin-.1&&after.boardDigitMin>=before.digitMin-.1,JSON.stringify({before,after:after&&{cellMin:after.cellMin,digitMin:after.boardDigitMin}}));assert.equal(after.stats.sort.h,48,'Stable toolbar height in '+before.name);}
