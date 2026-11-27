import {createServer} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({mode:'league-lab',server:{middlewareMode:true},appType:'custom'});
try{
 const league=await server.ssrLoadModule('/src/meta/league.ts'),catalog=await server.ssrLoadModule('/src/content/catalog.ts');
 const {joinLeague,advanceLeague,recordLeagueWin,leagueRows,leagueBotEvents}=league;
 const anchor=Date.parse('2026-11-23T00:00:00Z'),rows=[],botTotals=[];
 const patterns=[{name:'skip',track:'relax',count:0,days:[0,1,2,3,4,5,6]},
  {name:'easy-one-daily',track:'easy',count:1,days:[0,1,2,3,4,5,6]},
  {name:'relax-two-daily',track:'relax',count:2,days:[0,1,2,3,4,5,6]},
  {name:'relax-six-daily',track:'relax',count:6,days:[0,1,2,3,4,5,6]},
  {name:'challenge-two-daily',track:'challenge',count:2,days:[0,1,2,3,4,5,6]},
  {name:'challenge-six-daily',track:'challenge',count:6,days:[0,1,2,3,4,5,6]},
  {name:'weekend-relax-six',track:'relax',count:6,days:[5,6]}];
 const bank=(pattern,index)=>pattern.track==='easy'?catalog.referenceBoards.filter(p=>p.bucket==='easy-short')[index%40]:catalog.freeTrackPuzzle(pattern.track,index);
 for(let seed=0;seed<200;seed++)for(const joinedDay of [0,4,6]){
  const joinAt=new Date(anchor+joinedDay*86_400_000).toISOString();
  const base=joinLeague(undefined,'model-'+seed,'UTC',joinAt);
  if(!joinedDay)botTotals.push(base.active.bots.map(b=>leagueBotEvents(b).reduce((n,e)=>n+e.points,0)));
  for(const pattern of patterns){
   const state=structuredClone(base);let issued=0,accepted=0;
   for(const day of pattern.days.filter(d=>d>=joinedDay))for(let n=0;n<pattern.count;n++){
    const p=bank(pattern,issued++),at=anchor+day*86_400_000+20*3_600_000+n*60_000;
    const now=new Date(at).toISOString();advanceLeague(state,now);
    accepted+=recordLeagueWin(state,{profileId:state.profileId,weekId:state.active.id,receiptId:'win:'+issued,puzzleId:p.puzzleId,mode:pattern.track==='easy'?'campaign':'free',difficulty:p.difficulty,assisted:false,at},now);
   }
   advanceLeague(state,'2026-11-30T00:00:00Z');
   const result=state.history[0];assert.equal(result.points,accepted);
   rows.push({seed,joinedDay,scenario:pattern.name,wins:issued,points:result.points,place:result.rank,medal:result.medal.tier});
  }
 }
 const spread=xs=>{xs.sort((a,b)=>a-b);return {min:xs[0],median:(xs[(xs.length-1)>>1]+xs[xs.length>>1])/2,max:xs.at(-1)};};
 const summary=[];
 for(const joinedDay of [0,4,6])for(const scenario of patterns.map(p=>p.name)){
  const group=rows.filter(r=>r.joinedDay===joinedDay&&r.scenario===scenario);
  summary.push({joinedDay,scenario,wins:spread(group.map(r=>r.wins)),points:spread(group.map(r=>r.points)),place:spread(group.map(r=>r.place)),gold:group.filter(r=>r.medal==='gold').length/200});
 }
 const week=joinLeague(undefined,'footprint','UTC','2026-11-23T00:00:00Z');
 const activeBytes=new TextEncoder().encode(JSON.stringify(week)).length;advanceLeague(week,'2026-11-30T00:00:00Z');
 const resultBytes=new TextEncoder().encode(JSON.stringify(week.history[0])).length;
 const late=joinLeague(undefined,'late','UTC','2026-11-29T23:59:59Z'),lateWin=structuredClone(late);
 recordLeagueWin(lateWin,{profileId:'late',weekId:lateWin.active.id,receiptId:'win:late',puzzleId:catalog.boards[0].puzzleId,mode:'campaign',difficulty:'easy',assisted:false,at:Date.parse('2026-11-29T23:59:59Z')},'2026-11-29T23:59:59Z');
 advanceLeague(late,'2026-11-30T00:00:00Z');advanceLeague(lateWin,'2026-11-30T00:00:00Z');
 const {createSave,decodeSave,settleCompletion}=await server.ssrLoadModule('/src/app/model.ts');
 const maxProfile=createSave('max-profile','2026-11-23T09:00:00Z','UTC','max-ordinary');
 maxProfile.league=joinLeague(undefined,maxProfile.profile.id,'UTC','2026-11-23T09:00:00Z');
 const allBoards=[...catalog.boards,...catalog.referenceBoards];maxProfile.profile.solvedIds=allBoards.map(p=>p.puzzleId);
 for(const [i,p] of allBoards.entries())recordLeagueWin(maxProfile.league,{profileId:maxProfile.profile.id,weekId:maxProfile.league.active.id,receiptId:'win:fixture-'+i,puzzleId:p.puzzleId,mode:'free',difficulty:p.difficulty,assisted:false,at:Date.parse('2026-11-23T09:00:00Z')},'2026-11-23T09:00:00Z');
 maxProfile.meta.screen='league';decodeSave(maxProfile);
 const {createAttempt}=await server.ssrLoadModule('/src/core/engine.ts');
 const authorAnswers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
 let progression=createSave('rich-win-fixture','2026-11-23T09:00:00Z','UTC','fixture-first');
 progression.league=joinLeague(undefined,progression.profile.id,'UTC','2026-11-23T09:00:00Z');const richWins=[];
 for(let i=0;i<228;i++){
  const puzzle=catalog.campaignPuzzle(i,'content-v2');progression.attempt=createAttempt(puzzle,'fixture-'+i);progression.result=null;
  const cells=puzzle.cells.filter(c=>c.given===undefined),answer=authorAnswers[puzzle.puzzleId].answer,used=new Set();
  for(const cell of cells){const token=puzzle.tray.findIndex((n,index)=>n===answer[cell.id]&&!used.has(index));used.add(token);progression.attempt.placements[cell.id]='t'+token;}
  if([2,4,14,227].includes(i)){
   const fixture=structuredClone(progression);delete fixture.attempt.placements[cells.at(-1).id];fixture.meta.screen='play';decodeSave(fixture);richWins.push({milestone:i+1,points:league.leaguePolicy.weights[puzzle.difficulty],save:fixture});
  }
  progression.attempt.status='won';progression=settleCompletion(progression,'2026-11-23T09:00:00Z');
 }
 const baseline=JSON.parse(await readFile('docs/experiments/league22/BASELINE_V2.json','utf8'));
 assert.equal(lateWin.history[0].rank,10);assert.equal(lateWin.history[0].medal.tier,'participant');
 const report={comparison:{baselinePolicy:baseline.policy.version,baselineLastMinuteEasyPlace:baseline.lateAdmission.oneEasyWin.rank,newLastMinuteEasyPlace:lateWin.history[0].rank,pairedCadences:summary.map(row=>({joinedDay:row.joinedDay,scenario:row.scenario,before:baseline.summary.find(r=>r.joinedDay===row.joinedDay&&r.scenario===row.scenario),after:row}))},scope:'Synthetic cadence on the actual immutable bank/six-step routes and runtime league algorithm. Not observed human sessions or retention.',
  baseline:'8ac5dc66583509ef8784c927aa450b01a54fd847',policy:league.leaguePolicy,controls:rows.length,admissionSnapshots:600,uniqueScheduleSets:200,
  lateAdmission:{zeroPoints:late.history[0],oneEasyWin:lateWin.history[0],decision:'v3 retains v2 full calendar-week progress. One last-minute Easy win is place 10 and cannot earn a top-three medal; v1 active weeks stay frozen.'},
  maximumWeeklyPoints:Object.values(maxProfile.league.active.contributions).reduce((n,c)=>n+c.points,0),
  fullWeekBotTotals:['A1','A2','B1','B2','C1','C2','D1','D2','D3'].map((category,index)=>({category,points:spread(botTotals.map(x=>x[index]))})),summary,
  storage:{activeBytes,settledWeekBytes:resultBytes,history52EstimateBytes:52*resultBytes,history1100EstimateBytes:1100*resultBytes},
  caveats:['Late joiners face the same calendar week; no free catch-up or adaptive boost. Numeric pacing still requires playtest approval.',
   'No-win entrants receive only a participation result in the current cosmetic experiment; medal thresholds require calibration.',
   'Player-priority ties and all-place cosmetic medals are provisional. No coin/hint/XP league reward.',
   'Exact source templates and batches are ported; own target bands and normal frozen-weekend policy remain provisional. Source live configuration/prizes UNKNOWN.']};
 await mkdir('.test-output/league22',{recursive:true});await writeFile('.test-output/league22/rich-wins.json',JSON.stringify(richWins)+'\n');await writeFile('.test-output/league22/max-profile.json',JSON.stringify(maxProfile)+'\n');await writeFile('.test-output/league22/model.json',JSON.stringify(report,null,2)+'\n');
 await writeFile('.test-output/league22/model-rows.json',JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify({controls:rows.length,summary,storage:report.storage},null,2));
}finally{await server.close();}
