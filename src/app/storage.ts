import { Capacitor, registerPlugin } from '@capacitor/core';
import {webAtomicStorage} from './atomicStorage';
import type {AtomicStorage,StorageBatch} from './atomicStorage';
interface NativeStorage {
  get(options:{key:string}):Promise<{value:string|null}>;
  set(options:{key:string;value:string}):Promise<void>;
  remove(options:{key:string}):Promise<void>;
  list(options:{prefix:string}):Promise<{keys:string[]}>;
  compareAndSet(options:StorageBatch):Promise<{applied:boolean}>;
}
const nativeStorage=registerPlugin<NativeStorage>('GameStorage');
export function createStorage():AtomicStorage {
  if(!Capacitor.isNativePlatform())return webAtomicStorage(localStorage);
  return {getItem:async key=>(await nativeStorage.get({key})).value,setItem:(key,value)=>nativeStorage.set({key,value}),removeItem:key=>nativeStorage.remove({key}),
    listKeys:async prefix=>(await nativeStorage.list({prefix})).keys,
    compareAndSet:async batch=>(await nativeStorage.compareAndSet(batch)).applied};
}
