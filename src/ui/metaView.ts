import { challengeUnlockWins, freeTracks } from '../content/rotation';
import type { FreeTrack } from '../content/rotation';
import { localize, operatorGlyph, trackName } from './locale';
import type { Language } from './locale';
import { getTierProgress } from '@danilah/mini-games-kit/core';
import { campaignSequence, config, getPuzzle, routes } from '../content/catalog';
import { campaignContinuation, storedSlot } from '../app/session';
import { goals } from '../meta/missions';
import { calendarDayIndex, dateAvailable, dayFromIndex, profileDay } from '../meta/calendar';
import type { Save } from '../app/model';
import { rankThreshold } from '../app/model';
import { achievementValue, recordVersion } from '../meta/career';
import { cellValue } from '../core/types';
import type { Attempt, Puzzle } from '../core/types';
import type { MetaScreen, Offer } from '../meta/types';

const artwork=import.meta.glob('../../docs/spec/product/meta_v08/art/*.svg',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
function cardArt(index:number,parts:number,language:Language,previewNext=false):HTMLElement {
  const wrapper=el('div','instrument');const card=config.cards[index]!;wrapper.innerHTML=artwork[`../../docs/spec/product/meta_v08/art/${card.id}.svg`]??'';
  const title=language==='en'?card.titleEN:card.titleRU;
  const svg=wrapper.querySelector('svg');if(svg){svg.setAttribute('aria-label',localize(language,`${title}, ${parts} из 4 частей`,`${title}, ${parts} of 4 parts`));svg.querySelector('title')!.textContent=title;
    for(let i=1;i<=4;i++){const layer=svg.querySelector(`[id="part-${i}"]`);if(layer){if(i>parts) {
      if (previewNext && i===parts+1) layer.classList.add('unearned-part');
      else layer.setAttribute('display','none');
    }layer.setAttribute('data-part',String(i));layer.removeAttribute('id');}}
    svg.querySelector('[id="plate"]')?.removeAttribute('id');
  }return wrapper;
}
export function nextFragmentText(save:Save):string {
  if(save.profile.fragments>=48)return localize(save.settings.language,'Мастерская собрана','Workshop complete');
  const progress=getTierProgress(save.profile.solvedIds.length,config.collection.fragmentWinThresholds);
  const remaining=progress.complete?progress.nextTier?.remaining:progress.target-save.profile.solvedIds.length;
  return localize(save.settings.language,`Новых полей до детали: ${remaining??0}`,`New boards until next part: ${remaining??0}`);
}
interface Actions { navigate:(screen:MetaScreen)=>void; campaign:()=>void; free:(track:FreeTrack)=>void; daily:(day:string)=>void; endless:()=>void; offer:(offer:Offer)=>void; quest:(index:number)=>void; blocking:(blocked:boolean)=>void }
const partsEN = [
  ['Frame','Rods','Left beads','Right beads'],
  ['Tray','Units','Fives','Tens'],
  ['Case','Small weight','Medium weight','Large weight'],
  ['Stand','Beam','Left pan','Right pan'],
  ['First section','Second section','Third section','Hinges'],
  ['Left leg','Right leg','Lock','Hinge'],
  ['Base','Arc','Scale','Pointer'],
  ['Beam','Fixed jaw','Sliding jaw','Vernier scale'],
  ['Rim','Hour markings','Hour hand','Minute hand'],
  ['Base plate','Drive gear','Driven gear','Axles'],
  ['Case','Units','Tens','Hundreds'],
  ['Base','Inner arms','Outer arms','Pencil'],
];

export class MetaView {
  private language:Language='ru';
  private t(ru:string,en:string):string { return localize(this.language,ru,en); }
  private art(index:number,parts:number):HTMLElement { return cardArt(index,parts,this.language); }
  private toolTitle(index:number):string { const c=config.cards[index]!;return this.t(c.titleRU,c.titleEN); }
  private readonly dialog=document.getElementById('card-dialog') as HTMLDialogElement;
  private readonly frame = document.getElementById('first-fragment') as HTMLButtonElement;
  private returnToFrame = false;
  private readonly modeDialog = document.getElementById('mode-dialog') as HTMLDialogElement;
  private readonly modeChoices = document.getElementById('mode-choices')!;
  private disabled=false;
  constructor(private readonly root:HTMLElement,private readonly actions:Actions){this.dialog.addEventListener('close',()=>{
      actions.blocking(false);
      if (this.returnToFrame) {
        this.returnToFrame = false;
        if (!this.frame.hidden) this.frame.focus({preventScroll:true});
      }
    });document.getElementById('close-card')!.onclick=()=>this.dialog.close();
    document.getElementById('close-modes')!.onclick = () => this.modeDialog.close();
  }
  openRank(save:Save):void {if(this.disabled)return;this.language=save.settings.language;const body=document.getElementById('card-body')!,p=save.profile;document.getElementById('card-title')!.textContent=this.t(`Ранг ${p.rank}`, `Rank ${p.rank}`);body.replaceChildren(el('p','',`${p.xp} / ${rankThreshold(p.rank)} XP`),el('p','',this.t(`До следующего ранга: ${rankThreshold(p.rank)-p.xp} XP`, `${rankThreshold(p.rank)-p.xp} XP to next rank`)),el('p','',this.t(`За повышение: +${config.rank.rewardCoins} монет`, `Rank-up reward: +${config.rank.rewardCoins} coins`)),el('p','muted',this.t(`Разных решённых полей: ${p.solvedIds.length}`, `Unique boards solved: ${p.solvedIds.length}`)));document.getElementById('close-card')!.textContent=this.t('Продолжить','Continue');this.actions.blocking(true);this.dialog.showModal();}
  closeCard():boolean{if(!this.dialog.open)return false;this.dialog.close();return true;}
  closeModes(): boolean {
    if (!this.modeDialog.open) return false;
    this.modeDialog.close();
    return true;
  }
  private button(text:string,action:()=>void,id?:string,primary=false):HTMLButtonElement {const b=el('button',primary?'primary':'hub-button',text);b.type='button';b.disabled=this.disabled;b.onclick=action;if(id)b.id=id;return b;}
  private heading(title:string,subtitle=''):void{const head=el('div','hub-heading');head.append(el('p','kicker',this.t("СЧЁТНАЯ МАСТЕРСКАЯ", "THE COUNTING WORKSHOP")),el('h1','',title));if(subtitle)head.append(el('p','muted',subtitle));this.root.append(head);}
  render(save:Save,disabled:boolean):void {
    this.language = save.settings.language;
    const screen = save.meta.screen;
    this.disabled = disabled;
    this.root.hidden = screen === 'play';
    this.root.dataset.screen = screen;
    if (screen !== 'home') this.closeModes();
    if (screen === 'play') return;

    const focused = document.activeElement?.id;
    const expandedGoals = this.root.querySelector<HTMLDetailsElement>('#daily-goals')?.open ?? false;
    const expandedUpcoming = this.root.querySelector<HTMLDetailsElement>('#daily-upcoming')?.open ?? false;
    this.root.replaceChildren();
    if (screen === 'home') {
      this.home(save);
      if (this.modeDialog.open) this.renderModes(save);
    } else if (screen === 'calendar') {
      this.calendar(save);
      this.root.querySelector<HTMLDetailsElement>('#daily-goals')!.open = expandedGoals;
      this.root.querySelector<HTMLDetailsElement>('#daily-upcoming')!.open = expandedUpcoming;
    }
    else if (screen === 'profile') this.profile(save);
    else this.album(save);

    const control = focused && document.getElementById(focused);
    if (control && (this.root.contains(control) || this.modeChoices.contains(control))) {
      control.focus({preventScroll: true});
    }
  }

  private preview(puzzle: Puzzle, attempt?: Attempt): HTMLElement {
    const view = el('div', 'resume-preview');
    view.setAttribute('aria-hidden', 'true');
    const equation = puzzle.equations.find(eq => eq.cells.filter(id => attempt
      ? cellValue(puzzle, attempt, id) === undefined : puzzle.cells[id]!.given === undefined).length === 1) ?? puzzle.equations[0]!;
    equation.cells.forEach((id, index) => {
      const cell = puzzle.cells.find(c => c.id === id)!;
      const value = attempt ? cellValue(puzzle, attempt, id) : cell.given;
      if (index > 0) view.append(el('span', 'preview-slot preview-operator', index === 1 ? operatorGlyph[equation.op] : '='));
      const state = value === undefined ? ' preview-blank' : cell.given === undefined ? ' preview-piece' : '';
      view.append(el('span', 'preview-slot' + state, value === undefined ? '·' : String(value)));
    });
    return view;
  }

  private home(save: Save): void {
    const attempt = save.attempt;
    const profile = save.profile;
    const wins = profile.solvedIds.length;
    const resume = attempt.status !== 'won' && !(attempt.mode === 'endless' && save.career.run?.status === 'ended');
    const campaignId = campaignContinuation(save);
    const campaignAttempt = storedSlot(save, 'campaign')?.attempt;
    const campaignFinished = profile.campaignCursor === routes.campaignSequence.length
      && campaignAttempt?.status !== 'playing';
    const puzzle = getPuzzle(resume ? attempt.puzzleId : campaignId ?? attempt.puzzleId);
    const boardName = this.t(`Поле ${puzzle.campaignPosition}`, `Board ${puzzle.campaignPosition}`);

    const stage = el('section', 'resume-card');
    const freeName = attempt.freeTrack ? trackName(this.language, attempt.freeTrack) : this.t('Свободная игра', 'Free Play');
    const mode = resume && attempt.mode === 'daily' ? this.t('Задача дня', 'Daily challenge')
      : resume && attempt.mode === 'free' ? freeName
      : resume && attempt.mode === 'endless' ? 'Endless' : this.t('Кампания', 'Campaign');
    const previewAttempt = resume ? attempt : campaignAttempt;
    stage.append(el('h1', 'resume-context', mode),
      this.preview(puzzle, previewAttempt?.puzzleId === puzzle.puzzleId ? previewAttempt : undefined));

    let primary: HTMLButtonElement;
    if (resume) {
      const name = attempt.mode === 'campaign' ? boardName
        : attempt.mode === 'endless' ? this.t(`Этап ${(attempt.stageId ?? 0) + 1}`, `Stage ${(attempt.stageId ?? 0) + 1}`)
        : attempt.mode === 'daily' ? this.t('Задача дня', 'Daily challenge') : freeName;
      primary = this.button(this.t(`Продолжить · ${name}`, `Resume · ${name}`), () => this.actions.navigate('play'), 'continue-game', true);
    } else {
      const title = campaignFinished ? this.t('Маршрут завершён ✓', 'Campaign complete ✓')
        : this.t(`Продолжить · ${boardName}`, `Continue · ${boardName}`);
      primary = this.button(title, this.actions.campaign, 'campaign-primary', true);
    }
    stage.append(primary);
    this.root.append(stage);

    const quick = el('div', 'home-quick');
    const day = save.meta.effectiveDay;
    const dailyWins = config.unlockProposal.dailyAfterNewWins;
    const daily = this.button('', () => this.actions.daily(day), 'daily-primary');
    daily.disabled = disabledOrLocked(this.disabled, wins < dailyWins);
    const dayStatus = wins < dailyWins ? this.t(`После ${dailyWins} побед`, `After ${dailyWins} wins`)
      : this.dayStatus(save, day);
    const date = el('span', 'home-date', day.slice(8,10));
    date.setAttribute('aria-hidden','true');
    daily.append(date, el('strong','',this.t('Задача дня', 'Daily challenge')), el('span','quick-status',dayStatus));

    const album = this.button('', () => this.actions.navigate('album'), 'album-open');
    const albumWins = config.collection.fragmentWinThresholds[0]!;
    album.disabled = disabledOrLocked(this.disabled, wins < albumWins);
    const index = Math.min(config.cards.length - 1, Math.floor(profile.fragments / 4));
    const parts = Math.min(4, profile.fragments - index * 4);
    const art = this.art(index, parts);
    art.setAttribute('aria-hidden', 'true');
    const albumStatus = wins < albumWins ? this.t(`После ${albumWins} побед`, `After ${albumWins} wins`)
      : profile.fragments === config.cards.length * 4 ? this.t('Все приборы собраны', 'All instruments collected')
        : `${this.toolTitle(index)} · ${parts}/4`;
    album.append(art, el('strong','',this.t('Мастерская', 'Workshop')), el('span','quick-status',albumStatus));
    quick.append(daily, album);
    this.root.append(quick);

    const menu = this.button(this.t('Все режимы', 'All modes'), () => {
      if (this.modeDialog.open) return;
      this.renderModes(save);
      this.modeDialog.showModal();
    }, 'modes-open');
    menu.setAttribute('aria-haspopup', 'dialog');
    menu.setAttribute('aria-controls', 'mode-dialog');
    this.root.append(menu);
  }

  private renderModes(save: Save): void {
    const wins = save.profile.solvedIds.length;
    const { freePlayAfterNewWins, dailyAfterNewWins, endlessAfterNewWins } = config.unlockProposal;
    const choices = this.modeChoices;
    const showCompleted = choices.querySelector('details')?.open ?? false;
    choices.replaceChildren();
    const games = el('section','mode-group');
    games.append(this.button(this.t('Кампания', 'Campaign'), this.actions.campaign, 'campaign-open'));
    choices.append(games);

    const savedFree = storedSlot(save, 'free')?.attempt;
    if (savedFree?.status === 'playing' && !savedFree.freeTrack) {
      games.append(this.button(this.t('Продолжить свободную игру', 'Resume Free Play'),
        () => this.actions.offer({mode:'free',puzzleId:savedFree.puzzleId}), 'free-resume'));
    }
    for (const track of freeTracks) {
      const threshold = track === 'challenge' ? challengeUnlockWins : freePlayAfterNewWins;
      const name = trackName(this.language, track);
      const label = wins < threshold ? this.t(`${name} · после ${threshold} побед`, `${name} · after ${threshold} wins`)
        : savedFree?.freeTrack === track && savedFree.status === 'playing' ? this.t(`Продолжить · ${name}`, `Resume · ${name}`) : name;
      const open = this.button(label, () => this.actions.free(track), track === 'relax' ? 'free-open' : 'challenge-open');
      open.disabled = disabledOrLocked(this.disabled, wins < threshold);
      games.append(open);
    }

    const calendar = this.button(wins < dailyAfterNewWins
      ? this.t(`Календарь · после ${dailyAfterNewWins} побед`, `Calendar · after ${dailyAfterNewWins} wins`)
      : this.t('Календарь задач', 'Challenge calendar'), () => this.actions.navigate('calendar'), 'calendar-open');
    calendar.disabled = disabledOrLocked(this.disabled, wins < dailyAfterNewWins);


    const endless = this.button(wins < endlessAfterNewWins
      ? this.t(`Endless · после ${endlessAfterNewWins} побед`, `Endless · after ${endlessAfterNewWins} wins`)
      : save.career.run && save.career.run.status !== 'ended' ? this.t('Продолжить Endless', 'Resume Endless')
        : this.t('Начать Endless', 'Start Endless'), this.actions.endless, 'endless-open');
    endless.disabled = disabledOrLocked(this.disabled, wins < endlessAfterNewWins);
    games.append(endless);
    const progress = el('section','mode-group');
    progress.append(el('h3','',this.t('Задачи и прогресс','Challenges and progress')), calendar,
      this.button(this.t('Профиль и рекорды', 'Profile and records'), () => this.actions.navigate('profile'), 'profile-open'));
    if (save.attempt.status === 'won') progress.append(this.button(this.t('Последний результат', 'Last result'), () => this.actions.navigate('play'), 'last-result'));
    choices.append(progress);

    const completed = campaignSequence(save.contentVersion).slice(0, save.profile.campaignCursor);
    if (completed.length) {
      const details = el('details');
      details.open = showCompleted;
      const summary = el('summary', '', this.t('Пройденные поля', 'Completed boards'));
      const list = el('div', 'replay-list');
      for (const id of completed) {
        const puzzle = getPuzzle(id);
        const item = this.button(String(puzzle.campaignPosition), () => this.actions.offer({puzzleId:id, mode:'campaign'}), `replay-${id}`);
        item.setAttribute('aria-label', this.t(`Открыть поле ${puzzle.campaignPosition}`, `Open board ${puzzle.campaignPosition}`));
        list.append(item);
      }
      details.append(summary, list);
      progress.append(details);
    }
  }
  private quests(save:Save):void {
    const panel = el('details', 'hub-panel');
    panel.id = 'daily-goals';
    const set = save.meta.quests;
    const paid = set?.slots.filter(slot => slot.paid).length;
    const count = paid === undefined ? '' : ` · ${paid}/${set!.slots.length}`;
    panel.append(el('summary', '', this.t('Задания дня', 'Daily goals') + count));
    if(!set){panel.append(el('p','muted',save.profile.solvedIds.length<5?this.t("Откроются после пяти разных побед.", "Solve five different boards to unlock goals."):this.t("Сегодня можно продолжить маршрут.", "You can continue the campaign today.")));this.root.append(panel);return;}
    for(const [i,slot] of set.slots.entries()){const goal=goals.get(slot.goalId)!,b=this.button('',()=>this.actions.quest(i));b.dataset.quest=String(i);b.disabled=this.disabled||slot.paid;b.classList.add('quest');b.append(el('span','',this.t(goal.ru,goal.en)),el('strong','',slot.paid?'✓ +10':`${slot.progress} / ${slot.target}`));panel.append(b);}
    panel.append(el('p','muted',set.slots.every(s=>s.paid)?this.t("План выполнен · +30 монет получены", "All goals complete · 30 coins earned"):this.t("За каждую цель +10, за весь план ещё +30 монет.", "Earn 10 coins per goal and 30 more for the full set.")));
    if(set.replacements.length)panel.append(el('p','muted',this.t("Недоступная цель заменена. Для новой цели нужно одно действие.", "An unavailable goal was replaced. The new goal takes one action.")));this.root.append(panel);
  }
  private dayStatus(save: Save, day: string): string {
    if (day > save.meta.effectiveDay) return this.t('Будет доступно', 'Upcoming');
    if (save.meta.completedDates.includes(day)) return this.t('Решено ✓', 'Solved ✓');
    const current = storedSlot(save, 'daily:' + day)?.attempt;
    if (current?.status === 'out-of-lives') return this.t('Нет жизней', 'Out of lives');
    if (current) return this.t('Партия начата', 'In progress');
    return day === save.meta.effectiveDay ? this.t('Сегодня','Today') : this.t('Доступно', 'Available');
  }

  private dateButton(save: Save, day: string): HTMLButtonElement {
    const today = day === save.meta.effectiveDay;
    const status = this.dayStatus(save,day);
    const button = this.button('',()=>this.actions.daily(day),`daily-${day}`);
    button.dataset.day = day;
    button.classList.add('date-card');
    button.classList.toggle('today',today);
    button.classList.toggle('completed',save.meta.completedDates.includes(day));
    button.disabled = this.disabled || day > save.meta.effectiveDay;
    const stamp = el('strong', today ? 'home-date' : '', day.slice(8,10)+'.'+day.slice(5,7));
    stamp.setAttribute('aria-hidden','true');
    button.append(stamp);
    if (today) {
      const copy = el('span', 'today-copy');
      const action = status === this.t('Сегодня','Today') ? this.t('Играть · 3 жизни','Play · 3 lives') : status;
      copy.append(el('strong','',this.t('Сегодня','Today')), el('span','',action));
      const arrow = el('span','today-arrow','›');
      arrow.setAttribute('aria-hidden','true');
      button.append(copy,arrow);
      button.setAttribute('aria-label',this.t(`Сегодня, ${day}. ${action}`, `Today, ${day}. ${action}`));
    } else {
      button.append(el('span','',status));
      button.setAttribute('aria-label', `${day}, ${status}`);
    }
    return button;
  }

  private calendar(save:Save):void {
    this.heading(this.t('Календарь задач', 'Challenge calendar'));
    this.root.append(this.button(this.t('← На главную', '← Home'),()=>this.actions.navigate('home'),'calendar-back'));
    const today = calendarDayIndex(save.meta.effectiveDay);
    const created = calendarDayIndex(profileDay(save.profile.createdAt,save.profile.timeZone));
    this.root.append(this.dateButton(save,save.meta.effectiveDay));
    this.quests(save);
    if (created < today) {
      this.root.append(el('h2', 'calendar-subtitle', this.t('Прошлые задачи','Past challenges')));
      const past = el('div','date-grid');
      for(let i=today-1;i>=Math.max(created,today-30);i--) past.append(this.dateButton(save,dayFromIndex(i)));
      this.root.append(past);
    }
    const upcoming = el('details','hub-panel');
    upcoming.id = 'daily-upcoming';
    const future = el('div','date-grid');
    for (let i=today+1;i<=today+7;i++) future.append(this.dateButton(save,dayFromIndex(i)));
    upcoming.append(el('summary','',this.t('Следующие даты','Upcoming dates')), future);
    this.root.append(upcoming);
    const all=[{attempt:save.attempt,result:save.result},...Object.values(save.meta.inactive)].filter(s=>s.attempt.mode==='daily'&&s.attempt.status!=='won'&&!dateAvailable(save.profile.createdAt,save.profile.timeZone,save.meta.effectiveDay,s.attempt.dayKey!));
    if(all.length){const old=el('section','hub-panel');old.append(el('h2','',this.t("Начатые ранее", "Earlier unfinished boards")));for(const slot of all)old.append(this.button(slot.attempt.dayKey+this.t(" · продолжить", " · resume"),()=>this.actions.daily(slot.attempt.dayKey!)));this.root.append(old);}
  }
  private album(save:Save):void {
    this.heading(this.t("Мастерская счёта", "The Counting Workshop"),this.t(`${Math.floor(save.profile.fragments/4)} из 12 приборов · ${nextFragmentText(save)}`, `${Math.floor(save.profile.fragments/4)} of 12 instruments · ${nextFragmentText(save)}`));this.root.append(this.button(this.t("← На главную", "← Home"),()=>this.actions.navigate('home'),'album-back'));
    const grid=el('div','album-grid');for(let i=0;i<12;i++){const card=config.cards[i]!,parts=Math.min(4,Math.max(0,save.profile.fragments-4*i));const b=this.button('',()=>this.openCard(i,parts));b.dataset.card=card.id;b.classList.add('collection-card');b.append(this.art(i,parts),el('strong','',this.toolTitle(i)),el('span','muted',this.t(`${parts} / 4 частей`, `${parts} / 4 parts`)));b.setAttribute('aria-label',this.t(`${card.titleRU}, ${parts} из 4 частей, рассмотреть`,`${card.titleEN}, ${parts} of 4 parts, inspect`));grid.append(b);}this.root.append(grid);
  }
  private profile(save:Save):void {
    const p=save.profile,c=save.career;this.heading(this.t("Профиль", "Profile"),this.t(`Ранг ${p.rank} · ${p.xp} / ${rankThreshold(p.rank)} XP`, `Rank ${p.rank} · ${p.xp} / ${rankThreshold(p.rank)} XP`));this.root.append(this.button(this.t("← На главную", "← Home"),()=>this.actions.navigate('home'),'profile-back'));
    const progress=el('section','hub-panel');progress.append(el('h2','',this.t("Ваш маршрут", "Your progress")),el('p','',this.t(`Разных решённых задач: ${p.solvedIds.length}`, `Unique boards solved: ${p.solvedIds.length}`)),el('p','',this.t(`Пройдено в кампании: ${p.campaignCursor} / 240`, `Campaign boards cleared: ${p.campaignCursor} / 240`)),el('p','',this.t(`Решённых дат Daily: ${save.meta.completedDates.length}`, `Daily dates solved: ${save.meta.completedDates.length}`)),el('p','',this.t(`Полных планов дня: ${save.meta.setReceipts.length}`, `Daily goal sets completed: ${save.meta.setReceipts.length}`)),el('p','',this.t(`Собранных приборов: ${p.paidCardIds.length} / 12`, `Instruments completed: ${p.paidCardIds.length} / 12`)));this.root.append(progress);
    const stats=el('section','hub-panel');stats.append(el('h2','',this.t("Статистика", "Statistics")));
    if(c.partialHistory)stats.append(el('p','muted',this.t(`Подробный учёт с обновления ${profileDay(c.since,p.timeZone)}. Старые уникальные победы сохранены. Новые попытки и завершения считаются отдельно; ранее начатая партия тоже может завершиться после обновления.`, `Detailed tracking began on ${profileDay(c.since,p.timeZone)}. Earlier unique wins still count. Boards started before the update can count as completions after it.`)));
    const labels={campaign:this.t("Кампания", "Campaign"),free:this.t("Свободная игра","Free Play"),daily:'Daily',endless:'Endless'};
    for(const [mode,title] of Object.entries(labels)){const s=c.modes[mode as keyof typeof labels],box=el('div','stats-mode');box.dataset.stats=mode;box.append(el('h3','',title),el('p','',this.t(`Новых попыток: ${s.starts} · Завершений: ${s.completions}`, `New attempts: ${s.starts} · Completions: ${s.completions}`)),el('p','',this.t(`Активное время: ${Math.floor(s.seconds/60)} мин ${Math.floor(s.seconds%60)} с`, `Time played: ${Math.floor(s.seconds/60)}m ${Math.floor(s.seconds%60)}s`)),el('p','',this.t(`Ошибок: ${s.mistakes} · Отмен: ${s.undos} · Перезапусков: ${s.restarts}`, `Mistakes: ${s.mistakes} · Undos: ${s.undos} · Restarts: ${s.restarts}`)),el('p','',this.t(`Объяснений: ${s.explains} · Раскрытий: ${s.reveals}`, `Explanations: ${s.explains} · Reveals: ${s.reveals}`)));stats.append(box);}this.root.append(stats);
    const records=el('section','hub-panel');records.append(el('h2','',this.t("Рекорды Endless", "Endless records")));const r=c.records[recordVersion];for(const [title,record] of [[this.t("Самостоятельно", "Solo"),r.solo],[this.t("С помощью", "Assisted"),r.assisted]] as const)records.append(el('p','',record?this.t(`${title}: очки ${record.score} · поля ${record.boards}`, `${title}: score ${record.score} · boards ${record.boards}`):this.t(`${title}: пока нет завершённых забегов`, `${title}: no completed runs yet`)));if(c.run&&c.run.status!=='ended')records.append(el('p','muted',this.t(`Текущий забег: очки ${c.run.score} · поля ${c.run.solvedStages}. Завершите его, чтобы сохранить рекорд.`, `Current run: score ${c.run.score} · boards ${c.run.solvedStages}. End the run to save the result.`)));this.root.append(records);
    const badges=el('section','hub-panel');badges.append(el('h2','',this.t("Достижения", "Achievements")));for(const b of config.achievements){const earned=c.achievements[b.id],row=el('div','badge');row.dataset.badge=b.id;row.classList.toggle('earned',!!earned);row.append(el('strong','',`${earned?'✓ ':''}${this.t(b.titleRU,b.titleEN)}`),el('span','muted',earned?this.t(`Зафиксировано ${profileDay(earned.earnedAt,p.timeZone)}`, `Recorded ${profileDay(earned.earnedAt,p.timeZone)}`):`${Math.min(b.threshold,achievementValue(save,b.metric))} / ${b.threshold}`));badges.append(row);}this.root.append(badges);
  }
  openFirstFragment(save: Save): void {
    if (!this.frame.hidden && !this.frame.disabled && !this.dialog.open) {
      this.language = save.settings.language;
      this.openCard(0, Math.min(4, save.profile.fragments), true);
    }
  }
  private openCard(index:number, parts:number, fromResult=false):void {
    const card = config.cards[index]!;
    const body = document.getElementById('card-body')!;
    const names = this.language === 'en' ? partsEN[index]! : card.partsRU;
    document.getElementById('card-title')!.textContent = this.toolTitle(index);
    document.getElementById('close-card')!.textContent = fromResult
      ? this.t('К результату', 'Back to result') : this.t('Вернуться в альбом', 'Back to album');
    this.returnToFrame = fromResult;
    body.replaceChildren(cardArt(index, parts, this.language, fromResult));
    if (fromResult && parts < 4) {
      body.append(el('p', 'next-part', this.t(`Дальше — ${names[parts]}`, `Next — ${names[parts]}`)));
    }
    const list = el('ol', 'parts-list');
    names.forEach((part, i) => list.append(el('li', i < parts ? 'earned' : '', `${i < parts ? '✓ ' : ''}${part}`)));
    body.append(list);
    this.actions.blocking(true);
    this.dialog.showModal();
  }
  hideFirstFragment(): void {
    this.frame.hidden = true;
    this.frame.classList.remove('arrived');
  }
  renderResult(save:Save, frameArrival=false, disabled=false):void {
    const r=save.result,root=document.getElementById('reward-art')!,details=document.getElementById('reward-breakdown')!;root.replaceChildren();details.replaceChildren();if(!r)return;
    const total=r.collectionFragments;let title='';
    if (total !== undefined && (r.fragments > 0 || r.cardCoins > 0)) {
      const index = Math.min(11, Math.floor((total - 1) / 4));
      const parts = Math.min(4, total - index * 4);
      const card = config.cards[index]!;
      const part = this.t(card.partsRU[parts - 1]!, partsEN[index]![parts - 1]!);
      title = total === 48 && r.fragments > 0 ? this.t('Мастерская собрана', 'Workshop complete')
        : r.cardCoins ? this.t(`Прибор собран: ${this.toolTitle(index)}`, `Instrument complete: ${this.toolTitle(index)}`)
        : index === 0 && parts === 1 ? this.t('Рамка счётов · 1/4', 'Abacus frame · 1/4')
        : `${part} · ${parts}/4`;
      if (index === 0 && parts === 1 && r.fragments > 0) {
        if (this.frame.hidden) {
          const art = this.art(index, parts);
          art.setAttribute('aria-hidden', 'true');
          this.frame.querySelector('.instrument')?.remove();
          this.frame.prepend(art);
          this.frame.classList.toggle('arrived', frameArrival);
          this.frame.hidden = false;
        }
        this.frame.querySelector('span')!.textContent = title;
        this.frame.disabled = disabled;
      } else {
        this.hideFirstFragment();
        root.append(this.art(index, parts));
      }
    } else this.hideFirstFragment();
    if (!title && r.unlockedModes?.includes('endless'))title=this.t("Открыт Endless", "Endless unlocked");else if(!title && r.unlockedModes?.includes('daily'))title=this.t("Открыты Daily и задания дня", "Daily and daily goals unlocked");else if(!title && r.unlockedModes?.includes('free'))title=this.t("Открыта свободная игра", "Free Play unlocked");else if(!title && r.rankUps)title=this.t(`Новый ранг: ${r.rankLevel??save.profile.rank}`, `New rank: ${r.rankLevel??save.profile.rank}`);else if(!title && r.setCoins)title=this.t("План дня выполнен", "Daily goals complete");
    document.getElementById('result-detail')!.textContent = this.frame.hidden ? title : '';
    const sources:[string,number][]=[[this.t("За поле", "Board"),r.baseCoins??(r.first?config.difficultyRewards[getPuzzle(r.puzzleId).difficulty].coins:0)],[this.t("За дату", "Daily date"),r.dailyCoins??0],[this.t("За цели", "Goals"),r.taskCoins??0],[this.t("За весь план", "Full goal set"),r.setCoins??0],[this.t("За ранг", "Rank"),r.rankCoins??r.rankUps*config.rank.rewardCoins],[this.t("За прибор", "Instrument"),r.cardCoins]];
    for(const [name,coins] of sources)if(coins)details.append(el('p','',`${name}: +${coins}`));details.append(el('p','',this.t(`Опыт: +${r.xp}`, `XP: +${r.xp}`)));if(r.fragments)details.append(el('p','',this.t(`Новых деталей: ${r.fragments} · всего ${r.collectionFragments} / 48`, `New parts: ${r.fragments} · total ${r.collectionFragments} / 48`)));if(r.rankUps)details.append(el('p','',this.t(`Новый ранг: ${r.rankLevel??save.profile.rank}`, `New rank: ${r.rankLevel??save.profile.rank}`)));for(const mode of r.unlockedModes??[])details.append(el('p','',mode==='endless'?this.t("Открыт Endless", "Endless unlocked"):mode==='free'?this.t("Открыта свободная игра", "Free Play unlocked"):this.t("Открыты Daily и задания дня", "Daily and daily goals unlocked")));if(r.stageScore!==undefined)details.append(el('p','',this.t(`За этап: +${r.stageScore} очков · В забеге: ${r.runScore}`, `Stage points: +${r.stageScore} · Run score: ${r.runScore}`)));for(const id of r.badges??[]){const badge=config.achievements.find(b=>b.id===id)!;details.append(el('p','',this.t(`Знак: ${badge.titleRU}`,`Badge: ${badge.titleEN}`)));}
  }
}
function disabledOrLocked(disabled:boolean,locked:boolean):boolean{return disabled||locked;}
