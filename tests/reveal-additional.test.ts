import {describe,it,expect} from 'vitest';
import {additionalBoards,getPuzzle} from '../src/content/catalog';
import {createAttempt,applyHelpLayout} from '../src/core/engine';
import {assertInventory,isSolved,cellValue} from '../src/core/types';
import {reveal,materializeHelp} from '../src/help/reveal';
import {createSave} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {SaveRepository,SAVE_KEY} from '../src/app/saveRepository';
import answers from '../src/content/additionalAnswers.json';
import map from '../docs/acceptance/release29/content-map.json';
import source from '../docs/experiments/content03/author_solutions.json';
const table:Record<string,{answer:number[]}>=answers;
describe('FUNC-01 exact additional Reveal boundary',()=>{
 it('contains exactly the 90 shipped public IDs and their frozen authored answers',()=>{
  expect(Object.keys(table).sort()).toEqual(additionalBoards.map(p=>p.puzzleId).sort());
  for(const m of map)expect(table[m.product]).toEqual((source as Record<string,unknown>)[m.source]);
  expect(Object.keys(table).some(id=>id.includes('lab'))).toBe(false);
 });
 it('respects each selected empty cell and repairs full wrong layouts locally, retaining duplicate physical tokens',()=>{
  let localRepairs=0,movedSources=0;
  for(const p of additionalBoards){
   const holes=p.cells.filter(c=>c.given===undefined);
   for(const selected of holes){const a=createAttempt(p,'empty-'+selected.id),plan=reveal(p,a,selected.id)!;expect(plan.assignments[0]!.cellId).toBe(selected.id);expect(plan.returns).toEqual([]);const layout=materializeHelp(p,a,plan)!;expect(Object.keys(layout.placements)).toEqual([String(selected.id)]);assertInventory(p,layout);}
   let a=createAttempt(p,'wrong');a.placements=Object.fromEntries(holes.map((c,i)=>[c.id,'t'+i]));
   for(let n=0;!isSolved(p,a)&&n<=holes.length;n++){
    const before=structuredClone(a),target=holes.find(c=>cellValue(p,a,c.id)!==table[p.puzzleId]!.answer[c.id])!;
    const plan=reveal(p,a,target.id)!;expect(plan.assignments[0]!.cellId).toBe(target.id);expect(plan.returns.length).toBeLessThanOrEqual(2);
    const layout=materializeHelp(p,a,plan)!;const touched=new Set([String(target.id),...plan.returns.map(String)]);
    for(const cell of holes)if(!touched.has(String(cell.id)))expect(layout.placements[cell.id]).toBe(before.placements[cell.id]);
    for(const cell of holes)if(before.placements[cell.id]&&p.tray[Number(before.placements[cell.id]!.slice(1))]===table[p.puzzleId]!.answer[cell.id])expect(layout.placements[cell.id]).toBe(before.placements[cell.id]);
    movedSources+=Number(plan.returns.some(id=>id!==target.id));localRepairs++;a=applyHelpLayout(p,a,layout,'repair-'+n);assertInventory(p,a);
   }expect(isSolved(p,a),p.puzzleId).toBe(true);
  }expect(localRepairs).toBeGreaterThan(100);expect(movedSources).toBeGreaterThan(0);
 });
 it('charges one durable operation, honors insufficient funds and retries a lost write reply on a new field',async()=>{
  const seed=createSave('p','2026-11-18T12:00:00Z','UTC','initial'),p=getPuzzle('cm-own-03-020');seed.attempt={...createAttempt(p,'relax-new','free'),freeTrack:'relax',freeIndex:0,freeAssignmentVersion:1};seed.meta.activeSlot='free';
  const data=new Map<string,string>([[SAVE_KEY,JSON.stringify(seed)]]);let lost=false;
  const storage={getItem:async(k:string)=>data.get(k)??null,setItem:async(k:string,v:string)=>{data.set(k,v);if(lost&&k===SAVE_KEY)throw Error('lost ACK');},removeItem:async(k:string)=>{data.delete(k);}};
  const repo=new SaveRepository(storage,()=>seed),s=new GameSession(await repo.load(),repo,()=> 'id',()=> '2026-11-18T12:00:00Z');
  const plan=s.prepareHelp('reveal')!;expect(plan).not.toBeNull();lost=true;
  const applied=await s.help('reveal','one-paid',plan.boardRevision,plan);expect(applied).toMatchObject({outcome:'applied',costCoins:60});expect(s.state.profile.coins).toBe(60);
  const cold=new GameSession(await repo.load(),repo,()=> 'other');expect(await cold.help('reveal','one-paid',plan.boardRevision,plan)).toEqual(applied);expect(cold.state.profile.coins).toBe(60);
  const next=structuredClone(cold.state);next.revision++;next.profile.coins=0;await repo.commit(cold.state.revision,next);const poor=new GameSession(await repo.load(),repo,()=> 'poor');
  expect((await poor.help('reveal','no-money',poor.state.attempt.boardRevision,poor.prepareHelp('reveal'))).outcome).toBe('insufficient_resource');expect(poor.state.attempt.placements).toEqual(cold.state.attempt.placements);
 });
});
