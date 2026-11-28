import {describe,it,expect} from 'vitest';
import {additionalBoards,boards,referenceBoards,freeTrackBucket,campaignSequence,getPuzzle,releaseDailyBank} from '../src/content/catalog';
import {countSolutions} from '../src/content/validator';
import {product,productProfile} from '../src/product/releaseProfile';
import {createAttempt,applyHelpLayout} from '../src/core/engine';
import {prepareExplanation,verifyExplanation} from '../src/help/logic';
import {materializeHelp} from '../src/help/reveal';
import {createSave,decodeSave} from '../src/app/model';
import {resolveFreeAssignment,pinFreeAssignment,closeFreeAssignment,boardShape} from '../src/content/freeIssuance';
import {calendarPuzzle} from '../src/meta/calendar';
import {leagueEnabled,joinLeague} from '../src/meta/league';
import {rotations} from '../src/content/rotation';
import mapping from '../docs/acceptance/release29/content-map.json';
import source from '../docs/experiments/content03/banks.json';
import {mkdirSync,writeFileSync} from 'node:fs';

const now='2026-11-28T12:00:00Z';
const fresh=()=>createSave('release29',now,'UTC','original-attempt');
describe.skipIf(!product.candidate)('RELEASE-01 coherent product',()=>{
 it('activates only the reviewed RC set without lab UI, payouts or win bonus',()=>{
  expect(product.candidate).toBe(true);expect(product.issuance).toBe('d4-v2');expect(leagueEnabled).toBe(true);
  expect(product.lab).toBe(false);expect(product.winBonusCandidate).toBe(false);
  expect(productProfile('release').candidate).toBe(false);expect(productProfile('release').issuance).toBe('legacy');
  expect(boards.length+referenceBoards.length).toBe(515);expect(additionalBoards.length).toBe(90);
  expect(new Set([...boards,...referenceBoards,...additionalBoards].map(p=>p.puzzleId)).size).toBe(605);
  expect(additionalBoards.filter(p=>p.bucket==='easy-short')).toHaveLength(40);
  expect(additionalBoards.filter(p=>p.bucket==='daily')).toHaveLength(50);
  const old=campaignSequence('content-v2');expect(old).toHaveLength(240);expect(old.some(id=>id.startsWith('cm-own-03'))).toBe(false);
  for(const m of mapping){
   const original=[...source.easy9,...source.daily].find(p=>p.puzzleId===m.source)!;
   const actual=getPuzzle(m.product);expect(actual).toEqual({...original,puzzleId:m.product,contentVersion:3,campaignPosition:actual.campaignPosition});
  }
 });
 it('proves all 90 integrated IDs with independent uniqueness and verified Explain from empty and partial positions',()=>{
  const rows=[];
  for(const p of additionalBoards){
   expect(countSolutions(p)).toEqual({count:1,exhausted:false});
   for(const prefix of [0,2]){
    let a=createAttempt(p,'rc-proof-'+p.puzzleId);let steps=0;
    while(a.status==='playing'){
     const proof=prepareExplanation(p,a);expect(proof.outcome,p.puzzleId).toBe('ready');if(proof.outcome!=='ready')throw Error(p.puzzleId);
     expect(verifyExplanation(p,a,proof.plan)).toBe(true);
     const layout=materializeHelp(p,a,proof.plan)!;expect(layout).not.toBeNull();
     a=applyHelpLayout(p,a,layout,'rc-step-'+steps++);expect(steps).toBeLessThanOrEqual(p.tray.length);
     if(prefix&&steps===prefix){const decoded=decodeSave(structuredClone({...fresh(),attempt:a}));expect(decoded.attempt).toEqual(a);}
    }
    rows.push({id:p.puzzleId,start:prefix?'partial-restart':'empty',steps,unique:1});
   }
  }
  mkdirSync('.test-output/release29',{recursive:true});writeFileSync('.test-output/release29/content-proof.json',JSON.stringify(rows,null,2));
 },60000);
 it('keeps old Daily assignments, parked chips, resources, histories and a v3 League plan (legacy plans have dedicated League tests)',()=>{
  const s=fresh();s.profile.coins=12345;s.profile.hintCredits=17;
  const old=referenceBoards.find(p=>p.bucket==='daily')!;
  s.meta.assignments['2026-11-27']={puzzleId:old.puzzleId,calendarVersion:'calendar-v2'};
  const a=createAttempt(old,'old-daily','daily');a.dayKey='2026-11-27';
  const cell=old.cells.find(c=>c.given===undefined)!;a.placements[cell.id]=a.trayOrder[0]!;
  s.meta.inactive['daily:2026-11-27']={attempt:a,result:null};
  const league=joinLeague(undefined,s.profile.id,'UTC',now)!;
  expect(league.active!.policy.version).toBe('league-lab-3');
  const copy=structuredClone(s);copy.league=league;
  const decoded=decodeSave(structuredClone(copy));expect(decoded).toEqual(copy);
  expect(releaseDailyBank).toHaveLength(100);expect(releaseDailyBank).toContain(calendarPuzzle('2026-11-28'));
 });
 it('issues mixed long traces deterministically, pins across reload and retains six-slot difficulty rotations',()=>{
  const run=()=>{
   const s=fresh(),rows=[];s.meta.freeProgress={relax:0,challenge:0};
   for(let n=0;n<1800;n++){
    const track=n%3===0?'challenge':'relax',index=s.meta.freeProgress![track],a=resolveFreeAssignment(s,track,'d4-v2')!;
    const p=getPuzzle(a.puzzleId);expect(p.bucket).toBe(rotations[track][index%6]);
    pinFreeAssignment(s.meta,track,a);
    const decoded=decodeSave(structuredClone(s));
    expect(resolveFreeAssignment(decoded,track,'d4-v2')).toEqual(a);
    rows.push({track,index,id:p.puzzleId,shape:boardShape(p)});
    if(!s.profile.solvedIds.includes(p.puzzleId))s.profile.solvedIds.push(p.puzzleId);
    closeFreeAssignment(s.meta,track,index);s.meta.freeProgress![track]++;
   }return rows;
  };
  const first=run();expect(run()).toEqual(first);
  expect(first.some(r=>r.id.startsWith('cm-own-03'))).toBe(true);
  expect(freeTrackBucket('relax',0)).toHaveLength(80);
  writeFileSync('.test-output/release29/mixed-1800.json',JSON.stringify(first));
 },60000);
});
