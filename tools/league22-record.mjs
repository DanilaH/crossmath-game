import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.env.LEAGUE22_WEB??'dist'),out=resolve(process.env.LEAGUE22_OUTPUT??'.test-output/league22-recording');
const boards=JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')),answers=JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});
await mkdir(out,{recursive:true});let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,timezoneId:'UTC',recordVideo:{dir:out,size:{width:320,height:568}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-23T00:00:00Z'));
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 const tap=async selector=>{await page.locator(selector).tap();await page.locator('#home:enabled').waitFor();await page.waitForTimeout(450);};
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('html[data-state=ready]').waitFor();
 await tap('#home');await page.waitForTimeout(1000);await tap('#home-league-open');await page.waitForTimeout(900);await tap('#league-join');
 const first=Math.min(...(await snapshot()).league.active.bots.flatMap(b=>b.due));await page.clock.setFixedTime(new Date(first));
 await page.waitForFunction(at=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.lastSeenAt>=at,first);await page.waitForTimeout(1200);
 await tap('#tab-home');await tap('#continue-game');
 const state=await snapshot();
 const puzzle=boards.find(p=>p.puzzleId===state.attempt.puzzleId),answer=answers[puzzle.puzzleId].answer;
 for(const cell of puzzle.cells.filter(c=>c.given===undefined)){
  const s=await snapshot(),used=new Set(Object.values(s.attempt.placements)),token=puzzle.tray.findIndex((n,i)=>n===answer[cell.id]&&!used.has('t'+i));
  await tap(`[data-token="t${token}"]`);await tap(`#board [data-cell="${cell.id}"]`);
 }
 await page.locator('#result:visible').waitFor();assert.deepEqual(Object.fromEntries(Object.entries((await snapshot()).result.league).filter(([k])=>k!=='weekId')),{points:1,fromPoints:0,toPoints:1,fromPlace:2,toPlace:1});await page.waitForTimeout(2400);
 await tap('#result-main');await tap('#home-league-open');await page.waitForTimeout(1200);
 await page.clock.setFixedTime(new Date('2026-11-25T16:00:00Z'));await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.lastSeenAt>=Date.parse('2026-11-25T16:00:00Z'));await page.waitForTimeout(1600);
 await page.clock.setFixedTime(new Date('2026-11-30T00:00:00Z'));await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.history.length===1);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')).league.history[0].presented===true);await page.waitForTimeout(2400);
 assert.equal(await page.locator('[data-revealing=true]').count(),1);assert.deepEqual(errors,[]);const video=page.video();await context.close();await video.saveAs(resolve(out,'league-week-1x.webm'));
 console.log('LEAGUE-01 recording PASS · real taps, 1x, controlled calendar jumps, no audio capture');
}finally{await browser?.close();server.close();}
