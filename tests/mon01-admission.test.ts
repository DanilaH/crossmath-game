import {afterEach,describe,it,expect,vi} from 'vitest';
import {createAndroidAdsProvider} from '../src/platform/androidAds';
import type {NativeAds} from '../src/platform/androidAds';
import type {RewardRequest,RewardEvent} from '../src/platform/adState';
import {AdsController} from '../src/platform/ads';
import {GameSession} from '../src/app/session';
import {createSave} from '../src/app/model';
import {SaveRepository} from '../src/app/saveRepository';
const now='2026-11-28T12:00:00Z';
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
afterEach(()=>vi.useRealTimers());
class NativeContract {
 phase=new Map<string,{request:RewardRequest;armed:boolean;outcome?:RewardEvent['outcome'];ack?:boolean}>();
 listeners=new Map<string,Set<(event:any)=>void>>();
 fault:'none'|'listener-reject'|'listener-hang'|'reply-lost'='none';
 current:{id:string;presentationId:string;opened:boolean}|undefined;
 sdkCalls=0;ackLost=false;reconcileLost=false;lateListener:(()=>void)|undefined;
 async availability(){return {rewarded:true,interstitial:true,banner:false,protocolVersion:3};}
 async addListener(event:string,cb:(event:any)=>void){
  if(event==='fullscreenOpened'&&this.fault==='listener-reject')throw Error('registration rejected');
  if(event==='fullscreenOpened'&&this.fault==='listener-hang')await new Promise<void>(resolve=>{this.lateListener=resolve;});
  const set=this.listeners.get(event)??new Set();set.add(cb);this.listeners.set(event,set);return {remove:async()=>{set.delete(cb);}};
 }
 emit(event:string,data:any){for(const cb of this.listeners.get(event)??[])cb(data);}
 async pendingRewards(){return {receipts:[...this.phase.values()].filter(r=>r.outcome&&!r.ack).map(r=>this.receipt(r.request.id))};}
 receipt(id:string):RewardEvent{const r=this.phase.get(id)!;return {id,profileId:r.request.profileId,outcome:r.outcome!};}
 async acknowledge({id,outcome}:{id:string;outcome:string}){const r=this.phase.get(id)!;if(r.outcome===outcome)r.ack=true;if(this.ackLost)throw Error('ACK reply lost');}
 async reconcileReward(request:RewardRequest){
  let r=this.phase.get(request.id);const live=this.current?.id===request.id;
  if(!r){r={request,armed:false,outcome:'cancelled'};this.phase.set(request.id,r);}
  else if(!r.outcome&&(!r.armed||live&&!this.current!.opened)){r.outcome='cancelled';if(live)this.current=undefined;}
  const result={state:live&&this.current?.opened?'opened':r.outcome?'closed':'unknown',...(r.outcome?{receipt:this.receipt(request.id)}:{})};
  if(this.reconcileLost){this.reconcileLost=false;throw Error('durable fence reply lost');}return result;
 }
 async showRewarded(request:RewardRequest&{presentationId:string}){
  if(this.phase.has(request.id))return {result:'cancelled'};
  this.phase.set(request.id,{request,armed:true});this.current={id:request.id,presentationId:request.presentationId,opened:true};this.sdkCalls++;
  this.emit('fullscreenOpened',{presentationId:request.presentationId});
  if(this.fault==='reply-lost')throw Error('native dispatched; bridge reply lost');
  return await new Promise<any>(()=>{});
 }
 async showInterstitial(){return {result:'unavailable'};}
 async cancelUnopened(){return {state:this.current?.opened?'opened':'closed'};}
 async setBanner(){}
 earn(){const id=this.current!.id;const r=this.phase.get(id)!;r.outcome='earned';r.ack=false;this.emit('rewardSettled',this.receipt(id));}
 close(){const c=this.current!;const r=this.phase.get(c.id)!;r.outcome??='cancelled';this.current=undefined;this.emit('fullscreenClosed',{presentationId:c.presentationId,result:'shown'});this.emit('rewardSettled',this.receipt(c.id));}
}
async function setup(native=new NativeContract()){
 const data=new Map<string,string>();const repo=new SaveRepository({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}},()=>createSave('p',now,'UTC','first'));
 let serial=0;const session=new GameSession(await repo.load(),repo,()=> 'request-'+(++serial),()=>now),blocks:boolean[]=[];
 const provider=createAndroidAdsProvider(native as unknown as NativeAds);
 const controller=new AdsController(session,provider,v=>blocks.push(v),()=>{});controller.start();await flush();
 return {native,session,repo,provider,controller,blocks};
}
describe('MON-01 actual Android JS adapter + durable game session',()=>{
 it.each(['listener-reject','listener-hang'] as const)('%s fences the saved game request before allowing another ad, late registration cannot dispatch',async fault=>{
  const f=await setup();f.native.fault=fault;vi.useFakeTimers();const work=f.controller.reward('hint',0);
  await vi.advanceTimersByTimeAsync(1700);await work;await flush();
  const request=Object.values(f.session.state.ads.requests)[0]!;
  expect(request.settlement).toBe('cancelled');expect(f.native.sdkCalls).toBe(0);expect(f.controller.rewardAvailable('hint')).toBe(true);
  f.native.lateListener?.();await flush();expect(f.native.sdkCalls).toBe(0);expect(f.blocks.at(-1)).toBe(false);
  f.controller.dispose();
 });
 it('lost show reply after native opening holds input and competing ads until native dismissal; duplicate earned is one atomic reward',async()=>{
  const f=await setup();f.native.fault='reply-lost';f.native.ackLost=true;
  const work=f.controller.reward('hint',0);await flush();expect(f.native.sdkCalls).toBe(1);expect(f.blocks.at(-1)).toBe(true);expect(f.controller.rewardAvailable('hint')).toBe(false);
  f.native.earn();f.native.earn();await flush();expect(f.session.state.profile.hintCredits).toBe(1);
  f.native.close();await work;await flush();expect(f.blocks.at(-1)).toBe(false);
  f.native.ackLost=false;f.controller.refresh();await flush();expect(f.session.state.profile.hintCredits).toBe(1);expect(f.session.state.ads.interstitialGate).toBeDefined();f.controller.dispose();
 });
 it('cold restart between game commit and native dispatch durably fences absence; a delayed old dispatch cannot show',async()=>{
  const f=await setup();const req=(await f.session.beginReward('hint',0))!;f.controller.dispose();
  const restored=new GameSession(await f.repo.load(),f.repo,()=> 'new-request',()=>now);
  const next=new AdsController(restored,f.provider,()=>{},()=>{});next.start();await flush();
  expect(restored.state.ads.requests[req.id]!.settlement).toBe('cancelled');
  await f.native.showRewarded({...req,presentationId:'delayed'});expect(f.native.sdkCalls).toBe(0);expect(next.rewardAvailable('hint')).toBe(true);next.dispose();
 });
 it('lost fence reply remains safe and a later refresh completes game settlement',async()=>{
  const f=await setup();f.controller.dispose();const req=(await f.session.beginReward('hint',0))!;f.native.reconcileLost=true;
  const next=new AdsController(f.session,f.provider,()=>{},()=>{});next.start();await flush();
  next.refresh();await flush();expect(f.session.state.ads.requests[req.id]!.settlement).toBe('cancelled');expect(f.native.sdkCalls).toBe(0);next.dispose();
 });
});
