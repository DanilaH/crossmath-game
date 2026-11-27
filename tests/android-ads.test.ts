import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({platform:'android',available:true,bridge:{} as Record<string,unknown>}));
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=>state.platform,isPluginAvailable:(name:string)=>name==='CrossmathAds'&&state.available},registerPlugin:()=>state.bridge}));
import {androidAdsProvider} from '../src/platform/androidAds';
const until=()=>Date.now()+1500;
beforeEach(()=>{state.platform='android';state.available=true;state.bridge={};});
it('is optional outside Android and with no registered bridge',()=>{
 state.platform='web';expect(androidAdsProvider()).toBeUndefined();state.platform='android';state.available=false;expect(androidAdsProvider()).toBeUndefined();
});
it('passes exact outcome acknowledgement to protect a later earned receipt',async()=>{
 const acknowledge=vi.fn(async()=>{});state.bridge.acknowledge=acknowledge;
 await androidAdsProvider()!.acknowledge('r','cancelled');expect(acknowledge).toHaveBeenCalledWith({id:'r',outcome:'cancelled'});
});
it('does not hold fullscreen return for a hung listener removal and correlates opened by presentation',async()=>{
 const remove=vi.fn(()=>new Promise<void>(()=>{})),opened=vi.fn();let listener!:(e:{presentationId:string})=>void;
 state.bridge.addListener=vi.fn(async(_,callback)=>{listener=callback;return {remove};});
 state.bridge.showRewarded=vi.fn(async()=>{listener({presentationId:'stale'});expect(opened).not.toHaveBeenCalled();listener({presentationId:'p'});return {result:'shown'};});
 expect(await androidAdsProvider()!.showRewarded({id:'r',profileId:'owner',kind:'hint'},{presentationId:'p',startBefore:until(),opened})).toBe('shown');
 expect(opened).toHaveBeenCalledOnce();expect(remove).toHaveBeenCalledOnce();
});
it('forbids late automatic show when listener registration outlasts the pre-show deadline',async()=>{
 const remove=vi.fn(async()=>{}),show=vi.fn(async()=>({result:'shown'}));
 state.bridge.addListener=vi.fn(async()=>({remove}));state.bridge.showInterstitial=show;
 expect(await androidAdsProvider()!.showInterstitial({presentationId:'p',startBefore:Date.now()-1,opened:()=>{}})).toBe('unavailable');expect(show).not.toHaveBeenCalled();expect(remove).toHaveBeenCalledOnce();
});
it('cleans up after native failure and rejects non-protocol terminal values',async()=>{
 const remove=vi.fn(async()=>{});state.bridge.addListener=async()=>({remove});state.bridge.showInterstitial=async()=>({result:'loaded'});
 expect(await androidAdsProvider()!.showInterstitial({presentationId:'p',startBefore:until(),opened:()=>{}})).toBe('failed');
 state.bridge.showInterstitial=async()=>{throw Error('Missing SDK');};
 await expect(androidAdsProvider()!.showInterstitial({presentationId:'p2',startBefore:until(),opened:()=>{}})).rejects.toThrow('Missing SDK');expect(remove).toHaveBeenCalledTimes(2);
});
it('projects recovered native receipts without inventing earned from show result',async()=>{
 const receipt={id:'r',profileId:'p',outcome:'earned'};state.bridge.pendingRewards=async()=>({receipts:[receipt]});
 expect(await androidAdsProvider()!.pendingRewards()).toEqual([receipt]);
});
it('asks native for the matching presentation lease before accepting pre-show cancellation',async()=>{
 const cancelUnopened=vi.fn(async()=>({state:'opened'}));state.bridge.cancelUnopened=cancelUnopened;
 expect(await androidAdsProvider()!.cancelUnopened!('presentation')).toBe('opened');expect(cancelUnopened).toHaveBeenCalledWith({presentationId:'presentation'});
});
