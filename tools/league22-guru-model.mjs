import {createServer} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out='.test-output/league22-guru';await mkdir(out,{recursive:true});
const server=await createServer({mode:'league-lab',server:{middlewareMode:true},appType:'custom'});
const round=n=>Math.round(n*1000)/1000,avg=xs=>round(xs.reduce((a,b)=>a+b,0)/xs.length);
const spread=xs=>{xs.sort((a,b)=>a-b);return {min:xs[0],median:(xs[(xs.length-1)>>1]+xs[xs.length>>1])/2,max:xs.at(-1)};};
const anchor=Date.parse('2026-11-23T00:00:00Z'),dayMs=86_400_000;
const iso=at=>new Date(at).toISOString();
try{
 const league=await server.ssrLoadModule('/src/meta/league.ts'),catalog=await server.ssrLoadModule('/src/content/catalog.ts');
 const {createSave,decodeSave}=await server.ssrLoadModule('/src/app/model.ts'),{GameSession}=await server.ssrLoadModule('/src/app/session.ts'),{SaveRepository}=await server.ssrLoadModule('/src/app/saveRepository.ts');
 const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
 const proposals=JSON.parse(await readFile('docs/experiments/league22-guru/reward-options.json','utf8'));
 const cadences=[{id:'relax-2',count:2,track:'relax'},{id:'relax-4',count:4,track:'relax'},{id:'relax-6',count:6,track:'relax'},{id:'challenge-2',count:2,track:'challenge'},{id:'mixed-4',count:4,track:'mixed'},{id:'weekend-relax-6',count:6,track:'relax',weekend:true}];
 const journeys=[];
 for(const cohort of ['new','mature'])for(const cadence of cadences){
  let now=iso(anchor-dayMs),serial=0;
  const seed=createSave(`economy-${cohort}-${cadence.id}`,now,'UTC','first'),data=new Map();
  if(cohort==='mature'){
   seed.profile.solvedIds=[...catalog.boards,...catalog.referenceBoards].map(p=>p.puzzleId);seed.profile.campaignCursor=catalog.campaignSequence(seed.contentVersion).length;
   seed.profile.fragments=48;seed.profile.paidCardIds=catalog.config.cards.map(c=>c.id);seed.profile.rank=100;
  }
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}};
  const repo=new SaveRepository(storage,()=>structuredClone(seed)),session=new GameSession(await repo.load(),repo,()=>`sim-${++serial}`,()=>now);
  async function win(){
   const p=catalog.getPuzzle(session.state.attempt.puzzleId),used=new Set(),answer=answers[p.puzzleId].answer;
   session.state.attempt.placements={};
   for(const cell of p.cells.filter(c=>c.given===undefined)){const i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));assert.ok(i>=0);used.add(i);session.state.attempt.placements[cell.id]='t'+i;}
   session.state.attempt.status='won';await session.navigate('home');return structuredClone(session.state.result);
  }
  if(cohort==='new')for(let i=0;i<15;i++){await win();if(i<14)await session.next();}
  for(let week=0;week<3;week++){
   now=iso(anchor+week*7*dayMs);await session.refreshDay();await session.enterLeague();
   const before=structuredClone(session.state.profile),income={baseCoins:0,dailyCoins:0,taskCoins:0,setCoins:0,rankCoins:0,cardCoins:0},trace=[];
   for(let day=0;day<7;day++){
    if(cadence.weekend&&day<5)continue;
    for(let n=0;n<cadence.count;n++){
     now=iso(anchor+(week*7+day)*dayMs+20*3_600_000+n*60_000);await session.refreshDay();
     const mode=cadence.track==='mixed'?(n===3?'daily':n===2?'challenge':'relax'):cadence.track;
     const opened=mode==='daily'?await session.openDaily(now.slice(0,10)):await session.openFreeTrack(mode,true);
     assert.equal(opened,'opened');const p=catalog.getPuzzle(session.state.attempt.puzzleId),r=await win();
     for(const k of Object.keys(income))income[k]+=r[k]??0;
     trace.push({at:Date.parse(now),puzzleId:p.puzzleId,difficulty:p.difficulty,mode:mode==='daily'?'daily':'free',receiptId:r.id,first:r.first,coins:r.coins,leaguePoints:r.league.points});
    }
   }
   now=iso(anchor+(week+1)*7*dayMs);await session.refreshDay();
   const after=session.state.profile,total=Object.values(income).reduce((a,b)=>a+b,0);
   assert.equal(after.coins-before.coins,total);assert.equal(after.hintCredits,before.hintCredits);assert.equal(session.state.league.history.length,week+1);
   decodeSave(session.state);
   journeys.push({cohort,scenario:cadence.id,week,boards:trace.length,newWins:trace.filter(t=>t.first).length,points:trace.reduce((n,t)=>n+t.leaguePoints,0),income,totalCoins:total,beforeCoins:before.coins,afterCoins:after.coins,trace});
  }
 }
 const bands={gentle:[[5,10],[5,10],[3,8],[3,8],[2,6],[2,6],[1,4],[1,4],[1,4]],steady:[[6,11],[6,11],[4,8],[4,8],[3,6],[3,6],[1,4],[1,4],[1,4]],brisk:[[7,12],[7,12],[5,10],[5,10],[3,7],[3,7],[1,5],[1,5],[1,5]]};
 const original=league.leaguePolicy.bands,rows=[],samplePlans=[],burst=[];
 try{for(const [band,range] of Object.entries(bands)){
  league.leaguePolicy.bands=range;
  for(let seed=0;seed<100;seed++)for(let week=0;week<3;week++)for(const joinedDay of [0,4,6]){
   const entered=iso(anchor+(week*7+joinedDay)*dayMs),base=league.joinLeague(undefined,'pace-'+seed,'UTC',entered);
   if(band==='gentle'&&seed<4&&week===0&&joinedDay===0)samplePlans.push(base);
   if(week===0&&joinedDay===0){const ev=base.active.bots.flatMap(league.leagueBotEvents);burst.push({band,events:ev.length,points:ev.reduce((n,e)=>n+e.points,0),multi:ev.filter(e=>e.points>1).length});}
   for(const journey of journeys.filter(j=>j.week===week)){
    const state=structuredClone(base);let wins=0,points=0;
    for(const event of journey.trace.filter(e=>e.at>=Date.parse(entered))){wins++;points+=league.recordLeagueWin(state,{...event,profileId:state.profileId,weekId:state.active.id,assisted:false},iso(event.at));}
    league.advanceLeague(state,iso(anchor+(week+1)*7*dayMs));const result=state.history[0];assert.equal(result.points,points);
    rows.push({band,seed,week,joinedDay,cohort:journey.cohort,scenario:journey.scenario,wins,points,place:result.rank});
   }
  }
 }}finally{league.leaguePolicy.bands=original;}
 const summaries=[];
 for(const band of Object.keys(bands))for(const cohort of ['new','mature'])for(const scenario of cadences.map(p=>p.id))for(let week=0;week<3;week++)for(const joinedDay of [0,4,6]){
  const group=rows.filter(r=>r.band===band&&r.cohort===cohort&&r.scenario===scenario&&r.week===week&&r.joinedDay===joinedDay);
  summaries.push({band,cohort,scenario,week,joinedDay,points:spread(group.map(r=>r.points)),place:spread(group.map(r=>r.place)),gold:group.filter(r=>r.place===1&&r.points>0).length/group.length,top3:group.filter(r=>r.place<=3&&r.points>0).length/group.length});
 }
 const economy=[];
 for(const journey of journeys)for(const option of proposals.options){
  const samples=rows.filter(r=>r.band==='gentle'&&r.cohort===journey.cohort&&r.scenario===journey.scenario&&r.week===journey.week&&r.joinedDay===0);
  const rewards=samples.map(r=>r.points?option.places[r.place-1]??{coins:0,hints:0}:{coins:0,hints:0});
  const coins=avg(rewards.map(r=>r.coins)),hints=avg(rewards.map(r=>r.hints)),helpEquivalent=round(coins/catalog.config.hintCostCoins+hints);
  economy.push({cohort:journey.cohort,scenario:journey.scenario,week:journey.week,baselineCoins:journey.totalCoins,proposal:option.id,expectedCoins:coins,expectedHintCredits:hints,maxHelpEquivalent:helpEquivalent,additionalPurchasingPowerPercent:journey.totalCoins?round(100*(coins+hints*catalog.config.hintCostCoins)/journey.totalCoins):null,
   sensitivity:[.25,.5,1].map(rate=>{const need=Math.ceil(journey.boards*rate);return {hintsPerBoard:rate,hintNeed:need,maximumRewardedCreditsSubstituted:round(Math.min(need,helpEquivalent)),noRewardHelpCostCoins:need*catalog.config.hintCostCoins,capacityOnly:'Reward settles after the week; see rollingWallet for availability in later weeks'};})});
 }
 const rollingWallet=[];
 const rankIndex=new Map(rows.filter(r=>r.band==='gentle'&&r.joinedDay===0).map(r=>[`${r.seed}:${r.week}:${r.cohort}:${r.scenario}`,r]));
 for(const cohort of ['new','mature'])for(const cadence of cadences)for(const rate of [.25,.5,1])for(const option of [{id:'NONE',places:[]},...proposals.options]){
  const weeks=journeys.filter(j=>j.cohort===cohort&&j.scenario===cadence.id).sort((a,b)=>a.week-b.week),samples=[];
  for(let seed=0;seed<100;seed++){
   let coins=weeks[0].beforeCoins,credits=0,seen=0,need=0,unfunded=0;
   for(const week of weeks){
    for(const event of week.trace){
     const asks=Math.floor((seen+1)*rate)-Math.floor(seen*rate);seen++;
     for(let ask=0;ask<asks;ask++){need++;if(credits)credits--;else if(coins>=catalog.config.hintCostCoins)coins-=catalog.config.hintCostCoins;else unfunded++;}
     coins+=event.coins; // A board reward arrives AFTER any help needed to solve it.
    }
    const rank=rankIndex.get(`${seed}:${week.week}:${cohort}:${cadence.id}`);
    const award=rank.points?option.places[rank.place-1]:undefined;
    coins+=award?.coins??0;credits+=award?.hints??0; // Weekly settlement; never spend it retroactively.
   }
   samples.push({need,unfunded,coins,credits});
  }
  rollingWallet.push({cohort,scenario:cadence.id,hintsPerBoard:rate,proposal:option.id,weeks:3,startingCoins:weeks[0].beforeCoins,hintDemand:samples[0].need,unfundedRequests:avg(samples.map(s=>s.unfunded)),endingCoins:avg(samples.map(s=>s.coins)),endingCredits:avg(samples.map(s=>s.credits))});
 }
 const report={baseline:'8ac5dc66583509ef8784c927aa450b01a54fd847',source:'mini-games-kit@5cee4ac787d16afaab8edd3cd6e809bdf7d42448/research/games/crossmath/porting/guru-brains-plan-20261127',scope:'Synthetic deterministic model, not original runtime execution, human pacing, retention or ad revenue.',controls:rows.length,admissionSnapshots:2700,uniqueScheduleSets:900,profileWeekScopes:300,cohortWeeks:journeys.length,policy:league.leaguePolicy,bands,recommended:'gentle',
  calibrationRationale:'Retain point weights 1/2/3/4. Gentle targets mean 49/35/24.5/14 per full week: a 28-board Relax week (~37 points) can contend for bronze; 42 Relax boards (~56) contend for gold; Challenge needs fewer boards because each earns 3/4. Compare actual traces below; no difficulty or issuance changes.',
  rollingWallet,burst: Object.keys(bands).map(band=>{const g=burst.filter(b=>b.band===band);return {band,events:spread(g.map(r=>r.events)),points:spread(g.map(r=>r.points)),multiEventFraction:avg(g.map(r=>r.multi/r.events))};}),summaries,economy,
  proposalStatus:'NO coin/hint prize is active. Recommendations and eligibility require owner approval. Current weekly settlement gives medal only.',
  caveats:['Source 4.17 static tables and batches are verified; source live pacing/prizes remain UNKNOWN.','All seven normal-range days are frozen; special source isFirst/missed-weekend maximum is not made unconditional and is not activated.','New cohort begins after 15 actual campaign settlement fixtures; mature cohort is a valid synthetic 515-solved profile. Valid completed layouts use the real GameSession writer; not human play.','Income comes from actual no-help settlement and includes board/Daily/quest/rank/workshop sources. Help sensitivity changes costs only, not quest responses.','Rolling wallet debits help before each board and credits prizes only after weekly settlement. An unfunded request assumes an external earned credit for analytic continuity, not an automatic in-game grant or a real ad view. Income is held to the no-help trace.','Credit equivalents use current 60-coin help cost; credits cannot turn into coins. This is a capacity upper bound, not predicted rewarded-view loss or revenue.','Late entrants face accumulated calendar progress; no activity/rank-dependent bot changes. Existing v1/v2 weeks and awards stay frozen.']};
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/journeys.json',JSON.stringify(journeys,null,2)+'\n');await writeFile(out+'/scenarios.ndjson',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');await writeFile(out+'/plans.json',JSON.stringify(samplePlans,null,2)+'\n');
 const verified=spawnSync('python3',['tools/league22-guru-reference.py',out+'/plans.json'],{encoding:'utf8'});assert.equal(verified.status,0,verified.stderr||verified.stdout);await writeFile(out+'/independent-reference.json',verified.stdout);
 console.log(JSON.stringify({controls:report.controls,cohortWeeks:report.cohortWeeks,burst:report.burst,wholeWeekNewFirst:summaries.filter(r=>r.cohort==='new'&&r.week===0&&r.joinedDay===0),economy: economy.filter(r=>r.week===0)},null,2));
}finally{await server.close();}
