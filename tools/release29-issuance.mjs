import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({mode:'release-candidate',server:{middlewareMode:true},appType:'custom'});
try{
 const catalog=await server.ssrLoadModule('/src/content/catalog.ts'),f=await server.ssrLoadModule('/src/content/freeIssuance.ts'),{createSave}=await server.ssrLoadModule('/src/app/model.ts'),{bucketTurn}=await server.ssrLoadModule('/src/content/rotation.ts');
 const rows=[];
 for(const track of ['relax','challenge'])for(const prefix of [0,15,240])for(const policy of ['legacy','d4-old','d4-rc']){
  const s=createSave('comparison','2026-11-28T12:00:00Z','UTC','original');s.profile.solvedIds=[...catalog.campaignSequence('content-v2').slice(0,prefix)];s.meta.freeProgress={relax:0,challenge:0};
  const ids=[],gaps=[],shapeGaps=[],seen=new Map(),shapes=new Map();let beforeCycle=0,coins=0;
  for(let index=0;index<600;index++){
   const bucket=bucketTurn(track,index).bucket,pool=policy==='d4-rc'?catalog.freeTrackBucket(track,index):catalog.referenceBoards.filter(p=>p.bucket===bucket);
   const p=policy==='legacy'?catalog.newFreeTrackPuzzle(track,index,s.profile.solvedIds):f.selectPilotPuzzle(pool,s.profile.solvedIds,index,s.meta.freeIssuance?.[track]?.issued??{});
   assert.equal(p.bucket,bucket);const shape=f.boardShape(p);
   if(seen.has(p.puzzleId)){gaps.push(index-seen.get(p.puzzleId));if(pool.some(p=>!seen.has(p.puzzleId)))beforeCycle++;}
   if(shapes.has(shape))shapeGaps.push(index-shapes.get(shape));
   seen.set(p.puzzleId,index);shapes.set(shape,index);ids.push(p.puzzleId);
   if(!s.profile.solvedIds.includes(p.puzzleId)){s.profile.solvedIds.push(p.puzzleId);coins+=catalog.config.difficultyRewards[p.difficulty].coins;}
   if(policy!=='legacy'){f.pinFreeAssignment(s.meta,track,{index,puzzleId:p.puzzleId,policy:'d4-v2'});f.closeFreeAssignment(s.meta,track,index);}s.meta.freeProgress[track]++;
  }
  const metric=a=>({count:a.length,min:a.length?Math.min(...a):null,mean:a.length?a.reduce((n,v)=>n+v,0)/a.length:null});
  if(policy!=='legacy')assert.equal(beforeCycle,0);
  rows.push({track,prefix,policy,steps:600,unique:seen.size,geometries:shapes.size,beforeCycle,idGapLE50:gaps.filter(g=>g<=50).length,shapeGapLE3:shapeGaps.filter(g=>g<=3).length,idGap:metric(gaps),shapeGap:metric(shapeGaps),uniqueBaseCoins:coins,traceSha256:createHash('sha256').update(ids.join('\n')).digest('hex'),ids});
 }
 await mkdir('.test-output/release29',{recursive:true});await writeFile('.test-output/release29/issuance-comparison.json',JSON.stringify({status:'PASS',scope:'10800 model assignments; actual session restart/mixed persistence separately tested in release29.test.ts',rows},null,2));
 console.log(JSON.stringify(rows.map(({ids,...r})=>r),null,2));
}finally{await server.close();}
