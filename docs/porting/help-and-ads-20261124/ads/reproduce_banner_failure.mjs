/**
 * Reproduce the banner reconciliation defect in the exact, unchanged consumer class.
 * Node >=24; no npm packages, native SDK or application writes.
 * Source: bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67, blob 53fed5cc17d2afbd37526dc6845c805ec32cd219.
 * Only imported collaborators unused by banner paths are replaced; class body is unmodified.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const sourceUrl = new URL('./baseline/src/platform/ads.ts', import.meta.url);
const bytes = await readFile(sourceUrl);
const gitBlob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(gitBlob, '53fed5cc17d2afbd37526dc6845c805ec32cd219');
let source = stripTypeScriptTypes(bytes.toString('utf8'), {mode:'transform'});
assert(source.includes("import { DurableReceiptQueue } from '@danilah/mini-games-kit/platform';"));
assert(source.includes("import { canRequestReward, canShowInterstitial } from './adState';"));
source = source.replace("import { DurableReceiptQueue } from '@danilah/mini-games-kit/platform';",
  'class DurableReceiptQueue { constructor() {} deliver() { throw Error("Reward path must not run in banner reproduction"); } }');
source = source.replace("import { canRequestReward, canShowInterstitial } from './adState';",
  'function canRequestReward() { throw Error("Reward path not in this reproduction"); } function canShowInterstitial() { throw Error("Fullscreen path not in this reproduction"); }');
const {AdsController} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
const ready = {rewarded:true, interstitial:true, banner:true};

async function fixture() {
  const events=[];
  let actualVisible=false;
  let rejectNext=false;
  let deferred;
  const provider={
    availability:async()=>ready,
    pendingRewards:async()=>[],
    acknowledge:async()=>{throw Error('Unused');},
    watchAvailability:async()=>()=>{},
    watchRewards:async()=>()=>{},
    showRewarded:async()=>{throw Error('Unused');},
    showInterstitial:async()=>{throw Error('Unused');},
    setBanner:async visible=>{
      const event={ordinal:events.length+1,requested:visible,result:'pending'};
      events.push(event);
      if(deferred){const pending=deferred;deferred=undefined;await pending;}
      if(rejectNext){rejectNext=false;event.result='rejected';throw Error('Scripted bridge rejection');}
      actualVisible=visible;event.result='fulfilled';
    },
  };
  const controller=new AdsController({},provider,()=>{},()=>{});
  controller.start();await flush();
  return {
    controller,events,
    visible:()=>actualVisible,
    reject:()=>{rejectNext=true;},
    defer:()=>{let resolve;deferred=new Promise(done=>{resolve=done;});return ()=>resolve();},
  };
}

const results=[];
{
  const f=await fixture();
  f.controller.updateBanner(true);f.controller.updateBanner(true);await flush();
  f.controller.updateBanner(false);await flush();
  assert.deepEqual(f.events.map(e=>e.requested),[true,false]);assert.equal(f.visible(),false);
  results.push({id:'CONTROL_SUCCESS_COALESCES',status:'PASS',events:f.events});
  f.controller.dispose();await flush();
}
{
  const f=await fixture();
  f.controller.updateBanner(true);await flush();assert.equal(f.visible(),true);
  f.reject();f.controller.updateBanner(false);await flush();
  for(let i=0;i<3;i++){f.controller.updateBanner(false);f.controller.refresh();await flush();}
  assert.deepEqual(f.events.map(e=>e.requested),[true,false]);assert.equal(f.visible(),true);
  results.push({id:'FAILED_HIDE_NOT_RETRIED',status:'BASELINE_DEFECT_REPRODUCED',events:f.events,latestDesired:false,scriptedNativeVisible:f.visible(),repeatedDesiredUpdates:3,refreshCalls:3});
  f.controller.dispose();await flush();
}
{
  const f=await fixture();
  f.reject();f.controller.updateBanner(true);await flush();
  for(let i=0;i<3;i++){f.controller.updateBanner(true);f.controller.refresh();await flush();}
  assert.deepEqual(f.events.map(e=>e.requested),[true]);assert.equal(f.visible(),false);
  results.push({id:'FAILED_SHOW_NOT_RETRIED',status:'BASELINE_DEFECT_REPRODUCED',events:[...f.events],latestDesired:true,scriptedNativeVisible:f.visible(),repeatedDesiredUpdates:3,refreshCalls:3});
  f.controller.dispose();await flush();
}
{
  const f=await fixture();const finish=f.defer();
  f.controller.updateBanner(true);await flush();f.controller.dispose();
  finish();await flush();
  assert.deepEqual(f.events.map(e=>e.requested),[true,false]);assert.equal(f.visible(),false);
  results.push({id:'CONTROL_DISPOSE_DRAINS_TO_HIDE',status:'PASS',events:f.events});
}
console.log(JSON.stringify({
  evidence:'UNCHANGED_CONSUMER_CLASS_WITH_SCRIPTED_PROVIDER',
  commit:'bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67',
  sourceGitBlob:gitBlob,node:process.version,
  nativeSdkExecuted:false,androidExecuted:false,browserExecuted:false,
  classBodyChanged:false,results,
},null,2));
