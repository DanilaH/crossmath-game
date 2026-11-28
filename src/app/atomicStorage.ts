import type {StorageAdapter} from '@danilah/mini-games-kit/platform';

export interface StorageEntry {key:string;value:string}
export interface StorageBatch {
  expected:Record<string,string|null>;
  /** Immutable pages first, backup next, the canonical root last (linearization point). */
  puts:StorageEntry[];
  remove:string[];
}
export interface AtomicStorage extends StorageAdapter {
  compareAndSet?(batch:StorageBatch):Promise<boolean>;
  listKeys?(prefix:string):Promise<string[]>;
}
const queues=new WeakMap<StorageAdapter,Promise<unknown>>();

/** Injected adapters share an identity lock. Production web/native adapters supply real CAS. */
export function compareAndSet(storage:AtomicStorage,batch:StorageBatch):Promise<boolean>{
  if(storage.compareAndSet)return storage.compareAndSet(batch);
  const task=(queues.get(storage)??Promise.resolve()).catch(()=>undefined).then(async()=>{
    for(const [key,value] of Object.entries(batch.expected))if(await storage.getItem(key)!==value)return false;
    for(const {key,value} of batch.puts){
      try{await storage.setItem(key,value);}
      catch(error){if(await storage.getItem(key)!==value)throw error;}
    }
    // Cleanup is optional: never turn a committed root into a failed operation.
    for(const key of batch.remove)try{await storage.removeItem(key);}catch{/* retry on the next commit */}
    return true;
  });
  queues.set(storage,task);return task;
}

/** Cross-tab lock covers comparison, page writes, backup, root publication and collection. */
export function webAtomicStorage(storage:Storage):AtomicStorage {
  return {
    getItem:async key=>storage.getItem(key),
    setItem:async(key,value)=>{storage.setItem(key,value);},
    removeItem:async key=>{storage.removeItem(key);},
    listKeys:async prefix=>Array.from({length:storage.length},(_,i)=>storage.key(i)!).filter(k=>k?.startsWith(prefix)),
    compareAndSet:async batch=>{
      if(!globalThis.navigator?.locks)throw Error('Transactional storage requires Web Locks');
      return navigator.locks.request('crossmath.save.v1.writer',()=>{
        for(const [key,value] of Object.entries(batch.expected))if(storage.getItem(key)!==value)return false;
        for(const {key,value} of batch.puts)storage.setItem(key,value);
        for(const key of batch.remove)try{storage.removeItem(key);}catch{/* best effort */}
        return true;
      });
    },
  };
}
