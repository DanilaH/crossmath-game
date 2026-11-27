import { JsonStorageRepository } from '@danilah/mini-games-kit/platform';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
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
  try { return Number(JSON.parse(raw ?? 'null')?.schemaVersion)>4; }
  catch { return false; }
}
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
    this.backup=new JsonStorageRepository({storage,key:BACKUP_KEY,codec,createDefault:()=>{throw Error('No backup');}});
  }
  async load(): Promise<Save> {
    const raw=await this.storage.getItem(SAVE_KEY);
    let state:Save;
    let needsWrite=false;
    let validPrimary=false;
    try {
      if(raw===null)throw Error('No primary save');
      const parsed:unknown=JSON.parse(raw);
      const hadLeagueQuarantine=(parsed as Save).leagueQuarantine!==undefined;
      state=decodeSave(parsed);
      needsWrite=(parsed as {schemaVersion?:unknown}).schemaVersion!==state.schemaVersion||state.leagueQuarantine!==undefined&&!hadLeagueQuarantine;
      validPrimary=true;
    } catch(error) {
      if (unsupportedSchema(raw)) throw error;
      const backupRaw=await this.storage.getItem(BACKUP_KEY);
      try{
        if(raw!==null && backupRaw===null)throw Error('No backup');
        state=backupRaw===null?this.fresh():decodeSave(JSON.parse(backupRaw));
      }catch(backupError){
        if (unsupportedSchema(backupRaw) || raw===null && backupRaw===null) throw backupError;
        throw new UnrecoverableSave(raw,backupRaw);
      }
      if(raw!==null)await this.storage.setItem(SAVE_KEY+'.quarantine',raw);
      this.recoveredBackup=backupRaw!==null;
      needsWrite=true;
    }
    const compacted=compactDailyArchive(state);
    if(needsWrite || compacted){
      if(await this.storage.getItem(SAVE_KEY)!==raw)throw new SaveConflict('Save changed during load');
      if(compacted && validPrimary)await this.backup.write(state);
      await this.writePrimary(state);
    }
    this.recoveryRequired=false; return state;
  }

  async resetCorrupt({primaryRaw,backupRaw}:UnrecoverableSave):Promise<void> {
    const [primary,backup]=await Promise.all([this.storage.getItem(SAVE_KEY),this.storage.getItem(BACKUP_KEY)]);
    if (primary!==primaryRaw || backup!==backupRaw) throw new SaveConflict('Save changed before reset');
    if (primary!==null) await this.storage.setItem(SAVE_KEY+'.quarantine',primary);
    if (backup!==null) await this.storage.setItem(BACKUP_KEY+'.quarantine',backup);
    const fresh=this.fresh();
    await this.backup.write(fresh);
    await this.writePrimary(fresh);
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
