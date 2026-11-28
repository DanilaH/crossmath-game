import {compareAndSet} from './atomicStorage';
import type {AtomicStorage,StorageEntry} from './atomicStorage';
import {planSave,readSave,referencedPages,PAGE_PREFIX,SaveReadUnavailable} from './savePages';
import type {SavePlan} from './savePages';
import { decodeSave } from './model';
import type { Save } from './model';
import { compactDailyArchive } from '../meta/dailyArchive';

export const SAVE_KEY='crossmath.save.v1';
const BACKUP_KEY=SAVE_KEY+'.backup';
export class SaveConflict extends Error {}
export class RecoveryRequired extends Error {}
export class UnrecoverableSave extends Error {
  constructor(readonly primaryRaw:string|null,readonly backupRaw:string|null) {
    super('Neither saved copy could be decoded');
  }
}

function unsupportedSchema(raw:string|null):boolean {
  try { const value=JSON.parse(raw??'null');return Number(value?.schemaVersion)>4 || value?.storageFormat!==undefined&&value.storageFormat!=='crossmath.pages.v1'; }
  catch { return false; }
}
function leagueSignature(save:Save):string{
 const receipt=(value:Save['result'])=>value&&Object.hasOwn(value,'league')?[true,value.league]:[false];
 return JSON.stringify([save.league,save.leagueQuarantine,save.leagueReceiptQuarantine,receipt(save.result),
  Object.entries(save.meta?.inactive??{}).map(([key,slot])=>[key,receipt(slot?.result)]),
  Object.entries(save.meta?.archivedDailyResults??{}).map(([key,result])=>[key,receipt(result)])]);
}
/** Root publication is a CAS transaction; pages are immutable and backup is last-good. */
export class SaveRepository {
  private queue:Promise<unknown>=Promise.resolve();
  private recoveryRequired=false;
  public recoveredBackup=false;
  constructor(private readonly storage:AtomicStorage,private readonly fresh:()=>Save){}
  private enqueue<T>(operation:()=>Promise<T>):Promise<T>{
    const task=this.queue.catch(()=>undefined).then(operation);this.queue=task;return task;
  }
  load():Promise<Save>{return this.enqueue(async()=>{
    // A reader may straddle a root publication/collection. Retry a changed snapshot,
    // never mistake its missing old page for corruption of the new primary.
    for(let retry=0;;retry++)try{return await this.loadOnce();}catch(error){if(!(error instanceof SaveConflict)||retry>=3)throw error;}
  });}
  private async loadOnce():Promise<Save>{
    const raw=await this.storage.getItem(SAVE_KEY);
    let state:Save,needsWrite=false,validPrimary=false;
    let backupRaw:string|null|undefined;
    try{
      if(raw===null)throw Error('No primary save');
      const parsed=await readSave(raw,this.storage),before=leagueSignature(parsed as Save);
      state=decodeSave(parsed);validPrimary=true;
      needsWrite=(parsed as {schemaVersion?:unknown}).schemaVersion!==state.schemaVersion||before!==leagueSignature(state);
    }catch(error){
      if(await this.storage.getItem(SAVE_KEY)!==raw)throw new SaveConflict('Save changed during load');
      if(error instanceof SaveReadUnavailable)throw error;
      if(unsupportedSchema(raw))throw error;
      backupRaw=await this.storage.getItem(BACKUP_KEY);
      try{
        if(raw!==null&&backupRaw===null)throw Error('No backup');
        state=backupRaw===null?this.fresh():decodeSave(await readSave(backupRaw,this.storage));
      }catch(backupError){
        if(backupError instanceof SaveReadUnavailable||unsupportedSchema(backupRaw)||raw===null&&backupRaw===null)throw backupError;
        throw new UnrecoverableSave(raw,backupRaw);
      }
      this.recoveredBackup=backupRaw!==null;needsWrite=true;
    }
    const compacted=compactDailyArchive(state);
    if(needsWrite||compacted){
      backupRaw??=await this.storage.getItem(BACKUP_KEY);
      const extras:StorageEntry[]=raw!==null&&!validPrimary?[{key:SAVE_KEY+'.quarantine',value:raw}]:[];
      const plan=await planSave(state);
      if(compacted&&validPrimary&&raw!==null){
        // Keep the established migration guarantee: the backup already contains
        // the lossless Daily projection if publication of the primary is interrupted.
        extras.push({key:BACKUP_KEY,value:plan.raw});
      }
      await this.publish(raw,backupRaw,plan,extras);
    }else if(await this.storage.getItem(SAVE_KEY)!==raw)throw new SaveConflict('Save changed during load');
    this.recoveryRequired=false;return state;
  }
  resetCorrupt({primaryRaw,backupRaw}:UnrecoverableSave):Promise<void>{return this.enqueue(async()=>{
    const [primary,backup]=await Promise.all([this.storage.getItem(SAVE_KEY),this.storage.getItem(BACKUP_KEY)]);
    if(primary!==primaryRaw||backup!==backupRaw)throw new SaveConflict('Save changed before reset');
    const fresh=await planSave(this.fresh());
    const extras:StorageEntry[]=[];
    if(primaryRaw!==null)extras.push({key:SAVE_KEY+'.quarantine',value:primaryRaw});
    if(backupRaw!==null)extras.push({key:BACKUP_KEY+'.quarantine',value:backupRaw});
    extras.push({key:BACKUP_KEY,value:fresh.raw});
    try{await this.publish(primaryRaw,backupRaw,fresh,extras);}catch(error){if(error instanceof SaveConflict)throw new SaveConflict('Save changed before reset');throw error;}
  });}
  commit(expectedRevision:number,next:Save):Promise<Save>{
    const captured=decodeSave(next);compactDailyArchive(captured);
    return this.enqueue(async()=>{
      if(this.recoveryRequired)throw new RecoveryRequired('Reload durable state before retrying');
      const raw=await this.storage.getItem(SAVE_KEY);
      let current:Save;
      try{current=raw===null?this.fresh():decodeSave(await readSave(raw,this.storage));}
      catch(error){if(await this.storage.getItem(SAVE_KEY)!==raw)throw new SaveConflict('Save revision changed');throw error;}
      if(current.revision!==expectedRevision||current.profile.id!==captured.profile.id||captured.revision!==expectedRevision+1)throw new SaveConflict('Save revision changed');
      const backupRaw=await this.storage.getItem(BACKUP_KEY);
      const plan=await planSave(captured);
      // Repack a legacy large root too: neither canonical copy grows with raw Undo snapshots.
      const previous=await planSave(current);
      await this.publish(raw,backupRaw,{raw:plan.raw,entries:[...previous.entries,...plan.entries]},[{key:BACKUP_KEY,value:previous.raw}]);
      return structuredClone(captured);
    });
  }
  private async publish(expected:string|null,backupExpected:string|null,plan:SavePlan,extras:StorageEntry[]):Promise<void>{
    const primaryQuarantine=await this.storage.getItem(SAVE_KEY+'.quarantine');
    const backupQuarantine=await this.storage.getItem(BACKUP_KEY+'.quarantine');
    const puts=[...plan.entries,...extras,{key:SAVE_KEY,value:plan.raw}];
    for(const entry of puts)if(new TextEncoder().encode(entry.value).length>4*1024*1024)throw Error('Save exceeds native storage limit');
    const remove:string[]=[];
    if(this.storage.listKeys){
      const keep=new Set(plan.entries.map(e=>e.key));
      try{
        const backup=extras.find(e=>e.key===BACKUP_KEY)?.value??backupExpected;
        const staged:AtomicStorage={...this.storage,getItem:async key=>puts.find(e=>e.key===key)?.value??await this.storage.getItem(key)};
        for(const raw of [backup,primaryQuarantine,backupQuarantine,...extras.filter(e=>e.key.endsWith('.quarantine')).map(e=>e.value)]){
          for(const key of await referencedPages(raw,staged))keep.add(key);
        }
        for(const key of await this.storage.listKeys(PAGE_PREFIX))if(!keep.has(key))remove.push(key);
      }catch{/* A damaged quarantine remains intact; postpone collection rather than drop evidence. */}
    }
    try{
      const applied=await compareAndSet(this.storage,{expected:{[SAVE_KEY]:expected,[BACKUP_KEY]:backupExpected,[SAVE_KEY+'.quarantine']:primaryQuarantine,[BACKUP_KEY+'.quarantine']:backupQuarantine},puts,remove});
      if(!applied)throw new SaveConflict('Save revision changed');
    }catch(error){
      if(error instanceof SaveConflict)throw error;
      try{
        const durable=await this.storage.getItem(SAVE_KEY);
        if(durable===plan.raw)return;
        if(durable!==expected)throw Error('Another root followed an uncertain write');
        if(durable!==null)decodeSave(await readSave(durable,this.storage));
      }catch{this.recoveryRequired=true;throw new RecoveryRequired('Write outcome unknown; reload required');}
      throw error;
    }
  }
}
