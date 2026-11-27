import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out='.test-output/meta18-economy';await mkdir(out,{recursive:true});
const server=await createServer({mode:'league-lab',server:{middlewareMode:true},appType:'custom'});
const anchor=Date.parse('2026-11-23T00:00:00Z'),dayMs=86400000,iso=at=>new Date(at).toISOString(),round=n=>Math.round(n*1000)/1000;
const mean=rows=>round(rows.reduce((a,b)=>a+b,0)/rows.length);
try{
 const catalog=await server.ssrLoadModule('/src/content/catalog.ts'),league=await server.ssrLoadModule('/src/meta/league.ts');
 const {createSave,decodeSave}=await server.ssrLoadModule('/src/app/model.ts'),{GameSession}=await server.ssrLoadModule('/src/app/session.ts'),{SaveRepository}=await server.ssrLoadModule('/src/app/saveRepository.ts');
 const configBefore=JSON.stringify(catalog.config),policyBefore=JSON.stringify(league.leaguePolicy);
 const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
 const old=JSON.parse(await readFile('docs/experiments/league22-guru/MEASUREMENTS.json','utf8'));
 const proposals=JSON.parse(await readFile('docs/experiments/league22-guru/reward-options.json','utf8')).options;
 const rewards=[{id:'NONE',places:[]},...proposals,{id:'D',nameRU:'Меньше монет, без подсказок',places:[{coins:30,hints:0},{coins:20,hints:0},{coins:10,hints:0}]}];
 const cadences=[{id:'relax-2',count:2,track:'relax'},{id:'relax-4',count:4,track:'relax'},{id:'relax-6',count:6,track:'relax'},{id:'challenge-2',count:2,track:'challenge'},{id:'mixed-4',count:4,track:'mixed'},{id:'weekend-relax-6',count:6,track:'relax',weekend:true},{id:'daily-1',count:1,track:'daily'},{id:'campaign-2',count:2,track:'campaign'},{id:'quest-3',count:3,track:'quest'}];
 const variants=['current','compact-same-rules','simple-3-candidate','off-candidate'],journeys=[];
 for(const cohort of ['new','mature'])for(const cadence of cadences){
  let now=iso(anchor-dayMs),serial=0;
  const seed=createSave(`economy-${cohort}-${cadence.id}`,now,'UTC','first'),data=new Map();
  if(cohort==='mature'){seed.profile.solvedIds=[...catalog.boards,...catalog.referenceBoards].map(p=>p.puzzleId);seed.profile.campaignCursor=catalog.campaignSequence(seed.contentVersion).length;seed.profile.fragments=48;seed.profile.paidCardIds=catalog.config.cards.map(c=>c.id);seed.profile.rank=100;}
  const repo=new SaveRepository({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}},()=>structuredClone(seed));
  const session=new GameSession(await repo.load(),repo,()=>`sim-${++serial}`,()=>now);
  async function win(){
   const p=catalog.getPuzzle(session.state.attempt.puzzleId),answer=answers[p.puzzleId].answer,used=new Set();session.state.attempt.placements={};
   for(const cell of p.cells.filter(c=>c.given===undefined)){const i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));assert.ok(i>=0);used.add(i);session.state.attempt.placements[cell.id]='t'+i;}
   session.state.attempt.status='won';await session.navigate('home');return structuredClone(session.state.result);
  }
  if(cohort==='new')for(let i=0;i<15;i++){await win();if(i<14)await session.next();}
  for(let week=0;week<3;week++){
   now=iso(anchor+week*7*dayMs);await session.refreshDay();await session.enterLeague();
   const before=structuredClone(session.state.profile),income={baseCoins:0,dailyCoins:0,taskCoins:0,setCoins:0,rankCoins:0,cardCoins:0},trace=[];
   for(let day=0;day<7;day++){
    if(cadence.weekend&&day<5)continue;
    const distinct=new Set();
    for(let n=0;n<cadence.count;n++){
     now=iso(anchor+(week*7+day)*dayMs+20*3600000+n*60000);await session.refreshDay();
     const mode=cadence.track==='mixed'?(n===3?'daily':n===2?'challenge':'relax'):cadence.track;
     let opened;
     if(mode==='daily')opened=await session.openDaily(now.slice(0,10));
     else if(mode==='campaign'){
      const id=catalog.campaignSequence(session.state.contentVersion)[cohort==='mature'?n:session.state.profile.campaignCursor];
      opened=await session.openOffer({puzzleId:id,mode:'campaign'},true,0,true);
     }else if(mode==='quest'){
      const index=session.state.meta.quests?.slots.findIndex(s=>!s.paid)??-1;if(index<0)break;
      assert.ok(session.questOffer(index));opened=await session.openQuest(index,true);
     }else opened=await session.openFreeTrack(mode,true);
     assert.equal(opened,'opened');const p=catalog.getPuzzle(session.state.attempt.puzzleId),receipt=await win();
     const grants=Object.fromEntries(Object.keys(income).map(k=>[k,receipt[k]??0]));for(const k of Object.keys(income))income[k]+=grants[k];
     assert.equal(Object.values(grants).reduce((a,b)=>a+b,0),receipt.coins);
     const simple=distinct.has(p.puzzleId)?0:distinct.size===0?10:distinct.size===1?10:distinct.size===2?40:0;distinct.add(p.puzzleId);
     const nonquest=receipt.coins-grants.taskCoins-grants.setCoins;
     trace.push({at:Date.parse(now),day:now.slice(0,10),puzzleId:p.puzzleId,difficulty:p.difficulty,mode:session.state.attempt.mode,receiptId:receipt.id,first:receipt.first,leaguePoints:receipt.league.points,grants,
      coins:{current:receipt.coins,'compact-same-rules':receipt.coins,'simple-3-candidate':nonquest+simple,'off-candidate':nonquest},simpleQuestCoins:simple});
    }
   }
   now=iso(anchor+(week+1)*7*dayMs);await session.refreshDay();
   const total=Object.values(income).reduce((a,b)=>a+b,0);assert.equal(session.state.profile.coins-before.coins,total);decodeSave(session.state);
   const historical=old.economy.find(e=>e.cohort===cohort&&e.scenario===cadence.id&&e.week===week);
   if(historical)assert.equal(total,historical.baselineCoins,'Published #22 baseline must reproduce');
   journeys.push({cohort,scenario:cadence.id,week,boards:trace.length,beforeCoins:before.coins,afterCoins:session.state.profile.coins,income,coins:Object.fromEntries(variants.map(v=>[v,trace.reduce((sum,e)=>sum+e.coins[v],0)])),points:trace.reduce((sum,e)=>sum+e.leaguePoints,0),trace});
  }
 }
 const ranks=[];
 for(let seed=0;seed<100;seed++)for(let week=0;week<3;week++){
  const base=league.joinLeague(undefined,'pace-'+seed,'UTC',iso(anchor+week*7*dayMs));
  for(const j of journeys.filter(j=>j.week===week)){
   const state=structuredClone(base);for(const e of j.trace)league.recordLeagueWin(state,{...e,profileId:state.profileId,weekId:state.active.id,assisted:false},iso(e.at));
   league.advanceLeague(state,iso(anchor+(week+1)*7*dayMs));assert.equal(state.history[0].points,j.points);
   ranks.push({seed,week,cohort:j.cohort,scenario:j.scenario,place:state.history[0].rank,points:j.points});
  }
 }
 const prize=(r,option)=>r.points?option.places[r.place-1]??{coins:0,hints:0}:{coins:0,hints:0},economy=[];
 for(const j of journeys)for(const variant of variants)for(const option of rewards){
  const samples=ranks.filter(r=>r.cohort===j.cohort&&r.scenario===j.scenario&&r.week===j.week).map(r=>prize(r,option)),coins=mean(samples.map(p=>p.coins)),hints=mean(samples.map(p=>p.hints));
  economy.push({cohort:j.cohort,scenario:j.scenario,week:j.week,variant,ordinaryCoins:j.coins[variant],proposal:option.id,expectedCoins:coins,expectedCredits:hints,additionalHelpCapacity:round(coins/catalog.config.hintCostCoins+hints),helpPurchasingPowerPercent:j.coins[variant]?round(100*(coins+catalog.config.hintCostCoins*hints)/j.coins[variant]):null,zeroIncome:j.coins[variant]===0});
 }
 const rankIndex=new Map(ranks.map(r=>[`${r.seed}:${r.week}:${r.cohort}:${r.scenario}`,r])),wallet=[];
 for(const cohort of ['new','mature'])for(const cadence of cadences)for(const variant of variants)for(const rate of [.25,.5,1])for(const option of rewards){
  const weeks=journeys.filter(j=>j.cohort===cohort&&j.scenario===cadence.id),samples=[];
  for(let seed=0;seed<100;seed++){
   let coins=weeks[0].beforeCoins,credits=0,seen=0,need=0,unfunded=0;
   for(const week of weeks){
    for(const e of week.trace){
     const asks=Math.floor((seen+1)*rate)-Math.floor(seen*rate);seen++;
     for(let a=0;a<asks;a++){need++;if(credits)credits--;else if(coins>=catalog.config.hintCostCoins)coins-=catalog.config.hintCostCoins;else unfunded++;}
     coins+=e.coins[variant];
    }
    const award=prize(rankIndex.get(`${seed}:${week.week}:${cohort}:${cadence.id}`),option);coins+=award.coins;credits+=award.hints;
   }
   samples.push({coins,credits,need,unfunded});
  }
  wallet.push({cohort,scenario:cadence.id,variant,hintsPerBoard:rate,proposal:option.id,weeks:3,startingCoins:weeks[0].beforeCoins,hintDemand:samples[0].need,unfundedRequests:mean(samples.map(s=>s.unfunded)),endingCoins:mean(samples.map(s=>s.coins)),endingCredits:mean(samples.map(s=>s.credits))});
 }
 assert.equal(JSON.stringify(catalog.config),configBefore);assert.equal(JSON.stringify(league.leaguePolicy),policyBefore);
 assert.ok(journeys.every(j=>j.coins.current===j.coins['compact-same-rules']));
 const report={status:'PASS',baseline:'ad1bbbc5833b1cfd4b9489e8ff74b76031ad1069',scope:'Synthetic fixed completion traces, real GameSession writer. Counterfactual goal rules and prizes are model-only, not player behaviour or ad revenue.',liveVariant:'compact-same-rules',livePrizes:false,cohortWeeks:journeys.length,rankReplays:ranks.length,seedCount:100,leaguePolicy:structuredClone(league.leaguePolicy),payoutConfigSha256:createHash('sha256').update(await readFile('docs/spec/product/meta_v08/config.json')).digest('hex'),variants,rewards,economy,wallet,
  assumptions:['Preserve all already-earned starting resources in every variant; changes are prospective.','Current and compact variants use identical real 7-group rotation, targets, eligibility, grants and receipts.','Simple candidate: one daily three-distinct-board goal, no rotating metric; milestone payments 10/10/40, same maximum 60. It is NOT implemented in gameplay.','Off candidate removes only future quest income; Daily 30, unique-board coins, rank and workshop remain unchanged.','Same solved-ID trace in each variant; quest-guided traces do not predict what a person would choose under another policy.','Income uses no-help actual settlements; help expenses are a sensitivity model, not an ad impression or a behavioural forecast.','Help is paid before a board; ordinary income afterwards; weekly prizes after closing the week, available in subsequent weeks only.','An unfunded request assumes one external earned credit to continue the fixed trace; no automatic game grant or live SDK claim.','Zero baseline income has no finite percentage: report absolute coins/help capacity, never divide by zero.','Weekly A/B/C remain unchanged proposals; D is an additional lower coin-only proposal. No runtime policy, payout or economy change.']};
 await writeFile(out+'/journeys.json',JSON.stringify(journeys,null,2)+'\n');await writeFile(out+'/ranks.json',JSON.stringify(ranks,null,2)+'\n');await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 const verified=spawnSync('python3',['tools/meta18-economy-verify.py',out],{encoding:'utf8'});assert.equal(verified.status,0,verified.stderr||verified.stdout);await writeFile(out+'/independent.json',verified.stdout);
 console.log(JSON.stringify({status:report.status,cohortWeeks:journeys.length,rankReplays:ranks.length,week1:journeys.filter(j=>!j.week).map(({trace,...j})=>j),wallet:wallet.filter(w=>w.scenario==='relax-6'&&w.hintsPerBoard===.5)},null,2));
}finally{await server.close();}
