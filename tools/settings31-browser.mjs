import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {serve,ready} from './qa/rc30-harness.mjs';
const out=process.env.FUNC31_SETTINGS_OUT??'.test-output/functional31/settings';await mkdir(out,{recursive:true});
const host=await serve(process.env.FUNC31_WEB??'dist'),browser=await chromium.launch(),errors=[];
let context,page;
try{
 context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:'UTC'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-11-28T12:00:00Z'));await page.goto(host.url);await ready(page);
 const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));
 await page.locator('#pause').tap();await page.locator('#resume:enabled').waitFor();await page.locator('#settings-options summary').tap();
 const before=await save();assert.equal(before.settings.theme,'light');
 const hold=async()=>{await page.evaluate(()=>{window.writerHeld=false;window.heldWriter=navigator.locks.request('crossmath.save.v1.writer',async()=>{window.writerHeld=true;await new Promise(r=>window.releaseWriter=r);});});await page.waitForFunction(()=>window.writerHeld);};
 const release=async()=>{await page.evaluate(()=>window.releaseWriter());await page.locator('#resume:enabled').waitFor();};
 await hold();await page.locator('#theme').check();assert.equal(await page.locator('#theme').isChecked(),true);assert.equal(await page.locator('#theme').isDisabled(),true);assert.equal((await save()).settings.theme,'light');await page.screenshot({path:out+'/theme-pending.png'});
 await release();assert.equal((await save()).settings.theme,'dark');assert.equal(await page.locator('#theme').isChecked(),true);
 await hold();await page.locator('#language').selectOption('en');assert.equal(await page.locator('#language').inputValue(),'en');assert.equal(await page.locator('#language').isDisabled(),true);assert.equal((await save()).settings.language,'ru');await release();assert.equal((await save()).settings.language,'en');
 const durable=await save();
 await hold();await page.locator('#theme').uncheck();assert.equal(await page.locator('#theme').isChecked(),false);assert.equal((await save()).settings.theme,'dark');
 await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='crossmath.save.v1')throw Error('injected primary write failure');return set.call(this,k,v);};window.releaseWriter();});
 await page.locator('#save-error:visible').waitFor();await page.waitForFunction(()=>!document.querySelector('#theme').disabled);assert.equal(await page.locator('#theme').isChecked(),true);assert.deepEqual((await save()).settings,durable.settings);assert.deepEqual((await save()).profile,before.profile);await page.screenshot({path:out+'/failed-change-restored.png'});
 await page.locator('#reload').tap();await ready(page);const cold=await save();assert.deepEqual(cold.settings,durable.settings);assert.deepEqual(cold.profile,before.profile);assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({status:'PASS',transport:'Actual packaged web + real Web Locks, independently held writer; injected localStorage failure',pendingCheckboxRetained:true,pendingLanguageRetained:true,authoritativeSettingsUnchangedUntilCommit:true,failedChangeRevertsToDurable:true,coldRestore:true,profileAndEconomyRetained:true,errors,scope:'Chromium, not physical Android'},null,2));console.log('FUNC31 settings PASS · pending intent, real writer delay, failed primary, durable cold restore');
}catch(error){await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});await writeFile(out+'/failure.json',JSON.stringify({error:String(error),stack:error.stack,errors},null,2));throw error;}
finally{await browser.close();host.close();}
