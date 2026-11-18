import { config, getPuzzle, routes } from '../content/catalog';
import { rankThreshold } from '../app/model';
import { BoardView, equationText } from './board';
import { Feedback } from './feedback';
import type { GameSession } from '../app/session';
import type { BoardAction } from '../core/types';
import type { HintPlan } from '../help/logic';
import type { Settings } from '../app/model';
const $=<T extends HTMLElement=HTMLElement>(id:string):T=>document.getElementById(id) as T;
const titles=['Первый ход','Выбираем число','Общая клетка','Обратный ход','Две связи','Знакомая цепочка','Две пятёрки','Умножение','Точное деление','Пересечение','Считаем фишки','Два равенства','Связываем приёмы','Передышка','Теперь самостоятельно'];

export class GameUi {
  readonly board:BoardView;
  private readonly feedback:Feedback;
  private busy=false;private ready=false;private blocked=false;private saveFailed=false;
  private wasActive=false;private lastTime=performance.now();private elapsed=0;
  private plan:HintPlan|null=null;private helpKind:'explain'|'reveal'='explain';private helpOperation='';private helpRevision=0;
  private timer:ReturnType<typeof setInterval>;private retryAction:(()=>void)|null=null;
  constructor(readonly session:GameSession,private readonly blocker:(reason:string,blocked:boolean)=>void,private readonly repaint:()=>void){
    this.feedback=new Feedback(()=>session.state.settings);
    this.board=new BoardView($('board'),$('tray'),$('note'),this.feedback,()=>this.busy||this.blocked||this.saveFailed||!this.ready,()=>this.reduced(),(action,metadata)=>this.command(action,metadata));
    $('undo').onclick=()=>this.command({type:'Undo'});$('sort').onclick=()=>this.command({type:'SortTray'});$('return').onclick=()=>this.board.returnSelected();
    $('pause').onclick=()=>this.openPause();$('resume').onclick=()=>this.resume();$('help').onclick=()=>this.openHelp();$('close-help').onclick=()=>this.closeHelp();
    $('explain').onclick=()=>this.chooseHelp('explain');$('reveal').onclick=()=>this.chooseHelp('reveal');$('apply-help').onclick=()=>this.applyHelp();
    $('next').onclick=()=>this.run(async()=>({committed:await session.next()}),()=>{this.board.clearSelection();window.scrollTo(0,0);});
    $('restart').onclick=()=>{$('restart-confirm').hidden=false;};$('restart-no').onclick=()=>{$('restart-confirm').hidden=true;};
    $('restart-yes').onclick=()=>this.run(async()=>({committed:await session.restart()}),()=>{$<HTMLDialogElement>('pause-dialog').close();this.blocker('user',false);$('restart-confirm').hidden=true;window.scrollTo(0,0);});
    $<HTMLDialogElement>('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();this.resume();});$<HTMLDialogElement>('help-dialog').addEventListener('cancel',e=>{e.preventDefault();this.closeHelp();});
    for(const [id,key] of [['sound','sound'],['vibration','vibration'],['theme','theme'],['reduced','reducedMotion']] as const){$<HTMLInputElement>(id).onchange=()=>{const input=$<HTMLInputElement>(id);const value=key==='theme'?(input.checked?'dark':'light'):input.checked;this.run(async time=>{await session.update({[key]:value} as Partial<Settings>,true,time);return {committed:true};});};}
    $('retry').onclick=()=>this.retryAction?.();$('reload').onclick=()=>location.reload();
    this.timer=setInterval(()=>{this.tick();if(this.elapsed>=10)this.checkpoint();},2000);this.render();
  }
  private reduced():boolean{return this.session.state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private tick():void{const now=performance.now();if(this.wasActive)this.elapsed+=(now-this.lastTime)/1000;this.lastTime=now;this.wasActive=this.ready&&!this.blocked&&!this.saveFailed&&!this.session.state.attempt.userPaused&&this.session.state.attempt.status==='playing';}
  setReady():void{this.ready=true;this.tick();this.render();if(this.session.state.attempt.userPaused){this.blocker('user',true);$<HTMLDialogElement>('pause-dialog').showModal();}}
  activityChanged(blocked:boolean):void{this.tick();this.blocked=blocked;this.tick();if(blocked){this.board.cancel();this.feedback.setActive(false);queueMicrotask(()=>this.checkpoint());}else this.feedback.setActive(true);this.render();}
  private checkpoint():void{if(this.busy||!this.ready||this.saveFailed||this.elapsed<=0||this.session.state.attempt.status!=='playing')return;this.run(async time=>({committed:await this.session.checkpoint(time)}));}
  private run(operation:(elapsed:number)=>Promise<{committed:boolean}>,after:()=>void=()=>{}):void{
    if(this.busy)return;this.tick();const time=this.elapsed;this.busy=true;this.render();this.retryAction=()=>this.run(operation,after);
    void operation(time).then(result=>{if(result.committed)this.elapsed=Math.max(0,this.elapsed-time);this.saveFailed=false;$('save-error').hidden=true;this.retryAction=null;after();}).catch(()=>{
      this.saveFailed=true;this.board.cancel();
      for(const id of ['help-dialog','pause-dialog']){const dialog=$<HTMLDialogElement>(id);if(dialog.open)dialog.close();}
      this.blocker('modal',false);this.blocker('user',false);
      $('save-error-text').textContent='Не удалось подтвердить запись. Сохранённые данные сохранены. Повторите действие или восстановите сохранение перед продолжением.';$('save-error').hidden=false;$('save-error').scrollIntoView({block:'nearest'});
    }).finally(()=>{this.busy=false;this.tick();this.render();if(!this.saveFailed&&this.session.state.attempt.userPaused&&!$<HTMLDialogElement>('pause-dialog').open){this.blocker('user',true);$<HTMLDialogElement>('pause-dialog').showModal();}if(this.blocked&&this.elapsed>0&&!this.retryAction)this.checkpoint();});
  }
  private command(action:BoardAction,metadata?:{commandId:string;expectedRevision:number}):void{
    if(this.blocked||this.busy||this.saveFailed)return;this.board.cancel();this.board.clearSelection();
    const identity=metadata??{commandId:crypto.randomUUID(),expectedRevision:this.session.state.attempt.boardRevision};let cue:'place'|'right'|'wrong'|'win'|'none'='none';
    this.run(async time=>{const result=await this.session.command(action,time,identity);cue=result.cue;return {committed:result.outcome==='applied'};},()=>{if(cue!=='none')this.feedback.cue(cue);});
  }
  private openPause():void{if(this.busy||this.saveFailed||$<HTMLDialogElement>('pause-dialog').open)return;this.board.cancel();this.tick();this.blocker('user',true);$<HTMLDialogElement>('pause-dialog').showModal();this.run(async time=>{await this.session.update({},true,time);return {committed:true};});}
  private resume():void{if(this.busy)return;this.run(async time=>{await this.session.update({},false,time);return {committed:true};},()=>{$<HTMLDialogElement>('pause-dialog').close();this.blocker('user',false);$('restart-confirm').hidden=true;});}
  private openHelp():void{if(this.busy||this.saveFailed||this.session.state.attempt.status!=='playing')return;this.board.cancel();this.tick();this.blocker('modal',true);this.plan=null;$('apply-help').setAttribute('disabled','');$('help-description').textContent='Выберите вид помощи. Числа изменятся только после подтверждения.';this.helpOperation=crypto.randomUUID();this.helpRevision=this.session.state.attempt.boardRevision;
    const p=this.session.state.profile;$('help-cost').textContent=`Стоимость: ${p.hintCredits>0?'1 кредит':config.hintCostCoins+' монет'}. У вас ${p.coins} монет и ${p.hintCredits} кредитов.`;
    for(const id of ['explain','reveal'])$(id).classList.remove('chosen');$<HTMLDialogElement>('help-dialog').showModal();
  }
  private chooseHelp(kind:'explain'|'reveal'):void{this.helpKind=kind;this.plan=this.session.prepareHelp(kind,this.board.selectedCell());$('explain').classList.toggle('chosen',kind==='explain');$('reveal').classList.toggle('chosen',kind==='reveal');
    $('help-description').textContent=this.plan?kind==='explain'?'Применим доказуемый ход и покажем, как его получить из равенств и лотка.':'Покажем правильное число. Мешающие неверные фишки вернутся в лоток.':'Сейчас нет доказуемого хода из этой расстановки. Можно исправить гипотезу или отдельно показать число.';
    $<HTMLButtonElement>('apply-help').disabled=!this.plan;$('apply-help').textContent=kind==='explain'?'Объяснить ход':'Показать число';
  }
  private closeHelp():void{if(this.busy)return;$<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);}
  private applyHelp():void{const plan=this.plan;if(this.busy||!plan)return;let applied=false;
    this.run(async time=>{const revision=this.session.state.revision,result=await this.session.help(this.helpKind,this.helpOperation,this.helpRevision,plan,time);applied=result.outcome==='applied';
      if(!applied)$('help-description').textContent=result.outcome==='insufficient_resource'?'Не хватает монет. Продолжать решать и начинать поле заново можно бесплатно.':'Поле изменилось или этот ход больше недоступен. Закройте помощь и попробуйте снова.';return {committed:this.session.state.revision!==revision};
    },()=>{if(!applied)return;$<HTMLDialogElement>('help-dialog').close();this.blocker('modal',false);this.board.update(getPuzzle(this.session.state.attempt.puzzleId),this.session.state.attempt);
      const assignment=plan.assignments[0]!,p=getPuzzle(this.session.state.attempt.puzzleId);const text=plan.kind==='reveal'?`Показано число ${assignment.value}.${plan.returns.length?' Мешающие фишки возвращены в лоток.':''}`:plan.rule==='intersection'?`Общая клетка: ${assignment.evidence.map(e=>'{'+e.candidates.join(', ')+'}').join(' и ')}. В обоих наборах есть только ${assignment.value}.`:`${equationText(p,this.session.state.attempt,assignment.evidence[0]!.equationIndex)}. Подходящее число — ${assignment.value}.`;
      this.board.explain(text,assignment.evidence.map(e=>e.equationIndex));this.feedback.cue(this.session.state.attempt.status==='won'?'win':'right');
    });
  }
  render():void{const s=this.session.state,a=s.attempt,p=getPuzzle(a.puzzleId),settings=s.settings;
    document.body.classList.toggle('dark',settings.theme==='dark');document.body.classList.toggle('calm',this.reduced());
    $('wallet').textContent=`◈ ${s.profile.coins} монет`;$('rank').textContent=`Ранг ${s.profile.rank}`;const threshold=rankThreshold(s.profile.rank),xp=$('xp');xp.style.setProperty('--xp',`${100*s.profile.xp/threshold}%`);xp.setAttribute('aria-valuemin','0');xp.setAttribute('aria-valuemax',String(threshold));xp.setAttribute('aria-valuenow',String(s.profile.xp));xp.setAttribute('aria-valuetext',`${s.profile.xp} из ${threshold} опыта`);
    $('level').textContent=`ПОЛЕ ${p.campaignPosition} · ${p.difficulty==='easy'?'ЛЕГКО':p.difficulty==='standard'?'ОБЫЧНО':p.difficulty==='hard'?'СЛОЖНО':'ЭКСПЕРТ'}`;
    $('title').textContent=titles[p.campaignPosition-1]??'Найдите все связи';this.board.update(p,a);
    const unavailable=this.busy||this.blocked||this.saveFailed||a.status!=='playing';for(const id of ['help','sort'])$<HTMLButtonElement>(id).disabled=unavailable;$<HTMLButtonElement>('undo').disabled=unavailable||!a.history.length;
    $('result').hidden=!s.result;
    if(s.result){const r=s.result;$('result-title').textContent=s.profile.campaignCursor===routes.campaignSequence.length?'Маршрут пройден':'Поле решено';$('result-rewards').textContent=r.first?`+${r.coins} монет · +${r.xp} XP`:'Это поле уже решено. Первая награда сохранена.';$('result-detail').textContent=r.cardCoins?'Собран прибор мастерской!':r.fragments?'Получена новая деталь мастерской.':r.rankUps?`Новый ранг: ${s.profile.rank}.`:r.first?'Все равенства сходятся. Можно двигаться дальше.':'Можно продолжить маршрут.';$<HTMLButtonElement>('next').disabled=this.busy||this.saveFailed||s.profile.campaignCursor===routes.campaignSequence.length;}
    for(const [id,key] of [['sound','sound'],['vibration','vibration'],['theme','theme'],['reduced','reducedMotion']] as const){const input=$<HTMLInputElement>(id);input.checked=key==='theme'?settings.theme==='dark':settings[key];input.disabled=this.busy;}
    for(const id of ['resume','restart','restart-yes','restart-no','explain','reveal','close-help'])$<HTMLButtonElement>(id).disabled=this.busy;
    $<HTMLButtonElement>('apply-help').disabled=this.busy||!this.plan;this.feedback.setActive(!this.blocked);this.repaint();
  }
  onBack():boolean{if(this.busy||this.saveFailed)return true;if($<HTMLDialogElement>('help-dialog').open)this.closeHelp();else if($<HTMLDialogElement>('pause-dialog').open)this.resume();else this.openPause();return true;}
  dispose():void{clearInterval(this.timer);this.board.dispose();this.feedback.dispose();}
}
