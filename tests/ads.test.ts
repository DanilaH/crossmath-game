import { describe, expect, it, vi } from 'vitest';
import { createSave } from '../src/app/model';
import { GameSession } from '../src/app/session';
import { SAVE_KEY, SaveRepository } from '../src/app/saveRepository';
import { canShowInterstitial, createRewardRequest } from '../src/platform/adState';
import type { RewardEvent, RewardRequest } from '../src/platform/adState';
import { AdsController } from '../src/platform/ads';
import type { AdAvailability, AdsProvider, FullscreenContext, FullscreenResult } from '../src/platform/ads';
import { boards, getPuzzle, routes } from '../src/content/catalog';
import { createAttempt } from '../src/core/engine';
import { recordVersion } from '../src/meta/career';
import { quantity } from '../src/ui/locale';

type Listener<T> = (value:T)=>void;
const ready = {rewarded:true,interstitial:true,banner:true};
const date = '2026-11-19';
const now = date+'T12:00:00Z';
const flush = () => new Promise<void>(resolve=>setTimeout(resolve,0));
function deferred<T>(){
 let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}

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
  bannerInFlight=0;
  peakBannerInFlight=0;
  interstitials=0;
  failAck=false;
  hangQueries=false;
  statusCalls=0;
  status=ready;
  onRewarded:(request:RewardRequest)=>Promise<FullscreenResult>=async()=> 'shown';
  onInterstitial:(context:FullscreenContext)=>Promise<FullscreenResult>=async()=> 'shown';
  onBanner:(visible:boolean)=>Promise<void>=async()=>{};
  async availability(){this.statusCalls++;if(this.hangQueries)return new Promise<AdAvailability>(()=>{});return this.status;}
  async pendingRewards(){if(this.hangQueries)return new Promise<RewardEvent[]>(()=>{});return [...this.pending.values()];}
  async acknowledge(id:string,outcome?:RewardEvent['outcome']){if(this.failAck)throw Error('Ack failed');this.acks.push(id);if(!outcome||this.pending.get(id)?.outcome===outcome)this.pending.delete(id);}
  async watchAvailability(listener:Listener<AdAvailability>){this.states.add(listener);return ()=>{this.states.delete(listener);};}
  async watchRewards(listener:Listener<RewardEvent>){this.rewards.add(listener);return ()=>{this.rewards.delete(listener);};}
  async showRewarded(request:RewardRequest){this.requests.push(request);return this.onRewarded(request);}
  async showInterstitial(context:FullscreenContext){this.interstitials++;return this.onInterstitial(context);}
  async setBanner(visible:boolean){
    this.banners.push(visible);
    this.peakBannerInFlight=Math.max(this.peakBannerInFlight,++this.bannerInFlight);
    try{await this.onBanner(visible);}
    finally{this.bannerInFlight--;}
  }
  emit(request:RewardRequest,outcome:RewardEvent['outcome']='earned'){
    const event={id:request.id,profileId:request.profileId,outcome};
    this.pending.set(request.id,event);
    for(const listener of this.rewards)listener(event);
  }
}

async function setup(provider=new ScriptedProvider(),render?: (controller:AdsController,blocks:Set<string>)=>void){
  const storage=new Memory();
  const fresh=()=>createSave('p',now,'UTC','initial');
  const repo=new SaveRepository(storage,fresh);
  let serial=0;
  const clock={now};
  const session=new GameSession(await repo.load(),repo,()=> 'ad-test-'+(++serial),()=>clock.now);
  const blocks=new Set<string>();
  const controller:AdsController=new AdsController(session,provider,blocked=>{if(blocked)blocks.add('ad');else blocks.delete('ad');},()=>render?.(controller,blocks));
  controller.start();
  await flush();
  return {provider,storage,repo,clock,session,controller,blocks};
}

describe('ADS-01: recover the latest banner intent',()=>{
  it.each([false,true])('retries rejected setBanner(%s) once on refresh and coalesces after success',async desired=>{
    const {controller,provider}=await setup();
    if(!desired){controller.updateBanner(true);await flush();}
    provider.onBanner=vi.fn<ScriptedProvider['onBanner']>().mockRejectedValueOnce(Error('Bridge reply lost')).mockResolvedValue(undefined);
    controller.updateBanner(desired);await flush();
    const before=desired?[true]:[true,false];
    for(let i=0;i<5;i++)controller.updateBanner(desired);
    await flush();
    expect(provider.banners).toEqual(before);
    controller.refresh();controller.refresh();
    await flush();
    expect(provider.banners).toEqual([...before,desired]);
    controller.updateBanner(desired);controller.refresh();
    await flush();
    expect(provider.banners).toEqual([...before,desired]);
    expect(provider.peakBannerInFlight).toBe(1);
    controller.dispose();
  });

  it.each([[true,false],[true,true],[false,false],[false,true]] as const)(
    'reconciles the latest intent after pending setBanner(%s), rejected = %s',async (first,rejected)=>{
      const {controller,provider}=await setup();
      if(!first){controller.updateBanner(true);await flush();}
      const inFlight=deferred<void>();
      provider.onBanner=vi.fn<ScriptedProvider['onBanner']>().mockReturnValueOnce(inFlight.promise).mockResolvedValue(undefined);
      controller.updateBanner(first);
      controller.updateBanner(!first);controller.updateBanner(first);controller.updateBanner(!first);
      controller.refresh();await flush();
      expect(provider.banners).toEqual(first?[true]:[true,false]);
      if(rejected)inFlight.reject(Error('Bridge reply lost'));else inFlight.resolve();
      await flush();
      expect(provider.banners).toEqual(first?[true,false]:[true,false,true]);
      expect(provider.peakBannerInFlight).toBe(1);
      controller.dispose();
    },
  );

  it('limits repeated rejection to one attempt per refresh and leaves a hung RPC single-flight',async()=>{
    const {controller,provider,session}=await setup();
    provider.onBanner=async()=>{throw Error('Bridge offline');};
    controller.updateBanner(true);await flush();
    for(let i=0;i<10;i++)controller.updateBanner(true);
    await flush();expect(provider.banners).toEqual([true]);
    controller.refresh();await flush();await flush();
    expect(provider.banners).toEqual([true,true]);
    const pending=deferred<void>();
    provider.onBanner=()=>pending.promise;
    controller.refresh();
    for(let i=0;i<10;i++){controller.updateBanner(false);controller.updateBanner(true);controller.refresh();}
    await flush();expect(provider.banners).toEqual([true,true,true]);
    const move=await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    expect(move.outcome).toBe('applied');
    expect(session.state.result?.coins).toBe(10);
    controller.dispose();controller.refresh();
    expect(provider.banners).toEqual([true,true,true]);
    expect(provider.peakBannerInFlight).toBe(1);
    provider.onBanner=async()=>{};
    pending.resolve();await flush();
    expect(provider.banners).toEqual([true,true,true,false]);
  });

  it('recovers a banner independently of hung availability and pending receipt queries',async()=>{
    const provider=new ScriptedProvider();
    provider.hangQueries=true;
    const {controller}=await setup(provider);
    for(const listener of provider.states)listener(ready);
    provider.onBanner=vi.fn<ScriptedProvider['onBanner']>().mockRejectedValueOnce(Error('Offline')).mockResolvedValue(undefined);
    controller.updateBanner(true);await flush();
    controller.refresh();await flush();
    expect(provider.banners).toEqual([true,true]);
    expect(provider.statusCalls).toBe(1);
    controller.dispose();
  });

  it('keeps independent background and modal blockers when fullscreen closes',async()=>{
    const provider=new ScriptedProvider();
    const {controller,blocks}=await setup(provider,(ads,blockers)=>ads.updateBanner(blockers.size===0));
    const fullscreen=deferred<FullscreenResult>();
    provider.onRewarded=()=>fullscreen.promise;
    const showing=controller.reward('hint',0);
    await vi.waitFor(()=>expect(provider.requests).toHaveLength(1));
    blocks.add('background');blocks.add('modal');
    controller.updateBanner(false);
    fullscreen.resolve('shown');await showing;await flush();
    expect(blocks).toEqual(new Set(['background','modal']));
    expect(provider.banners).toEqual([true,false]);
    blocks.delete('modal');controller.updateBanner(blocks.size===0);await flush();
    expect(provider.banners).toEqual([true,false]);
    blocks.delete('background');controller.updateBanner(blocks.size===0);await flush();
    expect(provider.banners).toEqual([true,false,true]);
    controller.dispose();
  });

  it('drains a late show and tries one terminal hide without late renders or retries',async()=>{
    const provider=new ScriptedProvider(),render=vi.fn();
    const {controller}=await setup(provider,render);
    const showing=deferred<void>();
    provider.onBanner=vi.fn<ScriptedProvider['onBanner']>().mockReturnValueOnce(showing.promise).mockRejectedValue(Error('Offline'));
    controller.updateBanner(true);
    const listeners=[...provider.states];
    const renders=render.mock.calls.length;
    controller.dispose();controller.dispose();controller.refresh();controller.updateBanner(true);
    expect(provider.banners).toEqual([true]);
    for(const listener of listeners)listener(ready);
    showing.resolve();await flush();await flush();
    expect(provider.banners).toEqual([true,false]);
    expect(provider.states.size).toBe(0);expect(provider.rewards.size).toBe(0);
    expect(render.mock.calls.length).toBe(renders);
    expect(provider.peakBannerInFlight).toBe(1);
  });

  it.each([false,true])('tries a terminal hide after a rejected hide, pending at dispose = %s',async pending=>{
    const {controller,provider}=await setup();
    controller.updateBanner(true);await flush();
    const hiding=deferred<void>();
    provider.onBanner=vi.fn<ScriptedProvider['onBanner']>().mockReturnValueOnce(hiding.promise).mockRejectedValue(Error('Offline'));
    controller.updateBanner(false);
    if(pending)controller.dispose();
    hiding.reject(Error('Bridge reply lost'));await flush();
    if(!pending){expect(provider.banners).toEqual([true,false]);controller.dispose();}
    await flush();
    controller.refresh();controller.updateBanner(true);
    await flush();
    expect(provider.banners).toEqual([true,false,false]);
  });
});

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
    expect(session.state.ads.interstitialGate?.nextEligibleAtMs).toBe(122_000);
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
    expect(session.state.ads.interstitialGate).toBeUndefined();
    controller.dispose();
    provider.emit(late);
    const reopened=new GameSession(await repo.load(),repo,()=> 'loaded',()=>now);
    const resumed=new AdsController(reopened,provider,()=>{},()=>{});
    resumed.start();
    await vi.waitFor(()=>expect(provider.acks).toContain(late.id));
    expect(reopened.state.profile.hintCredits).toBe(1);
    expect(reopened.state.ads.interstitialGate?.nextEligibleAtMs).toBe(120_000);
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
    expect(session.state.ads.interstitialGate).toBeUndefined();
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
    expect(resumedSession.state.ads.interstitialGate?.nextEligibleAtMs).toBe(120_000);
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
    expect((await controller.reward('continue',0)).committed).toBe(false);
    const firstRequest=provider.requests[0]!;
    provider.emit(firstRequest,'cancelled');
    await vi.waitFor(()=>expect(provider.acks).toContain(firstRequest.id));
    await controller.reward('continue',0);
    const [first,duplicate]=provider.requests as [RewardRequest,RewardRequest];
    await session.openCampaign();
    provider.emit(first);
    await vi.waitFor(()=>expect(session.state.ads.requests[first.id]?.settlement).toBe('earned'));
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

  it('settles a pending legacy continuation once in the parked Endless slot',async()=>{
    const {session,provider,controller,repo}=await setup();
    const save=session.state;
    save.profile.solvedIds=boards.slice(0,15).map(p=>p.puzzleId);
    save.meta.inactive.campaign={attempt:save.attempt,result:null};
    save.meta.activeSlot='endless';
    save.attempt={...createAttempt(getPuzzle(routes.endlessSequence[0]!),'old-board','endless'),runId:'old-run',stageId:0,status:'out-of-lives',lives:0};
    save.career.run={id:'old-run',version:recordVersion,stage:0,solvedStages:0,score:0,lives:0,assisted:false,status:'failed'};
    const request=createRewardRequest(save,'already-shown','continue');
    await session.update({},false);
    expect(await session.beginReward('continue')).toBeNull();
    await session.restore();
    const before=await repo.load();
    provider.emit(request);
    await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
    const earned=await repo.load();
    expect(earned.attempt).toEqual(before.attempt);
    expect(earned.profile).toEqual(before.profile);
    expect(earned.career.run).toMatchObject({id:'old-run',lives:1,status:'active',assisted:true});
    expect(earned.meta.inactive.endless!.attempt).toEqual({...before.meta.inactive.endless!.attempt,lives:1,status:'playing',assisted:true});
    expect(earned.ads.continued['old-run']).toBe(request.id);
    provider.emit(request);
    await vi.waitFor(()=>expect(provider.acks).toEqual([request.id,request.id]));
    expect(await repo.load()).toEqual(earned);
    expect(controller.rewardAvailable('continue')).toBe(false);
    expect(provider.requests).toEqual([]);
    controller.dispose();
  });

  it('protects the first five wins and waits 180 active seconds after a confirmed display',async()=>{
    const {session,provider,controller,storage}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,5).map(p=>p.puzzleId);
    expect(canShowInterstitial(session.state)).toBe(false);
    await controller.beforeNext();
    expect(provider.interstitials).toBe(0);
    session.state.profile.solvedIds.push(boards[5]!.puzzleId);
    expect(canShowInterstitial(session.state)).toBe(true);
    provider.onInterstitial=async context=>{
      const saved=JSON.parse(storage.data.get(SAVE_KEY)!);
      expect(saved.ads.interstitialGate.pendingUntilMs).toBe(180_000);
      expect(saved.result.interstitialRequested).toBe(true);
      context.opened();
      context.opened();
      return 'shown';
    };
    await Promise.all([controller.beforeNext(),controller.beforeNext()]);
    expect(provider.interstitials).toBe(1);
    expect(session.state.ads.lastInterstitial).toBe(0);
    expect(session.state.ads.interstitialGate?.nextEligibleAtMs).toBe(180_000);
    const settledRevision=session.state.revision;
    await session.recordInterstitial(session.state.result!.id,'shown',()=>true);
    expect(session.state.revision).toBe(settledRevision);
    await session.restart();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},179.99);
    expect(canShowInterstitial(session.state)).toBe(false);
    await controller.beforeNext();
    expect(provider.interstitials).toBe(1);
    session.state.career.modes.campaign.seconds=180;
    expect(canShowInterstitial(session.state)).toBe(true);
    provider.onInterstitial=async()=> 'shown';
    await controller.beforeNext();
    expect(provider.interstitials).toBe(2);
    expect(await session.next()).toBe(true);
    expect(session.state.attempt.status).toBe('playing');
    controller.dispose();
  });

  it.each(['unavailable','failed','cancelled'] as const)('backs off after %s across reload and never retries the same result',async outcome=>{
    const {session,provider,controller,repo}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    provider.onInterstitial=async()=>outcome;
    await controller.beforeNext();
    expect(session.state.ads.lastInterstitial).toBeNull();
    expect(session.state.ads.interstitialGate?.nextEligibleAtMs).toBe(30_000);
    controller.dispose();

    let count=0;
    const reopened=new GameSession(await repo.load(),repo,()=>`reload-${++count}`,()=>now);
    const resumed=new AdsController(reopened,provider,()=>{},()=>{});
    resumed.start();
    await flush();
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(1);
    await reopened.restart();
    await reopened.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},29.99);
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(1);
    reopened.state.career.modes.campaign.seconds=30;
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(2);
    expect(reopened.state.profile.hintCredits).toBe(0);
    resumed.dispose();
  });

  it('stacks earned receipts against the legacy maximum, caps them and restores the deadline and credits',async()=>{
    const {session,provider,controller,repo}=await setup();
    session.state.career.modes.campaign.seconds=100;
    session.state.ads.lastInterstitial=90; // legacy deadline 270
    session.state.ads.lastReward=0;         // legacy deadline 120
    await session.update({},false);
    expect((await repo.load()).ads.interstitialGate).toBeUndefined();
    for(const [index,deadline] of [390_000,510_000,540_000,540_000].entries()){
      const elapsed=index===0?0:index<=2?10:0;
      await controller.reward('hint',elapsed);
      const request=provider.requests.at(-1)!;
      provider.emit(request);
      await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
      const saved=await repo.load();
      expect(saved.profile.hintCredits).toBe(index+1);
      expect(saved.ads.interstitialGate?.nextEligibleAtMs).toBe(deadline);
    }
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    expect(canShowInterstitial(session.state)).toBe(false);
    session.state.career.modes.campaign.seconds=539.99;
    expect(canShowInterstitial(session.state)).toBe(false);
    session.state.career.modes.campaign.seconds=540;
    expect(canShowInterstitial(session.state)).toBe(true);
    expect(provider.interstitials).toBe(0);
    controller.dispose();
  });

  it('does not call the interstitial provider when the reservation cannot be saved',async()=>{
    const {session,provider,controller,storage}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    storage.fail=true;
    await controller.beforeNext();
    expect(provider.interstitials).toBe(0);
    expect(session.state.result?.interstitialRequested).toBeUndefined();
    expect(session.state.ads.interstitialGate).toBeUndefined();
    storage.fail=false;
    expect(await session.next()).toBe(true);
    controller.dispose();
  });

  it('restores an in-flight reservation on cold start and waits for its full 180 active seconds',async()=>{
    const {session,provider,controller,repo}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    const resultId=session.state.result!.id;
    expect(await session.beginInterstitial(resultId,()=>true)).toBe(true);
    controller.dispose();

    let count=0;
    const reopened=new GameSession(await repo.load(),repo,()=>`restart-${++count}`,()=>now);
    const resumed=new AdsController(reopened,provider,()=>{},()=>{});
    resumed.start();
    await flush();
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(0);
    await reopened.restart();
    await reopened.command({type:'PlaceFromTray',tokenId:'t0',cellId:2},179.99);
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(0);
    reopened.state.career.modes.campaign.seconds=180;
    await resumed.beforeNext();
    expect(provider.interstitials).toBe(1);
    const deadline=reopened.state.ads.interstitialGate?.nextEligibleAtMs;
    expect(deadline).toBe(360_000);
    await reopened.recordInterstitial(resultId,'shown',()=>true);
    expect(reopened.state.ads.interstitialGate?.nextEligibleAtMs).toBe(deadline);
    resumed.dispose();
  });

  it('leaves a refused rewarded request unrewarded without substituting an interstitial',async()=>{
    const {session,provider,controller}=await setup();
    provider.onRewarded=async()=> 'unavailable';
    await controller.reward('hint',0);
    const request=provider.requests[0]!;
    expect(session.state.ads.requests[request.id]?.settlement).toBeUndefined();
    expect(session.state.ads.interstitialGate).toBeUndefined();
    expect(session.state.profile.hintCredits).toBe(0);
    expect(provider.interstitials).toBe(0);
    controller.dispose();
  });

  it('releases an unopened fullscreen request on deadline and keeps a hung show single-flight',async()=>{
    const {session,provider,controller,blocks,repo}=await setup();
    await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
    session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
    const pending=deferred<FullscreenResult>();
    provider.onInterstitial=()=>pending.promise;
    vi.useFakeTimers();
    try {
      const continuation=controller.beforeNext();
      await vi.advanceTimersByTimeAsync(1501);
      await continuation;
      expect(blocks.has('ad')).toBe(false);
      expect((await repo.load()).ads.interstitialGate?.pendingUntilMs).toBe(180_000);
      expect((await repo.load()).result?.interstitialRequested).toBe(true);
      await controller.beforeNext();
      expect(provider.interstitials).toBe(1);
      expect(session.state.ads.lastInterstitial).toBeNull();
      pending.resolve('shown');
      await vi.waitFor(()=>expect(session.state.ads.lastInterstitial).toBe(0));
      expect((await repo.load()).ads.interstitialGate?.pendingUntilMs).toBeNull();
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

describe('MONETIZATION callback and lifecycle faults',()=>{
 it('serializes cancelled and earned deliveries without stale ack deleting the newer receipt',async()=>{
  const {session,provider,controller}=await setup();
  await controller.reward('hint',0);const request=provider.requests[0]!;
  const ack=deferred<void>(),outcomes:(RewardEvent['outcome']|undefined)[]=[];
  provider.acknowledge=async(id,outcome)=>{
   outcomes.push(outcome);if(outcome==='cancelled')await ack.promise;
   if(provider.pending.get(id)?.outcome===outcome)provider.pending.delete(id);
  };
  provider.emit(request,'cancelled');await vi.waitFor(()=>expect(outcomes).toEqual(['cancelled']));
  provider.emit(request,'earned');ack.resolve();
  await vi.waitFor(()=>expect(session.state.profile.hintCredits).toBe(1));
  await vi.waitFor(()=>expect(outcomes).toEqual(['cancelled','earned']));
  expect(provider.pending.size).toBe(0);expect(session.state.ads.requests[request.id]!.settlement).toBe('earned');
  controller.dispose();
 });
 it('keeps an unknown request single-flight across cold restart without blocking ordinary play or help',async()=>{
  const {controller,provider,session,repo}=await setup();
  await controller.reward('hint',0);const request=provider.requests[0]!;
  expect(controller.rewardAvailable('hint')).toBe(false);expect(await session.beginReward('hint')).toBeNull();
  controller.dispose();
  const restored=new GameSession(await repo.load(),repo,()=> 'restart',()=>now),next=new AdsController(restored,provider,()=>{},()=>{});
  next.start();await flush();expect(next.rewardAvailable('hint')).toBe(false);expect(next.rewardStatus('hint')).toBe('pending');
  const plan=restored.prepareHelp('explain');
  expect((await restored.help('explain','normal-payment',0,plan)).outcome).toBe('applied');
  expect(restored.state.profile.coins).toBe(70); // original first win +10 less normal help60
  provider.emit(request);await vi.waitFor(()=>expect(restored.state.profile.hintCredits).toBe(1));
  next.dispose();
 });
 it('keeps a truly opened fullscreen blocked beyond the pre-show deadline and resumes only on close',async()=>{
  const {session,provider,controller,blocks}=await setup(),pending=deferred<FullscreenResult>();
  await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
  provider.onInterstitial=context=>{context.opened();return pending.promise;};
  vi.useFakeTimers();try{
   const operation=controller.beforeNext();await vi.advanceTimersByTimeAsync(1);
   expect(blocks.has('ad')).toBe(true);await vi.advanceTimersByTimeAsync(60000);expect(blocks.has('ad')).toBe(true);
   pending.resolve('shown');await operation;expect(blocks.has('ad')).toBe(false);
  }finally{vi.useRealTimers();controller.dispose();}
 });
 it('removes delayed subscriptions and refuses a stale query after disposal without touching the profile',async()=>{
  const provider=new ScriptedProvider(),watch=deferred<()=>void>(),status=deferred<AdAvailability>(),remove=vi.fn();
  provider.watchRewards=()=>watch.promise;provider.availability=()=>status.promise;
  const {controller,session}=await setup(provider),before=structuredClone(session.state);
  controller.dispose();watch.resolve(remove);status.resolve(ready);await flush();
  expect(remove).toHaveBeenCalledOnce();expect(session.state).toEqual(before);expect(controller.rewardAvailable('hint')).toBe(false);
 });
 it('does not turn sync adapter errors, network loss or missing optional SDK into a startup gate',async()=>{
  const provider=new ScriptedProvider();
  provider.watchAvailability=()=>{throw Error('SDK absent');};provider.watchRewards=()=>{throw Error('SDK absent');};
  provider.availability=()=>{throw Error('No network');};provider.pendingRewards=()=>{throw Error('No network');};
  const {controller,session,blocks}=await setup(provider);
  expect(controller.rewardAvailable('hint')).toBe(false);expect(blocks.size).toBe(0);
  expect((await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2})).outcome).toBe('applied');controller.dispose();
 });
 it('records phases without raw request, profile, save, or ad configuration data',async()=>{
  const {session,provider,controller}=await setup();controller.dispose();
  const events:unknown[]=[],next=new AdsController(session,provider,()=>{},()=>{},event=>events.push(event));
  next.start();await flush();await next.reward('hint',0);const request=provider.requests.at(-1)!;provider.emit(request);
  await vi.waitFor(()=>expect(provider.acks).toContain(request.id));
  const serialized=JSON.stringify(events);expect(serialized).not.toContain(request.id);expect(serialized).not.toContain('profileId');
  for(const phase of ['intent','reserved','provider-call','terminal','receipt','committed','acknowledged'])expect(serialized).toContain(phase);
  next.dispose();
 });
});

it.each([[4,false],[5,false],[6,true]] as const)('protects exactly the first-five boundary: wins=%s',async(wins,eligible)=>{
 const {session,controller}=await setup();await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
 session.state.profile.solvedIds=boards.slice(0,wins).map(p=>p.puzzleId);
 expect(canShowInterstitial(session.state)).toBe(eligible);controller.dispose();
});
it.each([[179,false],[180,true],[181,true]] as const)('uses accumulated active time at %s seconds, independent of wall date',async(seconds,eligible)=>{
 const {session,controller}=await setup();await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});
 session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);session.state.ads.lastInterstitial=0;
 session.state.career.modes.campaign.seconds=seconds;const state=structuredClone(session.state);
 expect(canShowInterstitial(session.state)).toBe(eligible);expect(session.state).toEqual(state);controller.dispose();
});

it('does not release an actually opened native ad when the opened event is delayed past the JS deadline',async()=>{
 const provider=new ScriptedProvider();provider.status={...ready,protocolVersion:2} as AdAvailability;
 const pending=deferred<FullscreenResult>(),cancel=vi.fn(async()=> 'opened' as const);
 const modern=Object.assign(provider,{cancelUnopened:cancel});
 const {session,controller,blocks}=await setup(modern);
 await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
 provider.onInterstitial=()=>pending.promise;
 vi.useFakeTimers();try{
  const work=controller.beforeNext();await vi.advanceTimersByTimeAsync(1501);expect(cancel).toHaveBeenCalledOnce();expect(blocks.has('ad')).toBe(true);
  await vi.advanceTimersByTimeAsync(60000);expect(blocks.has('ad')).toBe(true);
  pending.resolve('shown');await work;expect(blocks.has('ad')).toBe(false);expect(session.state.ads.lastInterstitial).toBe(0);
 }finally{vi.useRealTimers();controller.dispose();}
});
it('releases a protocol2 pre-show hang only after native cancellation proves that the lease is closed',async()=>{
 const provider=new ScriptedProvider();provider.status={...ready,protocolVersion:2} as AdAvailability;
 const pending=deferred<FullscreenResult>(),cancel=deferred<'closed'|'opened'>();
 const modern=Object.assign(provider,{cancelUnopened:vi.fn(()=>cancel.promise)}),{session,controller,blocks}=await setup(modern);
 await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
 provider.onInterstitial=()=>pending.promise;
 vi.useFakeTimers();try{
  const work=controller.beforeNext();await vi.advanceTimersByTimeAsync(1501);expect(blocks.has('ad')).toBe(true);
  cancel.resolve('closed');await vi.advanceTimersByTimeAsync(1);await work;expect(blocks.has('ad')).toBe(false);
  await controller.beforeNext();expect(provider.interstitials).toBe(1);pending.resolve('cancelled');await vi.advanceTimersByTimeAsync(1);
 }finally{vi.useRealTimers();controller.dispose();}
});
it('reblocks a delayed legacy opened notification until its genuine dismissal, with no new show',async()=>{
 const {session,provider,controller,blocks}=await setup();const pending=deferred<FullscreenResult>();let context!:FullscreenContext;
 await session.command({type:'PlaceFromTray',tokenId:'t0',cellId:2});session.state.profile.solvedIds=boards.slice(0,6).map(p=>p.puzzleId);
 provider.onInterstitial=c=>{context=c;return pending.promise;};
 vi.useFakeTimers();try{
  const work=controller.beforeNext();await vi.advanceTimersByTimeAsync(1501);await work;expect(blocks.has('ad')).toBe(false);
  context.opened();expect(blocks.has('ad')).toBe(true);pending.resolve('shown');await vi.advanceTimersByTimeAsync(1);expect(blocks.has('ad')).toBe(false);
  expect(provider.interstitials).toBe(1);
 }finally{vi.useRealTimers();controller.dispose();}
});

describe('MON-01 request-ID admission reconciliation',()=>{
 it.each(['absent','prepared','armed','earned'] as const)('cold restart: %s is reconciled without expiring unknown shown work',async phase=>{
  const provider=new ScriptedProvider();provider.status={...ready,protocolVersion:3} as AdAvailability;
  const {session,repo,controller}=await setup(provider);controller.dispose();
  const request=(await session.beginReward('hint',0))!;
  const before=JSON.stringify(session.state.ads.interstitialGate),hints=session.state.profile.hintCredits;
  const reconcile=vi.fn(async()=>({state:phase==='armed'?'unknown' as const:'closed' as const,...(phase==='armed'?{}:{receipt:{id:request.id,profileId:request.profileId,outcome:phase==='earned'?'earned' as const:'cancelled' as const}})}));
  const recoveredProvider=Object.assign(new ScriptedProvider(),{status:{...ready,protocolVersion:3},reconcileReward:reconcile});
  const restored=new GameSession(await repo.load(),repo,()=> 'restored-ad',()=>now);
  const restoredController=new AdsController(restored,recoveredProvider,()=>{},()=>{});restoredController.start();
  for(let i=0;i<6;i++)await flush();
  expect(reconcile).toHaveBeenCalledWith(request);
  expect(restored.state.ads.requests[request.id]!.settlement).toBe(phase==='armed'?undefined:phase==='earned'?'earned':'cancelled');
  expect(restored.state.profile.hintCredits).toBe(hints+(phase==='earned'?1:0));
  expect(restoredController.rewardAvailable('hint')).toBe(phase!=='armed');
  if(phase!=='earned')expect(JSON.stringify(restored.state.ads.interstitialGate)).toBe(before);
  restoredController.refresh();await flush();await flush();
  expect(restored.state.profile.hintCredits).toBe(hints+(phase==='earned'?1:0));restoredController.dispose();
 });
 it('fences a hung pre-dispatch operation, permits another request and ignores late old completion',async()=>{
  const provider=Object.assign(new ScriptedProvider(),{status:{...ready,protocolVersion:3},reconcileReward:vi.fn(async(request:RewardRequest)=>({state:'closed' as const,receipt:{id:request.id,profileId:request.profileId,outcome:'cancelled' as const}}))});
  const {session,controller,blocks}=await setup(provider);const old=deferred<FullscreenResult>(),next=deferred<FullscreenResult>();
  provider.onRewarded=()=>old.promise;
  vi.useFakeTimers();const first=controller.reward('hint',0);await vi.advanceTimersByTimeAsync(1600);await first;
  expect(blocks.size).toBe(0);expect(provider.reconcileReward.mock.calls.length).toBeGreaterThanOrEqual(1);
  await vi.advanceTimersByTimeAsync(10);expect(controller.rewardAvailable('hint')).toBe(true);
  provider.onRewarded=()=>next.promise;const second=controller.reward('hint',0);await vi.advanceTimersByTimeAsync(10);
  expect(blocks.has('ad')).toBe(true);old.resolve('failed');await vi.advanceTimersByTimeAsync(10);
  expect(blocks.has('ad')).toBe(true);expect(controller.rewardAvailable('hint')).toBe(false);
  next.resolve('cancelled');await second;vi.useRealTimers();controller.dispose();
  expect(Object.values(session.state.ads.requests)).toHaveLength(2);
 });
});
