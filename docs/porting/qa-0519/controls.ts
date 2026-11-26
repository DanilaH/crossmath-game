import { it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createSave, settleCompletion, decodeSave, type Save } from '../src/app/model';
import { SaveRepository, SAVE_KEY } from '../src/app/saveRepository';
import { GameSession } from '../src/app/session';
import { createAttempt, applyCommand } from '../src/core/engine';
import { campaignSequence, dailyVersion, getPuzzle } from '../src/content/catalog';
import { calendarPuzzle, dayFromIndex, calendarDayIndex } from '../src/meta/calendar';
import { refreshDay } from '../src/meta/progress';
import oldAnswers from '../docs/spec/product/content_v09/author_solutions.json';
import newAnswers from '../docs/spec/product/content_v2/author_solutions.json';

const dir = process.env.CROSSMATH_CONTROLS_DIR!;
mkdirSync(dir,{recursive:true});
const dump = (name:string,value:unknown)=>writeFileSync(join(dir,name+'.json'),JSON.stringify(value));
const answers = {...oldAnswers,...newAnswers} as Record<string,{answer:number[]}>;
const bytes = (value:unknown)=>Buffer.byteLength(JSON.stringify(value));

function nextTile(save:Save) {
  const a=save.attempt,p=getPuzzle(a.puzzleId);
  const cell=p.cells.find(c=>c.given===undefined && a.placements[c.id]===undefined)!;
  const value=answers[a.puzzleId]!.answer[cell.id],used=new Set(Object.values(a.placements));
  const token=p.tray.findIndex((v,i)=>v===value&&!used.has('t'+i));
  return {type:'PlaceFromTray' as const,tokenId:'t'+token,cellId:cell.id};
}
function finish(save:Save, now:string) {
  while(save.attempt.status==='playing'){
    const p=getPuzzle(save.attempt.puzzleId);
    save.attempt=applyCommand(p,save.attempt,{...nextTile(save),commandId:randomUUID(),expectedRevision:save.attempt.boardRevision}).state;
    save.revision++;
  }
  return settleCompletion(save,now);
}

it('generates played Daily archives and attempts a write with the actual repository at its size boundary',async()=>{
  const first='2026-01-01', start=first+'T12:00:00Z';
  let s=createSave(randomUUID(),start,'UTC',randomUUID());
  for(const id of campaignSequence(s.contentVersion).slice(0,5)){
    s.result=null;s.attempt=createAttempt(getPuzzle(id),randomUUID());
    s=finish(s,start);
  }
  dump('archive-0',s);
  const parked:Save['meta']['inactive']={};
  let parkedBytes=0;
  const milestones:Record<string,number>={};
  const assemble=():Save=>({...s,meta:{...s.meta,inactive:{...parked}}});
  for(let n=1;n<=1800;n++){
    const day=dayFromIndex(calendarDayIndex(first)+n-1),now=day+'T12:00:00Z';
    const previous=n>1 && parkedBytes+bytes(s)>4*1024*1024-32000?structuredClone(assemble()):null;
    // Keep dormant slots outside the hot simulation. Rejoin every original slot for all measurements and real persistence.
    const dormant={attempt:s.attempt,result:s.result};
    parked[s.meta.activeSlot]=dormant;
    parkedBytes+=bytes(dormant)+bytes(s.meta.activeSlot)+2;
    s.meta.activeSlot='daily:'+day;
    const id=calendarPuzzle(day);
    s.meta.assignments[day]={puzzleId:id,calendarVersion:dailyVersion};
    s.result=null;s.attempt=createAttempt(getPuzzle(id),randomUUID(),'daily');
    s.attempt.dayKey=day;s.career.modes.daily.starts++;
    refreshDay(s,now);s=finish(s,now);
    if([30,90,180,365,730].includes(n))milestones[n]=bytes(assemble());
    if([30,180,365].includes(n))dump('archive-'+n,decodeSave(assemble()));
    if(n===30)dump('jan30',decodeSave(assemble()));
    if(parkedBytes+bytes(s)<4*1024*1024-128)continue;
    const size=bytes(assemble());
    if(size<=4*1024*1024)continue;
    if(!previous)throw Error('Missing pre-boundary state');
    expect(bytes(previous)).toBeLessThanOrEqual(4*1024*1024);
    const memory=new Map([[SAVE_KEY,JSON.stringify(previous)]]);
    const repository=new SaveRepository({async getItem(k){return memory.get(k)??null},async setItem(k,v){memory.set(k,v)},async removeItem(k){memory.delete(k)}},()=>previous);
    const session=new GameSession(await repository.load(),repository,randomUUID,()=>now);
    let operations=0,operation='openDaily',error='';
    try{
      await session.openDaily(day);operation='place';
      while(session.state.attempt.status==='playing'){await session.command(nextTile(session.state));operations++;}
    }catch(e){error=String(e);}
    expect(error).toContain('Save exceeds native storage limit');
    const last=await repository.load();
    dump('storage',{daysAttempted:n,day,previousBytes:bytes(previous),projectedBytes:size,
      durableCompleted:last.meta.completedDates.length,durableBytes:bytes(last),limit:4*1024*1024,
      operation,successfulTileOperations:operations,error,months:Object.keys(last.meta.monthlyTrophies??{}).length,milestones});
    return;
  }
  throw Error('Did not reach threshold');
},240000);
