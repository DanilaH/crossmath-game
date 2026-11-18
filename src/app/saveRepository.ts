import { JsonStorageRepository } from '@danilah/mini-games-kit/platform';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import { decodeSave } from './model';
import type { Save } from './model';

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
    try {
      if (raw===null) {
        const backup=await this.storage.getItem(SAVE_KEY+'.backup');
        state=backup===null ? this.fresh() : decodeSave(JSON.parse(backup));
        await this.primary.write(state);
        if (backup!==null) this.recoveredBackup=true;
      } else { const parsed:unknown=JSON.parse(raw);state=decodeSave(parsed);if((parsed as {schemaVersion?:unknown}).schemaVersion!==state.schemaVersion)await this.primary.write(state); }
    } catch (error) {
      // Preserve the damaged bytes before replacing them; never silently start a fresh wallet.
      if (raw===null) throw error;
      state=await this.backup.load();
      await this.storage.setItem(SAVE_KEY+'.quarantine',raw);
      await this.primary.write(state); this.recoveredBackup=true;
    }
    this.recoveryRequired=false; return state;
  }
  commit(expectedRevision: number, next: Save): Promise<Save> {
    const captured=decodeSave(next);
    const task=this.queue.catch(()=>undefined).then(async()=>{
      if (this.recoveryRequired) throw new RecoveryRequired('Reload durable state before retrying');
      const current=await this.primary.load();
      if (current.revision!==expectedRevision || current.profile.id!==captured.profile.id || captured.revision!==expectedRevision+1) throw new SaveConflict('Save revision changed');
      if (new TextEncoder().encode(JSON.stringify(captured)).length>4*1024*1024) throw Error('Save exceeds native storage limit');
      await this.backup.write(current);
      try { await this.primary.write(captured); }
      catch (error) {
        let durable:Save;
        try { durable=await this.primary.load(); } catch { this.recoveryRequired=true; throw new RecoveryRequired('Write outcome unknown; reload required'); }
        if (JSON.stringify(durable)!==JSON.stringify(captured)) throw error;
      }
      return structuredClone(captured);
    });
    this.queue=task; return task;
  }
}
