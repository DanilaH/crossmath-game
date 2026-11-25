import { DurableReceiptQueue } from '@danilah/mini-games-kit/platform';
import type { InterstitialRequestOutcome } from '@danilah/mini-games-kit/platform';
import type { GameSession } from '../app/session';
import { canRequestReward, canShowInterstitial } from './adState';
import type { RewardEvent, RewardKind, RewardRequest } from './adState';

export interface AdAvailability { rewarded: boolean; interstitial: boolean; banner: boolean }
export type FullscreenResult = InterstitialRequestOutcome;
type Unsubscribe = () => void | Promise<void>;
export interface FullscreenContext {
  presentationId:string;
  startBefore:number;
  opened():void;
}

export interface AdsProvider {
  availability(): Promise<AdAvailability>;
  watchAvailability(listener: (state:AdAvailability) => void): Promise<Unsubscribe>;
  watchRewards(listener: (event:RewardEvent) => void): Promise<Unsubscribe>;
  pendingRewards(): Promise<RewardEvent[]>;
  acknowledge(id:string): Promise<void>;
  // Resolves on dismissal or pre-show refusal. Earned receipts travel independently.
  showRewarded(request:RewardRequest,context:FullscreenContext): Promise<FullscreenResult>;
  showInterstitial(context:FullscreenContext): Promise<FullscreenResult>;
  // Resolves when the provider handles this idempotent intent. It owns native visibility and reservation.
  // Acknowledging the command does not establish a rendered creative or an impression.
  setBanner(visible:boolean): Promise<void>;
}

const unavailable:AdAvailability = {rewarded:false,interstitial:false,banner:false};

export class AdsController {
  private availability = unavailable;
  private disposed = false;
  private fullscreen = false;
  private fullscreenWork:Promise<FullscreenResult>|undefined;
  private presentationCount=0;
  private statusRefresh:Promise<void>|undefined;
  private pendingRefresh:Promise<void>|undefined;
  private statusVersion = 0;
  private bannerDesired = false;
  // A new provider starts hidden. A failed command leaves its state unconfirmed.
  private bannerConfirmed: boolean|undefined = false;
  private bannerInFlight = false;
  private finalBannerHidePending = false;
  private readonly removers:Unsubscribe[] = [];
  private readonly delivery:DurableReceiptQueue<RewardEvent>;
  private readonly acknowledgements=new Map<string,Promise<void>>();
  private readonly receiving = new Map<string,Promise<unknown>>();

  constructor(
    private readonly session:GameSession,
    private readonly provider:AdsProvider,
    private readonly block:(blocked:boolean)=>void,
    private readonly changed:()=>void,
  ) {
    this.delivery=new DurableReceiptQueue({
      commit:async receipt=>{
        const write=this.session.acceptReward(receipt,()=>!this.disposed);
        if(!this.disposed)this.changed();
        try{return await write;}
        finally{if(!this.disposed)this.changed();}
      },
      acknowledge:id=>this.acknowledge(id),
    });
  }

  private acknowledge(id:string):Promise<void> {
    if(this.disposed)return Promise.reject(Error('Ad adapter disposed'));
    let work=this.acknowledgements.get(id);
    if(!work){
      work=this.provider.acknowledge(id).finally(()=>this.acknowledgements.delete(id));
      this.acknowledgements.set(id,work);
    }
    const pending=work;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Ad acknowledgement timed out')),1500);
      void pending.then(resolve,reject).finally(()=>clearTimeout(timer));
    });
  }

  start():void {
    this.subscribe(this.provider.watchAvailability(status=>{
      if(this.disposed)return;
      this.statusVersion++;
      this.availability=status;
      this.changed();
    }));
    this.subscribe(this.provider.watchRewards(event=>this.receive(event)));
    this.refresh();
  }

  private subscribe(subscription:Promise<Unsubscribe>):void {
    void subscription.then(remove=>{
      if(this.disposed)return remove();
      this.removers.push(remove);
    }).catch(()=>undefined);
  }

  // A hung bridge query stays single-flight. Receipts arriving later still count.
  refresh():void {
    if(this.disposed)return;
    void this.flushBanner();
    if(!this.statusRefresh){
      const version=this.statusVersion;
      this.statusRefresh=this.provider.availability().then(status=>{
        if(this.disposed||version!==this.statusVersion)return;
        this.availability=status;
        this.changed();
      }).catch(()=>undefined).finally(()=>{this.statusRefresh=undefined;});
    }
    if(!this.pendingRefresh){
      this.pendingRefresh=this.provider.pendingRewards().then(events=>{
        if(!this.disposed)for(const event of events)this.receive(event);
      }).catch(()=>undefined).finally(()=>{this.pendingRefresh=undefined;});
    }
  }

  private receive(event:RewardEvent):void {
    if(this.disposed||!event?.id||this.receiving.has(event.id))return;
    const delivery=this.delivery.deliver(event);
    this.receiving.set(event.id,delivery);
    void delivery.catch(()=>undefined).finally(()=>{
      this.receiving.delete(event.id);
      if(!this.disposed)this.changed();
    });
    this.changed();
  }

  rewardAvailable(kind:RewardKind):boolean {
    return !this.disposed&&!this.fullscreen&&!this.fullscreenWork&&this.availability.rewarded&&canRequestReward(this.session.state,kind);
  }

  async reward(kind:RewardKind,elapsed:number):Promise<{committed:boolean}> {
    if(!this.rewardAvailable(kind))return {committed:false};
    const request=await this.session.beginReward(kind,elapsed);
    if(!request||this.disposed)return {committed:!!request};
    await this.show(context=>this.provider.showRewarded(request,context));
    this.refresh();
    return {committed:true};
  }

  async beforeNext():Promise<void> {
    const resultId=this.session.state.result?.id;
    if(this.disposed||this.fullscreenWork||!resultId||!this.availability.interstitial||!canShowInterstitial(this.session.state))return;
    try{
      if(!await this.session.beginInterstitial(resultId,()=>!this.disposed)||this.disposed)return;
    }catch{
      // Optional advertising cannot prevent continuation. Show only after saving the reservation.
      return;
    }
    const settle=async (outcome:FullscreenResult)=>{
      // A late provider response can still settle the persisted request after the UI timeout.
      await this.session.recordInterstitial(resultId,outcome,()=>!this.disposed).catch(()=>undefined);
    };
    if(this.session.state.result?.id!==resultId||this.session.state.meta.screen!=='play'){
      await settle('cancelled');
      return;
    }
    await this.show(context=>this.provider.showInterstitial(context),settle);
  }

  private async show(
    operation:(context:FullscreenContext)=>Promise<FullscreenResult>,
    onResult?:(result:FullscreenResult)=>Promise<void>,
  ):Promise<FullscreenResult> {
    const startWindow=1500;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let waiting=true;
    let opened=false;
    const context:FullscreenContext={
      presentationId:`crossmath-ad-${Date.now()}-${++this.presentationCount}`,
      startBefore:Date.now()+startWindow,
      opened:()=>{if(waiting){opened=true;clearTimeout(timer);}},
    };
    this.fullscreen=true;
    this.block(true);
    const deadline=new Promise<FullscreenResult>(resolve=>{
      timer=setTimeout(()=>resolve('unavailable'),startWindow);
    });
    const work=Promise.resolve().then(()=>operation(context)).catch(()=>'failed' as const).then(async result=>{
      await onResult?.(opened?'shown':result);
      return result;
    });
    this.fullscreenWork=work;
    this.changed();
    void work.finally(()=>{
      this.fullscreenWork=undefined;
      if(!this.disposed)this.changed();
    });
    try{return await Promise.race([work,deadline]);}
    finally{
      waiting=false;
      clearTimeout(timer);
      this.fullscreen=false;
      if(!this.disposed){this.block(false);this.changed();}
    }
  }

  updateBanner(visible:boolean):void {
    const desired=visible&&!this.disposed&&!this.fullscreenWork&&this.availability.banner;
    if(this.bannerDesired===desired)return;
    this.bannerDesired=desired;
    void this.flushBanner();
  }

  private async flushBanner():Promise<void> {
    if(this.bannerInFlight)return;
    this.finalBannerHidePending=false;
    const desired=this.bannerDesired;
    if(this.bannerConfirmed===desired)return;
    this.bannerInFlight=true;
    try{
      await this.provider.setBanner(desired);
      this.bannerConfirmed=desired;
    } catch {
      this.bannerConfirmed=undefined;
    } finally {
      this.bannerInFlight=false;
    }
    // A rejected intent is retried by refresh, unless this flight was superseded or dispose needs a hide.
    if(this.bannerDesired!==desired||this.finalBannerHidePending)void this.flushBanner();
  }

  dispose():void {
    if(this.disposed)return;
    this.disposed=true;
    this.bannerDesired=false;
    this.finalBannerHidePending=true;
    void this.flushBanner();
    if(this.fullscreen)this.block(false);
    for(const remove of this.removers)void Promise.resolve(remove()).catch(()=>undefined);
  }
}
