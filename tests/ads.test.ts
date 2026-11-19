import { describe, expect, it, vi } from 'vitest';
import { createSave } from '../src/app/model';
import { GameSession } from '../src/app/session';
import { SAVE_KEY, SaveRepository } from '../src/app/saveRepository';
import { canShowInterstitial } from '../src/platform/adState';
import type { RewardEvent, RewardRequest } from '../src/platform/adState';
import { AdsController } from '../src/platform/ads';
import type { AdAvailability, AdsProvider, FullscreenResult } from '../src/platform/ads';
import { boards } from '../src/content/catalog';
import { quantity } from '../src/ui/locale';

type Listener<T> = (value:T)=>void;
const ready = {rewarded:true,interstitial:true,banner:true};
const date = '2026-11-19';
const now = date+'T12:00:00Z';
const flush = () => new Promise<void>(resolve=>setTimeout(resolve,0));

class Memory {
  data=new Map<string,string>();
  fail=false;
  async getItem(k:string){return this.data.get(k)??null;}
  async removeItem(k:string){this.data.delete(k);}
  async setItem(k:string,v:string){if(this.fail&&k===SAVE_KEY)throw Error('Write failed');this.data.set(k,v);}
}

class ScriptedProvider implements AdsProvider {
  rewards = new Set<Listener<RewardEvent>>();
  states = new Set<Listener<AdAvailability>>();
  pending=new Map<string,RewardEvent>();
  requests:RewardRequest[]=[];
  acks:string[]=[];
  banners:boolean[]=[];
  interstitials=0;
  failAck=false;
  hangQueries=false;
  statusCalls=0;
  status=ready;
  onRewarded:(request:RewardRequest)=>Promise<FullscreenResult>=async()=> 'shown';
  onInterstitial:()=>Promise<FullscreenResult>=async()=> 'shown';
  async availability(){this.statusCalls++;if(this.hangQueries)return new Promise<AdAvailability>(()=>{});return this.status;}
  async pendingRewards(){if(this.hangQueries)return new Promise<RewardEvent[]>(()=>{});return [...this.pending.values()];}
  async acknowledge(id:string){if(this.failAck)throw Error('Ack failed');this.acks.push(id);this.pending.delete(id);}
  async watchAvailability(listener:Listener<AdAvailability>){this.states.add(listener);return ()=>{this.states.delete(listener);};}
  async watchRewards(listener:Listener<RewardEvent>){this.rewards.add(listener);return ()=>{this.rewards.delete(listener);};}
  async showRewarded(request:RewardRequest){this.requests.push(request);return this.onRewarded(request);}
  async showInterstitial(){this.interstitials++;return this.onInterstitial();}
  async setBanner(visible:boolean){this.banners.push(visible);}
  emit(request:RewardRequest,outcome:RewardEvent['outcome']='earned'){
    const event={id:request.id,profileId:request.profileId,outcome};
    this.pending.set(request.id,event);
    for(const listener of this.rewards)listener(event);
  }
}

async function setup(provider=new ScriptedProvider()){
  const storage=new Memory();
  const fresh=()=>createSave('p',now,'UTC','initial');
  const repo=new SaveRepository(storage,fresh);
  let serial=0;
  const clock={now};
  const session=new GameSession(await repo.load(),repo,()=> 'ad-test-'+(++serial),()=>clock.now);
  const blocks=new Set<string>();
  const controller=new AdsController(session,provider,blocked=>{if(blocked)blocks.add('ad');else blocks.delete('ad');},()=>{});
  controller.start();
  await flush();
  return {provider,storage,repo,clock,session,controller,blocks};
}

describe('Rewarded and interstitial provider contract',()=>{
  it('persists the request before opening and acknowledges an earned callback only after committing the credit',async()=>{
    const {controller,provider,storage,session,blocks}=await setup();
    blocks.add('modal');
    provider.onRewarded=async request=>{
      expect(JSON.parse(storage.data.get(SAVE_KEY)!).ads.requests[request.id].request).toEqual(request);
      expect(blocks).toEqual(new Set(['modal','ad']));
      provider.emit(request);
      await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
      expect(JSON.parse(storage.data.get(SAVE_KEY)!).profile.hintCredits).toBe(1);
      provider.emit(request);
      return 'shown';
    };
    await controller.reward('hint',2);
    await vi.waitFor(()=>expect(provider.acks.length).toBe(2));
    expect(blocks).toEqual(new Set(['modal']));
    expect(session.state.profile.hintCredits).toBe(1);
    expect(session.state.attempt.placements).toEqual({});
    expect(session.state.profile.coins).toBe(120);
    const hint=session.prepareHelp('explain');
    const receipt=await session.help('explain','separate-help',0,hint);
    expect(receipt.costCredits).toBe(1);
    expect(session.state.profile.hintCredits).toBe(0);
    controller.dispose();
  });

  it('gives zero for cancelled and failed outcomes; dismissal alone leaves the receipt eligible after a cold start',async()=>{
    const {provider,controller,repo,session}=await setup();
    for(const outcome of ['cancelled','failed'] as const){
      await controller.reward('hint',0);
      const request=provider.requests.at(-1)!;
      provider.emit(request,outcome);
      await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
    }
    await controller.reward('hint',0);
    const late=provider.requests.at(-1)!;
    expect(session.state.profile.hintCredits).toBe(0);
    expect(session.state.ads.requests[late.id]?.settlement).toBeUndefined();
    controller.dispose();
    provider.emit(late);
    const reopened=new GameSession(await repo.load(),repo,()=> 'loaded',()=>now);
    const resumed=new AdsController(reopened,provider,()=>{},()=>{});
    resumed.start();
    await vi.waitFor(()=>expect(provider.acks).toContain(late.id));
    expect(reopened.state.profile.hintCredits).toBe(1);
    resumed.dispose();
  });

  it('keeps an earned receipt pending through a failed write and retries an acknowledgement without duplicating the credit',async()=>{
    const {provider,controller,storage,session,repo}=await setup();
    await controller.reward('hint',0);
    const request=provider.requests[0]!;
    storage.fail=true;
    provider.emit(request);
    await flush();
    expect(provider.acks).toHaveLength(0);
    expect(session.state.profile.hintCredits).toBe(0);
    storage.fail=false;
    provider.failAck=true;
    controller.refresh();
    await vi.waitFor(()=>expect(session.state.profile.hintCredits).toBe(1));
    expect(provider.pending.has(request.id)).toBe(true);
    controller.dispose();
    provider.failAck=false;
    const resumedSession=new GameSession(await repo.load(),repo,()=> 'after-write',()=>now);
    const resumed=new AdsController(resumedSession,provider,()=>{},()=>{});
    resumed.start();
    await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
    expect(resumedSession.state.profile.hintCredits).toBe(1);
    resumed.dispose();
  });

  it('revives a parked Daily only once and ignores valid late receipts for a replaced attempt',async()=>{
    const {session,provider,controller}=await setup();
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    await session.openDaily(date);
    session.state.attempt.lives=0;
    session.state.attempt.status='out-of-lives';
    await session.update({},false);
    const id=session.state.attempt.id;
    await controller.reward('continue',0);
    await controller.reward('continue',0);
    const [first,duplicate]=provider.requests as [RewardRequest,RewardRequest];
    await session.openCampaign();
    provider.emit(first);
    await vi.waitFor(()=>expect(provider.acks).toContain(first.id));
    expect(session.state.attempt.mode).toBe('campaign');
    await session.openDaily(date);
    expect(session.state.attempt.id).toBe(id);
    expect(session.state.attempt.lives).toBe(1);
    provider.emit(duplicate);
    await vi.waitFor(()=>expect(provider.acks).toContain(duplicate.id));
    expect(session.state.attempt.lives).toBe(1);
    expect(session.state.ads.requests[duplicate.id]?.settlement).toBe('expired');
    await session.restart();
    expect(session.state.attempt.lives).toBe(3);
    session.state.attempt.lives=0;
    session.state.attempt.status='out-of-lives';
    await session.update({},false);
    await controller.reward('continue',0);
    const late=provider.requests.at(-1)!;
    await session.restart();
    provider.emit(late);
    await vi.waitFor(()=>expect(provider.acks).toContain(late.id));
    expect(session.state.attempt.lives).toBe(3);
    expect(session.state.ads.requests[late.id]?.settlement).toBe('expired');
    controller.dispose();
  });

  it('marks revival as assisted for the same Endless run and refuses a second revival within it',async()=>{
    const {session,provider,controller}=await setup();
    session.state.profile.solvedIds=boards.slice(0,15).map(p=>p.puzzleId);
    await session.openEndless();
    session.state.attempt.status='out-of-lives';
    session.state.attempt.lives=0;
    session.state.career.run!.status='failed';
    session.state.career.run!.lives=0;
    await session.update({},false);
    await controller.reward('continue',0);
    const request=provider.requests[0]!;
    provider.emit(request);
    await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
    expect(session.state.career.run).toMatchObject({id:request.target!.runId,lives:1,status:'active',assisted:true});
    session.state.attempt.status='out-of-lives';
    session.state.attempt.lives=0;
    session.state.career.run!.status='failed';
    session.state.career.run!.lives=0;
    await session.update({},false);
    expect(controller.rewardAvailable('continue')).toBe(false);
    controller.dispose();
  });

  it('uses confirmed impressions and active-time spacing only on explicit continuation',async()=>{
    const {session,provider,controller}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,5).map(p=>p.puzzleId);
    expect(canShowInterstitial(session.state)).toBe(false);
    await controller.beforeNext();
    expect(provider.interstitials).toBe(0);
    session.state.profile.solvedIds.push(boards[5]!.puzzleId);
    expect(canShowInterstitial(session.state)).toBe(true);
    provider.onInterstitial=async()=> 'unavailable';
    await controller.beforeNext();
    expect(provider.interstitials).toBe(1);
    expect(session.state.ads.lastInterstitial).toBeNull();
    provider.onInterstitial=async()=> 'shown';
    await controller.beforeNext();
    expect(provider.interstitials).toBe(2);
    expect(session.state.ads.lastInterstitial).toBe(0);
    session.state.career.modes.campaign.seconds=179.99;
    expect(canShowInterstitial(session.state)).toBe(false);
    session.state.career.modes.campaign.seconds=180;
    session.state.ads.lastReward=61;
    expect(canShowInterstitial(session.state)).toBe(false);
    session.state.career.modes.campaign.seconds=181;
    expect(canShowInterstitial(session.state)).toBe(true);
    await controller.beforeNext();
    expect(provider.interstitials).toBe(2);
    expect(await session.next()).toBe(true);
    expect(session.state.attempt.status).toBe('playing');
    controller.dispose();
  });

  it('releases an unopened fullscreen request on deadline and keeps a hung show single-flight',async()=>{
    const {session,provider,controller,blocks}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    provider.onInterstitial=()=>new Promise<FullscreenResult>(()=>{});
    vi.useFakeTimers();
    try {
      const continuation=controller.beforeNext();
      await vi.advanceTimersByTimeAsync(1501);
      await continuation;
      expect(blocks.has('ad')).toBe(false);
      await controller.beforeNext();
      expect(provider.interstitials).toBe(1);
      expect(session.state.ads.lastInterstitial).toBeNull();
    } finally {
      vi.useRealTimers();
      controller.dispose();
    }
  });

  it('leaves gameplay available with missing or hung SDK and coalesces optional banner updates',async()=>{
    const provider=new ScriptedProvider();provider.hangQueries=true;
    const {controller,session,blocks}=await setup(provider);
    controller.refresh();controller.refresh();
    expect(provider.statusCalls).toBe(1);
    expect(controller.rewardAvailable('hint')).toBe(false);
    expect((await controller.reward('hint',0)).committed).toBe(false);
    expect(blocks.size).toBe(0);
    for(const listener of provider.states)listener(ready);
    controller.updateBanner(true);
    controller.updateBanner(true);
    await flush();
    controller.updateBanner(false);
    await flush();
    expect(provider.banners).toEqual([true,false]);
    expect((await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2})).outcome).toBe('applied');
    controller.dispose();
    await flush();
    expect(provider.states.size+provider.rewards.size).toBe(0);
  });
});

it('inflects player currency for both locales including the Russian teen exception',()=>{
  expect([0,1,2,4,5,11,14,21,22,111].map(n=>quantity('ru',n,'coin'))).toEqual([
    '0 монет','1 монета','2 монеты','4 монеты','5 монет','11 монет','14 монет','21 монета','22 монеты','111 монет',
  ]);
  expect(quantity('en',1,'credit')).toBe('1 credit');
  expect(quantity('en',2,'credit')).toBe('2 credits');
});


it('keeps the valid schema-3 save intact when migration write fails, then upgrades when storage recovers',async()=>{
  const {session,storage,repo,controller}=await setup();
  await session.update({language:'en',theme:'dark'},false);
  const old=structuredClone(session.state) as Partial<typeof session.state> & {schemaVersion:number};
  Object.assign(old,{schemaVersion:3});
  delete old.ads;
  Reflect.deleteProperty(old.settings!,'timerVisible');
  const raw=JSON.stringify(old);
  storage.data.set(SAVE_KEY,raw);
  storage.fail=true;
  await expect(repo.load()).rejects.toThrow();
  expect(storage.data.get(SAVE_KEY)).toBe(raw);
  expect(storage.data.has(SAVE_KEY+'.quarantine')).toBe(false);
  storage.fail=false;
  const migrated=await repo.load();
  expect(migrated.schemaVersion).toBe(4);
  expect(migrated.settings).toMatchObject({language:'en',theme:'dark',timerVisible:false});
  expect(migrated.attempt).toEqual(old.attempt);
  expect(migrated.career).toEqual(old.career);
  controller.dispose();
});
