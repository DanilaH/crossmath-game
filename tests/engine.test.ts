import { describe, expect, it } from 'vitest';
import { boards, getPuzzle } from '../src/content/catalog';
import { applyCommand, createAttempt } from '../src/core/engine';
import { assertInventory, cellValue, evaluate } from '../src/core/types';
import type { Attempt, BoardAction, Puzzle } from '../src/core/types';
const puzzle=(n:number)=>getPuzzle(`cm-own-01-${String(n).padStart(3,'0')}`);
function harness(p:Puzzle,mode:Attempt['mode']='campaign'){
  let state=createAttempt(p,'attempt',mode),id=0;
  return {get state(){return state;},act(action:BoardAction){const r=applyCommand(p,state,{...action,commandId:String(++id),expectedRevision:state.boardRevision});state=r.state;return r;}};
}
describe('P01/P03: pure command semantics',()=>{
 it('keeps the valid row editable; one atomic swap solves field 12',()=>{
  const p=puzzle(12),h=harness(p);h.act({type:'PlaceFromTray',tokenId:'t0',cellId:0});h.act({type:'PlaceFromTray',tokenId:'t1',cellId:1});h.act({type:'PlaceFromTray',tokenId:'t2',cellId:3});
  expect(evaluate(p,h.state)).toEqual(['valid','invalid']);expect(h.state.status).toBe('playing');
  const rev=h.state.boardRevision,history=h.state.history.length;
  expect(h.act({type:'MoveCell',from:0,to:1}).cue).toBe('win');expect(h.state.boardRevision).toBe(rev+1);expect(h.state.history).toHaveLength(history+1);
  expect(h.act({type:'Undo'}).outcome).toBe('unavailable');
 });
 it('preserves both fives, exact identity through swap/undo, displaced tray token and stable sorting',()=>{
  const p=puzzle(7),h=harness(p);h.act({type:'PlaceFromTray',tokenId:'t0',cellId:0});h.act({type:'PlaceFromTray',tokenId:'t2',cellId:1});
  const original=structuredClone(h.state.placements);h.act({type:'MoveCell',from:0,to:1});expect(h.state.placements).toEqual({'0':'t2','1':'t0'});
  h.act({type:'Undo'});expect(h.state.placements).toEqual(original);
  h.act({type:'PlaceFromTray',tokenId:'t1',cellId:0});expect(Object.values(h.state.placements)).not.toContain('t0');assertInventory(p,h.state);
  h.act({type:'ReturnToTray',cellId:1});h.act({type:'SortTray'});expect(h.state.trayOrder).toEqual(['t0','t2','t1']);
 });
 it('rejects stale, duplicate, fixed-target and unavailable-source events without changing state',()=>{
  const p=puzzle(7),a=createAttempt(p,'id');const cmd={type:'PlaceFromTray' as const,tokenId:'t0',cellId:0,commandId:'same-gesture',expectedRevision:0};
  const b=applyCommand(p,a,cmd).state;expect(applyCommand(p,b,cmd).outcome).toBe('duplicate');expect(applyCommand(p,b,cmd).state).toBe(b);
  expect(applyCommand(p,b,{...cmd,commandId:'new'}).outcome).toBe('stale_snapshot');
  expect(applyCommand(p,a,{...cmd,cellId:2}).state).toBe(a);expect(applyCommand(p,a,{...cmd,tokenId:'t999'}).state).toBe(a);
 });
 it('daily removes at most one life per placement; undo does not refund it',()=>{
  const h=harness(puzzle(12),'daily');h.act({type:'PlaceFromTray',tokenId:'t0',cellId:0});h.act({type:'PlaceFromTray',tokenId:'t1',cellId:1});h.act({type:'PlaceFromTray',tokenId:'t2',cellId:3});expect(h.state.lives).toBe(2);
  h.act({type:'Undo'});expect(h.state.lives).toBe(2);
 });
 it('endless waits for submission and deduplicates rejected layouts by values',()=>{
  const p=puzzle(7),h=harness(p,'endless');h.act({type:'PlaceFromTray',tokenId:'t0',cellId:0});h.act({type:'PlaceFromTray',tokenId:'t1',cellId:1});h.act({type:'PlaceFromTray',tokenId:'t2',cellId:4});
  expect(h.state.lives).toBe(3);expect(h.state.status).toBe('playing');h.act({type:'SubmitEndless'});expect(h.state.lives).toBe(2);
  h.act({type:'MoveCell',from:0,to:4});h.act({type:'SubmitEndless'});expect(h.state.lives).toBe(2);
  h.act({type:'MoveCell',from:1,to:4});expect(h.state.status).toBe('playing');expect(evaluate(p,h.state)).toEqual(['valid','valid']);h.act({type:'SubmitEndless'});expect(h.state.status).toBe('won');
 });
 it('maintains inventory under seeded mixed legal and illegal commands on the whole bank',()=>{
  let seed=7643;const random=(n:number)=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
  for(const p of boards){const h=harness(p);for(let i=0;i<30;i++){
   const from=random(p.cells.length),to=random(p.cells.length),kind=random(5);
   const action:BoardAction=kind===0?{type:'PlaceFromTray',tokenId:`t${random(p.tray.length)}`,cellId:to}:kind===1?{type:'MoveCell',from,to}:kind===2?{type:'ReturnToTray',cellId:from}:kind===3?{type:'Undo'}:{type:'SortTray'};
   h.act(action);assertInventory(p,h.state);for(const c of p.cells)if(c.given!==undefined)expect(cellValue(p,h.state,c.id)).toBe(c.given);
  }}
 });
});
