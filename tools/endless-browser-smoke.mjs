import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),out=resolve('.test-output/endless-ui');await mkdir(out,{recursive:true});
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')),answers=JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);assert.ok(path===root||path.startsWith(root+'/'));res.setHeader('Content-Type',mime[extname(path)]??'text/html');res.end(await readFile(path===root?root+'/index.html':path));}catch{res.writeHead(404).end();}});
let browser;const checks=[],errors=[],geometry=[];
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'Asia/Yekaterinburg'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.locator('html[data-state=ready]').waitFor(),snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 const tap=async(selector)=>{await page.locator(selector).tap();await page.locator('#home:enabled').waitFor();};
 const openModes=async()=>{await tap('#modes-open');await page.locator('#mode-dialog[open]').waitFor();};
 const fill=async()=>{const state=await snapshot(),p=boards.find(p=>p.puzzleId===state.attempt.puzzleId),answer=answers[p.puzzleId].answer;for(const c of p.cells.filter(c=>c.given===undefined)){const s=await snapshot();if(p.tray[Number(s.attempt.placements[c.id]?.slice(1))]===answer[c.id])continue;const used=new Set(Object.values(s.attempt.placements)),token=p.tray.findIndex((v,i)=>v===answer[c.id]&&!used.has('t'+i));assert.notEqual(token,-1);await tap(`[data-token="t${token}"]`);await tap(`[data-cell="${c.id}"]`);}};
 const swap=async(a,b)=>{await tap(`[data-cell="${a}"]`);await tap(`[data-cell="${b}"]`);};
 const finish=async()=>{await tap('#pause');await page.locator('#end-run:enabled').waitFor();await tap('#end-run');await page.locator('#profile-back').waitFor();};
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await ready();
 for(let i=1;i<=15;i++){if(i>1)await tap('#next');await fill();assert.equal((await snapshot()).attempt.status,'won');if(i===14){await tap('#home');await openModes();assert.equal(await page.locator('#endless-open').isDisabled(),true);await tap('#campaign-open');await tap('#last-result');}}
 await tap('#home');await openModes();assert.equal(await page.locator('#endless-open').isEnabled(),true);await tap('#endless-open');const first=await snapshot();assert.equal(first.attempt.puzzleId,'cm-own-01-016');checks.push('actual fresh-profile campaign 1–15, Endless locked at 14 and unlocked at 15');
 await fill();assert.equal((await snapshot()).attempt.status,'playing');assert.equal(await page.locator('.op.right,.op.invalid,.cell.invalid,.given.invalid').count(),0);const p=boards[15],cells=p.cells.filter(c=>c.given===undefined);await swap(cells[0].id,cells[1].id);assert.equal(await page.locator('.op.right,.op.invalid').count(),0);await page.screenshot({path:out+'/neutral-full.png',fullPage:true});
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));const data=await page.locator('#submit').evaluate(e=>{const r=e.getBoundingClientRect();return{visibleWithoutScroll:r.top>=0&&r.bottom<=innerHeight,minTarget:Math.min(r.width,r.height)};});assert.equal(data.visibleWithoutScroll,true);assert.ok(data.minTarget>=48);geometry.push({screen:'Endless submit',viewport:[width,height],...data});}await page.setViewportSize({width:390,height:844});
 await tap('#submit');assert.equal((await snapshot()).attempt.lives,2);await tap('#submit');assert.equal((await snapshot()).attempt.lives,2);await tap('#undo');assert.equal((await snapshot()).attempt.lives,2);await tap('#submit');const won=await snapshot();assert.equal(won.attempt.status,'won');assert.equal(won.career.run.solvedStages,1);assert.equal(won.result.stageScore,10*p.equations.length);await page.screenshot({path:out+'/stage-result.png',fullPage:true});
 await page.reload();await ready();assert.deepEqual((await snapshot()).result,won.result);assert.equal((await snapshot()).career.run.score,won.career.run.score);await tap('#next');const second=await snapshot();assert.equal(second.attempt.lives,2);assert.equal(second.attempt.stageId,1);checks.push('pre-submit neutral board, explicit scoring, one rejected-layout penalty, free repeat/undo, cold result and carried lives');
 const secondBoard=boards.find(p=>p.puzzleId===second.attempt.puzzleId),cell=secondBoard.cells.find(c=>c.given===undefined),token=secondBoard.tray.indexOf(answers[secondBoard.puzzleId].answer[cell.id]);await tap(`[data-token="t${token}"]`);await tap(`[data-cell="${cell.id}"]`);const placed=await snapshot();await tap('#home');await openModes();await tap('#campaign-open');await tap('#campaign-continue');assert.equal((await snapshot()).attempt.mode,'campaign');await tap('#home');await openModes();await tap('#endless-open');assert.equal((await snapshot()).attempt.id,placed.attempt.id);assert.deepEqual((await snapshot()).attempt.placements,placed.attempt.placements);
 await tap('#help');await tap('#reveal');await tap('#apply-help');assert.equal((await snapshot()).career.run.assisted,true);assert.equal((await snapshot()).attempt.status,'playing');assert.equal(await page.locator('.op.right,.op.invalid').count(),0);await fill();await tap('#submit');await tap('#next');await fill();await tap('#submit');const badge=(await snapshot()).career.achievements.run3;assert.ok(badge);await finish();const assisted=await snapshot();assert.equal(assisted.career.records['cm-integer-1/content-v1/score-v1'].solo,null);assert.equal(assisted.career.records['cm-integer-1/content-v1/score-v1'].assisted.boards,3);await page.screenshot({path:out+'/profile-assisted.png',fullPage:true});checks.push('parked mode exact restore, explicit paid reveal taints whole run, three distinct stages earn permanent badge and assisted record');
 await tap('#profile-back');await openModes();await tap('#endless-open');await fill();await tap('#submit');assert.equal((await snapshot()).result.baseCoins,0);await finish();const records=(await snapshot()).career.records['cm-integer-1/content-v1/score-v1'];assert.equal(records.solo.boards,1);assert.equal(records.assisted.boards,3);assert.deepEqual((await snapshot()).career.achievements.run3,badge);checks.push('new solo run has separate record; repeated canonical ID still earns stage score, no base reward or repeated badge');
 for(const [width,height] of [[320,568],[360,640],[390,844],[800,1280]]){await page.setViewportSize({width,height});const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...[...document.querySelectorAll('#hub button')].map(e=>e.getBoundingClientRect().height))}));assert.equal(data.overflow,false);assert.ok(data.minTarget>=48);geometry.push({screen:'profile',viewport:[width,height],...data});await page.screenshot({path:out+`/profile-${width}.png`,fullPage:true});}
 await tap('#profile-back');await openModes();await tap('#endless-open');await fill();await tap('#submit');await tap('#next');await fill();const failing=await snapshot(),fc=boards.find(p=>p.puzzleId===failing.attempt.puzzleId).cells.filter(c=>c.given===undefined);for(let i=0;i<3;i++){await swap(fc[0].id,fc[i+1].id);await tap('#submit');assert.equal((await snapshot()).attempt.lives,2-i);}assert.equal((await snapshot()).attempt.status,'out-of-lives');assert.equal(await page.locator('#ad-continue').isHidden(),true);await page.screenshot({path:out+'/no-lives.png',fullPage:true});const oldRun=(await snapshot()).career.run.id,balance=(await snapshot()).profile.coins;await tap('#retry-daily');assert.notEqual((await snapshot()).career.run.id,oldRun);assert.equal((await snapshot()).attempt.lives,3);assert.equal((await snapshot()).profile.coins,balance);checks.push('three distinct rejected layouts stop run at zero; free new run resets run identity/lives without wallet debit');

 // Exercise the actual runtime language switch and inspect rendered copy including accessible labels.
 await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#settings-options summary');await page.locator('#language:enabled').waitFor();
 await page.locator('#language').selectOption('en');
 await page.locator('html[lang="en"] #resume:enabled').waitFor();
 await tap('#rules-options summary');
 assert.match(await page.locator('#mode-rules').innerText(),/Three lives for the entire run/);
 await page.locator('#timer-visible').check();await page.locator('#resume:enabled').waitFor();
 await tap('#resume');
 const noRussian=async(selector)=>{
   const node=page.locator(selector);
   assert.doesNotMatch(await node.innerText(),/[А-Яа-яЁё]/,selector);
   const labels=await node.locator('[aria-label]:visible').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
   assert.doesNotMatch(labels.join(' '),/[А-Яа-яЁё]/,selector+' aria-labels');
 };
 await noRussian('#play-screen');assert.equal(await page.locator('#play-time').isHidden(),true);
 await tap('#help');await page.locator('#close-help:enabled').waitFor();await noRussian('#help-dialog');
 assert.equal(await page.locator('#ad-hint').isHidden(),true);
 await tap('#explain');assert.match(await page.locator('#help-description').innerText(),/equations and the tray/);
 await tap('#close-help');
 await tap('#home');await noRussian('#hub');
 await openModes();await noRussian('#mode-dialog');await tap('#close-modes');await tap('#calendar-open');await noRussian('#hub');await page.screenshot({path:out+'/calendar-en.png',fullPage:true});
 await tap('#calendar-back');await tap('#album-open');await noRussian('#hub');
 await page.locator('[data-card="abacus"]').tap();await noRussian('#card-dialog');
 assert.match(await page.locator('#card-body').innerText(),/Left beads/);await tap('#close-card');
 await tap('#album-back');await tap('#profile-open');await noRussian('#hub');
 assert.equal(await page.locator('#profile-statistics').evaluate(node=>node.open),false);
 assert.equal(await page.locator('#profile-badges').evaluate(node=>node.open),false);
 assert.equal(await page.locator('.profile-record').count(),2);
 await tap('#profile-statistics summary');
 assert.equal(await page.locator('.stats-mode:visible').count(),4);
 await tap('#profile-statistics summary');
 await tap('#profile-badges summary');
 assert.ok(await page.locator('.badge:visible').count()>0);
 await tap('#profile-badges summary');
 await page.screenshot({path:out+'/profile-en.png',fullPage:true});
 await tap('#profile-back');await openModes();await tap('#campaign-open');await tap('#campaign-continue');assert.equal(await page.locator('#play-time').isVisible(),true);
 await page.reload();await ready();assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert.equal(await page.locator('#play-time').isVisible(),true);await noRussian('#play-screen');
 await tap('#pause');await page.locator('#resume:enabled').waitFor();await tap('#settings-options summary');await page.locator('#language:enabled').waitFor();await page.locator('#language').selectOption('ru');
 await page.locator('html[lang="ru"] #resume:enabled').waitFor();await tap('#resume');
 assert.match(await page.locator('#help').innerText(),/Помощь/);
 checks.push('RU/EN switch and cold persistence, localized board/help/mission/calendar/album/profile/accessibility copy, timer hidden in Endless, optional ads absent without provider');
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',source:process.env.GITHUB_SHA??'local',browser:browser.version(),checks,geometry,limits:'Real UI input from fresh profile; no Android runtime or live services claim'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,geometry},null,2));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({status:'FAIL',error:String(error),checks,errors},null,2)+'\n');throw error;}
finally{await browser?.close();await new Promise(done=>server.close(done));}
