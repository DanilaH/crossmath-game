import type {AtomicStorage,StorageEntry} from './atomicStorage';
import type {Save} from './model';

export const PAGE_PREFIX='crossmath.save.v1.page.';
export const INLINE_BYTES=128*1024;
const PAGE_BYTES=64*1024,FANOUT=64,FORMAT='crossmath.pages.v1';
const utf8=new TextEncoder(),text=new TextDecoder('utf-8',{fatal:true});
interface Manifest {storageFormat:typeof FORMAT;schemaVersion:4;root:string;codec:'gzip'|'utf8';rawBytes:number;storedBytes:number;revision:number;profileId:string}
type Node={data:string}|{children:string[]};
export interface SavePlan {raw:string;entries:StorageEntry[]}
export class SaveReadUnavailable extends Error {constructor(cause:unknown){super('Save page read unavailable',{cause});}}
const hash=async(raw:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(raw))),n=>n.toString(16).padStart(2,'0')).join('');
const base64=(data:Uint8Array)=>btoa(Array.from(data,n=>String.fromCharCode(n)).join(''));
function unbase64(data:string):Uint8Array {return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}
function manifest(raw:string):Manifest|null {
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||!Object.hasOwn(value,'storageFormat'))return null;
  if(value.storageFormat!==FORMAT||!/^([a-f0-9]{64})$/.test(value.root)||!['gzip','utf8'].includes(value.codec)||
    !Number.isSafeInteger(value.rawBytes)||value.rawBytes<1||!Number.isSafeInteger(value.storedBytes)||value.storedBytes<1)throw Error('Invalid save manifest');
  return value;
}
/** Lossless compression and bounded immutable values. No Undo, ID or receipt is discarded. */
export async function planSave(save:Save):Promise<SavePlan> {
  const raw=JSON.stringify(save),bytes=utf8.encode(raw);
  if(bytes.length<=INLINE_BYTES)return {raw,entries:[]};
  const codec=typeof CompressionStream==='function'?'gzip':'utf8';
  const packed=codec==='gzip'?new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()):bytes;
  const entries=new Map<string,string>();
  const add=async(node:Node)=>{const value=JSON.stringify(node),id=await hash(value);entries.set(PAGE_PREFIX+id,value);return id;};
  let level:string[]=[];
  for(let offset=0;offset<packed.length;offset+=PAGE_BYTES)level.push(await add({data:base64(packed.subarray(offset,offset+PAGE_BYTES))}));
  while(level.length>1){const parents:string[]=[];for(let i=0;i<level.length;i+=FANOUT)parents.push(await add({children:level.slice(i,i+FANOUT)}));level=parents;}
  const m:Manifest={storageFormat:FORMAT,schemaVersion:4,root:level[0]!,codec,rawBytes:bytes.length,storedBytes:packed.length,revision:save.revision,profileId:save.profile.id};
  return {raw:JSON.stringify(m),entries:[...entries].map(([key,value])=>({key,value}))};
}
async function walk(m:Manifest,storage:AtomicStorage,collect:(key:string,node:Node)=>void):Promise<void>{
  const path=new Set<string>();
  const visit=async(id:string,depth:number):Promise<void>=>{
    if(depth>12||!/^([a-f0-9]{64})$/.test(id)||path.has(id))throw Error('Invalid save page tree');
    path.add(id);const key=PAGE_PREFIX+id;let raw:string|null;
    try{raw=await storage.getItem(key);}catch(error){throw new SaveReadUnavailable(error);}
    if(raw===null||utf8.encode(raw).length>96*1024||await hash(raw)!==id)throw Error('Missing or damaged save page');
    const node:Node=JSON.parse(raw);
    if('data' in node){if(typeof node.data!=='string')throw Error('Invalid save page');collect(key,node);}
    else if('children' in node&&Array.isArray(node.children)&&node.children.length>0&&node.children.length<=FANOUT){collect(key,node);for(const child of node.children)await visit(child,depth+1);}
    else throw Error('Invalid save page');
    path.delete(id);
  };await visit(m.root,0);
}
export async function readSave(raw:string,storage:AtomicStorage):Promise<unknown>{
  const m=manifest(raw);if(!m)return JSON.parse(raw);
  const blocks:Uint8Array[]=[];let size=0;
  await walk(m,storage,(_key,node)=>{if('data'in node){const block=unbase64(node.data);size+=block.length;if(size>m.storedBytes)throw Error('Invalid packed length');blocks.push(block);}});
  if(size!==m.storedBytes)throw Error('Invalid packed length');
  const bytes=new Uint8Array(size);let offset=0;for(const block of blocks){bytes.set(block,offset);offset+=block.length;}
  const stream=new Blob([bytes]).stream();
  const decoded=new Uint8Array(await new Response(m.codec==='gzip'?stream.pipeThrough(new DecompressionStream('gzip')):stream).arrayBuffer());
  if(decoded.length!==m.rawBytes)throw Error('Invalid save length');
  const save=JSON.parse(text.decode(decoded));
  if(save.revision!==m.revision||save.profile?.id!==m.profileId)throw Error('Save manifest identity mismatch');
  return save;
}
export async function referencedPages(raw:string|null,storage:AtomicStorage):Promise<Set<string>>{
  const keys=new Set<string>();if(raw===null)return keys;
  let m:Manifest|null;try{m=manifest(raw);}catch(error){if(raw.includes('storageFormat'))throw error;return keys;}
  if(m)await walk(m,storage,key=>keys.add(key));return keys;
}
