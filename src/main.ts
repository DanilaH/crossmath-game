import { androidAdsProvider } from './platform/androidAds';
import type { Language } from './ui/locale';
import Phaser from 'phaser';
import { getRenderPixelRatio } from '@danilah/mini-games-kit/core';
import { destroyRenderer } from '@danilah/mini-games-kit/phaser';
import { StartupTimeline } from '@danilah/mini-games-kit/startup';
import { createPlatform } from './app/platform';
import { createStorage } from './app/storage';
import { createSave } from './app/model';
import { SaveRepository } from './app/saveRepository';
import { GameSession } from './app/session';
import { GameUi } from './ui/gameUi';
import { showStartupRecovery } from './ui/startupRecovery';
import { WorkshopScene, PRESENTABLE } from './game/WorkshopScene';
import './style.css';
import './ui/theme.css';
import './ui/play.css';
import './ui/hub.css';
import './ui/home.css';
import './ui/workshopReveal.css';

const startup=new StartupTimeline<'hostReady'|'storageReady'|'firstFrame'|'ready'>(),cover=document.querySelector<HTMLElement>('#startup')!,root=document.querySelector<HTMLElement>('#game-root')!;
let language:Language='ru';
let alive=true,ui:GameUi|undefined,removeDebug=()=>{},dispose=()=>{};
let repository:SaveRepository|undefined;
try{
  const platform=createPlatform(()=>ui?.onBack()??true);dispose=()=>platform.destroy();startup.mark('hostReady');
  repository=new SaveRepository(createStorage(),()=>createSave(crypto.randomUUID(),new Date().toISOString(),Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',crypto.randomUUID()));
  const state=await repository.load();language=state.settings.language;startup.mark('storageReady');
  const session=new GameSession(state,repository,()=>crypto.randomUUID());
  await session.refreshDay();
  let resolveFrame!:()=>void;const frame=new Promise<void>(resolve=>{resolveFrame=resolve;});
  const size=()=>{const r=root.getBoundingClientRect(),dpr=getRenderPixelRatio();return{cssWidth:Math.max(1,r.width),cssHeight:Math.max(1,r.height),dpr};};
  const initial=size();
  const game=new Phaser.Game({type:Phaser.AUTO,parent:root,width:Math.round(initial.cssWidth*initial.dpr),height:Math.round(initial.cssHeight*initial.dpr),transparent:true,scale:{mode:Phaser.Scale.NONE},scene:[WorkshopScene],callbacks:{preBoot:g=>g.events.once(PRESENTABLE,resolveFrame),postBoot:g=>{const s=size();g.canvas.style.width=s.cssWidth+'px';g.canvas.style.height=s.cssHeight+'px';}}});
  let paintPending=false;
  const paint=()=>{if(!game.isBooted||paintPending||platform.activity.isBlocked())return;paintPending=true;game.events.once(Phaser.Core.Events.POST_RENDER,()=>{paintPending=false;game.loop.sleep();});(game.scene.scenes[0] as WorkshopScene|undefined)?.paint();game.loop.wake();};
  const resize=()=>{if(!game.isBooted)return;const s=size();game.canvas.style.width=s.cssWidth+'px';game.canvas.style.height=s.cssHeight+'px';const w=Math.round(s.cssWidth*s.dpr),h=Math.round(s.cssHeight*s.dpr);if(game.scale.width!==w||game.scale.height!==h)game.scale.resize(w,h);ui?.board.resize();paint();};
  ui=new GameUi(session,(reason,blocked)=>platform.activity.setBlocked(reason,blocked),paint,androidAdsProvider());
  const blocked=platform.activity.onBlockedChange(value=>{game.sound.mute=value;game.input.enabled=!value;if(value&&game.isBooted)game.loop.sleep();else resize();ui?.activityChanged(value);});
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);observer?.observe(root);window.addEventListener('resize',resize);
  await frame;startup.mark('firstFrame');game.loop.sleep();cover.hidden=true;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  startup.mark('ready');document.documentElement.dataset.state='ready';platform.activity.setGameplayDesired(true);ui.setReady();
  if(repository.recoveredBackup)ui.showRecoveryNotice();
  if(import.meta.env.DEV){const{installDebug}=await import('./app/debug');if(alive)removeDebug=installDebug(()=>startup.snapshot({toReady:['start','ready'],toFrame:['start','firstFrame']}));}
  const destroy=(event:PageTransitionEvent)=>{if(event.persisted)return;alive=false;window.removeEventListener('pagehide',destroy);window.removeEventListener('resize',resize);observer?.disconnect();blocked();removeDebug();ui?.dispose();platform.destroy();destroyRenderer(game);};window.addEventListener('pagehide',destroy);
}catch(error){
  dispose();showStartupRecovery(cover,language,error,repository);
}
