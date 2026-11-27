import {leagueEnabled} from '../meta/league';
import { AdsController } from '../platform/ads';
import type { AdsProvider } from '../platform/ads';
import { dailyName, localize, localizeDocument, missingCoinsLabel, quantity, trackName } from './locale';
import type { Language } from './locale';
import { config, getPuzzle } from '../content/catalog';
import { campaignResultStatus, rankThreshold } from '../app/model';
import { BoardView, equationText } from './board';
import { Feedback } from './feedback';
import { acceptedFeedback, victoryFeedback } from './playFeedback';
import type { MoveFeedback, VictoryFeedback } from './playFeedback';
import { RewardReadout } from './rewardReadout';
import type { GameSession, OpenOutcome } from '../app/session';
import { hintPayment, storedSlot } from '../app/session';
import { MetaView } from './metaView';
import { menuIcon } from './icons';
import { rootScreens } from '../meta/types';
import type { MetaScreen, NewGameChoice, Offer, RootScreen } from '../meta/types';
import { RecoveryRequired } from '../app/saveRepository';
import type { FreeTrack } from '../content/rotation';
import type { Mode, Puzzle } from '../core/types';
import type { BoardAction } from '../core/types';
import type { ExplainPreparation, HintPlan } from '../help/logic';
import type { Save, Settings } from '../app/model';
const $=<T extends HTMLElement=HTMLElement>(id:string):T=>document.getElementById(id) as T;
type OpenOperation = (replace: boolean, elapsed: number) => Promise<OpenOutcome>;
interface Replacement { operation: OpenOperation; triggerId: string; recovery: boolean; restoreModes?: ((save: Save) => void) | undefined }
export class GameUi {
  private disposed=false;
  private readonly ads:AdsController|undefined;
  private notice:'recovered'|'unavailable'|undefined;
  private replacement: Replacement | undefined;
  private renderedLanguage?: Language;
  private moveFeedback: MoveFeedback | undefined;
  private freshRewardId: string | undefined;
  private victory: VictoryFeedback | undefined;
  private pendingStart: string | undefined;
  private startFrame: number | undefined;
  private readonly scoreReadout = new RewardReadout($('run-status'));
  private readonly rewardReadout = new RewardReadout($('result-rewards'));
  private readonly tabScroll=new Map<RootScreen,number>();
  private get language(): Language { return this.session.state.settings.language; }
  private t(ru: string, en: string): string { return localize(this.language, ru, en); }
  readonly board:BoardView;
  private readonly feedback:Feedback;
  private readonly meta:MetaView;private navigationBlocked=false;
  private busy=false;private ready=false;private blocked=false;private saveFailed=false;
  private wasActive=false;private lastTime=performance.now();private elapsed=0;
  private explanation:ExplainPreparation|null=null;
  private revealPlan:HintPlan|null=null;
  private helpKind:'explain'|'reveal'='explain';
  private helpSnapshot:ExplainPreparation['snapshot']|undefined;
  private helpOperation='';
  private timer:ReturnType<typeof setInterval>;private retryAction:(()=>void)|null=null;
  constructor(readonly session:GameSession,private readonly blocker:(reason:string,blocked:boolean)=>void,private readonly repaint:()=>void,adsProvider?:AdsProvider){
    this.ads=adsProvider?new AdsController(session,adsProvider,value=>this.blocker('ad',value),()=>this.render()):undefined;
    this.feedback=new Feedback(()=>session.state.settings);
    this.board=new BoardView($('board'),$('tray'),$('note'),this.feedback,()=>this.busy||session.writing||this.blocked||this.saveFailed||!this.ready,()=>this.reduced(),(action,metadata)=>this.command(action,metadata),()=>this.language);
    this.meta=new MetaView($('hub'),{
      joinLeague:()=>{this.run(async()=>({committed:await session.enterLeague()}));},
      navigate:(screen,history)=>this.navigate(screen,history),campaign:()=>this.open((_,time)=>session.openCampaign(time),'campaign'),
      newGame:choice=>this.chooseNewGame(choice),selectDay:day=>this.selectDay(day),
      free:track=>this.openFree(track),daily:day=>this.open((_,time)=>session.openDaily(day,time),'daily'),
      endless:()=>this.open((_,time)=>session.openEndless(time),'endless'),offer:(offer,repeat)=>this.openOffer(offer,repeat),
      quest:index=>{
        const offer=session.questOffer(index);
        if (offer) this.open((replace,time)=>session.openQuest(index,replace,time),offer.mode);
      },
      questStartsNewRun:index=>session.questStartsNewRun(index),blocking:value=>this.blocker('modal',value),
    },()=>this.feedback.workshopContact());
    const settingsIcon = menuIcon('settings');
    settingsIcon.classList.add('hub-settings');
    $('pause').querySelector('.hub-settings')?.replaceWith(settingsIcon);
    const tabIcons={home:'campaign',calendar:'calendar',modes:'modes',profile:'profile'};
    for (const screen of rootScreens) {
      const tab=$(`tab-${screen}`);
      tab.prepend(menuIcon(tabIcons[screen]));
      tab.onclick=()=>this.navigate(screen);
    }
    for (const [id,name] of [['undo','undo'],['sort','sort'],['return','return-to-tray'],['help','hint']] as const) {
      $(id).querySelector('svg')?.replaceWith(menuIcon(name));
    }
    $('help-title').insertBefore(menuIcon('hint'),$('help-title').firstChild);

    $('submit').onclick=()=>this.command({type:'SubmitEndless'});
    $('end-run').onclick=()=>this.requestEndRun();
    $('finish-run').onclick=$('end-run-yes').onclick=()=>this.finishEndless();
    const endDialog=$<HTMLDialogElement>('end-run-dialog');
    $('end-run-no').onclick=()=>this.keepPlayingEndless();
    endDialog.addEventListener('cancel',event=>{event.preventDefault();this.keepPlayingEndless();});
    $('home').onclick=()=>this.session.state.meta.screen==='album' ? this.leaveWorkshop() : this.session.state.meta.screen==='league'?this.navigate('profile'):this.navigate('home');
    $('home-from-pause').onclick=()=>this.navigate('home');
    $('result-main').onclick=()=>this.navigate('home');
    $('result-home').onclick=()=>campaignResultStatus(session.state)==='finish' ? this.navigate('home') : this.navigate('modes',true);
    $('defeat-calendar').onclick = () => this.navigate('calendar');
    $('instrument-reward').onclick = () => this.meta.openInstrumentReward(session.state);
    $('rank').onclick=()=>{if(!this.busy&&!this.saveFailed)this.meta.openRank(session.state);};
    for(const id of ['retry-daily','result-replay'])$(id).onclick=()=>this.run(async()=>({committed:await session.restart()}),()=>{this.board.clearSelection();window.scrollTo(0,0);});
    $('undo').onclick=()=>this.command({type:'Undo'});$('sort').onclick=()=>this.command({type:'SortTray'});$('return').onclick=()=>this.board.returnSelected();
    $('pause').onclick=()=>this.openPause();$('resume').onclick=()=>this.resume();$('help').onclick=()=>this.openHelp();$('close-help').onclick=()=>this.closeHelp();
    $('explain').onclick=()=>this.chooseHelp('explain');$('reveal').onclick=()=>this.chooseHelp('reveal');$('apply-help').onclick=()=>this.applyHelp();
    $('ad-hint').onclick=()=>this.run(time=>this.ads!.reward('hint',time));
    $('ad-continue').onclick=()=>this.run(time=>this.ads!.reward('continue',time));
    $('next').onclick=()=>{
      this.meta.skipWorkshopReveal();
      this.finishReadouts();
      this.run(async()=>{
        await this.ads?.beforeNext();
        await session.waitForWrite();
        if(this.disposed)return {committed:false};
        return {committed:await session.next()};
      },()=>{
        this.board.clearSelection();window.scrollTo(0,0);
        requestAnimationFrame(()=>{
          if(session.state.meta.calendarTrophyMonth)document.getElementById('month-trophy')?.focus();
          else $('level').focus({preventScroll:true});
        });
      });
    };
    $('restart').onclick=()=>{$('restart-confirm').hidden=false;};$('restart-no').onclick=()=>{$('restart-confirm').hidden=true;};
    $('restart-yes').onclick=()=>this.run(async()=>({committed:await session.restart()}),()=>{$<HTMLDialogElement>('pause-dialog').close();this.blocker('user',false);$('restart-confirm').hidden=true;window.scrollTo(0,0);});
    $<HTMLDialogElement>('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});
    const helpDialog=$<HTMLDialogElement>('help-dialog');
    helpDialog.addEventListener('cancel',e=>{e.preventDefault();this.closeHelp();});
    helpDialog.addEventListener('close',()=>{
      if (!helpDialog.open) {
        this.helpSnapshot=undefined;
        this.clearHelpSelection();
      }
    });
    for(const [id,key] of [['sound','sound'],['vibration','vibration'],['theme','theme'],['reduced','reducedMotion'],['timer-visible','timerVisible']] as const){$<HTMLInputElement>(id).onchange=()=>{const input=$<HTMLInputElement>(id);const value=key==='theme'?(input.checked?'dark':'light'):input.checked;this.run(async time=>{await session.update({[key]:value} as Partial<Settings>,session.state.attempt.userPaused,time);return {committed:true};});};}
    $<HTMLSelectElement>('language').onchange=()=>{
      const language:Language=$<HTMLSelectElement>('language').value==='en'?'en':'ru';
      this.run(async time=>{
        await session.update({language},session.state.attempt.userPaused,time);
        return {committed:true};
      });
    };
    const replaceDialog = $<HTMLDialogElement>('replace-dialog');
    replaceDialog.addEventListener('cancel', event => {event.preventDefault();this.cancelReplacement();});
    replaceDialog.addEventListener('close', () => this.finishReplacement(true));
    $('keep-board').onclick = () => this.cancelReplacement();
    $('replace-board').onclick = () => this.confirmReplacement();
    $('replace-reload').onclick = () => location.reload();
    $('retry').onclick=()=>this.retryAction?.();$('reload').onclick=()=>location.reload();
    this.timer=setInterval(()=>{this.tick();this.renderTime();if(this.ready)this.ads?.refresh();if(!this.busy&&this.ready&&!this.saveFailed&&(session.hasDayChange()||session.hasLeagueUpdate()))this.run(async()=>({committed:await session.refreshDay()}));else if(this.elapsed>=10)this.checkpoint();},2000);this.render();
  }
  private leaveModal():void{for(const id of ['end-run-dialog','pause-dialog','help-dialog']){const dialog=$<HTMLDialogElement>(id);if(dialog.open)dialog.close();}this.blocker('user',false);this.blocker('modal',false);$('restart-confirm').hidden=true;this.finishReadouts();this.board.clearSelection();window.scrollTo(0,0);}

  private requestEndRun():void {
    if (this.busy || this.saveFailed) return;
    const run=this.session.state.career.run;
    if (!run || run.status!=='active') { this.finishEndless(); return; }
    const score=quantity(this.language,run.score,'point');
    $('end-run-title').textContent=this.t(`Завершить забег с ${run.score} ${run.score%10===1&&run.score%100!==11?'очком':'очками'}?`, `End the run with ${score}?`);
    const dialog=$<HTMLDialogElement>('end-run-dialog');
    if (!dialog.open) dialog.showModal();
  }

  private keepPlayingEndless():void {
    if (this.busy) return;
    $<HTMLDialogElement>('end-run-dialog').close();
    this.resume();
  }

  private finishEndless():void {
    this.run(async time=>({committed:await this.session.endRun(time)}),()=>this.leaveModal());
  }
  private leaveWorkshop():void { this.navigate(this.session.state.meta.albumOrigin??'home'); }
  private navigate(screen: MetaScreen, campaignHistory = false): void {
    const from=this.session.state.meta.screen;
    if (from===screen||this.busy||this.session.writing||this.saveFailed) return;
    if(from!=='play'&&from!=='album'&&from!=='league')this.tabScroll.set(from,window.scrollY);
    this.run(async time=>({committed:await this.session.navigate(screen,time)}),()=>{
      this.leaveModal();
      requestAnimationFrame(()=>{
        if (campaignHistory) this.meta.openCampaignHistory();
        else if (screen==='play') $('level').focus({preventScroll:true});
        else if (screen==='album'||screen==='league') $('deep-title').focus({preventScroll:true});
        else {
          window.scrollTo(0,this.tabScroll.get(screen)??0);
          const back=from==='album'&&(screen==='home'||screen==='profile');
          const focus=back ? $(screen==='home'?'album-open':'profile-workshop') : $(`tab-${screen}`);
          focus?.focus({preventScroll:!back});
        }
      });
    });
  }
  private selectDay(day:string):void {
    this.run(async()=>({committed:await this.session.selectDailyDay(day)}),()=>{
      requestAnimationFrame(()=> {
        const play=$<HTMLButtonElement>('daily-play');
        (play?.disabled ? $('tab-calendar') : play)?.focus();
      });
    });
  }
  private chooseNewGame(choice:NewGameChoice):void {
    if (this.busy||this.session.writing||this.saveFailed) return;
    const mode:Mode=choice==='campaign'||choice==='endless'?choice:'free';
    const save=this.session.state;
    const operation:OpenOperation=(replace,elapsed)=>this.session.newGame(choice,replace,elapsed);
    const replacing=mode==='endless'?save.career.run?.status==='active':storedSlot(save,mode)?.attempt.status==='playing';
    if (!replacing&&save.attempt.status==='playing'&&save.meta.activeSlot!==mode) {
      this.requestReplacement(operation,mode,document.activeElement?.id||'new-game','park');
    } else this.open(operation,mode,true);
  }
  private openFree(track: FreeTrack): void {
    this.open((replace,time) => this.session.openFreeTrack(track,replace,time), 'free');
  }
  private openOffer(offer: Offer, repeatCompleted = false): void {
    this.open((replace,time) => this.session.openOffer(offer,replace,time,repeatCompleted), offer.mode);
  }
  private open(operation: OpenOperation, mode: Mode, newGame=false): void {
    const triggerId = document.activeElement?.id || 'tab-modes';
    let result: OpenOutcome;
    this.run(async time => {
      result = await operation(false,time);
      return {committed: result === 'opened'};
    }, () => {
      if (result === 'confirm_replace') this.requestReplacement(operation,mode,triggerId,newGame?'new':'replace');
      else if (result === 'opened') { this.meta.closeChoice();this.leaveModal(); }
      else this.notice = 'unavailable';
    });
  }
  private requestReplacement(operation: OpenOperation, mode: Mode, triggerId: string, kind:'replace'|'park'|'new'='replace'): void {
    this.replacement = {operation, triggerId, recovery:false, restoreModes:this.meta.suspendChoice()};
    const score=this.session.state.career.run?.score ?? 0;
    const copy = kind==='park' ? [
      this.t('Открыть другую игру?','Open another game?'),
      this.t('Текущая партия останется в сохранении.','Your current board will stay saved.'),
    ] : mode==='endless' && kind==='new' ? [
      this.t('Начать новый забег?','Start a new run?'),
      this.t(`Текущий забег завершится. В рекорд пойдёт ${quantity(this.language,score,'point')}.`,
        `Your current run will end. Its ${quantity(this.language,score,'point')} will count toward the record.`),
    ] : mode==='free' ? [
      this.t('Начать другую свободную игру?', 'Start another Free Play board?'),
      this.t('Текущая расстановка в свободной игре будет потеряна.', 'Your current Free Play board will be reset.'),
    ] : [
      this.t('Начать другое поле?', 'Start another board?'),
      this.t('Числа в незаконченной партии вернутся в лоток.', 'The numbers on your unfinished board will return to the tray.'),
    ];
    $('replace-title').textContent = copy[0]!;
    $('replace-description').textContent = copy[1]!;
    $('replace-error').hidden = $('replace-reload').hidden = true;
    $('replace-board').textContent = kind==='park' ? this.t('Открыть','Open')
      : mode==='endless' && kind==='new' ? this.t('Начать забег','Start run')
      : this.t('Заменить партию', 'Replace this board');
    this.blocker('replace', true);
    $<HTMLDialogElement>('replace-dialog').showModal();
    requestAnimationFrame(() => $('keep-board').focus());
  }
  private cancelReplacement(): void {
    if (this.busy || this.replacement?.recovery) return;
    this.finishReplacement(true);
  }
  private finishReplacement(restoreFocus: boolean): void {
    const replacement = this.replacement;
    if (!replacement) return;
    this.replacement = undefined;
    const dialog = $<HTMLDialogElement>('replace-dialog');
    if (dialog.open) dialog.close();
    this.blocker('replace', false);
    if (restoreFocus) {
      replacement.restoreModes?.(this.session.state);
      requestAnimationFrame(() => ($(replacement.triggerId) ?? $('tab-modes'))?.focus({preventScroll:true}));
    }
  }
  private confirmReplacement(): void {
    const replacement = this.replacement;
    if (!replacement || replacement.recovery) return;
    let result: OpenOutcome;
    this.run(async time => {
      result = await replacement.operation(true,time);
      return {committed:result === 'opened'};
    }, () => {
      this.finishReplacement(result !== 'opened');
      if (result === 'opened') {
        this.leaveModal();
        requestAnimationFrame(() => $('level').focus({preventScroll:true}));
      } else this.notice = 'unavailable';
    }, error => {
      replacement.recovery = error instanceof RecoveryRequired;
      $('replace-error').hidden = false;
      $('replace-reload').hidden = !replacement.recovery;
      $('replace-board').textContent = this.t('Повторить', 'Retry');
      requestAnimationFrame(() => $(replacement.recovery ? 'replace-reload' : 'replace-board').focus());
    });
  }
  private syncNavigation():void{if(!this.ready)return;const next=this.session.state.meta.screen!=='play';if(next===this.navigationBlocked)return;this.navigationBlocked=next;this.blocker('navigation',next);}
  private reduced():boolean{return this.session.state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private renderTime():void {
    const remaining=document.getElementById('league-remaining'),league=this.session.state.league;
    if(remaining&&league?.active){
      const left=Math.max(0,league.active.endAt-Math.max(Date.now(),league.lastSeenAt));
      const days=Math.floor(left/86_400_000),hours=Math.floor(left%86_400_000/3_600_000);
      remaining.textContent=this.t(`До итога: ${days} д ${hours} ч`,`Ends in ${days}d ${hours}h`);
    }
    const a=this.session.state.attempt,node=$('play-time');
    node.hidden=!this.session.state.settings.timerVisible||a.mode==='daily'||a.mode==='endless';
    if(node.hidden)return;
    const seconds=Math.floor(a.elapsedPlaying+this.elapsed);
    node.textContent=this.t("Время", "Time")+" "+Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
  }
  private tick():void{const now=performance.now();if(this.wasActive)this.elapsed+=(now-this.lastTime)/1000;this.lastTime=now;this.wasActive=this.ready&&!this.blocked&&!this.saveFailed&&this.session.state.meta.screen==='play'&&!this.session.state.attempt.userPaused&&this.session.state.attempt.status==='playing';}
  setReady():void{this.ready=true;this.ads?.start();this.syncNavigation();this.tick();this.render();if(this.session.state.meta.screen==='play'&&this.session.state.attempt.userPaused){this.showPause();}}
  activityChanged(blocked:boolean):void{this.tick();this.blocked=blocked;this.tick();if(blocked){this.board.suspend();this.meta.skipWorkshopReveal();this.finishReadouts();this.moveFeedback=undefined;this.freshRewardId=undefined;this.stopStart();this.feedback.setActive(false);queueMicrotask(()=>this.checkpoint());}else this.feedback.setActive(true);this.render();}
  private checkpoint():void{if(this.busy||!this.ready||this.saveFailed||this.elapsed<=0||this.session.state.attempt.status!=='playing')return;this.run(async time=>({committed:await this.session.checkpoint(time)}));}
  private run(operation:(elapsed:number)=>Promise<{committed:boolean}>,after:()=>void=()=>{},onFailure?:(error:unknown)=>void):void{
    if(this.busy||this.session.writing)return;this.tick();const time=this.elapsed,before=this.session.state;this.busy=true;this.render();this.retryAction=()=>this.run(operation,after,onFailure);
    void operation(time).then(result=>{
      if(result.committed){
        this.elapsed=Math.max(0,this.elapsed-time);
        const next=this.session.state;
        const attempt=next.attempt;
        if(next.meta.screen==='play'&&attempt.status==='playing'&&attempt.boardRevision===0&&attempt.id!==before.attempt.id
          && !Object.values(before.meta.inactive).some(slot=>slot.attempt.id===attempt.id))this.pendingStart=attempt.id;
      }
      this.saveFailed=false;$('save-error').hidden=true;this.retryAction=null;after();
    }).catch(error=>{
      if (onFailure) {this.retryAction=null;onFailure(error);return;}
      this.saveFailed=true;this.board.cancel();
      for(const id of ['end-run-dialog','help-dialog','pause-dialog']){const dialog=$<HTMLDialogElement>(id);if(dialog.open)dialog.close();}
      this.blocker('modal',false);this.blocker('user',false);
      $('save-error-text').textContent=this.t("Не удалось подтвердить запись. Сохранённые данные сохранены. Повторите действие или восстановите сохранение перед продолжением.", "The save could not be confirmed. Retry the action or reload your saved game.");$('save-error').hidden=false;$('save-error').scrollIntoView({block:'nearest'});
    }).finally(()=>{this.busy=false;this.syncNavigation();this.tick();this.render();if(!this.saveFailed&&this.session.state.meta.screen==='play'&&this.session.state.attempt.userPaused&&!$<HTMLDialogElement>('pause-dialog').open){this.showPause();}if(this.blocked&&this.elapsed>0&&!this.retryAction)this.checkpoint();});
  }
  private command(action:BoardAction,metadata?:{commandId:string;expectedRevision:number}):void{
    if(this.blocked||this.busy||this.session.writing||this.saveFailed)return;this.board.cancel();this.board.clearSelection();
    const identity = metadata ?? {commandId:crypto.randomUUID(), expectedRevision:this.session.state.attempt.boardRevision};
    let committedFeedback: MoveFeedback | undefined;
    let before = this.session.state;
    this.run(async time => {
      before = this.session.state;
      const result = await this.session.command(action, time, identity);
      committedFeedback = acceptedFeedback(action,identity.commandId,before.attempt,this.session.state.attempt,result.outcome,result.cue);
      return {committed:result.outcome === 'applied'};
    }, () => this.presentMove(committedFeedback,before));
  }

  private presentMove(move:MoveFeedback|undefined,before:Save):void {
    if(!move||this.disposed)return;
    if(move.cue==='win'){
      this.victory=victoryFeedback(before,this.session.state);
      Object.assign(move.detail,this.victory?.detail);
      if(!this.blocked)this.freshRewardId=this.victory?.id;
    }
    if(!this.blocked)this.moveFeedback=move;
  }

  private finishReadouts():void {
    this.scoreReadout.finish();
    this.rewardReadout.finish();
    $('result-rank').classList.remove('rank-arrived');
  }

  private stopStart():void {
    this.pendingStart=undefined;
    if(this.startFrame!==undefined)cancelAnimationFrame(this.startFrame);
    this.startFrame=undefined;
  }

  private playNewField(attemptId:string):void {
    if(this.pendingStart!==attemptId||this.busy||this.blocked||!this.ready)return;
    this.stopStart();
    this.startFrame=requestAnimationFrame(()=>{
      this.startFrame=requestAnimationFrame(()=>{
        this.startFrame=undefined;
        const {meta,attempt}=this.session.state;
        if(!this.disposed&&!this.blocked&&!this.saveFailed&&meta.screen==='play'
          &&attempt.id===attemptId&&attempt.boardRevision===0&&attempt.status==='playing')this.feedback.cue('start');
      });
    });
  }

  private showPause(): void {
    const playing = this.session.state.meta.screen === 'play';
    $<HTMLDetailsElement>('settings-options').open = !playing;
    $<HTMLDetailsElement>('rules-options').open = false;
    $('rules-options').hidden = $('home-from-pause').hidden = $('restart').hidden = !playing;
    $('restart-confirm').hidden = true;
    this.blocker('user', true);
    $<HTMLDialogElement>('pause-dialog').showModal();
  }

  private openPause(): void {
    if (this.busy || this.session.writing || this.saveFailed || $<HTMLDialogElement>('pause-dialog').open) return;
    this.board.cancel();
    this.tick();
    this.showPause();
    if (this.session.state.meta.screen === 'play') {
      this.run(async time => { await this.session.update({}, true, time); return {committed:true}; });
    }
  }

  private resume(): void {
    if (this.busy) return;
    const close = () => {
      $<HTMLDialogElement>('pause-dialog').close();
      this.blocker('user', false);
      $('restart-confirm').hidden = true;
    };
    if (this.session.state.meta.screen !== 'play') close();
    else this.run(async time => { await this.session.update({}, false, time); return {committed:true}; }, close);
  }

  private openHelp(): void {
    if (this.busy || this.session.writing || this.saveFailed || this.session.state.attempt.status !== 'playing') return;
    this.board.cancel();
    this.tick();
    this.helpSnapshot = undefined;
    this.updateHelpPrice();
    this.blocker('modal',true);
    $<HTMLDialogElement>('help-dialog').showModal();
    $('help-content').scrollTop = 0;
  }

  private clearHelpSelection(): void {
    this.explanation = null;
    this.revealPlan = null;
    const description = $('help-description');
    description.hidden = true;
    description.textContent = '';
    for (const id of ['explain','reveal']) {
      $(id).classList.remove('chosen');
      $(id).setAttribute('aria-pressed','false');
    }
  }

  private get helpPlan(): HintPlan|null {
    if (this.helpKind === 'reveal') return this.revealPlan;
    return this.explanation?.outcome === 'ready' ? this.explanation.plan : null;
  }

  private syncHelpSnapshot(): void {
    const {attempt} = this.session.state;
    if (this.helpSnapshot?.attemptId !== attempt.id || this.helpSnapshot.puzzleId !== attempt.puzzleId
      || this.helpSnapshot.boardRevision !== attempt.boardRevision) {
      this.clearHelpSelection();
      this.helpSnapshot = {attemptId:attempt.id, puzzleId:attempt.puzzleId, boardRevision:attempt.boardRevision};
      this.helpOperation = crypto.randomUUID();
    }
  }

  private updateHelpPrice(): void {
    this.syncHelpSnapshot();
    const {profile, attempt, career} = this.session.state;
    const { coins, hintCredits } = profile;
    const {costCredits, costCoins, missingCoins} = hintPayment(profile);
    const balance = quantity(this.language, coins, 'coin');
    const credits = quantity(this.language, hintCredits, 'credit');
    const price = costCredits ? quantity(this.language, costCredits, 'credit') : quantity(this.language, costCoins, 'coin');
    $('help-cost').textContent = this.t(`Стоимость ${price} · У вас ${balance} и ${credits}`, `Cost ${price} · Balance ${balance} and ${credits}`);
    const shortage = $('help-shortage');
    shortage.hidden = missingCoins === 0;
    shortage.textContent = missingCoins > 0 ? missingCoinsLabel(this.language, missingCoins) : '';
    const impact = $('help-impact');
    impact.hidden = attempt.mode !== 'endless' || career.run?.assisted === true;
    impact.textContent = impact.hidden ? '' : this.t('Этот забег попадёт в рекорды с помощью', 'This run will count toward assisted records');
    const apply = $<HTMLButtonElement>('apply-help');
    const plan = this.helpPlan;
    apply.disabled = this.busy || !plan || missingCoins > 0;
    apply.textContent = plan && !missingCoins ? this.t(`Применить · ${price}`, `Apply · ${price}`) : this.t('Применить', 'Apply');
  }

  private chooseHelp(kind:'explain'|'reveal'):void{
    this.syncHelpSnapshot();
    this.helpKind=kind;
    this.explanation=kind==='explain' ? this.session.prepareExplanation() : null;
    this.revealPlan=kind==='reveal' ? this.session.prepareHelp('reveal',this.board.selectedCell()) : null;
    for (const choice of ['explain','reveal']) {
      $(choice).classList.toggle('chosen',choice===kind);
      $(choice).setAttribute('aria-pressed',String(choice===kind));
    }
    const description = $('help-description');
    description.hidden = false;
    description.textContent = this.explanation ? this.explanationDescription(this.explanation) : this.revealPlan
      ? this.t('Покажем правильное число. Мешающие неверные фишки вернутся в лоток.', 'Reveal the correct number. Any pieces in the way go back to the tray.')
      : this.t('Сейчас нет доказуемого хода из этой расстановки. Можно исправить гипотезу или отдельно показать число.', 'No step can be proved from this layout. Change a placement or reveal a number.');
    this.updateHelpPrice();
    description.scrollIntoView({block:'nearest'});
  }

  private explanationDescription(result: ExplainPreparation): string {
    switch (result.outcome) {
      case 'ready':
        return this.t('Применим доказуемый ход и покажем, как его получить из равенств и лотка.', 'Place a number and see why it follows from the equations and the tray.');
      case 'incompatible_position':
      case 'no_supported_step':
        if (this.session.state.attempt.mode === 'endless') {
          return this.t('Сейчас не удалось подготовить объяснение. Можно продолжить решать или отдельно выбрать «Показать число».', 'An explanation is not available right now. Keep playing, or choose “Reveal a number” separately.');
        }
        return result.outcome === 'incompatible_position'
          ? this.t('С текущей расстановкой поле нельзя завершить. Вернитесь к полю и проверьте поставленные числа.', 'The board cannot be completed with these placements. Go back to the board and review the numbers you placed.')
          : this.t('Для этой расстановки пока нет готового объяснения. Можно продолжить решать или отдельно выбрать «Показать число».', 'There is no explanation available for this layout yet. Keep playing, or choose “Reveal a number” separately.');
      case 'budget_exhausted':
        return this.t('Проверка хода не завершилась. Можно продолжить решать или отдельно выбрать «Показать число».', 'The move check did not finish. Keep playing, or choose “Reveal a number” separately.');
      case 'unavailable':
        return this.t('Объяснение сейчас недоступно.', 'An explanation is currently unavailable.');
    }
  }

  private closeHelp():void{if(this.busy)return;$<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);}
  private showAppliedExplanation(puzzle: Puzzle, plan: HintPlan): void {
    const assignment = plan.assignments[0]!, {value} = assignment;
    if (plan.kind === 'explain' && plan.proof) {
      const equations = plan.proof.steps.flatMap(step => step.type === 'equation' ? [step.equationIndex] : []);
      const reversed = [...plan.proof.steps].reverse();
      const rejection = reversed.find(step => step.type === 'exclude');
      if (rejection) {
        const cell = puzzle.cells.find(cell => cell.id === rejection.cellId)!;
        const {contradiction} = rejection;
        const reason = contradiction.type === 'equation'
          ? this.t('выделенное равенство не сойдётся', 'the highlighted equation cannot work')
          : this.t(`число фишек «${contradiction.value}» не совпадёт с числом клеток для них`, `the number of ${contradiction.value} tiles will not match the cells for them`);
        const support = contradiction.type === 'equation' ? [contradiction.equationIndex]
          : rejection.reductions.flatMap(step => step.type === 'equation' ? [step.equationIndex] : []).slice(-2);
        this.board.explain(this.t(
          `Если поставить ${rejection.value} в строку ${cell.y+1}, столбец ${cell.x+1}, ${reason}. Здесь остаётся ${value}.`,
          `Trying ${rejection.value} at row ${cell.y+1}, column ${cell.x+1} means ${reason}. This cell must be ${value}.`,
        ),support);
      } else {
        const inventory = reversed.find(step => step.type === 'inventory');
        const text = inventory ? this.t(
          `Равенства и количество фишек с числом ${inventory.value} исключают другие варианты. Здесь остаётся ${value}.`,
          `The equations and the number of ${inventory.value} tiles rule out the other choices. This cell must be ${value}.`,
        ) : this.t(
          `По выделенным равенствам в этой клетке остаётся только ${value}.`,
          `Checking the highlighted equations leaves only ${value} for this cell.`,
        );
        const direct = equations.filter(index => puzzle.equations[index]!.cells.includes(assignment.cellId));
        this.board.explain(text,[...new Set([...direct,...equations.slice(-2)])].slice(0,3));
      }
      return;
    }
    const evidence = assignment.evidence.map(e => e.equationIndex);
    const candidateSets=assignment.evidence.map(e=>'{'+e.candidates.join(', ')+'}').join(this.t(' и ', ' and '));
    const expression=equationText(puzzle,this.session.state.attempt,evidence[0] ?? 0);
    const text=plan.kind==='reveal'
      ?this.t(`Показано число ${value}.`,`Revealed ${value}.`)+(plan.returns.length?this.t(' Мешающие фишки возвращены в лоток.', ' Conflicting pieces returned to the tray.'):'')
      :plan.rule==='intersection'
        ?this.t(`Общая клетка: ${candidateSets}. В обоих наборах есть только ${value}.`,`Shared cell: ${candidateSets}. Only ${value} appears in both sets.`)
        :this.t(`${expression}. Подходящее число — ${value}.`,`${expression}. The missing number is ${value}.`);
    this.board.explain(text,evidence);
  }

  private applyHelp():void{
    if(this.busy)return;
    this.updateHelpPrice();
    const plan=this.helpPlan,snapshot=this.helpSnapshot,operation=this.helpOperation;
    if(!plan||!snapshot||hintPayment(this.session.state.profile).missingCoins>0)return;let applied=false;
    let before=this.session.state;
    this.run(async time=>{before=this.session.state;const revision=before.revision,result=await this.session.help(plan.kind,operation,snapshot.boardRevision,plan,time);applied=result.outcome==='applied';
      if(!applied)$('help-description').textContent=result.outcome==='insufficient_resource'?this.t("Не хватает монет. Продолжать решать и начинать поле заново можно бесплатно.", "You need more coins for help. Keep playing or restart for free."):this.t("Поле изменилось или этот ход больше недоступен. Закройте помощь и попробуйте снова.", "The board changed or this move is no longer available. Close Help and try again.");return {committed:this.session.state.revision!==revision};
    },()=>{if(!applied)return;
      const attempt=this.session.state.attempt;
      const puzzle=getPuzzle(attempt.puzzleId);
      $<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);this.board.update(puzzle,attempt);
      this.showAppliedExplanation(puzzle,plan);
      this.presentMove(acceptedFeedback({type:'Help',cellId:plan.assignments[0]!.cellId},operation,before.attempt,attempt,'applied',
        attempt.status==='won'?'win':attempt.mode==='endless'?'place':'right'),before);
    });
  }
  showRecoveryNotice():void {this.notice='recovered';this.render();}
  render():void{if(this.disposed)return;const s=this.session.state,a=s.attempt,p=getPuzzle(a.puzzleId),settings=s.settings;
    if(this.renderedLanguage!==this.language){
      this.renderedLanguage=this.language;
      localizeDocument(this.language);
      this.board.clearSelection();
    }
    const language=$<HTMLSelectElement>('language');language.value=this.language;language.disabled=this.busy;
    this.renderTime();
    $('storage-note').textContent=this.notice==='recovered'
      ?this.t('Восстановлено последнее исправное сохранение.','Restored the last good save.')
      :this.notice==='unavailable'
        ?this.t('Это поле сейчас недоступно. Выберите открытый режим или дату.','This board is unavailable. Choose an unlocked mode or date.')
        :'';
    this.ads?.updateBanner(this.ready&&!this.blocked&&!this.saveFailed&&s.meta.screen==='play'&&a.status==='playing');
    for(const [id,kind,ru,en] of [
      ['ad-hint','hint','Кредит подсказки за видео','Watch for one hint credit'],
      ['ad-continue','continue','Ещё одна жизнь за видео','Watch for one extra life'],
    ] as const){
      const button=$<HTMLButtonElement>(id);
      button.textContent=this.t(ru,en);
      button.hidden=!this.ads?.rewardAvailable(kind);
      button.disabled=this.busy||this.session.writing||this.saveFailed;
    }
    if($<HTMLDialogElement>('help-dialog').open)this.updateHelpPrice();
    const workshop = settings.theme === 'dark';
    if (document.body.classList.contains('dark') !== workshop) {
      document.body.classList.toggle('dark', workshop);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', workshop ? '#263143' : '#ffffff');
    }
    document.body.classList.toggle('calm',this.reduced());
    $('wallet').textContent=`◈ ${quantity(this.language, s.profile.coins, 'coin')}`;$('rank').textContent=this.t(`Ранг ${s.profile.rank}`, `Rank ${s.profile.rank}`);const threshold=rankThreshold(s.profile.rank),xp=$('xp');xp.style.setProperty('--xp',`${100*s.profile.xp/threshold}%`);xp.setAttribute('aria-valuemin','0');xp.setAttribute('aria-valuemax',String(threshold));xp.setAttribute('aria-valuenow',String(s.profile.xp));xp.setAttribute('aria-valuetext',this.t(`${s.profile.xp} из ${threshold} опыта`, `${s.profile.xp} of ${threshold} XP`));
    const playing = s.meta.screen === 'play';
    document.body.classList.toggle('in-play', playing);
    document.body.classList.toggle('in-hub', !playing);
    $('play-screen').hidden = !playing;
    $('play-screen').classList.toggle('is-solving', playing && a.status === 'playing' && !this.saveFailed);
    $('level').hidden = !playing;
    this.meta.render(s, this.busy || this.session.writing || this.saveFailed);
    const wallet = $('hub-wallet');
    wallet.hidden = playing;
    wallet.setAttribute('aria-label',quantity(this.language,s.profile.coins,'coin'));
    const balance = document.createElement('span');
    balance.textContent = String(s.profile.coins);
    wallet.replaceChildren(menuIcon('coin'),balance);
    const insideAlbum=s.meta.screen==='album',insideLeague=s.meta.screen==='league';
    const deepTitle=$('deep-title');
    deepTitle.hidden=!insideAlbum&&!insideLeague;
    deepTitle.textContent=insideLeague?this.t('Офлайн-лига','Offline league'):insideAlbum?this.t('Мастерская счёта','Counting Workshop'):'';
    $('home').setAttribute('aria-label',insideAlbum||insideLeague?this.t('Назад','Back'):this.t('Crossmath — на главную','Crossmath — Home'));
    const tabBar=$('root-tabs');
    tabBar.hidden=playing||s.meta.screen==='album';
    for(const screen of rootScreens) {
      const tab=$<HTMLButtonElement>(`tab-${screen}`);
      tab.disabled=this.busy||this.session.writing||this.saveFailed;
      if (s.meta.screen===screen||insideLeague&&screen==='profile') tab.setAttribute('aria-current','page');
      else tab.removeAttribute('aria-current');
    }
    if(leagueEnabled){
      let line=document.getElementById('league-result');
      if(!line){line=document.createElement('p');line.id='league-result';$('result-rewards').after(line);}
      const points=s.result?.league?.points;
      const clockBack=!!s.league?.active&&Date.now()<s.league.lastSeenAt;
      line.hidden=!!s.leagueQuarantine||!s.result?.league&&!clockBack;
      line.textContent=clockBack?this.t('Лига ждёт восстановления времени профиля','League scoring awaits profile time'):points?(s.result!.league!.weekId===s.league?.active?.id?this.t(`+${points} в лигу`,`+${points} league points`):this.t(`В лигу той недели: +${points}`,`That week’s league: +${points}`)):this.t('Это поле уже зачтено в лиге','This board already counted this week');
    }
    const pauseLabel = playing ? this.t('Пауза', 'Pause') : this.t('Настройки', 'Settings');
    $('pause-title').textContent = pauseLabel;
    $('resume').textContent = playing ? this.t('Продолжить', 'Continue') : this.t('Готово', 'Done');
    $('pause-label').textContent = pauseLabel;
    $('pause').setAttribute('aria-label', pauseLabel);
    const band = p.bucket === 'hell-short' ? this.t('Хардкор', 'Hell') : p.difficulty === 'easy' ? this.t('Легко', 'Easy')
      : p.difficulty === 'standard' ? this.t('Обычно', 'Normal')
      : p.difficulty === 'hard' ? this.t('Сложно', 'Hard') : this.t('Эксперт', 'Expert');
    const run = s.career.run;
    $('level').textContent = a.mode === 'daily' ? dailyName(this.language)
      : a.mode === 'free' ? a.freeTrack ? trackName(this.language, a.freeTrack) : this.t('Свободная игра', 'Free Play')
      : a.mode === 'endless' ? this.t(`Этап ${(a.stageId ?? 0) + 1}`, `Stage ${(a.stageId ?? 0) + 1}`)
      : this.t(`Поле ${p.campaignPosition}`, `Board ${p.campaignPosition}`);
    $('level').setAttribute('aria-description', a.mode === 'daily' ? a.dayKey ?? '' : band);
    const formattedDate = a.dayKey && new Intl.DateTimeFormat(this.language === 'ru' ? 'ru-RU' : 'en-US',
      {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(a.dayKey+'T00:00:00Z'));
    for (const id of ['pause-date','result-date']) {
      const node = $(id);
      node.hidden = !formattedDate || !playing;
      node.textContent = formattedDate || '';
    }
    const context = $('play-context');
    context.hidden = a.mode !== 'daily' && a.mode !== 'free';
    context.textContent = a.mode === 'daily' ? a.dayKey ?? '' : band;
    const move = this.busy || this.blocked ? undefined : this.moveFeedback;
    if(move)this.moveFeedback=undefined;
    this.board.update(p, a, move);
    $('lives').hidden = a.mode !== 'daily' && a.mode !== 'endless';
    const icons = $('life-icons');
    if (icons.dataset.lives !== String(a.lives)) {
      const remaining = document.createElement('span');
      remaining.textContent = '♡'.repeat(config.dailyLives - a.lives);
      icons.replaceChildren(...Array.from({length:a.lives}, () => menuIcon('life-full')),remaining);
      icons.dataset.lives = String(a.lives);
    }
    $('life-count').textContent = this.t(`Жизни ${a.lives}/3`, `Lives ${a.lives}/3`);
    $('run-status').hidden = a.mode !== 'endless';
    const freshReward = s.result?.id !== undefined && this.freshRewardId === s.result.id && !this.busy && !this.blocked;
    const countReward = freshReward && !this.reduced();
    const score = (value:number) => `${this.t('Очки', 'Score')} ${value}`;
    const stage = s.result?.stageScore;
    const runScore = s.result?.runScore;
    this.scoreReadout.update(`${this.language}:${run?.id}:${run?.score}`,run ? score(run.score) : '',
      countReward && stage && runScore !== undefined ? {from:runScore-stage,to:runScore,format:score} : undefined);
    $('run-kind').hidden = a.mode !== 'endless' || !run?.assisted;
    $('run-kind').textContent = this.t('С помощью', 'Assisted');
    $('submit').hidden=a.mode!=='endless'||a.status!=='playing';$<HTMLButtonElement>('submit').disabled=this.busy||this.blocked||this.saveFailed||Object.keys(a.placements).length!==p.tray.length||run?.status!=='active';
    const canRetry = this.session.canRestart();
    $('defeat').hidden=a.status!=='out-of-lives';$('defeat-detail').textContent=canRetry?this.t("Можно бесплатно начать эту дату заново.", "Retry this date for free."):this.t("Эта дата вышла из архива. Выберите другую дату в календаре.", "This date is outside the archive. Choose another date in the calendar.");
    if (formattedDate && a.status==='out-of-lives') $('defeat-detail').prepend(formattedDate+' · ');
    $('retry-daily').hidden = !canRetry;
    $<HTMLButtonElement>('retry-daily').disabled = this.busy || this.saveFailed;
    $('defeat-calendar').hidden = canRetry;
    $<HTMLButtonElement>('defeat-calendar').disabled = this.busy || this.saveFailed;
    if(a.mode==='endless')$('defeat-detail').textContent=this.t(`В забеге ${run?.score??0} очков. Сохраните итог или начните новый забег бесплатно.`, `Run score: ${run?.score??0}. Save your result or start a new run for free.`);$('retry-daily').textContent=a.mode==='endless'?this.t("Новый забег · бесплатно", "New run · free"):this.t("Ещё попытка · бесплатно", "Retry · free");$('finish-run').hidden=a.mode!=='endless';$<HTMLButtonElement>('finish-run').disabled=this.busy||this.saveFailed;
    const unavailable=this.busy||this.session.writing||this.blocked||this.saveFailed||a.status!=='playing';for(const id of ['help','sort'])$<HTMLButtonElement>(id).disabled=unavailable;$<HTMLButtonElement>('undo').disabled=unavailable||!a.history.length;
    const result = $('result');
    const showResult = playing && !!s.result && !this.saveFailed && (!this.busy || !result.hidden);
    const arriving = result.hidden && showResult;
    result.hidden = !showResult;
    if (!showResult) { this.meta.hideInstrumentReward(); this.meta.hideWorkshopReveal(); }
    if (showResult && s.result) {
      const reward = s.result;
      const endless = a.mode === 'endless';
      const campaignStatus = campaignResultStatus(s);
      const campaignClosed = campaignStatus !== null;
      const finished = campaignStatus === 'finish';
      const next = $<HTMLButtonElement>('next');
      const resultHome = $<HTMLButtonElement>('result-home');
      const resultMain=$<HTMLButtonElement>('result-main');
      const replay = $<HTMLButtonElement>('result-replay');
      $('result-title').textContent = finished ? this.t('Маршрут пройден', 'Campaign complete')
        : campaignStatus === 'complete' ? this.t('Кампания завершена','Campaign completed')
        : campaignStatus === 'replay' ? this.t(`Поле ${p.campaignPosition} решено повторно`, `Board ${p.campaignPosition} solved again`)
        : endless ? this.t('Этап пройден', 'Stage cleared') : this.t('Поле решено', 'Board solved');
      const coins=(value:number)=>`+${quantity(this.language,value,'coin')}`;
      const rewardText = endless ? `+${quantity(this.language, reward.stageScore ?? 0, 'point')}`
        : reward.coins ? coins(reward.coins)
        : reward.xp ? `+${reward.xp} XP`
        : campaignClosed ? '' : this.t('Решено повторно', 'Solved again');
      const showCoins = !endless && reward.coins > 0;
      this.rewardReadout.update(`${reward.id}:${this.language}`,rewardText,
        countReward && showCoins ? {from:0,to:reward.coins,format:coins} : undefined,
        showCoins ? ()=>menuIcon('coin') : undefined);
      const nextPosition=s.profile.campaignCursor+1;
      next.textContent = a.mode === 'daily' ? this.t('В календарь', 'Back to calendar')
        : endless ? this.t('Следующий этап', 'Next stage')
        : a.mode==='campaign' && !campaignClosed && nextPosition>p.campaignPosition+1
          ? this.t(`Продолжить кампанию · Поле ${nextPosition}`,`Continue campaign · Board ${nextPosition}`)
          : this.t('Следующее поле', 'Next board');
      next.hidden = campaignClosed;
      next.disabled = this.busy || (endless && run?.status !== 'active');
      resultHome.textContent = finished ? this.t('На главную', 'Home') : this.t('Пройденные поля', 'Completed boards');
      resultHome.hidden = !campaignClosed;
      resultMain.hidden=finished;
      resultMain.disabled=this.busy;
      resultHome.disabled = this.busy;
      replay.disabled = this.busy || !this.session.canRestart();
      replay.hidden = endless;
      if(freshReward)this.freshRewardId=undefined;
      const victory=this.victory?.id===reward.id ? this.victory : undefined;
      const rank=$('result-rank');
      rank.hidden=!reward.rankUps;
      rank.textContent=reward.rankUps ? this.t(`Ранг ${reward.rankLevel??s.profile.rank} ↑`,`Rank ${reward.rankLevel??s.profile.rank} ↑`) : '';
      if(arriving||freshReward)rank.classList.toggle('rank-arrived',countReward&&!!reward.rankUps);
      const quests=$('quest-progress-result');
      quests.hidden=!victory?.quests.length;
      quests.textContent=victory?.quests.length
        ? [this.t('Цели дня','Daily goals'),...victory.quests.map(goal=>`${goal.from}→${goal.to}/${goal.target}`)].join(' · ') : '';
      quests.dataset.complete=String(!!victory?.quests.some(goal=>goal.to>=goal.target));
      this.meta.renderResult(s, countReward, this.busy || this.blocked);
      if (arriving) {
        $<HTMLDetailsElement>('result-details').open = false;
        if (this.ready && !this.blocked && !a.userPaused) $('result-title').focus({preventScroll: true});
      }
    }
    for(const [id,key] of [['sound','sound'],['vibration','vibration'],['theme','theme'],['reduced','reducedMotion'],['timer-visible','timerVisible']] as const){const input=$<HTMLInputElement>(id);input.checked=key==='theme'?settings.theme==='dark':settings[key];input.disabled=this.busy;}
    for(const id of ['resume','restart','restart-yes','restart-no','explain','reveal','close-help','end-run-no','end-run-yes'])$<HTMLButtonElement>(id).disabled=this.busy;
    $<HTMLButtonElement>('restart').disabled=this.busy||s.meta.screen!=='play'||!this.session.canRestart();for(const id of ['home','home-from-pause','pause'])$<HTMLButtonElement>(id).disabled=this.busy||this.saveFailed;
    for (const id of ['keep-board','replace-board']) $<HTMLButtonElement>(id).disabled = this.busy || !!this.replacement?.recovery;
    if($<HTMLDialogElement>('help-dialog').open)this.updateHelpPrice();
    if(this.reduced())this.finishReadouts();
    this.feedback.setActive(!this.blocked);this.repaint();
    if(playing)this.playNewField(a.id);
    $('restart').textContent=a.mode==='endless'?this.t("Новый забег", "New run"):this.t("Начать заново", "Restart");$('restart-warning').textContent=a.mode==='endless'?this.t("Завершить текущий забег и начать новый? Текущий итог будет сохранён в соответствующих рекордах.", "End this run and start a new one? Your current result will count toward your record."):this.t("Начать это поле заново? Поставленные числа вернутся в лоток.", "Restart this board? The placed numbers will go back to the tray.");$('end-run').hidden=a.mode!=='endless'||run?.status==='ended'||s.meta.screen!=='play';$<HTMLButtonElement>('end-run').disabled=this.busy||this.saveFailed;
    $('mode-rules').textContent=a.mode==='endless'?this.t("Три жизни на весь забег. До кнопки «Проверить» оценка скрыта. Неверная изменённая полная раскладка снимает одну жизнь. Помощь переводит весь забег в отдельный рекорд.", "Three lives for the entire run. Select Check to submit a full board. A different incorrect layout costs a life. Using help counts toward the assisted record."):a.mode==='daily'?this.t("Три жизни на попытку. Новая ошибка снимает максимум одну жизнь за ход. Отмена, возврат и помощь жизнь не снимают. Повтор бесплатный.", "Three lives per attempt. A new error costs at most one life per move. Undo, returning numbers and help cost no lives. Retrying is free."):this.t("Числа сохранены. Ошибки не ограничены, правильные строки можно менять. Коснитесь числа и клетки в любом порядке или перетащите фишку.", "Your board is saved. There is no penalty for mistakes, and correct equations remain editable. Tap a number and a cell in either order, or drag a piece.");
  }
  onBack():boolean{if($<HTMLDialogElement>('replace-dialog').open){this.cancelReplacement();return true;}if(this.busy||this.session.writing||this.saveFailed)return true;if(this.meta.closeCard()||this.meta.closeChoice())return true;if($<HTMLDialogElement>('end-run-dialog').open)this.keepPlayingEndless();else if($<HTMLDialogElement>('help-dialog').open)this.closeHelp();else if($<HTMLDialogElement>('pause-dialog').open)this.resume();else if(this.session.state.meta.screen==='home')return false;else if(this.session.state.meta.screen==='album')this.leaveWorkshop();else if(this.session.state.meta.screen==='league')this.navigate('profile');else if(this.session.state.meta.screen!=='play')this.navigate('home');else this.openPause();return true;}
  dispose():void{this.disposed=true;this.ads?.dispose();clearInterval(this.timer);this.stopStart();this.finishReadouts();this.board.dispose();this.meta.hideWorkshopReveal();this.feedback.dispose();}
}
