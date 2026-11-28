import {chromium} from '@playwright/test';
import {createServer as viteServer} from 'vite';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {baselineSpecs,baselineRoot} from './rc30-baselines.mjs';
import {serve,episode,save,ready,tap} from './qa/rc30-harness.mjs';
const rcStamp=JSON.parse(await readFile('dist/native-build.json','utf8'));assert.equal(rcStamp.releaseCandidate,true);assert.equal(rcStamp.freeIssuancePolicy,'d4-v2');assert.equal(rcStamp.contentLab,false);
const rc=resolve('dist'),out='.test-output/rc30-update';await mkdir(out,{recursive:true});
const modules=await viteServer({mode:'release-candidate',server:{middlewareMode:true,watch:{ignored:['**/.test-output/**']}},appType:'custom'});
const {calendarPuzzle,dateAvailable}=await modules.ssrLoadModule('/src/meta/calendar.ts');
const {availableOffers,findWitness}=await modules.ssrLoadModule('/src/meta/missions.ts');
const boards=[...JSON.parse(await readFile('docs/spec/product/content_v09/boards.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/boards.json','utf8'))];
const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
boards.push(...JSON.parse(await readFile('src/content/additionalBoards.json','utf8')));
const extraMap=JSON.parse(await readFile('docs/acceptance/release29/content-map.json','utf8')),extraAnswers=JSON.parse(await readFile('docs/experiments/content03/author_solutions.json','utf8'));for(const m of extraMap)answers[m.product]=extraAnswers[m.source];
const host=await serve(),browser=await chromium.launch(),rows=[],errors=[];
async function place(page){
 const s=await save(page),p=boards.find(p=>p.puzzleId===s.attempt.puzzleId),cell=p.cells.find(c=>c.given===undefined&&!s.attempt.placements[c.id]);
 const used=new Set(Object.values(s.attempt.placements)),i=p.tray.findIndex((v,i)=>v===answers[p.puzzleId].answer[cell.id]&&!used.has('t'+i));
 await tap(page,`[data-token="t${i}"]`);await tap(page,`#board [data-cell="${cell.id}"]`);await page.locator('#undo:enabled').waitFor();
 assert.equal((await save(page)).attempt.placements[cell.id],'t'+i);
}
function preserved(before,after,label){
 for(const key of ['profile','attempt','result','settings','career','league','leagueQuarantine','leagueReceiptQuarantine'])assert.deepEqual(after[key],before[key],label+': '+key);
 for(const key of ['assignments','inactive','completedDates','freeProgress','freeIssuance','archivedDailyResults','slotReceipts','setReceipts','contributedIds','monthlyTrophies'])assert.deepEqual(after.meta[key],before.meta[key],label+': '+key);
 assert.deepEqual(after.meta.quests?.slots,before.meta.quests?.slots,label+': paid/progress');
 if(after.meta.quests){const q=after.meta.quests;assert.notEqual(findWitness(q.slots,availableOffers(after),q.dayKey,after.profile.campaignCursor,after.meta.contributedIds),null,'A real reachable quest route survives');}
}
try{
 for(const spec of baselineSpecs){
  const root=resolve(baselineRoot,spec.name),f=JSON.parse(await readFile(root+'/fixtures.json','utf8'));
  let web=root+'/dist';try{await access(root+'/artifact-web/index.html');web=root+'/artifact-web';}catch{}
  for(const state of (spec.name==='league-v1'?['active','completed']:['active','completed','quarantined',...(['playtest526','rc527'].includes(spec.name)?['issued']:[])])){
   host.use(web);const seed=structuredClone(f[state==='quarantined'?'active':state]);if(state==='quarantined'){seed.league.active.planHash=-1;const savedResult=Object.values(seed.meta.archivedDailyResults??{})[0]??Object.values(seed.meta.inactive).find(slot=>slot.result)?.result;assert.ok(savedResult);savedResult.league={invalid:true};}
   const {page,context}=await episode(browser,host.url,seed);page.on('pageerror',e=>errors.push(e.message));
   if(state==='active'){await tap(page,'#tab-calendar');await tap(page,'#daily-play');await place(page);await tap(page,'#home');}
   const before=await save(page);if(state==='quarantined'){assert.ok(before.leagueQuarantine);assert.ok(before.leagueReceiptQuarantine);}else assert.equal(before.league.active?.policy.version??before.league.history.at(-1).policyVersion,spec.policy);
   if(state!=='quarantined')assert.ok(before.league.history.length>0);host.use(rc);await page.reload();await ready(page);const after=await save(page);preserved(before,after,spec.name+' '+state);assert.deepEqual(after.ads,before.ads);
   if(state==='active'){
    await tap(page,'#tab-modes');await tap(page,'#free-open');await page.locator('#help:enabled').waitFor();const restored=await save(page),parked=before.meta.inactive.free;
    assert.deepEqual(restored.attempt.placements,parked.attempt.placements);assert.deepEqual(restored.attempt.trayOrder,parked.attempt.trayOrder);assert.equal(restored.attempt.puzzleId,parked.attempt.puzzleId);
    await tap(page,'#undo');await page.locator('#help:enabled').waitFor();await place(page);await tap(page,'#home');
    await tap(page,'#tab-calendar');await tap(page,'#daily-play');await page.locator('#help:enabled').waitFor();assert.deepEqual((await save(page)).attempt.placements,before.attempt.placements);await tap(page,'#home');
   }
   if(state==='completed'&&spec.name!=='rc527'){
    if(await page.locator('#home:visible').count())await tap(page,'#home');
    const oldCalendar=await viteServer({root,mode:'league-lab',server:{middlewareMode:true,watch:null},appType:'custom'});
    let unissued;try{const old=await oldCalendar.ssrLoadModule('/src/meta/calendar.ts');unissued=Array.from({length:332},(_,i)=>new Date(Date.parse(before.meta.effectiveDay+'T12:00:00Z')-i*86400000).toISOString().slice(0,10)).find(day=>dateAvailable(before.profile.createdAt,before.profile.timeZone,before.meta.effectiveDay,day)&&!before.meta.assignments[day]&&old.calendarPuzzle(day)!==calendarPuzzle(day));assert.ok(unissued,'Unissued date changes under calendar-v3');}finally{await oldCalendar.close();}
    await tap(page,'#tab-calendar');for(let m=0;m<12&&!await page.locator(`.month-day[data-day="${unissued}"]`).count();m++){await page.locator('#calendar-prev-month').scrollIntoViewIfNeeded();await tap(page,'#calendar-prev-month');}await page.locator(`.month-day[data-day="${unissued}"]`).scrollIntoViewIfNeeded();await tap(page,`.month-day[data-day="${unissued}"]`);assert.equal((await save(page)).meta.calendarSelectedDay,unissued,'Selected unissued date');await page.locator('#daily-play').scrollIntoViewIfNeeded();await tap(page,'#daily-play');await page.locator('#help:enabled').waitFor();assert.equal((await save(page)).attempt.puzzleId,calendarPuzzle(unissued));
   }
   if(state==='issued'){await tap(page,'#continue-game');await place(page);assert.equal((await save(page)).attempt.puzzleId,before.attempt.puzzleId);}
   await page.screenshot({path:`${out}/${spec.name}-${state}.png`});rows.push({name:spec.name,state,provenance:f.provenance,webSource:web.endsWith('artifact-web')?'Delivered '+f.provenance.version.versionName+' APK extracted web':'Exact historical executable',before,after,afterActions:await save(page)});await context.close();
  }
 }
 // Old actual adapter creates requests; storage/native journal survive the code replacement.
 const root=resolve(baselineRoot,'playtest526'),f=JSON.parse(await readFile(root+'/fixtures.json','utf8'));let web=root+'/dist';try{await access(root+'/artifact-web/index.html');web=root+'/artifact-web';}catch{}
 for(const fault of ['pending-absent','pending-prepared','pending-admitted','earned-lost-ack','acked']){
  host.use(web);const seed=structuredClone(f.active);seed.meta.screen='play';
  const {page,context}=await episode(browser,host.url,seed,{config:{ack:fault==='earned-lost-ack'?'reject-before':'ok',show:fault==='pending-absent'?'reject-before-prepare':fault==='pending-prepared'?'hold-prepared':'normal'}});page.on('pageerror',e=>errors.push(e.message));
  await tap(page,'#help');await tap(page,'#ad-hint');await page.waitForFunction(f=>f==='pending-absent'?window.rc30.journal().calls.some(c=>c.format==='rewarded'):f==='pending-prepared'?Object.values(window.rc30.journal().records).some(r=>r.phase==='prepared'):!!window.rc30.live,fault);
  const request=Object.values((await save(page)).ads.requests).at(-1).request;
  if(!fault.startsWith('pending-')){await page.evaluate(()=>window.rc30.finish('earned'));await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).at(-1).settlement==='earned');}
  const before=await save(page);await page.evaluate(()=>window.rc30.configure({ack:'ok',show:'normal'}));host.use(rc);await page.reload();await ready(page);
  if(fault==='pending-admitted'){assert.equal((await save(page)).ads.requests[request.id].settlement,undefined);await page.evaluate(id=>window.rc30.lateEarn(id),request.id);}
  const terminal=['pending-absent','pending-prepared'].includes(fault)?'cancelled':'earned';await page.waitForFunction(outcome=>Object.values(JSON.parse(localStorage.getItem('crossmath.save.v1')).ads.requests).at(-1).settlement===outcome,terminal);
  const after=await save(page);assert.equal(after.profile.coins,before.profile.coins);assert.equal(after.profile.hintCredits,seed.profile.hintCredits+(terminal==='earned'?1:0));assert.deepEqual(after.attempt,before.attempt);assert.deepEqual(after.league,before.league);
  for(let n=0;n<2;n++){await page.reload();await ready(page);assert.equal((await save(page)).profile.hintCredits,after.profile.hintCredits);}
  await tap(page,'#help');await page.locator('#ad-hint:enabled').waitFor();rows.push({fault,request,before,after,journal:await page.evaluate(()=>window.rc30.journal())});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify({status:'PASS',cases:rows,errors,scope:'Real historical packaged executables -> RC at same origin/native-storage transport; actual UI actions. Historical model-created starting profiles. NOT Android installation proof.'},null,2));console.log('RC-01 PASS · '+rows.length+' historical League/D4/Daily/quest/quarantine/reward upgrades');
}finally{await browser.close();host.close();await modules.close();}
