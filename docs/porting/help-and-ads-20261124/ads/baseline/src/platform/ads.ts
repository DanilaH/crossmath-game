import { DurableReceiptQueue } from '@danilah/mini-games-kit/platform';
import type { GameSession } from '../app/session';
import { canRequestReward, canShowInterstitial } from './adState';
import type { RewardEvent, RewardKind, RewardRequest } from './adState';

export interface AdAvailability { rewarded: boolean; interstitial: boolean; banner: boolean }
export type FullscreenResult = 'shown' | 'unavailable' | 'failed';
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
  // Native host owns the reservation and actual visibility.
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
  private banner = false;
  private bannerSent = false;
  private bannerWork:Promise<void>|undefined;
  private readonly removers:Unsubscribe[] = [];
  private readonly delivery:DurableReceiptQueue<RewardEvent>;
  private readonly acknowledgements=new Map<string,Promise<void>>();
  private lastShownResult:string|undefined;
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
    if(this.disposed||this.fullscreenWork||!resultId||resultId===this.lastShownResult||!this.availability.interstitial||!canShowInterstitial(this.session.state))return;
    const result=await this.show(context=>this.provider.showInterstitial(context));
    if(result==='shown'&&!this.disposed){
      this.lastShownResult=resultId;
      await this.session.recordInterstitial(()=>!this.disposed);
    }
  }

  private async show(operation:(context:FullscreenContext)=>Promise<FullscreenResult>):Promise<FullscreenResult> {
    const startWindow=1500;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let waiting=true;
    const context:FullscreenContext={
      presentationId:`crossmath-ad-${Date.now()}-${++this.presentationCount}`,
      startBefore:Date.now()+startWindow,
      opened:()=>{if(waiting)clearTimeout(timer);},
    };
    this.fullscreen=true;
    this.block(true);
    const deadline=new Promise<FullscreenResult>(resolve=>{
      timer=setTimeout(()=>resolve('unavailable'),startWindow);
    });
    const work=Promise.resolve().then(()=>operation(context)).catch(()=>'failed' as const);
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
    this.banner=visible&&!this.disposed&&!this.fullscreenWork&&this.availability.banner;
    this.flushBanner();
  }

  private flushBanner():void {
    if(this.bannerWork||this.bannerSent===this.banner)return;
    const value=this.banner;
    this.bannerSent=value;
    this.bannerWork=this.provider.setBanner(value).catch(()=>undefined).finally(()=>{
      this.bannerWork=undefined;
      this.flushBanner();
    });
  }

  dispose():void {
    this.disposed=true;
    this.updateBanner(false);
    if(this.fullscreen)this.block(false);
    for(const remove of this.removers)void Promise.resolve(remove()).catch(()=>undefined);
  }
}
