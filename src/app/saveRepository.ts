import { JsonStorageRepository } from '@danilah/mini-games-kit/platform';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import { decodeSave } from './model';
import type { Save } from './model';
import { compactDailyArchive } from '../meta/dailyArchive';

export const SAVE_KEY='crossmath.save.v1';
export class SaveConflict extends Error {}
export class RecoveryRequired extends Error {}
/** One canonical atomic blob holds attempt + wallet + receipts + result. Backup is last-good, not another writer. */
export class SaveRepository {
  private readonly primary: JsonStorageRepository<Save>;
  private readonly backup: JsonStorageRepository<Save>;
  private queue: Promise<unknown> = Promise.resolve();
  private recoveryRequired=false;
  public recoveredBackup=false;
  constructor(private readonly storage: StorageAdapter, private readonly fresh: () => Save) {
    const codec={decode:decodeSave};
    this.primary=new JsonStorageRepository({storage,key:SAVE_KEY,codec,createDefault:fresh});
    this.backup=new JsonStorageRepository({storage,key:SAVE_KEY+'.backup',codec,createDefault:()=>{throw Error('No backup');}});
  }
  async load(): Promise<Save> {
    const raw=await this.storage.getItem(SAVE_KEY);
    let state:Save;
    let needsWrite=false;
    let validPrimary=false;
    if(raw===null){
      const backup=await this.storage.getItem(SAVE_KEY+'.backup');
      state=backup===null?this.fresh():decodeSave(JSON.parse(backup));
      needsWrite=true;
      this.recoveredBackup=backup!==null;
    }else{
      try{
        const parsed:unknown=JSON.parse(raw);
        state=decodeSave(parsed);
        needsWrite=(parsed as {schemaVersion?:unknown}).schemaVersion!==state.schemaVersion;
        validPrimary=true;
      }catch{
        // Quarantine corrupt bytes. A failure to write a valid migration is handled separately.
        state=await this.backup.load();
        await this.storage.setItem(SAVE_KEY+'.quarantine',raw);
        this.recoveredBackup=true;
        needsWrite=true;
      }
    }
    const compacted=compactDailyArchive(state);
    if(needsWrite || compacted){
      if(await this.storage.getItem(SAVE_KEY)!==raw)throw new SaveConflict('Save changed during load');
      if(compacted && validPrimary)await this.backup.write(state);
      await this.writePrimary(state);
    }
    this.recoveryRequired=false; return state;
  }
  commit(expectedRevision: number, next: Save): Promise<Save> {
    const captured=decodeSave(next);
    compactDailyArchive(captured);
    const task=this.queue.catch(()=>undefined).then(async()=>{
      if (this.recoveryRequired) throw new RecoveryRequired('Reload durable state before retrying');
      const current=await this.primary.load();
      if (current.revision!==expectedRevision || current.profile.id!==captured.profile.id || captured.revision!==expectedRevision+1) throw new SaveConflict('Save revision changed');
      if (new TextEncoder().encode(JSON.stringify(captured)).length>4*1024*1024) throw Error('Save exceeds native storage limit');
      await this.backup.write(current);
      await this.writePrimary(captured);
      return structuredClone(captured);
    });
    this.queue=task; return task;
  }

  private async writePrimary(state:Save):Promise<void>{
    try { await this.primary.write(state); }
    catch (error) {
      try {
        const raw=await this.storage.getItem(SAVE_KEY);
        if (raw===JSON.stringify(state)) return;
        if (raw!==null) decodeSave(JSON.parse(raw));
      } catch { this.recoveryRequired=true; throw new RecoveryRequired('Write outcome unknown; reload required'); }
      throw error;
    }
  }
}
