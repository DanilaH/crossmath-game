import { AdsController } from '../platform/ads';
import type { AdsProvider } from '../platform/ads';
import { localize, localizeDocument, quantity, trackName } from './locale';
import type { Language } from './locale';
import { config, getPuzzle, routes } from '../content/catalog';
import { rankThreshold } from '../app/model';
import { BoardView, equationText } from './board';
import type { MoveFeedback } from './board';
import { Feedback } from './feedback';
import type { GameSession, OpenOutcome } from '../app/session';
import { MetaView } from './metaView';
import type { MetaScreen, Offer } from '../meta/types';
import { RecoveryRequired } from '../app/saveRepository';
import type { FreeTrack } from '../content/rotation';
import type { Mode } from '../core/types';
import type { BoardAction } from '../core/types';
import type { HintPlan } from '../help/logic';
import type { Settings } from '../app/model';
const $=<T extends HTMLElement=HTMLElement>(id:string):T=>document.getElementById(id) as T;
type OpenOperation = (replace: boolean, elapsed: number) => Promise<OpenOutcome>;
interface Replacement { operation: OpenOperation; triggerId: string; recovery: boolean }
export class GameUi {
  private disposed=false;
  private readonly ads:AdsController|undefined;
  private notice:'recovered'|'unavailable'|undefined;
  private replacement: Replacement | undefined;
  private renderedLanguage?: Language;
  private moveFeedback: MoveFeedback | undefined;
  private get language(): Language { return this.session.state.settings.language; }
  private t(ru: string, en: string): string { return localize(this.language, ru, en); }
  readonly board:BoardView;
  private readonly feedback:Feedback;
  private readonly meta:MetaView;private navigationBlocked=false;
  private busy=false;private ready=false;private blocked=false;private saveFailed=false;
  private wasActive=false;private lastTime=performance.now();private elapsed=0;
  private plan:HintPlan|null=null;private helpKind:'explain'|'reveal'='explain';private helpOperation='';private helpRevision=0;
  private timer:ReturnType<typeof setInterval>;private retryAction:(()=>void)|null=null;
  constructor(readonly session:GameSession,private readonly blocker:(reason:string,blocked:boolean)=>void,private readonly repaint:()=>void,adsProvider?:AdsProvider){
    this.ads=adsProvider?new AdsController(session,adsProvider,value=>this.blocker('ad',value),()=>this.render()):undefined;
    this.feedback=new Feedback(()=>session.state.settings);
    this.board=new BoardView($('board'),$('tray'),$('note'),this.feedback,()=>this.busy||session.writing||this.blocked||this.saveFailed||!this.ready,()=>this.reduced(),(action,metadata)=>this.command(action,metadata),()=>this.language);
    this.meta=new MetaView($('hub'),{navigate:screen=>this.navigate(screen),campaign:()=>this.open((_,time)=>session.openCampaign(time),'campaign'),free:track=>this.openFree(track),daily:day=>this.open((_,time)=>session.openDaily(day,time),'daily'),endless:()=>this.open((_,time)=>session.openEndless(time),'endless'),offer:offer=>this.openOffer(offer),quest:index=>{const offer=session.questOffer(index);if(offer)this.openOffer(offer,true);},blocking:value=>this.blocker('modal',value)});
    $('submit').onclick=()=>this.command({type:'SubmitEndless'});for(const id of ['end-run','finish-run'])$(id).onclick=()=>this.run(async time=>({committed:await session.endRun(time)}),()=>this.leaveModal());
    for(const id of ['home','home-from-pause','result-home'])$(id).onclick=()=>this.navigate('home');
    $('first-fragment').onclick = () => this.meta.openFirstFragment(session.state);
    $('rank').onclick=()=>{if(!this.busy&&!this.saveFailed)this.meta.openRank(session.state);};
    for(const id of ['retry-daily','result-replay'])$(id).onclick=()=>this.run(async()=>({committed:await session.restart()}),()=>{this.board.clearSelection();window.scrollTo(0,0);});
    $('undo').onclick=()=>this.command({type:'Undo'});$('sort').onclick=()=>this.command({type:'SortTray'});$('return').onclick=()=>this.board.returnSelected();
    $('pause').onclick=()=>this.openPause();$('resume').onclick=()=>this.resume();$('help').onclick=()=>this.openHelp();$('close-help').onclick=()=>this.closeHelp();
    $('explain').onclick=()=>this.chooseHelp('explain');$('reveal').onclick=()=>this.chooseHelp('reveal');$('apply-help').onclick=()=>this.applyHelp();
    $('ad-hint').onclick=()=>this.run(time=>this.ads!.reward('hint',time));
    $('ad-continue').onclick=()=>this.run(time=>this.ads!.reward('continue',time));
    $('next').onclick=()=>this.run(async()=>{
      await this.ads?.beforeNext();
      await session.waitForWrite();
      if(this.disposed)return {committed:false};
      return {committed:await session.next()};
    },()=>{this.board.clearSelection();window.scrollTo(0,0);requestAnimationFrame(()=>$('level').focus({preventScroll:true}));});
    $('restart').onclick=()=>{$('restart-confirm').hidden=false;};$('restart-no').onclick=()=>{$('restart-confirm').hidden=true;};
    $('restart-yes').onclick=()=>this.run(async()=>({committed:await session.restart()}),()=>{$<HTMLDialogElement>('pause-dialog').close();this.blocker('user',false);$('restart-confirm').hidden=true;window.scrollTo(0,0);});
    $<HTMLDialogElement>('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});$<HTMLDialogElement>('help-dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeHelp();});
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
    this.timer=setInterval(()=>{this.tick();this.renderTime();if(this.ready)this.ads?.refresh();if(!this.busy&&this.ready&&!this.saveFailed&&session.hasDayChange())this.run(async()=>({committed:await session.refreshDay()}));else if(this.elapsed>=10)this.checkpoint();},2000);this.render();
  }
  private leaveModal():void{for(const id of ['pause-dialog','help-dialog']){const dialog=$<HTMLDialogElement>(id);if(dialog.open)dialog.close();}this.blocker('user',false);this.blocker('modal',false);$('restart-confirm').hidden=true;this.board.clearSelection();window.scrollTo(0,0);}
  private navigate(screen:MetaScreen):void{this.run(async time=>({committed:await this.session.navigate(screen,time)}),()=>this.leaveModal());}
  private openFree(track: FreeTrack): void {
    this.open((replace,time) => this.session.openFreeTrack(track,replace,time), 'free');
  }
  private openOffer(offer: Offer, repeatCompleted = false): void {
    this.open((replace,time) => this.session.openOffer(offer,replace,time,repeatCompleted), offer.mode);
  }
  private open(operation: OpenOperation, mode: Mode): void {
    const triggerId = document.activeElement?.id || 'modes-open';
    let result: OpenOutcome;
    this.run(async time => {
      result = await operation(false,time);
      return {committed: result === 'opened'};
    }, () => {
      if (result === 'confirm_replace') this.requestReplacement(operation, mode, triggerId);
      else if (result === 'opened') this.leaveModal();
      else this.notice = 'unavailable';
    });
  }
  private requestReplacement(operation: OpenOperation, mode: Mode, triggerId: string): void {
    this.replacement = {operation, triggerId, recovery:false};
    const copy = mode === 'free'
      ? [this.t('Начать другую свободную игру?', 'Start another Free Play board?'), this.t('Текущая расстановка в свободной игре будет потеряна.', 'Your current Free Play board will be reset.')]
      : [this.t('Начать другое поле?', 'Start another board?'), this.t('Числа в незаконченной партии вернутся в лоток.', 'The numbers on your unfinished board will return to the tray.')];
    $('replace-title').textContent = copy[0]!;
    $('replace-description').textContent = copy[1]!;
    $('replace-error').hidden = $('replace-reload').hidden = true;
    $('replace-board').textContent = this.t('Начать другую', 'Start another');
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
    if (restoreFocus) requestAnimationFrame(() => ($(replacement.triggerId) ?? $('modes-open'))?.focus({preventScroll:true}));
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
    const a=this.session.state.attempt,node=$('play-time');
    node.hidden=!this.session.state.settings.timerVisible||a.mode==='daily'||a.mode==='endless';
    if(node.hidden)return;
    const seconds=Math.floor(a.elapsedPlaying+this.elapsed);
    node.textContent=this.t("Время", "Time")+" "+Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
  }
  private tick():void{const now=performance.now();if(this.wasActive)this.elapsed+=(now-this.lastTime)/1000;this.lastTime=now;this.wasActive=this.ready&&!this.blocked&&!this.saveFailed&&this.session.state.meta.screen==='play'&&!this.session.state.attempt.userPaused&&this.session.state.attempt.status==='playing';}
  setReady():void{this.ready=true;this.ads?.start();this.syncNavigation();this.tick();this.render();if(this.session.state.meta.screen==='play'&&this.session.state.attempt.userPaused){this.showPause();}}
  activityChanged(blocked:boolean):void{this.tick();this.blocked=blocked;this.tick();if(blocked){this.board.suspend();this.feedback.setActive(false);queueMicrotask(()=>this.checkpoint());}else this.feedback.setActive(true);this.render();}
  private checkpoint():void{if(this.busy||!this.ready||this.saveFailed||this.elapsed<=0||this.session.state.attempt.status!=='playing')return;this.run(async time=>({committed:await this.session.checkpoint(time)}));}
  private run(operation:(elapsed:number)=>Promise<{committed:boolean}>,after:()=>void=()=>{},onFailure?:(error:unknown)=>void):void{
    if(this.busy||this.session.writing)return;this.tick();const time=this.elapsed;this.busy=true;this.render();this.retryAction=()=>this.run(operation,after,onFailure);
    void operation(time).then(result=>{if(result.committed)this.elapsed=Math.max(0,this.elapsed-time);this.saveFailed=false;$('save-error').hidden=true;this.retryAction=null;after();}).catch(error=>{
      if (onFailure) {this.retryAction=null;onFailure(error);return;}
      this.saveFailed=true;this.board.cancel();
      for(const id of ['help-dialog','pause-dialog']){const dialog=$<HTMLDialogElement>(id);if(dialog.open)dialog.close();}
      this.blocker('modal',false);this.blocker('user',false);
      $('save-error-text').textContent=this.t("Не удалось подтвердить запись. Сохранённые данные сохранены. Повторите действие или восстановите сохранение перед продолжением.", "The save could not be confirmed. Retry the action or reload your saved game.");$('save-error').hidden=false;$('save-error').scrollIntoView({block:'nearest'});
    }).finally(()=>{this.busy=false;this.syncNavigation();this.tick();this.render();if(!this.saveFailed&&this.session.state.meta.screen==='play'&&this.session.state.attempt.userPaused&&!$<HTMLDialogElement>('pause-dialog').open){this.showPause();}if(this.blocked&&this.elapsed>0&&!this.retryAction)this.checkpoint();});
  }
  private command(action:BoardAction,metadata?:{commandId:string;expectedRevision:number}):void{
    if(this.blocked||this.busy||this.session.writing||this.saveFailed)return;this.board.cancel();this.board.clearSelection();
    const identity = metadata ?? {commandId:crypto.randomUUID(), expectedRevision:this.session.state.attempt.boardRevision};
    const cell = action.type === 'PlaceFromTray' ? action.cellId : action.type === 'MoveCell' ? action.to : undefined;
    let committedFeedback: MoveFeedback | undefined;
    this.run(async time => {
      const result = await this.session.command(action, time, identity);
      committedFeedback = result.outcome === 'applied' && result.cue !== 'none' ? {cue:result.cue, cell} : undefined;
      return {committed:result.outcome === 'applied'};
    }, () => { this.moveFeedback = committedFeedback; });
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
    this.plan = null;
    $('help-description').hidden = true;
    $<HTMLButtonElement>('apply-help').disabled = true;
    this.helpOperation = crypto.randomUUID();
    this.helpRevision = this.session.state.attempt.boardRevision;
    for (const id of ['explain','reveal']) {
      $(id).classList.remove('chosen');
      $(id).setAttribute('aria-pressed','false');
    }
    this.updateHelpPrice();
    this.blocker('modal',true);
    $<HTMLDialogElement>('help-dialog').showModal();
  }

  private updateHelpPrice(): void {
    const { coins, hintCredits } = this.session.state.profile;
    const balance = quantity(this.language, coins, 'coin');
    const credits = quantity(this.language, hintCredits, 'credit');
    const price = hintCredits > 0 ? quantity(this.language, 1, 'credit') : quantity(this.language, config.hintCostCoins, 'coin');
    $('help-cost').textContent = this.t(`Стоимость ${price} · У вас ${balance} и ${credits}`, `Cost ${price} · Balance ${balance} and ${credits}`);
    $('apply-help').textContent = this.plan ? this.t(`Применить · ${price}`, `Apply · ${price}`) : this.t('Применить', 'Apply');
  }

  private chooseHelp(kind:'explain'|'reveal'):void{
    this.helpKind=kind;
    this.plan=this.session.prepareHelp(kind,this.board.selectedCell());
    for (const choice of ['explain','reveal']) {
      $(choice).classList.toggle('chosen',choice===kind);
      $(choice).setAttribute('aria-pressed',String(choice===kind));
    }
    $('help-description').hidden = false;
    $('help-description').textContent=this.plan?kind==='explain'?this.t("Применим доказуемый ход и покажем, как его получить из равенств и лотка.", "Place a number and see why it follows from the equations and the tray."):this.t("Покажем правильное число. Мешающие неверные фишки вернутся в лоток.", "Reveal the correct number. Any pieces in the way go back to the tray."):this.t("Сейчас нет доказуемого хода из этой расстановки. Можно исправить гипотезу или отдельно показать число.", "No step can be proved from this layout. Change a placement or reveal a number.");
    $<HTMLButtonElement>('apply-help').disabled=!this.plan;
    this.updateHelpPrice();
  }
  private closeHelp():void{if(this.busy)return;$<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);}
  private applyHelp():void{const plan=this.plan;if(this.busy||!plan)return;let applied=false;
    this.run(async time=>{const revision=this.session.state.revision,result=await this.session.help(this.helpKind,this.helpOperation,this.helpRevision,plan,time);applied=result.outcome==='applied';
      if(!applied)$('help-description').textContent=result.outcome==='insufficient_resource'?this.t("Не хватает монет. Продолжать решать и начинать поле заново можно бесплатно.", "You need more coins for help. Keep playing or restart for free."):this.t("Поле изменилось или этот ход больше недоступен. Закройте помощь и попробуйте снова.", "The board changed or this move is no longer available. Close Help and try again.");return {committed:this.session.state.revision!==revision};
    },()=>{if(!applied)return;$<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);this.board.update(getPuzzle(this.session.state.attempt.puzzleId),this.session.state.attempt);
      const assignment=plan.assignments[0]!,p=getPuzzle(this.session.state.attempt.puzzleId);
      const candidateSets=assignment.evidence.map(e=>'{'+e.candidates.join(', ')+'}').join(this.t(" и ", " and "));
      const expression=equationText(p,this.session.state.attempt,assignment.evidence[0]?.equationIndex ?? 0);
      const value=assignment.value;
      const text=plan.kind==='reveal'
        ?this.t(`Показано число ${value}.`,`Revealed ${value}.`)+(plan.returns.length?this.t(" Мешающие фишки возвращены в лоток.", " Conflicting pieces returned to the tray."):"")
        :plan.rule==='intersection'
          ?this.t(`Общая клетка: ${candidateSets}. В обоих наборах есть только ${value}.`,`Shared cell: ${candidateSets}. Only ${value} appears in both sets.`)
          :this.t(`${expression}. Подходящее число — ${value}.`,`${expression}. The missing number is ${value}.`);
      this.board.explain(text,assignment.evidence.map(e=>e.equationIndex));this.feedback.cue(this.session.state.attempt.status==='won'?'win':this.session.state.attempt.mode==='endless'?'place':'right');
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
    document.body.classList.toggle('dark',settings.theme==='dark');document.body.classList.toggle('calm',this.reduced());
    $('wallet').textContent=`◈ ${quantity(this.language, s.profile.coins, 'coin')}`;$('rank').textContent=this.t(`Ранг ${s.profile.rank}`, `Rank ${s.profile.rank}`);const threshold=rankThreshold(s.profile.rank),xp=$('xp');xp.style.setProperty('--xp',`${100*s.profile.xp/threshold}%`);xp.setAttribute('aria-valuemin','0');xp.setAttribute('aria-valuemax',String(threshold));xp.setAttribute('aria-valuenow',String(s.profile.xp));xp.setAttribute('aria-valuetext',this.t(`${s.profile.xp} из ${threshold} опыта`, `${s.profile.xp} of ${threshold} XP`));
    const playing = s.meta.screen === 'play';
    document.body.classList.toggle('in-play', playing);
    document.body.classList.toggle('in-hub', !playing);
    $('play-screen').hidden = !playing;
    $('level').hidden = !playing;
    this.meta.render(s, this.busy || this.session.writing || this.saveFailed);
    const pauseLabel = playing ? this.t('Пауза', 'Pause') : this.t('Настройки', 'Settings');
    $('pause-title').textContent = pauseLabel;
    $('resume').textContent = playing ? this.t('Продолжить', 'Continue') : this.t('Готово', 'Done');
    $('pause-label').textContent = pauseLabel;
    $('pause').setAttribute('aria-label', pauseLabel);
    const band = p.bucket === 'hell-short' ? this.t('Хардкор', 'Hell') : p.difficulty === 'easy' ? this.t('Легко', 'Easy')
      : p.difficulty === 'standard' ? this.t('Обычно', 'Normal')
      : p.difficulty === 'hard' ? this.t('Сложно', 'Hard') : this.t('Эксперт', 'Expert');
    const run = s.career.run;
    $('level').textContent = a.mode === 'daily' ? this.t('Задача дня', 'Daily challenge')
      : a.mode === 'free' ? a.freeTrack ? trackName(this.language, a.freeTrack) : this.t('Свободная игра', 'Free Play')
      : a.mode === 'endless' ? this.t(`Этап ${(a.stageId ?? 0) + 1}`, `Stage ${(a.stageId ?? 0) + 1}`)
      : this.t(`Поле ${p.campaignPosition}`, `Board ${p.campaignPosition}`);
    $('level').setAttribute('aria-description', a.mode === 'daily' ? a.dayKey ?? '' : band);
    const context = $('play-context');
    context.hidden = a.mode !== 'daily' && a.mode !== 'free';
    context.textContent = a.mode === 'daily' ? a.dayKey ?? '' : band;
    const move = this.moveFeedback;
    this.moveFeedback = undefined;
    this.board.update(p, a, move);
    $('lives').hidden = a.mode !== 'daily' && a.mode !== 'endless';
    $('life-icons').textContent = '♥'.repeat(a.lives) + '♡'.repeat(3 - a.lives);
    $('life-count').textContent = this.t(`Жизни ${a.lives}/3`, `Lives ${a.lives}/3`);
    $('run-status').hidden = a.mode !== 'endless';
    $('run-status').textContent = run ? `${this.t('Очки', 'Score')} ${run.score}` : '';
    $('run-kind').hidden = a.mode !== 'endless' || !run?.assisted;
    $('run-kind').textContent = this.t('С помощью', 'Assisted');
    $('submit').hidden=a.mode!=='endless'||a.status!=='playing';$<HTMLButtonElement>('submit').disabled=this.busy||this.blocked||this.saveFailed||Object.keys(a.placements).length!==p.tray.length||run?.status!=='active';
    $('defeat').hidden=a.status!=='out-of-lives';$('defeat-detail').textContent=this.session.canRestart()?this.t("Можно бесплатно начать эту дату заново.", "Retry this date for free."):this.t("Эта дата вышла из архива. Выберите другую дату в календаре.", "This date is outside the archive. Choose another date in the calendar.");$<HTMLButtonElement>('retry-daily').disabled=this.busy||this.saveFailed||!this.session.canRestart();
    if(a.mode==='endless')$('defeat-detail').textContent=this.t(`В забеге ${run?.score??0} очков. Сохраните итог или начните новый забег бесплатно.`, `Run score: ${run?.score??0}. Save your result or start a new run for free.`);$('retry-daily').textContent=a.mode==='endless'?this.t("Новый забег · бесплатно", "New run · free"):this.t("Ещё попытка · бесплатно", "Retry · free");$('finish-run').hidden=a.mode!=='endless';$<HTMLButtonElement>('finish-run').disabled=this.busy||this.saveFailed;
    const unavailable=this.busy||this.session.writing||this.blocked||this.saveFailed||a.status!=='playing';for(const id of ['help','sort'])$<HTMLButtonElement>(id).disabled=unavailable;$<HTMLButtonElement>('undo').disabled=unavailable||!a.history.length;
    const result = $('result');
    const showResult = playing && !!s.result && !this.saveFailed;
    const arriving = result.hidden && showResult;
    result.hidden = !showResult;
    if (!showResult) this.meta.hideFirstFragment();
    if (showResult && s.result) {
      const reward = s.result;
      const endless = a.mode === 'endless';
      const finished = a.mode === 'campaign' && s.profile.campaignCursor === routes.campaignSequence.length;
      const next = $<HTMLButtonElement>('next');
      const resultHome = $<HTMLButtonElement>('result-home');
      const replay = $<HTMLButtonElement>('result-replay');
      $('result-title').textContent = finished ? this.t('Маршрут пройден', 'Campaign complete')
        : endless ? this.t('Этап пройден', 'Stage cleared') : this.t('Поле решено', 'Board solved');
      $('result-rewards').textContent = endless ? `+${quantity(this.language, reward.stageScore ?? 0, 'point')}`
        : reward.coins ? `+${quantity(this.language, reward.coins, 'coin')}`
        : reward.xp ? `+${reward.xp} XP`
        : this.t('Решено повторно', 'Solved again');
      next.textContent = a.mode === 'daily' ? this.t('В календарь', 'Back to calendar')
        : endless ? this.t('Следующий этап', 'Next stage') : this.t('Следующее поле', 'Next board');
      next.hidden = finished;
      next.disabled = this.busy || (endless && run?.status !== 'active');
      resultHome.hidden = !finished;
      resultHome.disabled = this.busy;
      replay.disabled = this.busy || !this.session.canRestart();
      replay.hidden = endless;
      this.meta.renderResult(s, arriving && move?.cue === 'win' && !this.reduced(), this.busy || this.blocked);
      if (arriving) {
        $<HTMLDetailsElement>('result-details').open = false;
        if (this.ready && !this.blocked && !a.userPaused) $('result-title').focus({preventScroll: true});
      }
    }
    for(const [id,key] of [['sound','sound'],['vibration','vibration'],['theme','theme'],['reduced','reducedMotion'],['timer-visible','timerVisible']] as const){const input=$<HTMLInputElement>(id);input.checked=key==='theme'?settings.theme==='dark':settings[key];input.disabled=this.busy;}
    for(const id of ['resume','restart','restart-yes','restart-no','explain','reveal','close-help'])$<HTMLButtonElement>(id).disabled=this.busy;
    $<HTMLButtonElement>('restart').disabled=this.busy||s.meta.screen!=='play'||!this.session.canRestart();for(const id of ['home','home-from-pause','pause'])$<HTMLButtonElement>(id).disabled=this.busy||this.saveFailed;
    for (const id of ['keep-board','replace-board']) $<HTMLButtonElement>(id).disabled = this.busy || !!this.replacement?.recovery;
    $<HTMLButtonElement>('apply-help').disabled=this.busy||!this.plan;this.feedback.setActive(!this.blocked);this.repaint();
    $('restart').textContent=a.mode==='endless'?this.t("Новый забег", "New run"):this.t("Начать заново", "Restart");$('restart-warning').textContent=a.mode==='endless'?this.t("Завершить текущий забег и начать новый? Текущий итог будет сохранён в соответствующих рекордах.", "End this run and start a new one? Your current result will count toward your record."):this.t("Начать это поле заново? Поставленные числа вернутся в лоток.", "Restart this board? The placed numbers will go back to the tray.");$('end-run').hidden=a.mode!=='endless'||run?.status==='ended'||s.meta.screen!=='play';$<HTMLButtonElement>('end-run').disabled=this.busy||this.saveFailed;
    $('mode-rules').textContent=a.mode==='endless'?this.t("Три жизни на весь забег. До кнопки «Проверить» оценка скрыта. Неверная изменённая полная раскладка снимает одну жизнь. Помощь переводит весь забег в отдельный рекорд.", "Three lives for the entire run. Select Check to submit a full board. A different incorrect layout costs a life. Using help counts toward the assisted record."):a.mode==='daily'?this.t("Три жизни на попытку. Новая ошибка снимает максимум одну жизнь за ход. Отмена, возврат и помощь жизнь не снимают. Повтор бесплатный.", "Three lives per attempt. A new error costs at most one life per move. Undo, returning numbers and help cost no lives. Retrying is free."):this.t("Числа сохранены. Ошибки не ограничены, правильные строки можно менять. Коснитесь числа и клетки в любом порядке или перетащите фишку.", "Your board is saved. There is no penalty for mistakes, and correct equations remain editable. Tap a number and a cell in either order, or drag a piece.");
  }
  onBack():boolean{if($<HTMLDialogElement>('replace-dialog').open){this.cancelReplacement();return true;}if(this.busy||this.session.writing||this.saveFailed)return true;if(this.meta.closeCard()||this.meta.closeModes())return true;if($<HTMLDialogElement>('help-dialog').open)this.closeHelp();else if($<HTMLDialogElement>('pause-dialog').open)this.resume();else if(this.session.state.meta.screen==='home')return false;else if(this.session.state.meta.screen!=='play')this.navigate('home');else this.openPause();return true;}
  dispose():void{this.disposed=true;this.ads?.dispose();clearInterval(this.timer);this.board.dispose();this.feedback.dispose();}
}
