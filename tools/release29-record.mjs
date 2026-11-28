import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const out='.test-output/release29-recording';await mkdir(out,{recursive:true});
const {fixtures}=JSON.parse(await readFile('.test-output/meta18/fixtures.json','utf8')),seed=structuredClone(fixtures['after-15']);seed.meta.screen='home';seed.settings.theme='light';seed.settings.language='ru';seed.settings.sound=true;seed.settings.vibration=true;
const boards=JSON.parse(await readFile('src/content/additionalBoards.json','utf8')),mapping=JSON.parse(await readFile('docs/acceptance/release29/content-map.json','utf8')),solutions=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));
const root=resolve('dist'),mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+'/'));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'UTC',recordVideo:{dir:out,size:{width:390,height:844}}});
 await context.addInitScript(s=>{if(!localStorage.getItem('crossmath.save.v1'))localStorage.setItem('crossmath.save.v1',JSON.stringify(s));},seed);
 const page=await context.newPage();await page.clock.setFixedTime(new Date(seed.meta.effectiveDay+'T12:00:00Z'));await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('html[data-state=ready]').waitFor();
 const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 const tap=async id=>{await page.locator(id).tap();await page.waitForTimeout(250);};
 await page.waitForTimeout(400);await tap('#home-league-open');await tap('#league-join');await tap('#tab-home');await tap('#new-game');await tap('#choice-relax');await page.locator('#help:enabled').waitFor();
 const s=await save(),p=boards.find(p=>p.puzzleId===s.attempt.puzzleId);assert.ok(p,'RC actually issued an additional board');const answer=solutions[mapping.find(m=>m.product===p.puzzleId).source].answer;
 await page.screenshot({path:out+'/additional-board.png'});await page.waitForTimeout(500);
 for(const c of p.cells.filter(c=>c.given===undefined)){
  const current=await save(),used=new Set(Object.values(current.attempt.placements)),i=p.tray.findIndex((v,i)=>v===answer[c.id]&&!used.has('t'+i));assert.ok(i>=0);
  await tap(`[data-token="t${i}"]`);await tap(`#board [data-cell="${c.id}"]`);
 }
 await page.locator('#result:visible').waitFor();await page.locator('#next:enabled').waitFor();const won=await save();assert.equal(won.result.coins,10);assert.equal(won.result.league.points,1);
 await page.waitForTimeout(1400);await page.screenshot({path:out+'/victory-coins-league.png'});await tap('#home');await tap('#home-league-open');await page.waitForTimeout(1000);await page.screenshot({path:out+'/league-after-win.png'});
 const video=page.video();await context.close();await video.saveAs(out+'/release29-1x.webm');
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',puzzleId:p.puzzleId,coins:won.result.coins,leaguePoints:won.result.league.points,speed:'1x',touch:'actual Chromium taps',audio:'NOT CAPTURED; sound setting enabled is not device audio acceptance',seed:'valid synthetic after-15 profile',device:'Chromium, not Android'},null,2));console.log('RELEASE-01 recording PASS · '+p.puzzleId+' +10 coins +1 League point');
}finally{await browser?.close();server.close();}
