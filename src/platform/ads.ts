import { DurableReceiptQueue } from '@danilah/mini-games-kit/platform';
import type { InterstitialRequestOutcome } from '@danilah/mini-games-kit/platform';
import type { GameSession } from '../app/session';
import { canRequestReward, canShowInterstitial } from './adState';
import type { RewardEvent, RewardKind, RewardRequest } from './adState';

export interface AdAvailability { rewarded: boolean; interstitial: boolean; banner: boolean; rewardKinds?:RewardKind[]; protocolVersion?:number }
export interface AdTrace { phase:'intent'|'eligibility'|'reserved'|'provider-call'|'opened'|'terminal'|'receipt'|'committed'|'acknowledged'|'error'; format:'rewarded'|'interstitial'|'banner'; outcome?:string }
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
  acknowledge(id:string,outcome?:RewardEvent['outcome']): Promise<void>;
  // Resolves on dismissal or pre-show refusal. Earned receipts travel independently.
  showRewarded(request:RewardRequest,context:FullscreenContext): Promise<FullscreenResult>;
  showInterstitial(context:FullscreenContext): Promise<FullscreenResult>;
  // Protocol2 cancels an unopened native lease atomically or confirms it is already opened.
  cancelUnopened?(presentationId:string):Promise<'closed'|'opened'>;
  // Resolves when the provider handles this idempotent intent. It owns native visibility and reservation.
  // Acknowledging the command does not establish a rendered creative or an impression.
  setBanner(visible:boolean): Promise<void>;
}

const unavailable:AdAvailability = {rewarded:false,interstitial:false,banner:false};

export class AdsController {
  private availability = unavailable;
  private disposed = false;
  private started = false;
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
  private readonly delivery:DurableReceiptQueue<{id:string;event:RewardEvent}>;
  private readonly acknowledgements=new Map<string,Promise<void>>();
  private readonly receiving = new Map<string,Promise<unknown>>();
  private readonly recentRewards=new Map<RewardKind,string>();

  constructor(
    private readonly session:GameSession,
    private readonly provider:AdsProvider,
    private readonly block:(blocked:boolean)=>void,
    private readonly changed:()=>void,
    private readonly trace:(event:AdTrace)=>void=()=>{},
  ) {
    this.delivery=new DurableReceiptQueue({
      commit:async ({event:receipt})=>{
        const write=this.session.acceptReward(receipt,()=>!this.disposed);
        if(!this.disposed)this.changed();
        try{
          const result=await write,entry=this.session.state.ads.requests[receipt.id];
          if(result==='applied'&&entry)this.recentRewards.set(entry.request.kind,receipt.id);
          this.report('committed','rewarded',receipt.outcome);return result;
        }
        finally{if(!this.disposed)this.changed();}
      },
      acknowledge:key=>{const [id,outcome]=JSON.parse(key) as [string,RewardEvent['outcome']];return this.acknowledge(id,outcome);},
    });
  }

  private report(phase:AdTrace['phase'],format:AdTrace['format'],outcome?:string):void {
    // Diagnostics are optional and carry no profile/request/configuration identifiers.
    try{this.trace({phase,format,...(outcome?{outcome}:{})});}catch{ /* not gameplay authority */ }
  }

  private acknowledge(id:string,outcome:RewardEvent['outcome']):Promise<void> {
    if(this.disposed)return Promise.reject(Error('Ad adapter disposed'));
    const key=JSON.stringify([id,outcome]);
    let work=this.acknowledgements.get(key);
    if(!work){
      work=Promise.resolve().then(()=>this.provider.acknowledge(id,outcome)).then(()=>this.report('acknowledged','rewarded',outcome)).finally(()=>this.acknowledgements.delete(key));
      this.acknowledgements.set(key,work);
    }
    const pending=work;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Ad acknowledgement timed out')),1500);
      void pending.then(resolve,reject).finally(()=>clearTimeout(timer));
    });
  }

  start():void {
    if(this.started||this.disposed)return;
    this.started=true;
    this.subscribe(Promise.resolve().then(()=>this.provider.watchAvailability(status=>{
      if(this.disposed)return;
      this.statusVersion++;
      this.availability=status;
      this.changed();
    })));
    this.subscribe(Promise.resolve().then(()=>this.provider.watchRewards(event=>this.receive(event))));
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
      this.statusRefresh=Promise.resolve().then(()=>this.provider.availability()).then(status=>{
        if(this.disposed||version!==this.statusVersion)return;
        this.availability=status;
        this.changed();
      }).catch(()=>undefined).finally(()=>{this.statusRefresh=undefined;});
    }
    if(!this.pendingRefresh){
      this.pendingRefresh=Promise.resolve().then(()=>this.provider.pendingRewards()).then(events=>{
        if(!this.disposed)for(const event of events)this.receive(event);
      }).catch(()=>undefined).finally(()=>{this.pendingRefresh=undefined;});
    }
  }

  private receive(event:RewardEvent):void {
    if(this.disposed||!event?.id||!['earned','cancelled','failed'].includes(event.outcome))return;
    const key=JSON.stringify([event.id,event.outcome]);
    if(this.receiving.has(key))return;
    this.report('receipt','rewarded',event.outcome);
    const delivery=this.delivery.deliver({id:key,event});
    this.receiving.set(key,delivery);
    void delivery.catch(()=>this.report('error','rewarded','receipt-handoff')).finally(()=>{
      this.receiving.delete(key);
      if(!this.disposed)this.changed();
    });
    this.changed();
  }

  rewardAvailable(kind:RewardKind):boolean {
    return this.rewardReason(kind)==='eligible';
  }

  rewardStatus(kind:RewardKind):RewardEvent['outcome']|'pending'|'expired'|undefined {
    const id=this.recentRewards.get(kind),entry=id?this.session.state.ads.requests[id]:undefined;
    return entry?entry.settlement??'pending':Object.values(this.session.state.ads.requests).some(r=>r.settlement===undefined)?'pending':undefined;
  }

  dismissRewardStatus(kind:RewardKind):void {
    if(this.rewardStatus(kind)!=='pending')this.recentRewards.delete(kind);
  }

  private rewardReason(kind:RewardKind):string {
    if(this.disposed)return 'disposed';
    if(this.fullscreen||this.fullscreenWork)return 'fullscreen-in-flight';
    if(!this.availability.rewarded)return 'provider-unavailable';
    if(kind==='win-bonus'&&(this.availability.protocolVersion!==2||!this.availability.rewardKinds?.includes(kind)))return 'unsupported-placement';
    if(Object.values(this.session.state.ads.requests).some(entry=>entry.settlement===undefined))return 'pending-receipt';
    return canRequestReward(this.session.state,kind)?'eligible':'ineligible-target';
  }

  async reward(kind:RewardKind,elapsed:number):Promise<{committed:boolean}> {
    this.report('intent','rewarded',kind);
    const reason=this.rewardReason(kind);this.report('eligibility','rewarded',reason);
    if(reason!=='eligible')return {committed:false};
    const request=await this.session.beginReward(kind,elapsed);
    if(!request||this.disposed)return {committed:!!request};
    this.recentRewards.set(kind,request.id);
    this.report('reserved','rewarded',kind);
    await this.show(context=>this.provider.showRewarded(request,context));
    this.refresh();
    return {committed:true};
  }

  async beforeNext():Promise<void> {
    this.report('intent','interstitial');
    const resultId=this.session.state.result?.id;
    const reason=this.disposed?'disposed':this.fullscreenWork?'fullscreen-in-flight':!resultId?'no-result':!this.availability.interstitial?'provider-unavailable':!canShowInterstitial(this.session.state)?'gate-or-result-protected':'eligible';
    this.report('eligibility','interstitial',reason);
    if(reason!=='eligible'||!resultId)return;
    try{
      if(!await this.session.beginInterstitial(resultId,()=>!this.disposed)||this.disposed)return;
      this.report('reserved','interstitial');
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
    await this.show(context=>this.provider.showInterstitial(context),settle,'interstitial');
  }

  private async show(
    operation:(context:FullscreenContext)=>Promise<FullscreenResult>,
    onResult?:(result:FullscreenResult)=>Promise<void>,
    format:'rewarded'|'interstitial'='rewarded',
  ):Promise<FullscreenResult> {
    const startWindow=1500;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let waiting=true;
    let opened=false;
    let operationDone=false;
    const cancelUnopened=this.availability.protocolVersion===2?this.provider.cancelUnopened?.bind(this.provider):undefined;
    const context:FullscreenContext={
      presentationId:`crossmath-ad-${Date.now()}-${++this.presentationCount}`,
      startBefore:Date.now()+startWindow,
      opened:()=>{if(!operationDone&&!this.disposed){opened=true;clearTimeout(timer);if(!this.fullscreen){this.fullscreen=true;this.block(true);}this.report('opened',format);}},
    };
    this.fullscreen=true;
    this.block(true);
    const deadline=new Promise<FullscreenResult>(resolve=>{
      timer=setTimeout(()=>{
        if(cancelUnopened){
          // A delayed opened event is not evidence that native never opened. The native
          // main-thread lease decides before the JS input/audio blocker is released.
          void cancelUnopened(context.presentationId).then(state=>{
            if(state==='opened')context.opened();else resolve('unavailable');
          }).catch(()=>this.report('error',format,'native-presentation-unknown'));
        }else resolve('unavailable');
      },startWindow);
    });
    const work=Promise.resolve().then(()=>{this.report('provider-call',format);return operation(context);}).catch(()=>'failed' as const).then(async result=>{
      this.report('terminal',format,result);
      await onResult?.(opened?'shown':result);
      return result;
    });
    this.fullscreenWork=work;
    this.changed();
    void work.finally(()=>{
      operationDone=true;
      this.fullscreenWork=undefined;
      if(!this.disposed){if(!waiting&&this.fullscreen){this.fullscreen=false;this.block(false);}this.changed();}
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
      this.report('terminal','banner',desired?'visible-intent':'hidden-intent');
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
