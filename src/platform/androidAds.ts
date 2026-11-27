import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AdAvailability, AdsProvider, FullscreenContext, FullscreenResult } from './ads';
import type { RewardEvent, RewardRequest } from './adState';

interface Presentation { presentationId:string; startBefore:number }
interface NativeAds {
  availability(): Promise<AdAvailability>;
  pendingRewards(): Promise<{receipts:RewardEvent[]}>;
  acknowledge(receipt:{id:string;outcome?:RewardEvent['outcome']}): Promise<void>;
  showRewarded(request:RewardRequest & Presentation): Promise<{result:FullscreenResult}>;
  showInterstitial(context:Presentation): Promise<{result:FullscreenResult}>;
  cancelUnopened(context:{presentationId:string}):Promise<{state:'closed'|'opened'}>;
  setBanner(options:{visible:boolean}): Promise<void>;
  addListener(event:'availabilityChanged',listener:(status:AdAvailability)=>void): Promise<PluginListenerHandle>;
  addListener(event:'fullscreenOpened',listener:(event:{presentationId:string})=>void): Promise<PluginListenerHandle>;
  addListener(event:'rewardSettled',listener:(receipt:RewardEvent)=>void): Promise<PluginListenerHandle>;
}

export function androidAdsProvider():AdsProvider|undefined {
  if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('CrossmathAds'))return undefined;
  const bridge=registerPlugin<NativeAds>('CrossmathAds');
  const show=async(context:FullscreenContext,showNative:(presentation:Presentation)=>Promise<{result:FullscreenResult}>):Promise<FullscreenResult>=>{
    const {presentationId,startBefore}=context;
    const handle=await bridge.addListener('fullscreenOpened',event=>{
      if(event.presentationId===presentationId)context.opened();
    });
    try{
      if(Date.now()>=startBefore)return 'unavailable';
      const result=(await showNative({presentationId,startBefore})).result;
      return ['shown','unavailable','failed','cancelled'].includes(result)?result:'failed';
    }finally{
      // Listener cleanup cannot hold the game's return from fullscreen.
      void handle.remove().catch(()=>undefined);
    }
  };
  return {
    availability:()=>bridge.availability(),
    pendingRewards:async()=> (await bridge.pendingRewards()).receipts,
    acknowledge:(id,outcome)=>bridge.acknowledge({id,...(outcome?{outcome}:{})}),
    watchAvailability:async listener=>{const handle=await bridge.addListener('availabilityChanged',listener);return ()=>handle.remove();},
    watchRewards:async listener=>{const handle=await bridge.addListener('rewardSettled',listener);return ()=>handle.remove();},
    showRewarded:(request,context)=>show(context,presentation=>bridge.showRewarded({...request,...presentation})),
    showInterstitial:context=>show(context,presentation=>bridge.showInterstitial(presentation)),
    cancelUnopened:async presentationId=>{
      const {state}=await bridge.cancelUnopened({presentationId});
      if(state!=='closed'&&state!=='opened')throw Error('Invalid native presentation state');
      return state;
    },
    setBanner:visible=>bridge.setBanner({visible}),
  };
}
