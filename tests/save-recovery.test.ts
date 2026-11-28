import {describe,it,expect} from 'vitest';
import {SaveRepository,SAVE_KEY,SaveConflict} from '../src/app/saveRepository';
import {compareAndSet} from '../src/app/atomicStorage';
import type {AtomicStorage,StorageBatch} from '../src/app/atomicStorage';
import {createSave,decodeSave} from '../src/app/model';
import {GameSession} from '../src/app/session';
import {createAttempt} from '../src/core/engine';
import {getPuzzle,config,campaignSequence} from '../src/content/catalog';
import {PAGE_PREFIX,planSave} from '../src/app/savePages';
import {mkdirSync,writeFileSync} from 'node:fs';

const now='2026-11-23T12:00:00Z';
const fresh=()=>createSave('recovery-33',now,'UTC','initial');
let serial=0;
const session=(state:Awaited<ReturnType<SaveRepository['load']>>,repo:SaveRepository)=>new GameSession(state,repo,()=>`save33-${++serial}`,()=>now);
class Disk implements AtomicStorage {
  data=new Map<string,string>();failKey:string|undefined;lostAck=false;
  async getItem(key:string){return this.data.get(key)??null;}
  async setItem(key:string,value:string){if(key===this.failKey)throw Error('before root');this.data.set(key,value);}
  async removeItem(key:string){this.data.delete(key);}
  async listKeys(prefix:string){return [...this.data.keys()].filter(k=>k.startsWith(prefix));}
  async compareAndSet(batch:StorageBatch){
    const adapter={getItem:this.getItem.bind(this),setItem:this.setItem.bind(this),removeItem:this.removeItem.bind(this)};
    const applied=await compareAndSet(adapter,batch);
    if(applied&&this.lostAck){this.lostAck=false;throw Error('lost ACK');}
    return applied;
  }
}
async function setup(paged=false,puzzleId?:string){
  const disk=new Disk(),seed=fresh();
  if(puzzleId){seed.attempt=createAttempt(getPuzzle(puzzleId),'larger');seed.profile.campaignCursor=campaignSequence(seed.contentVersion).indexOf(puzzleId);seed.meta.screen='play';}
  if(paged){
    const a=createAttempt(getPuzzle('cm-own-02-220'),'long-history');
    a.history=Array.from({length:900},()=>({placements:{},trayOrder:[...a.trayOrder]}));
    a.commandIds=Array.from({length:900},(_,i)=>'preserved-'+i);a.boardRevision=900;seed.attempt=a;
  }
  const plan=await planSave(decodeSave(seed));
  for(const {key,value} of plan.entries)disk.data.set(key,value);
  disk.data.set(SAVE_KEY,plan.raw);
  expect(Object.hasOwn(JSON.parse(plan.raw),'storageFormat')).toBe(paged);
  const repo=new SaveRepository(disk,fresh),a=session(await repo.load(),repo);
  return {disk,repo,a,seed};
}
describe('FINAL-SAVE-01 exact observed base',()=>{
  it.each([false,true].flatMap(paged=>[false,true].map(shared=>({paged,shared}))))('rejects ABA with paged=$paged sharedRepository=$shared, then reloads without loss',async({paged,shared})=>{
    const {disk,repo,a,seed}=await setup(paged);
    await a.update({sound:true},false);await a.update({vibration:true},false);
    const stale=structuredClone(a.state),oldPrimary=disk.data.get(SAVE_KEY)!;
    // Exercise both damaged flat bytes and a damaged immutable primary page.
    if(paged)disk.data.set(PAGE_PREFIX+JSON.parse(oldPrimary).root,'damaged primary page');
    else disk.data.set(SAVE_KEY,'corrupt primary');
    const recoveredRepo=shared?repo:new SaveRepository(disk,fresh);
    const b=session(await recoveredRepo.load(),recoveredRepo);
    expect(recoveredRepo.recoveredBackup).toBe(true);expect(b.state.revision).toBe(1);
    expect(b.state.settings).toMatchObject({sound:true,vibration:false});
    await b.update({language:'en'},false);expect(b.state.revision).toBe(stale.revision);
    const confirmed=structuredClone(b.state),before=new Map(disk.data);
    await expect(a.update({timerVisible:true},false)).rejects.toBeInstanceOf(SaveConflict);
    expect(a.state).toEqual(stale);expect(disk.data).toEqual(before);expect(await recoveredRepo.load()).toEqual(confirmed);
    const retry=session(await repo.load(),repo);await retry.update({timerVisible:true},false);
    expect(retry.state.revision).toBe(3);expect(retry.state.settings).toMatchObject({language:'en',sound:true,vibration:false,timerVisible:true});
    expect(retry.state.attempt).toEqual(seed.attempt);expect(retry.state.profile).toEqual(seed.profile);
    expect(await new SaveRepository(disk,fresh).load()).toEqual(retry.state);
    mkdirSync('.test-output/save33',{recursive:true});
    writeFileSync(`.test-output/save33/${paged?'paged':'flat'}-${shared?'shared':'separate'}.json`,JSON.stringify({status:'PASS',paged,shared,backupRecovered:true,reusedRevision:2,staleOutcome:'SaveConflict',lostAcknowledgedChange:false,retryRevision:3,logicalStatePreserved:true,scope:'Injected disk fault with actual GameSession/SaveRepository; not physical Android'},null,2));
  });
  it('does not let another load rebind an old base, and does not accept a clone or another storage capability',async()=>{
    const {disk,repo}=await setup(),base=await repo.load(),next=structuredClone(base);next.revision++;
    const committed=await repo.commit(base,next);await repo.load();const before=new Map(disk.data);
    await expect(repo.commit(base,next)).rejects.toBeInstanceOf(SaveConflict);
    const n=structuredClone(committed);n.revision++;
    await expect(repo.commit(structuredClone(committed),n)).rejects.toThrow('base was not loaded');
    const other=new SaveRepository(new Disk(),fresh);await expect(other.commit(committed,n)).rejects.toThrow('base was not loaded');
    expect(disk.data).toEqual(before);
    expect(await repo.commit(committed,n)).toEqual(n);
  });
  it.each([false,true])('retains the exact base after a before-root failure and reconciles lost ACK, paged=%s',async paged=>{
    const {disk,repo,a}=await setup(paged),before=structuredClone(a.state);
    disk.failKey=SAVE_KEY;await expect(a.update({language:'en'},false)).rejects.toThrow('before root');
    expect(a.state).toEqual(before);expect(await repo.load()).toEqual(before);
    disk.failKey=undefined;disk.lostAck=true;
    await a.update({language:'en'},false);expect(a.state.revision).toBe(1);
    await a.update({timerVisible:true},false);expect(await repo.load()).toEqual(a.state);
    expect(a.state.settings).toMatchObject({language:'en',timerVisible:true});
  });
  it('keeps one real help debit and one rewarded grant after recovery, failed writes, lost ACK and restart',async()=>{
    const {disk,repo,a}=await setup(false,'cm-own-02-004');await a.update({sound:true},false);await a.update({vibration:true},false);
    disk.data.set(SAVE_KEY,'corrupt primary');const b=session(await repo.load(),repo);await b.update({language:'en'},false);
    const plan=b.prepareHelp('reveal',getPuzzle(b.state.attempt.puzzleId).cells.find(c=>c.given===undefined)!.id)!;
    const coins=b.state.profile.coins;disk.failKey=SAVE_KEY;
    await expect(b.help('reveal','help-after-recovery',plan.boardRevision,plan)).rejects.toThrow('before root');
    expect(b.state.profile.coins).toBe(coins);expect(b.state.helpReceipts['help-after-recovery']).toBeUndefined();
    disk.failKey=undefined;disk.lostAck=true;
    const paid=await b.help('reveal','help-after-recovery',plan.boardRevision,plan);expect(paid.outcome).toBe('applied');expect(b.state.profile.coins).toBe(coins-paid.costCoins);
    let cold=session(await repo.load(),repo);expect(await cold.help('reveal','help-after-recovery',plan.boardRevision,plan)).toEqual(paid);
    const request=await cold.beginReward('hint');expect(request).not.toBeNull();
    const event={id:request!.id,profileId:request!.profileId,outcome:'earned' as const},credits=cold.state.profile.hintCredits;
    disk.failKey=SAVE_KEY;await expect(cold.acceptReward(event,()=>true)).rejects.toThrow('before root');expect(cold.state.profile.hintCredits).toBe(credits);
    disk.failKey=undefined;disk.lostAck=true;expect(await cold.acceptReward(event,()=>true)).toBe('applied');
    cold=session(await repo.load(),repo);expect(await cold.acceptReward(event,()=>true)).toBe('already-applied');
    expect(cold.state.profile.hintCredits).toBe(credits+config.rewardedHintCredits);expect(cold.state.profile.coins).toBe(coins-paid.costCoins);
    await expect(a.update({timerVisible:true},false)).rejects.toBeInstanceOf(SaveConflict);expect(await repo.load()).toEqual(cold.state);
  });
});
