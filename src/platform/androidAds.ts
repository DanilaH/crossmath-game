import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AdAvailability, AdsProvider, FullscreenContext, FullscreenResult, RewardReconciliation } from './ads';
import type { RewardEvent, RewardRequest } from './adState';

interface Presentation { presentationId:string; startBefore:number }
export interface NativeAds {
  availability(): Promise<AdAvailability>;
  pendingRewards(): Promise<{receipts:RewardEvent[]}>;
  acknowledge(receipt:{id:string;outcome?:RewardEvent['outcome']}): Promise<void>;
  showRewarded(request:RewardRequest & Presentation): Promise<{result:FullscreenResult}>;
  showInterstitial(context:Presentation): Promise<{result:FullscreenResult}>;
  cancelUnopened(context:{presentationId:string}):Promise<{state:'closed'|'opened'}>;
  reconcileReward(request:RewardRequest):Promise<RewardReconciliation>;
  setBanner(options:{visible:boolean}): Promise<void>;
  addListener(event:'availabilityChanged',listener:(status:AdAvailability)=>void): Promise<PluginListenerHandle>;
  addListener(event:'fullscreenClosed',listener:(event:{presentationId:string;result:FullscreenResult})=>void): Promise<PluginListenerHandle>;
  addListener(event:'fullscreenOpened',listener:(event:{presentationId:string})=>void): Promise<PluginListenerHandle>;
  addListener(event:'rewardSettled',listener:(receipt:RewardEvent)=>void): Promise<PluginListenerHandle>;
}

export function androidAdsProvider():AdsProvider|undefined {
  if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('CrossmathAds'))return undefined;
  return createAndroidAdsProvider(registerPlugin<NativeAds>('CrossmathAds'));
}

/** Exported adapter seam is exercised against the same native request-ID contract in CI. */
export function createAndroidAdsProvider(bridge:NativeAds):AdsProvider {
  const retirements=new Map<string,()=>void>();
  const reconcile=async(request:RewardRequest):Promise<RewardReconciliation>=>{
    const result=await bridge.reconcileReward(request);
    if(result.state==='closed')retirements.get(request.id)?.();
    return result;
  };
  const show=async(context:FullscreenContext,showNative:(presentation:Presentation)=>Promise<{result:FullscreenResult}>,request?:RewardRequest):Promise<FullscreenResult>=>{
    const {presentationId,startBefore}=context;
    const handles:PluginListenerHandle[]=[];
    let closed:(result:FullscreenResult)=>void=()=>{};
    const dismissal=new Promise<FullscreenResult>(resolve=>{closed=resolve;});
    let dispatched=false,retired=false;
    let retire=()=>{};
    const fenced=new Promise<FullscreenResult>(resolve=>{retire=()=>{retired=true;resolve('cancelled');};});
    if(request)retirements.set(request.id,retire);
    const listen=async(event:'fullscreenClosed'|'fullscreenOpened',callback:(event:any)=>void)=>{
      const handle=await bridge.addListener(event as 'fullscreenOpened',callback);
      if(retired)void handle.remove().catch(()=>undefined);else handles.push(handle);
    };
    const run=async():Promise<FullscreenResult>=>{try{
      await listen('fullscreenClosed',event=>{if(event.presentationId===presentationId)closed(event.result);});
      if(retired)return 'cancelled';
      await listen('fullscreenOpened',event=>{if(event.presentationId===presentationId)context.opened();});
      if(retired||Date.now()>=startBefore)return 'unavailable';
      dispatched=true;
      const result=(await showNative({presentationId,startBefore})).result;
      return ['shown','unavailable','failed','cancelled'].includes(result)?result:'failed';
    }catch(error){
      // A rejected bridge reply is not proof that the SDK did not open.
      try{if(request){
        const status=await reconcile(request);
        if(status.state==='opened'){context.opened();return await dismissal;}
        if(status.state==='unknown')return 'failed'; // unresolved game receipt continues to block competing ads
      }else{
        const status=await bridge.cancelUnopened({presentationId});
        if(status.state==='opened'){context.opened();return await dismissal;}
      }
      }catch(recoveryError){if(dispatched)return await dismissal;throw recoveryError;}
      return 'failed';
    }};
    try{return await Promise.race([run(),fenced]);}
    finally{retired=true;if(request&&retirements.get(request.id)===retire)retirements.delete(request.id);for(const handle of handles)void handle.remove().catch(()=>undefined);}
  };
  return {
    availability:()=>bridge.availability(),
    reconcileReward:reconcile,
    pendingRewards:async()=> (await bridge.pendingRewards()).receipts,
    acknowledge:(id,outcome)=>bridge.acknowledge({id,...(outcome?{outcome}:{})}),
    watchAvailability:async listener=>{const handle=await bridge.addListener('availabilityChanged',listener);return ()=>handle.remove();},
    watchRewards:async listener=>{const handle=await bridge.addListener('rewardSettled',listener);return ()=>handle.remove();},
    showRewarded:(request,context)=>show(context,presentation=>bridge.showRewarded({...request,...presentation}),request),
    showInterstitial:context=>show(context,presentation=>bridge.showInterstitial(presentation)),
    cancelUnopened:async presentationId=>{
      const {state}=await bridge.cancelUnopened({presentationId});
      if(state!=='closed'&&state!=='opened')throw Error('Invalid native presentation state');
      return state;
    },
    setBanner:visible=>bridge.setBanner({visible}),
  };
}
