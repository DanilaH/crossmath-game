import { it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const out = process.env.CROSSMATH_CONTROLS_DIR;
if (!out) throw new Error('Set CROSSMATH_CONTROLS_DIR to the audit output directory');
mkdirSync(out,{recursive:true});
import { createSave, decodeSave, settleCompletion } from '../src/app/model';
import { campaignSequence, getPuzzle } from '../src/content/catalog';
import { createAttempt, applyCommand } from '../src/core/engine';
import { GameSession } from '../src/app/session';
import { SaveRepository } from '../src/app/saveRepository';
import a from '../docs/spec/product/content_v09/author_solutions.json';
import b from '../docs/spec/product/content_v2/author_solutions.json';
it('constructs a fully settled control profile via physical token commands',()=>{
 const now='2026-11-21T12:00:00.000Z', answers={...a,...b} as Record<string,{answer:number[]}>;
 let s=createSave('research-control',now,'UTC','start');
 for(const id of campaignSequence(s.contentVersion)){
   const p=getPuzzle(id), attempt=createAttempt(p,'attempt-'+id);s.attempt=attempt;s.result=null;
   for(const c of p.cells.filter(c=>c.given===undefined)){
     const used=new Set(Object.values(s.attempt.placements));
     const t=p.tray.findIndex((v,i)=>v===answers[id]!.answer[c.id] && !used.has('t'+i));
     s.attempt=applyCommand(p,s.attempt,{type:'PlaceFromTray',cellId:c.id,tokenId:'t'+t,commandId:'place-'+c.id,expectedRevision:s.attempt.boardRevision}).state;
   }
   expect(s.attempt.status).toBe('won');
   s=settleCompletion(s,now);
 }
 expect(s.profile.campaignCursor).toBe(240);
 writeFileSync(join(out,'full-campaign.json'),JSON.stringify(decodeSave(s)));
});
it('creates 28/29 and 29/29 controls with the actual save writer',async()=>{
  const answers={...a,...b} as Record<string,{answer:number[]}>;
  let now='2028-02-01T12:00:00Z', serial=0;
  const seeder=()=>createSave('calendar-control',now,'UTC','lesson-1');
  const data=new Map<string,string>();
  const repo=new SaveRepository({async getItem(k){return data.get(k)??null},async setItem(k,v){data.set(k,v)},async removeItem(k){data.delete(k)}},seeder);
  const s=new GameSession(await repo.load(),repo,()=>String(++serial),()=>now);
  async function solve(){
    const p=getPuzzle(s.state.attempt.puzzleId);
    for(const c of p.cells.filter(c=>c.given===undefined)){
      const used=new Set(Object.values(s.state.attempt.placements));
      const t=p.tray.findIndex((v,i)=>v===answers[p.puzzleId]!.answer[c.id]&&!used.has('t'+i));
      await s.command({type:'PlaceFromTray',cellId:c.id,tokenId:'t'+t});
    }
    expect(s.state.attempt.status).toBe('won');
  }
  for(let i=0;i<5;i++){if(i>0) await s.next();await solve();}
  for(let i=1;i<=29;i++){
    const day='2028-02-'+String(i).padStart(2,'0');now=day+'T12:00:00Z';
    await s.refreshDay();expect(await s.openDaily(day)).toBe('opened');await solve();
    expect(s.state.meta.completedDates.length).toBe(i);
    if(i>=28) writeFileSync(join(out,'feb'+i+'.json'),JSON.stringify(await repo.load()));
  }
},60000);
