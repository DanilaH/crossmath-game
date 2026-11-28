// Independent progression proposal model; Node 24; run from pinned Crossmath checkout.
import {readFileSync} from 'node:fs';
function model(old,newer,routes,cfg){
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const all=new Map([...old,...newer].map(x=>[x.puzzleId,x]));
 const rotation={relax:["easy-short","easy-long","normal-short","easy-short","easy-long","normal-long"],challenge:["hard-short","hard-short","expert-short","hard-short","hard-short","hell-short"]};
 const pools={}; for(const p of newer)(pools[p.bucket]??=[]).push(p);
 function pick(track,index){const seq=rotation[track],pos=index%seq.length,bucket=seq[pos],turn=Math.floor(index/seq.length)*seq.filter(x=>x===bucket).length+seq.slice(0,pos).filter(x=>x===bucket).length;return pools[bucket][turn].puzzleId;}
 const campaign=[...routes.campaignSequence.slice(0,15),...Array.from({length:120},(_,i)=>pick("relax",i)),...Array.from({length:105},(_,i)=>pick("challenge",i))];
 const v2Union=new Set([...campaign,...newer.map(x=>x.puzzleId),...routes.endlessSequence]);
 assert(old.length===240&&newer.length===275&&all.size===515&&new Set(campaign).size===240&&v2Union.size===515,"catalog identity");
 const counts=ps=>ps.reduce((a,p)=>(a[p.difficulty]=(a[p.difficulty]||0)+1,a),{});
 const xp=p=>cfg.difficultyRewards[p.difficulty].xp, sum=ps=>ps.reduce((s,p)=>s+xp(p),0);
 const threshold=r=>Math.min(cfg.rank.baseXp+cfg.rank.stepXp*(r-1),cfg.rank.maxXpPerRank);
 const rank=total=>{let r=1;while(total>=threshold(r)){total-=threshold(r);r++}return {rank:r,xp:total,next:threshold(r)}};
 const milestones=[1,3,4,8,15,28,48,50,100,150,200,228,233,238,240];
 const oldParts=cfg.collection.fragmentWinThresholds, extended=[...oldParts,...Array.from({length:24},(_,i)=>228+5*(i+1))];
 let cum=0,route=[];for(let i=0;i<campaign.length;i++){cum+=xp(all.get(campaign[i]));if(milestones.includes(i+1))route.push({wins:i+1,totalXP:cum,...rank(cum),oldParts:oldParts.filter(t=>t<=i+1).length,proposedParts:extended.filter(t=>t<=i+1).length})}
 const saturationXP=sum([...v2Union].map(id=>all.get(id))),start=rank(saturationXP);
 const daily=pools.daily;assert(daily.length===50&&daily.every(p=>xp(p)===15),"daily value");
 let sc=0,score=[];for(let i=0;i<routes.endlessSequence.length;i++){const p=all.get(routes.endlessSequence[i]);sc+=p.equations.length*cfg.endless.scorePerEquation*cfg.endless.multipliers[p.difficulty];if([1,3,5,10,15,20,30,50,100,225].includes(i+1))score.push({stages:i+1,score:sc})}
 const dailyAfterSaturation=[0,7,30,55,90,180,355,365,1355].map(d=>{const a=rank(saturationXP+15*d);return {newDates:d,totalXP:saturationXP+15*d,...a,extraRankCoins:(a.rank-start.rank)*cfg.rank.rewardCoins,existingDailyCoins:cfg.dailyBonusCoins*d}});
 const achievementGroups={difficulty:Object.fromEntries(Object.keys(cfg.difficultyRewards).map(d=>[d,d==="expert"?[1,10,20,50]:[1,10,20,50,100]])),dailyDates:[1,7,30,90,365],monthlyTrophies:[1,3,6,12],fullSets:[10,30,100],anyEndlessScore:[500,1000,5000,10000,25000],distinctWins:[250,400,500],rank:[10,20,30,50,100],completedCards:[18]};
 const newAchievements=Object.values(achievementGroups.difficulty).flat().length+Object.entries(achievementGroups).filter(([k])=>k!=="difficulty").reduce((s,[k,v])=>s+v.length,0);
 const population=counts([...v2Union].map(id=>all.get(id)));
 for(const [d,targets] of Object.entries(achievementGroups.difficulty))assert(targets.every(t=>t<=population[d]),"unreachable difficulty badge "+d);
 assert(newAchievements===45&&cfg.achievements.length===12,"achievement count");
 // Candidate policy, not product code: new Daily date with a previously cleared ID earns fixed 15 XP;
 // first unique ID retains normal base XP and coins, never both; old completed dates already recorded.
 let cases=0;
 for(const mode of ["campaign","free","daily","endless"])for(const first of [false,true])for(const newDate of [false,true])for(const difficulty of Object.keys(cfg.difficultyRewards)){
   const reward=cfg.difficultyRewards[difficulty],eligible=mode==="daily"&&!first&&newDate;
   const got={xp:first?reward.xp:eligible?15:0,baseCoins:first?reward.coins:0};
   assert(got.baseCoins===(first?reward.coins:0),"base grant");
   assert(got.xp===(first?reward.xp:(mode==="daily"&&newDate?15:0)),"XP eligibility");cases++;
 }
 const migration=[];
 for(let wins=0;wins<=515;wins++){
   const previous=oldParts.filter(t=>t<=wins).length, target=extended.filter(t=>t<=wins).length, newCards=Math.floor(target/4)-Math.floor(previous/4);
   assert(target>=previous&&target<=72&&newCards>=0&&newCards<=6,"collection bounds");
   const legacyIds=new Set(Array.from({length:Math.floor(previous/4)},(_,i)=>i));
   const settle=(paid)=>{let grant=0;for(let i=0;i<Math.floor(target/4);i++)if(!paid.has(i)){paid.add(i);grant+=cfg.collection.cardRewardCoins;}return grant;};
   const grant=settle(legacyIds);
   assert(grant===newCards*20&&settle(legacyIds)===0,"migration dedupe");
   if([227,228,232,233,237,238,240,247,248,268,300,348,515].includes(wins))migration.push({wins,oldParts:previous,extendedParts:target,catchupCoins:grant});
 }
 assert(extended[71]===348&&extended.slice(0,48).every((t,i)=>t===oldParts[i]),"prefix");
 // Check rank carry/boundary and payout over 366 date prefixes, independent of the order of distinct first wins.
 for(let d=1;d<=366;d++){
   const prev=rank(saturationXP+15*(d-1)),next=rank(saturationXP+15*d);
   assert(next.rank>=prev.rank&&next.rank<=prev.rank+1&&next.xp>=0&&next.xp<next.next,"rank boundary");
 }
 return {scope:"MODEL on pinned consumer content, not game runtime, player retention or provider evidence",
   campaign:{count:campaign.length,counts:counts(campaign.map(id=>all.get(id))),totalXP:sum(campaign.map(id=>all.get(id))),rank:rank(sum(campaign.map(id=>all.get(id)))),milestones:route},
   configuredRouteUnion:{count:v2Union.size,counts:population,totalXP:saturationXP,rank:start,scope:"route membership, not completed playtest"},
   daily:{count:daily.length,counts:counts(daily),proposedRepeatNewDateXP:15,afterSaturation:dailyAfterSaturation},
   endless:{routeLength:routes.endlessSequence.length,firstCycleScore:sc,checkpoints:score},
   collection:{oldParts:48,proposedParts:72,proposedInstruments:18,addedThresholds:extended.slice(48),newCompletionWins:348,catchupExamples:migration,modelMaxAdditionalCardCoins:120},
   achievementGroups,oldAchievements:cfg.achievements.length,addedAchievements:newAchievements,totalAchievements:cfg.achievements.length+newAchievements,
   controls:{eligibilityMatrix:cases,collectionMigrationStates:516,rankDatePrefixes:366}};
}
const paths=[
  "docs/spec/product/content_v09/boards.json",
  "docs/spec/product/content_v2/boards.json",
  "docs/spec/product/content_v09/routes.json",
  "docs/spec/product/meta_v08/config.json"
];
console.log(JSON.stringify(model(...paths.map(p=>JSON.parse(readFileSync(p,'utf8')))),null,2));
