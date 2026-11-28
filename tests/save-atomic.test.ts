import {describe,it,expect,vi} from 'vitest';
import {SaveRepository,SAVE_KEY,SaveConflict} from '../src/app/saveRepository';
import {compareAndSet} from '../src/app/atomicStorage';
import type {AtomicStorage,StorageBatch} from '../src/app/atomicStorage';
import {createSave,decodeSave} from '../src/app/model';
import type {Save} from '../src/app/model';
import {getPuzzle,referenceBoards} from '../src/content/catalog';
import {createAttempt,applyCommand} from '../src/core/engine';
import {PAGE_PREFIX,planSave,readSave} from '../src/app/savePages';
class Memory implements AtomicStorage {
 compareAndSet?: (batch:StorageBatch)=>Promise<boolean>;
 data=new Map<string,string>();fail:((key:string)=>void)|null=null;
 async getItem(key:string){return this.data.get(key)??null;}
 async setItem(key:string,value:string){this.fail?.(key);this.data.set(key,value);}
 async removeItem(key:string){this.data.delete(key);}
 async listKeys(prefix:string){return [...this.data.keys()].filter(k=>k.startsWith(prefix));}
}
const fresh=()=>createSave('atomic-profile','2026-11-18T12:00:00Z','UTC','first');
function longSave(n=18000):Save{
 const s=fresh(),p=getPuzzle('cm-own-02-220'),a=createAttempt(p,'long-playing');
 const c=p.cells.find(c=>c.given===undefined)!;
 const b=applyCommand(p,a,{type:'PlaceFromTray',cellId:c.id,tokenId:'t0',commandId:'seed',expectedRevision:0}).state;
 s.attempt={...a,boardRevision:n,history:Array.from({length:n},(_,i)=>({placements:{...(i%2?b:a).placements},trayOrder:[...a.trayOrder]})),commandIds:Array.from({length:n},(_,i)=>'stable-'+String(i).padStart(30,'0'))};
 s.profile.coins=73;s.profile.hintCredits=2;s.helpReceipts['paid-once']={kind:'reveal',outcome:'applied',costCoins:60,costCredits:0};
 return decodeSave(s);
}
async function setup(){const storage=new Memory(),a=new SaveRepository(storage,fresh),b=new SaveRepository(storage,fresh);await a.load();await b.load();return {storage,a,b};}
describe('FUNC-02 transactional save publication',()=>{
 it('rejects a delayed older writer; reload/retry preserves both confirmed settings',async()=>{
  const {storage,a,b}=await setup();const initial=await a.load();let unblock!:()=>void;const gate=new Promise<void>(r=>unblock=r);let arrived!:()=>void;const arrival=new Promise<void>(r=>arrived=r);let hold=true;
  storage.compareAndSet=async batch=>{if(hold){hold=false;arrived();await gate;}const adapter={getItem:storage.getItem.bind(storage),setItem:storage.setItem.bind(storage),removeItem:storage.removeItem.bind(storage)};return compareAndSet(adapter,batch);};
  const old={...structuredClone(initial),revision:1};old.settings.sound=true;const first=a.commit(0,old);await arrival;
  const current={...structuredClone(initial),revision:1};current.settings.vibration=true;await b.commit(0,current);unblock();await expect(first).rejects.toBeInstanceOf(SaveConflict);
  const retry=await a.load();retry.revision++;retry.settings.sound=true;await a.commit(1,retry);expect((await b.load()).settings).toMatchObject({sound:true,vibration:true});
 });
 it('lost CAS acknowledgement recognizes the exact committed root without replaying money',async()=>{
  const {storage,a}=await setup();let calls=0;
  storage.compareAndSet=async batch=>{calls++;const adapter={getItem:storage.getItem.bind(storage),setItem:storage.setItem.bind(storage),removeItem:storage.removeItem.bind(storage)};await compareAndSet(adapter,batch);throw Error('lost native reply');};
  const next=await a.load();next.revision++;next.profile.coins+=10;expect((await a.commit(0,next)).profile.coins).toBe(130);expect((await a.load()).profile.coins).toBe(130);expect(calls).toBe(1);
 });
 it('an unrelated later root after lost ACK requires recovery instead of a false success',async()=>{
  const {storage,a}=await setup();const initial=await a.load();
  storage.compareAndSet=async batch=>{for(const e of batch.puts)await storage.setItem(e.key,e.value);const newer=structuredClone(initial);newer.revision=2;newer.settings.vibration=true;await storage.setItem(SAVE_KEY,JSON.stringify(newer));throw Error('lost reply');};
  const next=structuredClone(initial);next.revision=1;next.settings.sound=true;await expect(a.commit(0,next)).rejects.toThrow('reload required');await expect(a.commit(0,next)).rejects.toThrow('Reload durable');
  expect((await a.load()).settings.vibration).toBe(true);
 });
});
describe('FUNC-03 lossless paged saves',()=>{
 it('crosses 4MiB, retains every Undo/ID/receipt, continues and reloads a parked Daily',async()=>{
  const {storage,a}=await setup(),s=longSave();expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeGreaterThan(4*1024*1024);
  const dp=referenceBoards.find(p=>p.bucket==='daily')!,daily=createAttempt(dp,'parked-daily','daily');daily.dayKey='2026-11-18';const dc=dp.cells.find(c=>c.given===undefined)!;const placed=applyCommand(dp,daily,{type:'PlaceFromTray',tokenId:'t0',cellId:dc.id,commandId:'seed-daily',expectedRevision:0}).state;daily.boardRevision=18000;daily.history=Array.from({length:18000},(_,i)=>({placements:{...(i%2?placed:daily).placements},trayOrder:[...daily.trayOrder]}));daily.commandIds=s.attempt.commandIds.map(id=>'daily-'+id);s.meta.assignments[daily.dayKey]={puzzleId:daily.puzzleId,calendarVersion:'calendar-v2'};
  // Both unfinished histories survive; Daily retains its actual pool assignment.
  s.meta.inactive['daily:'+daily.dayKey]={attempt:daily,result:null};s.revision=1;await a.commit(0,s);
  const before=structuredClone(s);expect(await a.load()).toEqual(before);
  const restored=await a.load(),p=getPuzzle(restored.attempt.puzzleId);restored.attempt=applyCommand(p,restored.attempt,{type:'Undo',commandId:'undo-after-upgrade',expectedRevision:restored.attempt.boardRevision}).state;restored.revision++;await a.commit(1,restored);
  expect(await a.load()).toEqual(restored);expect(restored.attempt.history).toHaveLength(s.attempt.history.length-1);expect(restored.attempt.commandIds).toContain(s.attempt.commandIds[0]);
  expect([...storage.data.values()].every(v=>new TextEncoder().encode(v).length<=128*1024)).toBe(true);expect(storage.data.get(SAVE_KEY)!.length).toBeLessThan(1024);
  const bytes=[...storage.data.values()].reduce((sum,v)=>sum+new TextEncoder().encode(v).length,0);expect(bytes).toBeLessThan(JSON.stringify(s).length/3);
 },30000);
 it.each(['CompressionStream','DecompressionStream'])('retains a multi-level page tree without %s support',async missing=>{
  vi.stubGlobal(missing,undefined);
  try{const {storage,a}=await setup(),s=longSave();s.revision=1;await a.commit(0,s);expect(await a.load()).toEqual(s);const root=JSON.parse(storage.data.get(PAGE_PREFIX+JSON.parse(storage.data.get(SAVE_KEY)!).root)!);expect(root.children).toHaveLength(2);expect(JSON.parse(storage.data.get(PAGE_PREFIX+root.children[0])!).children).toHaveLength(64);expect([...storage.data.values()].every(v=>v.length<=128*1024)).toBe(true);}
  finally{vi.unstubAllGlobals();}
 },30000);
 it('a failed page write leaves the small old save playable; retry and orphan collection succeed',async()=>{
  vi.stubGlobal('CompressionStream',undefined);
  try{const {storage,a}=await setup(),before=await a.load(),s=longSave();s.revision=1;let pages=0;storage.fail=key=>{if(key.startsWith(PAGE_PREFIX)&&++pages===2)throw Error('page write fault');};
   await expect(a.commit(0,s)).rejects.toThrow('page write fault');storage.fail=null;expect(await a.load()).toEqual(before);
   const orphan=PAGE_PREFIX+'0'.repeat(64);storage.data.set(orphan,'orphan');await a.commit(0,s);expect(await a.load()).toEqual(s);expect(storage.data.has(orphan)).toBe(false);
  }finally{vi.unstubAllGlobals();}
 },30000);
 it('rotates the last-good paged backup and preserves its receipts when a primary page is damaged',async()=>{
  const {storage,a}=await setup(),first=longSave();first.revision=1;await a.commit(0,first);
  const next=structuredClone(first);next.revision=2;next.settings.sound=true;await a.commit(1,next);
  const raw=storage.data.get(SAVE_KEY)!,root=JSON.parse(raw).root;storage.data.set(PAGE_PREFIX+root,'damaged');
  const recovered=await a.load();expect(a.recoveredBackup).toBe(true);expect(recovered).toEqual(first);expect(storage.data.get(SAVE_KEY+'.quarantine')).toBe(raw);expect(recovered.helpReceipts).toEqual(first.helpReceipts);
 },30000);
 it('an unavailable decoder preserves compressed primary instead of recovering an older backup',async()=>{
  const {storage,a}=await setup(),s=longSave();s.revision=1;await a.commit(0,s);const root=storage.data.get(SAVE_KEY);
  vi.stubGlobal('DecompressionStream',undefined);
  try{await expect(a.load()).rejects.toThrow('Save page read unavailable');expect(storage.data.get(SAVE_KEY)).toBe(root);expect(storage.data.has(SAVE_KEY+'.quarantine')).toBe(false);}
  finally{vi.unstubAllGlobals();}
  expect(await a.load()).toEqual(s);
 },30000);
 it('an unavailable page read never quarantines or rolls back a valid primary',async()=>{
  const {storage,a}=await setup(),s=longSave();s.revision=1;await a.commit(0,s);const root=storage.data.get(SAVE_KEY);
  const get=storage.getItem.bind(storage);storage.getItem=async key=>{if(key.startsWith(PAGE_PREFIX))throw Error('unavailable disk');return get(key);};
  await expect(a.load()).rejects.toThrow('Save page read unavailable');expect(storage.data.get(SAVE_KEY)).toBe(root);expect(storage.data.has(SAVE_KEY+'.quarantine')).toBe(false);
  storage.getItem=get;expect(await a.load()).toEqual(s);
 },30000);
 it('collects obsolete snapshots but keeps primary, backup and quarantined pages',async()=>{
  const {storage,a}=await setup(),s=longSave();s.revision=1;await a.commit(0,s);
  const quarantine=storage.data.get(SAVE_KEY)!;storage.data.set(SAVE_KEY+'.quarantine',quarantine);
  for(let revision=2;revision<7;revision++){s.revision=revision;s.settings.sound=revision%2===0;await a.commit(revision-1,s);}
  expect(await a.load()).toEqual(s);expect(decodeSave(await readSave(quarantine,storage)).revision).toBe(1);expect(decodeSave(await readSave(storage.data.get(SAVE_KEY+'.backup')!,storage)).revision).toBe(5);
  const live=new Set<string>();for(const raw of [storage.data.get(SAVE_KEY)!,storage.data.get(SAVE_KEY+'.backup')!,quarantine]){const plan=await planSave(decodeSave(await readSave(raw,storage)));for(const e of plan.entries)live.add(e.key);}
  expect((await storage.listKeys(PAGE_PREFIX)).sort()).toEqual([...live].sort());
 },30000);
});
