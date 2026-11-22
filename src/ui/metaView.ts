import { challengeUnlockWins, freeTracks } from '../content/rotation';
import type { FreeTrack } from '../content/rotation';
import { dailyName, localize, trackName, unlockAnnouncement } from './locale';
import type { Language } from './locale';
import { campaignSequence, config, getPuzzle } from '../content/catalog';
import { campaignContinuation, storedSlot } from '../app/session';
import { goals } from '../meta/missions';
import { activeTrackGoal, relaxGoalTarget, trackGoalDefinitions } from '../meta/trackGoals';
import type { TrackGoalId } from '../meta/trackGoals';
import { calendarDayIndex, canResumeDaily, dateAvailable, dayFromIndex, profileDay } from '../meta/calendar';
import { reachablePastTrophies, trophyMonthStatus } from '../meta/monthlyTrophy';
import type { Completion, Save } from '../app/model';
import { rankThreshold } from '../app/model';
import { achievementValue, recordVersion } from '../meta/career';
import { resumePreview } from './resumePreview';
import { menuIcon } from './icons';
import { WorkshopReveal } from './workshopReveal';
import { workshopTarget } from '../meta/workshopProgress';
import type { MetaScreen, Offer } from '../meta/types';

const artwork=import.meta.glob('../../docs/spec/product/meta_v08/art/*.svg',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
type ArtPreview = 'earned' | 'next' | 'outline';
const partCount = 4;
type ModePage = 'modes' | 'campaign' | 'unlocked';
type CardView = 'current' | 'future' | 'assembled' | 'receipt';

function formatDuration(seconds: number, language: Language): string {
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return localize(language, minutes ? `${minutes} мин ${remainder} с` : `${remainder} с`,
    minutes ? `${minutes}m ${remainder}s` : `${remainder}s`);
}

function partsOnShelf(total: number, index: number): number {
  return Math.min(partCount, Math.max(0, total - partCount * index));
}

function instrumentAward(result: Completion | null): {index: number; parts: number} | undefined {
  const total = result?.collectionFragments;
  if (!result || !total || (!result.fragments && !result.cardCoins)) return;
  if (total > partCount * config.cards.length) return;
  const index = Math.floor((total - 1) / partCount);
  return {index, parts: partsOnShelf(total, index)};
}

function cardArt(index: number, parts: number, language: Language, preview: ArtPreview): HTMLElement {
  const wrapper = el('span', preview==='outline'?'instrument instrument-outline':'instrument');
  const card = config.cards[index]!;
  wrapper.innerHTML = artwork[`../../docs/spec/product/meta_v08/art/${card.id}.svg`] ?? '';
  const svg = wrapper.querySelector('svg');
  if (!svg) return wrapper;
  const title = language === 'en' ? card.titleEN : card.titleRU;
  svg.setAttribute('aria-label', localize(language, `${title}, ${parts} из 4 частей`, `${title}, ${parts} of 4 parts`));
  svg.querySelector('title')!.textContent = title;
  for (let i = 1; i <= partCount; i++) {
    const layer = svg.querySelector(`[id="part-${i}"]`);
    if (!layer) continue;
    layer.setAttribute('data-part', String(i));
    layer.removeAttribute('id');
    if (i <= parts) continue;
    if (preview === 'outline' || (preview === 'next' && i === parts + 1)) layer.classList.add('unearned-part');
    else layer.setAttribute('display', 'none');
  }
  svg.querySelector('[id="plate"]')?.removeAttribute('id');
  return wrapper;
}

function partMeter(parts: number): HTMLElement {
  const meter = el('span','part-meter');
  meter.setAttribute('aria-hidden','true');
  for (let i = 0; i < partCount; i++) meter.append(el('i', i < parts ? 'fitted' : ''));
  return meter;
}
export function nextFragmentText(save:Save):string {
  if(save.profile.fragments>=48)return localize(save.settings.language,'Мастерская собрана','Workshop complete');
  const remaining=workshopTarget(save.profile.solvedIds.length,save.profile.fragments)?.remaining;
  return localize(save.settings.language,`Новых полей до детали: ${remaining??0}`,`New boards until next part: ${remaining??0}`);
}
interface Actions { navigate:(screen:MetaScreen)=>void; campaign:()=>void; free:(track:FreeTrack)=>void; daily:(day:string)=>void; endless:()=>void; offer:(offer:Offer,repeatCompleted?:boolean)=>void; quest:(index:number)=>void; questStartsNewRun:(index:number)=>boolean; blocking:(blocked:boolean)=>void }
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
  private art(index: number, parts: number, preview: ArtPreview = 'earned'): HTMLElement {
    return cardArt(index, parts, this.language, preview);
  }
  private partName(index:number,partIndex:number):string { return this.t(config.cards[index]!.partsRU[partIndex]!,partsEN[index]![partIndex]!); }
  private toolTitle(index:number):string { const c=config.cards[index]!;return this.t(c.titleRU,c.titleEN); }
  private readonly dialog=document.getElementById('card-dialog') as HTMLDialogElement;
  private readonly reward = document.getElementById('instrument-reward') as HTMLButtonElement;
  private returnTarget: string | undefined;
  private readonly workshopReveal: WorkshopReveal;
  private readonly modeDialog = document.getElementById('mode-dialog') as HTMLDialogElement;
  private readonly modeChoices = document.getElementById('mode-choices')!;
  private readonly modeTitle = document.getElementById('mode-title')!;
  private readonly modeBack = document.getElementById('mode-back') as HTMLButtonElement;
  private modePage: ModePage = 'modes';
  private disabled=false;
  constructor(private readonly root:HTMLElement,private readonly actions:Actions,workshopContact:()=>void) {
    this.workshopReveal = new WorkshopReveal(document.getElementById('workshop-award')!,workshopContact);
    this.dialog.addEventListener('close',()=>{
      actions.blocking(false);
      if (this.returnTarget) document.getElementById(this.returnTarget)?.focus({preventScroll:true});
      this.returnTarget = undefined;
    });document.getElementById('close-card')!.onclick=()=>this.dialog.close();
    document.getElementById('close-modes')!.onclick = () => this.modeDialog.close();
    this.modeDialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.backFromModes();
    });
    const finishReward = (event: AnimationEvent) => {
      if (event.animationName === 'award-drift') this.reward.classList.remove('arrived');
    };
    this.reward.addEventListener('animationend', finishReward);
    this.reward.addEventListener('animationcancel', finishReward);
  }
  openRank(save:Save, trigger = 'rank'):void {if(this.disabled)return;this.language=save.settings.language;const body=document.getElementById('card-body')!,p=save.profile;document.getElementById('card-title')!.textContent=this.t(`Ранг ${p.rank}`, `Rank ${p.rank}`);body.replaceChildren(el('p','',`${p.xp} / ${rankThreshold(p.rank)} XP`),el('p','',this.t(`До следующего ранга: ${rankThreshold(p.rank)-p.xp} XP`, `${rankThreshold(p.rank)-p.xp} XP to next rank`)),el('p','',this.t(`За повышение: +${config.rank.rewardCoins} монет`, `Rank-up reward: +${config.rank.rewardCoins} coins`)),el('p','muted',this.t(`Разных решённых полей: ${p.solvedIds.length}`, `Unique boards solved: ${p.solvedIds.length}`)));document.getElementById('close-card')!.textContent=this.t('Продолжить','Continue');this.showCard(trigger);}
  closeCard():boolean{if(!this.dialog.open)return false;this.dialog.close();return true;}
  closeModes(): boolean {
    if (!this.modeDialog.open) return false;
    this.modeDialog.close();
    return true;
  }
  openCampaignHistory(save: Save): void {
    this.showModePage(save, 'campaign', true);
    if (!this.modeDialog.open) this.modeDialog.showModal();
    this.modeChoices.querySelector('summary')?.focus({preventScroll:true});
  }
  backFromModes(): boolean {
    if (!this.modeDialog.open) return false;
    if (this.modePage === 'campaign') this.modeBack.click();
    else this.closeModes();
    return true;
  }

  suspendModes(): ((save: Save) => void) | undefined {
    if (!this.modeDialog.open) return;
    const scroll = this.modeDialog.scrollTop;
    this.closeModes();
    return save => {
      this.renderModes(save);
      this.modeDialog.showModal();
      this.modeDialog.scrollTop = scroll;
    };
  }

  private button(text:string,action:()=>void,id?:string,primary=false):HTMLButtonElement {const b=el('button',primary?'primary':'hub-button',text);b.type='button';b.disabled=this.disabled;b.onclick=action;if(id)b.id=id;return b;}
  private heading(title: string, subtitle = '', showKicker = false): void {
    const head = el('div','hub-heading');
    if (showKicker) head.append(el('p','kicker',this.t('СЧЁТНАЯ МАСТЕРСКАЯ','THE COUNTING WORKSHOP')));
    head.append(el('h1','',title));
    if (subtitle) head.append(el('p','muted',subtitle));
    this.root.append(head);
  }
  render(save:Save,disabled:boolean):void {
    this.language = save.settings.language;
    const screen = save.meta.screen;
    this.disabled = disabled;
    this.root.hidden = screen === 'play';
    this.root.dataset.screen = screen;
    const unlockPicker=screen==='play' && this.modePage==='unlocked' && Boolean(save.result);
    if (screen !== 'home' && !unlockPicker) this.closeModes();
    if (screen === 'play') {
      if(unlockPicker && this.modeDialog.open) this.renderModes(save);
      return;
    }

    const focused = document.activeElement?.id;
    const openPanels = new Set([...this.root.querySelectorAll('details[id][open]')].map(panel => panel.id));
    this.root.replaceChildren();
    if (screen === 'home') {
      this.home(save);
      if (this.modeDialog.open) this.renderModes(save);
    } else if (screen === 'calendar') {
      this.calendar(save);
    }
    else if (screen === 'profile') this.profile(save);
    else this.album(save);

    for (const panel of this.root.querySelectorAll<HTMLDetailsElement>('details[id]')) panel.open = openPanels.has(panel.id);
    const control = focused && document.getElementById(focused);
    if (control && (this.root.contains(control) || this.modeChoices.contains(control))) {
      control.focus({preventScroll: true});
    }
  }

  private home(save: Save): void {
    const { attempt, profile } = save;
    const wins = profile.solvedIds.length;
    const resume = attempt.mode === 'daily' ? canResumeDaily(attempt)
      : attempt.status !== 'won' && !(attempt.mode === 'endless' && save.career.run?.status === 'ended');
    const campaignId = campaignContinuation(save);
    const campaignAttempt = storedSlot(save, 'campaign')?.attempt;
    const campaignFinished = profile.campaignCursor === campaignSequence(save.contentVersion).length
      && campaignAttempt?.status !== 'playing';
    const previewAttempt = resume ? attempt : campaignAttempt;
    const puzzle = getPuzzle(resume ? attempt.puzzleId : campaignId ?? attempt.puzzleId);
    const mode = resume ? attempt.mode : 'campaign';
    const contexts = {
      daily: dailyName(this.language),
      free: this.t('Свободная игра', 'Free Play'),
      endless: 'Endless',
      campaign: this.t('Кампания', 'Campaign'),
    };
    const title = mode === 'campaign' ? this.t(`Поле ${puzzle.campaignPosition}`, `Board ${puzzle.campaignPosition}`)
      : mode === 'endless' ? this.t(`Этап ${(attempt.stageId ?? 0) + 1}`, `Stage ${(attempt.stageId ?? 0) + 1}`)
      : mode === 'daily' ? this.dateLabel(attempt.dayKey!) : attempt.freeTrack
        ? trackName(this.language, attempt.freeTrack) : this.t(`Поле ${puzzle.campaignPosition}`, `Board ${puzzle.campaignPosition}`);

    const stage = el('section', 'resume-card');
    const completed = !resume && campaignFinished;
    const primary = this.button(completed ? this.t('Пройденные поля', 'Completed boards') : this.t('Продолжить', 'Continue'),
      resume ? () => this.actions.navigate('play') : completed ? () => this.openCampaignHistory(save) : this.actions.campaign,
      resume ? 'continue-game' : 'campaign-primary', true);
    const play = el('span','start-mark','▸');
    play.setAttribute('aria-hidden','true');
    primary.prepend(play);
    const preview = resumePreview(puzzle, previewAttempt?.puzzleId === puzzle.puzzleId ? previewAttempt : undefined);
    if (!completed) {
      const previewButton = this.button('',()=>primary.click(),'resume-board-open');
      previewButton.className = 'resume-board-open';
      previewButton.append(preview);
      previewButton.setAttribute('aria-label',`${primary.textContent?.slice(1)} · ${preview.getAttribute('aria-label')}`);
      stage.append(el('p', 'resume-context', contexts[mode]), el('h1','',title), previewButton, primary);
    } else stage.append(el('p', 'resume-context', contexts[mode]),
      el('h1', '', completed ? this.t('Маршрут завершён', 'Campaign complete') : title),
      primary);
    this.root.append(stage);

    const quick = el('div', 'home-quick');
    const day = save.meta.effectiveDay;
    const dailyWins = config.unlockProposal.dailyAfterNewWins;
    const daily = this.button('', () => this.actions.daily(day), 'daily-primary');
    daily.classList.add('quick-daily');
    daily.disabled = disabledOrLocked(this.disabled, wins < dailyWins);
    const status = this.dayStatus(save, day);
    const dayStatus = wins < dailyWins ? this.unlockText(dailyWins)
      : status === this.t('Сегодня', 'Today') ? this.t(`${config.dailyLives} жизни`, `${config.dailyLives} lives`) : status;
    const date = this.dateTicket(day);
    const dailyCopy = el('span', 'quick-copy');
    const dateStatus = el('span', 'quick-status');
    if (wins >= dailyWins && status === this.t('Сегодня','Today')) dateStatus.append(menuIcon('life-full'));
    dateStatus.append(dayStatus);
    dailyCopy.append(el('strong', '', contexts.daily), dateStatus);
    daily.append(date, dailyCopy);

    const calendar = this.button(this.t('Календарь', 'Calendar'),
      () => this.actions.navigate('calendar'), 'calendar-open');
    calendar.prepend(menuIcon('calendar'));
    calendar.disabled = daily.disabled;

    const album = this.button('', () => this.actions.navigate('album'), 'album-open');
    album.classList.add('quick-workshop');
    const albumWins = config.collection.fragmentWinThresholds[0]!;
    album.disabled = disabledOrLocked(this.disabled, wins < albumWins);
    const index = Math.min(config.cards.length - 1, Math.floor(profile.fragments / partCount));
    const parts = partsOnShelf(profile.fragments, index);
    const art = this.art(index, parts, 'next');
    art.setAttribute('aria-hidden', 'true');
    const complete = profile.fragments === config.cards.length * partCount;
    const remaining = workshopTarget(wins,profile.fragments)?.remaining ?? 0;
    const albumStatus = wins < albumWins ? this.unlockText(albumWins)
      : complete ? this.t('Все приборы собраны','All instruments collected')
        : `${this.partName(index,parts)} · ${this.t(`Ещё ${remaining} ${remaining===1?'поле':remaining<5?'поля':'полей'}`, `${remaining} more ${remaining===1?'board':'boards'}`)}`;
    const albumCopy = el('span','quick-copy');
    albumCopy.append(el('strong','',this.t('Мастерская','Workshop')),el('span','quick-status',albumStatus));
    const felt = el('span','instrument-felt');
    felt.append(art,el('span','home-parts-count',`${parts}/${partCount}`));
    album.append(felt,albumCopy);
    quick.append(daily,album);
    this.root.append(quick);

    const menu = this.button(this.t('Все режимы', 'All modes'), () => {
      if (this.modeDialog.open) return;
      this.showModePage(save, 'modes');
      this.modeDialog.showModal();
    }, 'modes-open');
    menu.prepend(menuIcon('modes'));
    menu.setAttribute('aria-haspopup', 'dialog');
    menu.setAttribute('aria-controls', 'mode-dialog');
    const shortcuts=el('div','home-shortcuts');
    shortcuts.append(menu,calendar);
    this.root.append(shortcuts);
  }

  private dateTicket(day:string): HTMLTimeElement {
    const ticket = el('time','home-tear');
    ticket.dateTime = day;
    ticket.setAttribute('aria-label',this.dateLabel(day));
    ticket.append(el('span','tear-month',this.monthName(day.slice(0,7))),el('strong','tear-day',String(Number(day.slice(-2)))));
    return ticket;
  }

  private dateLabel(day: string): string {
    return new Intl.DateTimeFormat(this.language === 'ru' ? 'ru-RU' : 'en-US',
      {day:'numeric', month:'long', timeZone:'UTC'}).format(new Date(`${day}T00:00:00Z`));
  }

  private monthName(month: string, genitive = false): string {
    const parts = new Intl.DateTimeFormat(this.language, {month:'long',timeZone:'UTC',...(genitive && {day:'numeric'})})
      .formatToParts(new Date(`${month}-01T00:00:00Z`));
    return parts.find(part=>part.type==='month')!.value;
  }

  private unlockText(wins: number): string {
    return this.t(`После ${wins} разных побед`, `After ${wins} unique wins`);
  }

  private arrow(): HTMLElement {
    const mark = el('span', 'nav-arrow', '›');
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  private modeButton(kind: string, id: string, title: string, subtitle: string, action: () => void): HTMLButtonElement {
    const button = this.button('', action, id);
    const copy = el('span', 'quick-copy');
    copy.append(el('strong', '', title), el('span', 'quick-status', subtitle));
    button.classList.add('mode-option', 'mode-option--'+kind);
    button.append(menuIcon(kind), copy, this.arrow());
    return button;
  }

  private showModePage(save: Save, page: ModePage, openHistory = false): void {
    this.modePage = page;
    this.modeChoices.replaceChildren();
    this.renderModes(save);
    const history = this.modeChoices.querySelector('details');
    if (history && openHistory) history.open = true;
    this.modeDialog.scrollTop = 0;
  }

  private renderModes(save: Save): void {
    const campaign = this.modePage === 'campaign';
    const unlocked = this.modePage === 'unlocked';
    const scroll = this.modeDialog.scrollTop;
    const historyOpen = this.modeChoices.querySelector('details')?.open ?? false;
    this.modeTitle.textContent = campaign ? this.t('Кампания', 'Campaign')
      : unlocked ? this.t('Новые режимы','New modes') : this.t('Режимы', 'Modes');
    this.modeBack.hidden = !campaign;
    this.modeBack.textContent = this.t('← Режимы', '← Modes');
    this.modeBack.onclick = () => {
      this.showModePage(save, 'modes');
      document.getElementById('campaign-open')?.focus({preventScroll:true});
    };
    this.modeChoices.replaceChildren();
    if (campaign) this.campaign(save, historyOpen);
    else if(unlocked) {
      const choices=el('div','mode-group');
      choices.append(this.freeModeOption(save,'challenge'),this.endlessModeOption(save));
      this.modeChoices.append(choices);
    }
    else this.modeOptions(save);
    this.modeDialog.scrollTop = scroll;
  }

  private modeOptions(save: Save): void {
    const games = el('div', 'mode-group');
    const campaign = this.modeButton('campaign', 'campaign-open', this.t('Кампания', 'Campaign'),
      this.campaignPosition(save), () => {
        this.showModePage(save, 'campaign');
        this.modeBack.focus({preventScroll:true});
      });
    campaign.querySelector('.quick-copy')!.append(this.campaignTrack(save));
    games.append(campaign);

    const savedFree = storedSlot(save, 'free')?.attempt;
    if (savedFree?.status === 'playing' && !savedFree.freeTrack) {
      games.append(this.modeButton('relax', 'free-resume', this.t('Свободная игра', 'Free Play'),
        this.t('Есть сохранение', 'Saved board'),
        () => this.actions.offer({mode:'free',puzzleId:savedFree.puzzleId})));
    }
    for (const track of freeTracks) games.append(this.freeModeOption(save,track));
    games.append(this.endlessModeOption(save));
    this.modeChoices.append(games);
  }

  private freeModeOption(save:Save,track:FreeTrack):HTMLButtonElement {
    const saved=storedSlot(save,'free')?.attempt;
    const threshold=track==='challenge'?challengeUnlockWins:config.unlockProposal.freePlayAfterNewWins;
    const locked=save.profile.solvedIds.length<threshold;
    const goal=activeTrackGoal(save,track);
    const subtitle=locked?this.unlockText(threshold)
      : goal?this.trackGoalText(goal.id,goal.progress):this.t('Ступень пройдена ✓','Step complete ✓');
    const open=this.modeButton(track,track==='relax'?'free-open':'challenge-open',trackName(this.language,track),subtitle,()=>this.actions.free(track));
    if(saved?.freeTrack===track && saved.status==='playing') {
      open.querySelector('.quick-copy')!.append(el('span','quick-status',this.t('Есть сохранение','Saved board')));
    }
    open.disabled=disabledOrLocked(this.disabled,locked);
    return open;
  }

  private endlessModeOption(save:Save):HTMLButtonElement {
    const {endlessAfterNewWins}=config.unlockProposal;
    const locked=save.profile.solvedIds.length<endlessAfterNewWins;
    const run = save.career.run;
    const solo = save.career.records[recordVersion].solo;
    const status = run?.status === 'active' ? this.t('Продолжить забег','Resume run')
      : run?.status === 'failed' ? this.t('Итог забега','Run result') : this.t('Начать забег','Start run');
    const endless = this.modeButton('endless', 'endless-open', 'Endless',
      locked ? this.unlockText(endlessAfterNewWins) : status, this.actions.endless);
    if (!locked) {
      const record = el('span','mode-record',this.t(`Рекорд · ${solo?.score ?? '—'}`,`Solo best · ${solo?.score ?? '—'}`));
      endless.querySelector('.quick-copy')!.append(record);
    }
    endless.disabled = disabledOrLocked(this.disabled, locked);
    return endless;
  }

  private trackGoalText(id: TrackGoalId, progress: number): string {
    const target = trackGoalDefinitions[id].target;
    const position: [string,string,string,string] = [`Дойдите до позиции ${target}`,`Reach position ${target}`,`Позиция ${target} достигнута`,`Reached position ${target}`];
    const labels: Record<TrackGoalId,typeof position> = {
      'relax-easy-v1': [`Решите ${target} лёгких поля`, `Solve ${target} Easy boards`,'Лёгкие поля','Easy boards'],
      'relax-normal-v1': ['Решите поле средней сложности','Solve a Normal board','Поле средней сложности','Normal board'],
      'challenge-hard-v1': ['Решите сложное поле','Solve a Hard board','Сложное поле','Hard board'],
      'challenge-expert-v1': ['Решите экспертное поле','Solve an Expert board','Экспертное поле','Expert board'],
      'relax-position-v1': position,
      'challenge-position-v1': position,
    };
    const [prompt, promptEN, done, doneEN] = labels[id];
    const completed = progress === target;
    const label = completed ? this.t(done,doneEN) : this.t(prompt,promptEN);
    return `${label} · ${progress}/${target}${completed?' ✓':''}`;
  }

  private campaignPosition(save: Save): string {
    const puzzle = campaignContinuation(save);
    const size = campaignSequence(save.contentVersion).length;
    if (!puzzle || save.profile.campaignCursor === size && storedSlot(save,'campaign')?.attempt.status !== 'playing') {
      return this.t(`Пройдено ${size}/${size}`,`Completed ${size}/${size}`);
    }
    const position = getPuzzle(puzzle).campaignPosition;
    return this.t(`Поле ${position} из ${size}`,`Board ${position} of ${size}`);
  }

  private campaignTrack(save: Save): HTMLElement {
    const position = save.profile.campaignCursor;
    const cap = campaignSequence(save.contentVersion).length;
    const route = el('div','campaign-track');
    route.setAttribute('aria-label',this.t(`${position} из ${cap} полей пройдено`,`${position} of ${cap} boards completed`));
    route.setAttribute('role','img');
    route.style.setProperty('--campaign-progress',`${100*position/cap}%`);
    for (let i=0;i<5;i++) route.append(el('i',position>=i*cap/4?'passed':''));
    return route;
  }

  private campaign(save: Save, historyOpen: boolean): void {
    const id = campaignContinuation(save);
    const position = id && getPuzzle(id).campaignPosition;
    const completed = campaignSequence(save.contentVersion).slice(0, save.profile.campaignCursor);
    const route = el('section','campaign-overview');
    route.append(el('strong','',this.campaignPosition(save)),this.campaignTrack(save));
    this.modeChoices.append(route);
    if (completed.length < campaignSequence(save.contentVersion).length || storedSlot(save,'campaign')?.attempt.status === 'playing') {
      this.modeChoices.append(this.button(this.t(`Продолжить · Поле ${position}`, `Continue · Board ${position}`),
        this.actions.campaign, 'campaign-continue', true));
    }

    const result = storedSlot(save, 'campaign')?.result;
    if (result) {
      const board = getPuzzle(result.puzzleId).campaignPosition;
      this.modeChoices.append(this.button(this.t(`Результат поля ${board}`, `Board ${board} result`),
        () => this.actions.offer({puzzleId:result.puzzleId,mode:'campaign'}), 'last-result'));
    }
    if (!completed.length) return;
    const details = el('details', 'campaign-history');
    details.open = historyOpen;
    const summary = el('summary', '', this.t('Пройденные поля', 'Completed boards'));
    const list = el('div', 'replay-list');
    for (const puzzleId of completed) {
      const puzzle = getPuzzle(puzzleId);
      const item = this.button(String(puzzle.campaignPosition),
        () => this.actions.offer({puzzleId, mode:'campaign'},true), `replay-${puzzleId}`);
      item.setAttribute('aria-label', this.t(`Открыть поле ${puzzle.campaignPosition}`, `Open board ${puzzle.campaignPosition}`));
      list.append(item);
    }
    details.append(summary, list);
    this.modeChoices.append(details);
  }
  private quests(save:Save):void {
    const panel = el('details', 'hub-panel');
    panel.id = 'daily-goals';
    const set = save.meta.quests;
    const paid = set?.slots.filter(slot => slot.paid).length;
    const count = paid === undefined ? '' : ` · ${paid}/${set!.slots.length}`;
    panel.append(el('summary', '', this.t('Задания дня', 'Daily goals') + count));
    if(!set){panel.append(el('p','muted',save.profile.solvedIds.length<5?this.t("Откроются после пяти разных побед.", "Solve five different boards to unlock goals."):this.t("Сегодня можно продолжить маршрут.", "You can continue the campaign today.")));this.root.append(panel);return;}
    for (const [i,slot] of set.slots.entries()) {
      const goal = goals.get(slot.goalId)!;
      const button = this.button('', () => this.actions.quest(i));
      button.dataset.quest = String(i);
      button.disabled = this.disabled || slot.paid;
      button.classList.add('quest');
      const copy = el('span','quest-copy');
      copy.append(el('span','',this.t(goal.ru,goal.en)));
      if (!slot.paid && this.actions.questStartsNewRun(i)) copy.append(el('small','quest-action',this.t('Начать новый забег','Start a new run')));
      button.append(copy,el('strong','',slot.paid?'✓ +10':`${slot.progress} / ${slot.target}`));
      panel.append(button);
    }
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
    if (today) {
      const copy = el('span','today-copy');
      const current = storedSlot(save,'daily:'+day)?.attempt;
      const action = current?.status === 'playing' ? this.t(`Продолжить · ${current.lives}/3 жизни`,`Continue · ${current.lives}/3 lives`)
        : current?.status === 'won' || save.meta.completedDates.includes(day) ? this.t('Открыть результат','View result')
        : current?.status === 'out-of-lives' ? this.t('Открыть итог','View attempt')
        : this.t(`Играть · ${config.dailyLives} жизни`,`Play · ${config.dailyLives} lives`);
      copy.append(el('strong','',this.t('Сегодня','Today')),el('span','',action));
      button.append(this.dateTicket(day),copy,this.arrow());
      button.setAttribute('aria-label',this.t(`Сегодня, ${this.dateLabel(day)}. ${action}`, `Today, ${this.dateLabel(day)}. ${action}`));
    } else {
      button.append(el('strong','',day.slice(8,10)+'.'+day.slice(5,7)),el('span','',status));
      button.setAttribute('aria-label', `${day}, ${status}`);
    }
    return button;
  }

  private monthGrid(save:Save):HTMLElement {
    const day = save.meta.effectiveDay;
    const month = day.slice(0,7);
    const first = calendarDayIndex(month+'-01');
    const [year, number] = month.split('-').map(Number);
    const end = calendarDayIndex(new Date(Date.UTC(year!,number!,1)).toISOString().slice(0,10));
    const grid = el('section','daily-month');
    const title = el('h2','',`${this.monthName(month)} ${year}`);
    title.id = 'calendar-month';
    grid.setAttribute('aria-labelledby',title.id);
    const dates = el('div','month-grid');
    const names = this.language === 'ru' ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for (const name of names) dates.append(el('abbr','month-weekday',name));
    const offset = (new Date(first*86_400_000).getUTCDay()+6)%7;
    for(let i=0;i<offset;i++) dates.append(el('span','month-padding'));
    const solved = new Set(save.meta.completedDates);
    for(let index=first;index<end;index++) {
      const date = dayFromIndex(index);
      const attempt = storedSlot(save,'daily:'+date)?.attempt;
      const available = dateAvailable(save.profile.createdAt,save.profile.timeZone,day,date) || canResumeDaily(attempt);
      const current = date === day;
      const status = solved.has(date) ? 'solved' : attempt?.status === 'playing' ? 'started'
        : attempt?.status === 'out-of-lives' ? 'defeat' : date > day ? 'future' : available ? 'available' : 'closed';
      const button = this.button('',()=>this.actions.daily(date));
      button.className = 'month-day';
      button.dataset.day = date;
      button.dataset.state = status;
      button.disabled = this.disabled || !available;
      if (current) button.setAttribute('aria-current','date');
      if (date === save.attempt.dayKey) button.classList.add('selected-date');
      const spoken = status==='closed' ? this.t('Дата недоступна','Date unavailable') : this.dayStatus(save,date);
      button.setAttribute('aria-label',`${this.dateLabel(date)} · ${spoken}`);
      const numberLabel = el('span','',String(index-first+1));
      const mark = el('span','month-day-mark',status==='solved'?'✓':status==='started'?'•':status==='defeat'?'×':'');
      mark.setAttribute('aria-hidden','true');
      button.append(numberLabel,mark);
      dates.append(button);
    }
    grid.append(title,dates);
    return grid;
  }

  private trophyRow(save: Save, month: string, status = trophyMonthStatus(save,month)): HTMLElement {
    const row = el('section','monthly-trophy');
    row.dataset.month = month;
    row.dataset.status = status.kind;
    const seal = el('span','month-seal');
    seal.setAttribute('aria-hidden','true');
    seal.append(el('b','',month.slice(5)),el('span','',month.slice(0,4)));
    const name = this.monthName(month);
    const copy = el('div','month-copy');
    copy.append(el('strong','',`${name.charAt(0).toLocaleUpperCase(this.language)}${name.slice(1)} ${month.slice(0,4)} · ${status.solved}/${status.total}`));
    let subtitle: string;
    if (status.kind === 'earned') subtitle = this.t('Трофей получен','Trophy earned');
    else if (status.kind === 'partial') {
      const next = this.monthName(status.nextMonth);
      subtitle = this.t(`Первый полный месяц для трофея — ${next}`,`Your first full trophy month is ${next}`);
    } else if (status.kind === 'missed') subtitle = this.t('Этот месяц полностью закрыть уже нельзя','This month can no longer be completed');
    else subtitle = status.total-status.solved === 1 ? this.t('Остался один день до трофея','One day left to earn the trophy')
      : this.t('Решите задачи за все дни месяца','Solve every day of the month');
    copy.append(el('span','',subtitle));
    row.append(seal,copy);
    if (status.kind === 'available' && status.playableDay && status.playableDay !== save.meta.effectiveDay) {
      const day = status.playableDay;
      const button = this.button(this.t(`Открыть задачу за ${this.dateLabel(day)}`,`Open the challenge for ${this.dateLabel(day)}`),
        ()=>this.actions.daily(day));
      button.classList.add('trophy-play-day');
      button.dataset.day = day;
      row.append(button);
    }
    return row;
  }

  private trophyArchive(save: Save): void {
    const months = Object.keys(save.meta.monthlyTrophies ?? {}).sort().reverse();
    if (!months.length) return;
    const archive = el('details','hub-panel');
    archive.id = 'trophy-archive';
    archive.append(el('summary','',this.t('Мои трофеи','My trophies')));
    for (const month of months) archive.append(this.trophyRow(save,month));
    this.root.append(archive);
  }

  private calendar(save:Save):void {
    this.heading(this.t('Календарь задач', 'Challenge calendar'), '', true);
    this.root.append(this.button(this.t('← На главную', '← Home'),()=>this.actions.navigate('home'),'calendar-back'));
    const today = calendarDayIndex(save.meta.effectiveDay);
    const created = calendarDayIndex(profileDay(save.profile.createdAt,save.profile.timeZone));
    this.root.append(this.dateButton(save,save.meta.effectiveDay));
    const currentMonth = save.meta.effectiveDay.slice(0,7);
    const month = this.trophyRow(save,save.meta.calendarTrophyMonth ?? currentMonth);
    month.id = 'month-trophy';
    month.tabIndex = -1;
    this.root.append(this.monthGrid(save),month);
    for(const past of reachablePastTrophies(save)) this.root.append(this.trophyRow(save,past.month,past.status));
    this.quests(save);
    this.trophyArchive(save);
    const previousMonthEnd = calendarDayIndex(currentMonth+'-01')-1;
    if (Math.max(created,today-config.calendar.previousDaysAccessible)<=previousMonthEnd) {
      this.root.append(el('h2', 'calendar-subtitle', this.t('Прошлые задачи','Past challenges')));
      const past = el('div','date-grid');
      for(let i=previousMonthEnd;i>=Math.max(created,today-config.calendar.previousDaysAccessible);i--) past.append(this.dateButton(save,dayFromIndex(i)));
      this.root.append(past);
    }
    const older = [save.attempt, ...Object.values(save.meta.inactive).map(slot => slot.attempt)]
      .filter(attempt => canResumeDaily(attempt) && !dateAvailable(save.profile.createdAt, save.profile.timeZone, save.meta.effectiveDay, attempt.dayKey!));
    if (older.length) {
      const old = el('section', 'hub-panel');
      old.id = 'older-dates';
      old.append(el('h2', '', this.t('Начатые ранее', 'Earlier unfinished boards')));
      for (const {dayKey} of older) {
        const day = dayKey!;
        old.append(this.button(day + this.t(' · продолжить', ' · resume'), () => this.actions.daily(day), `resume-${day}`));
      }
      this.root.append(old);
    }
  }
  private album(save: Save): void {
    const total = save.profile.fragments;
    const assembled = Math.floor(total / partCount);
    const limit = config.cards.length;
    const summary = assembled === limit ? nextFragmentText(save)
      : this.t(`${assembled} из ${limit} приборов`, `${assembled} of ${limit} instruments`);
    this.heading(this.t('Мастерская счёта', 'The Counting Workshop'), summary);
    this.root.append(this.button(this.t('← На главную','← Home'), () => this.actions.navigate('home'), 'album-back'));
    if (assembled === limit) {
      const complete = el('div','collection-complete');
      complete.append(menuIcon('workshop'),el('strong','',this.t('12 из 12 приборов','12 of 12 instruments')));
      this.root.append(complete);
    }
    if (assembled < limit) {
      const parts = partsOnShelf(total, assembled);
      const bench = this.button('', () => this.openCard(assembled, parts, 'workbench','current'), 'workbench');
      bench.classList.add('workbench');
      bench.setAttribute('aria-haspopup','dialog');
      const art = this.art(assembled, parts, 'next');
      art.setAttribute('aria-hidden','true');
      const copy = el('span','workbench-copy');
      copy.append(el('span','workbench-stage',this.t('На верстаке','On the bench')),
        el('strong','',this.toolTitle(assembled)),
        partMeter(parts),
        el('span','',this.t(`${parts} / 4 частей`, `${parts} of 4 parts`)),
        el('span','workbench-next',this.nextPartLabel(assembled,parts)),
        el('span','workbench-next',nextFragmentText(save)));
      const progress = workshopTarget(save.profile.solvedIds.length,total);
      if (progress) copy.append(this.workshopMeter(progress.percent));
      bench.append(art,copy);
      this.root.append(bench);
    }

    const grid = el('div','album-grid');
    config.cards.forEach((card, index) => {
      const parts = partsOnShelf(total,index);
      const id = `instrument-card-${card.id}`;
      const view=parts===partCount?'assembled':index===assembled?'current':'future';
      const button = this.button('', () => this.openCard(index,parts,id,view), id);
      button.dataset.card = card.id;
      button.dataset.assembly = parts === partCount ? 'complete' : index === assembled ? 'current' : 'pending';
      button.classList.add('collection-card');
      button.setAttribute('aria-haspopup','dialog');
      const art = this.art(index, parts, parts || index === assembled ? 'next' : 'outline');
      art.setAttribute('aria-hidden','true');
      button.append(art, el('strong','',this.toolTitle(index)));
      if(view==='future') button.append(el('span','muted',this.t('Позже в коллекции','Later in the collection')),
        el('span','muted',this.instrumentUnlockLabel(index)));
      else button.append(partMeter(parts),el('span','muted',this.t(`${parts} / 4 частей`, `${parts} of 4 parts`)));
      grid.append(button);
    });
    this.root.append(grid);
  }
  private workshopMeter(percent:number):HTMLElement {
    const meter=el('span','collection-progress');
    const bar=el('span','collection-progress-track');
    const fill=el('i');
    fill.style.width=percent+'%';
    bar.append(fill);
    bar.setAttribute('aria-hidden','true');
    meter.append(bar,el('strong','',percent+'%'));
    meter.setAttribute('aria-label',this.t(`${percent}% до детали`,`${percent}% to next part`));
    return meter;
  }

  private profile(save: Save): void {
    const p = save.profile;
    const c = save.career;
    this.heading(this.t('Профиль', 'Profile'));
    this.root.append(this.button(this.t('← На главную','← Home'), () => this.actions.navigate('home'), 'profile-back'));
    const rank = this.button('', () => this.openRank(save, 'profile-rank'), 'profile-rank');
    rank.classList.add('mode-option');
    rank.setAttribute('aria-haspopup', 'dialog');
    const rankCopy = el('span', 'quick-copy');
    rankCopy.append(el('strong', '', this.t(`Ранг ${p.rank}`, `Rank ${p.rank}`)),
      el('span', 'quick-status', `${p.xp} / ${rankThreshold(p.rank)} XP`));
    const tier = rankThreshold(p.rank);
    const rankBar = el('span','rank-hero-progress');
    rankBar.setAttribute('aria-hidden','true');
    rankBar.style.setProperty('--rank-progress',`${100*p.xp/tier}%`);
    rankCopy.append(rankBar);
    rank.append(menuIcon('rank'),rankCopy,this.arrow());

    const latest = Object.entries(c.achievements).reduce<string | undefined>((id, [candidate, entry]) =>
      !id || entry.earnedAt >= c.achievements[id]!.earnedAt ? candidate : id, undefined);
    const achievement = config.achievements.find(badge => badge.id === latest);
    const header = el('section','profile-hero');
    if (achievement) {
      const recent = el('div','profile-achievement');
      const achieved = el('span','achievement-stamp','✓');
      achieved.setAttribute('aria-hidden','true');
      const caption=el('span','achievement-copy');
      caption.append(el('span','muted',this.t('Последний знак','Latest badge')),
        el('strong','',this.t(achievement.titleRU,achievement.titleEN)));
      recent.append(achieved,caption);
      header.append(recent);
    } else {
      const first = config.achievements.find(badge=>badge.metric==='distinctWins');
      if (first) header.append(el('p','achievement-goal',this.t(
        `${first.titleRU} · ${achievementValue(save,first.metric)}/${first.threshold}`,
        `${first.titleEN} · ${achievementValue(save,first.metric)}/${first.threshold}`)));
    }
    header.append(rank);
    this.root.append(header);

    const overview = el('dl','profile-overview');
    for (const [label, value] of [
      [this.t('Кампания','Campaign'), `${p.campaignCursor}/${campaignSequence(save.contentVersion).length}`],
      [this.t('Задачи дня','Daily'), String(save.meta.completedDates.length)],
      [this.t('Приборы','Instruments'), `${p.paidCardIds.length}/${config.cards.length}`],
    ] as const) {
      const item = el('div');
      item.append(el('dt','',label), el('dd','',value));
      overview.append(item);
    }
    const records = el('section','hub-panel profile-records');
    records.append(el('h2','',this.t('Рекорды Endless','Endless records')));
    const bank = c.records[recordVersion];
    for (const [title, record] of [[this.t('Самостоятельно','Solo'),bank.solo], [this.t('С помощью','Assisted'),bank.assisted]] as const) {
      const entry = el('div','profile-record');
      const score = record ? this.t(`${record.score} очк. · ${record.boards} пол.`, `${record.score} pts · ${record.boards} boards`) : '—';
      entry.append(el('span','',title), el('strong','',score));
      records.append(entry);
    }
    if (!bank.solo || !bank.assisted) records.append(el('p','muted',this.t(
      'Завершите забег Endless. Подсказки учитываются в отдельном рекорде.',
      'Finish an Endless run. Runs with hints have a separate record.')));
    if (c.run && c.run.status !== 'ended') records.append(el('p','muted',this.t(
      `Текущий забег · ${c.run.score} очк. · ${c.run.solvedStages} пол. Итог появится после завершения.`,
      `Current run · ${c.run.score} pts · ${c.run.solvedStages} boards. Finish it to record the result.`)));
    this.root.append(records, overview);

    const stats = el('details','hub-panel profile-details');
    stats.id = 'profile-statistics';
    stats.append(el('summary','',this.t('Статистика по режимам','Statistics by mode')),
      el('p','muted',this.t(`Разных полей ${p.solvedIds.length} · Полных планов дня ${save.meta.setReceipts.length}`,
        `Unique boards ${p.solvedIds.length} · Daily goal sets ${save.meta.setReceipts.length}`)));
    if (c.partialHistory) stats.append(el('p','muted',this.t(
      `Подробный учёт с ${profileDay(c.since,p.timeZone)}. Старые уникальные победы сохранены.`,
      `Detailed tracking since ${profileDay(c.since,p.timeZone)}. Earlier unique wins still count.`)));
    const labels = {campaign:this.t('Кампания','Campaign'), free:this.t('Свободная игра','Free Play'), daily:'Daily', endless:'Endless'};
    for (const mode of ['campaign','free','daily','endless'] as const) {
      const s = c.modes[mode];
      const box = el('div','stats-mode');
      box.dataset.stats = mode;
      const rows = el('dl', 'stat-rows');
      for (const [ru, en, value] of [
        ['Попытки', 'Attempts', s.starts],
        ['Завершения', 'Completions', s.completions],
        ['Активное время', 'Time played', formatDuration(s.seconds, this.language)],
        ['Ошибки', 'Mistakes', s.mistakes],
        ['Отмены', 'Undos', s.undos],
        ['Перезапуски', 'Restarts', s.restarts],
        ['Объяснения', 'Explanations', s.explains],
        ['Раскрытия чисел', 'Reveals', s.reveals],
      ] as const) {
        const row = el('div');
        row.append(el('dt', '', this.t(ru, en)), el('dd', '', String(value)));
        rows.append(row);
      }
      box.append(el('h3', '', labels[mode]), rows);
      stats.append(box);
    }
    this.root.append(stats);

    const badges = el('details','hub-panel profile-details');
    badges.id = 'profile-badges';
    const earnedCount = Object.keys(c.achievements).length;
    badges.append(el('summary','',this.t(`Достижения · ${earnedCount}/${config.achievements.length}`,
      `Achievements · ${earnedCount}/${config.achievements.length}`)));
    for (const badge of config.achievements) {
      const earned = c.achievements[badge.id];
      const row = el('div','badge');
      row.dataset.badge = badge.id;
      row.classList.toggle('earned', !!earned);
      row.append(el('strong','',`${earned ? '✓ ' : ''}${this.t(badge.titleRU,badge.titleEN)}`),
        el('span','muted',earned ? profileDay(earned.earnedAt,p.timeZone)
          : `${Math.min(badge.threshold,achievementValue(save,badge.metric))} / ${badge.threshold}`));
      badges.append(row);
    }
    this.root.append(badges);
  }
  openInstrumentReward(save: Save): void {
    if (this.reward.hidden || this.reward.disabled || this.dialog.open) return;
    const award = instrumentAward(save.result);
    if (!award) return;
    this.language = save.settings.language;
    this.openCard(award.index, award.parts, this.reward.id,'receipt');
  }

  private nextPartLabel(index:number,parts:number):string {
    return this.t(`Следующая деталь · ${config.cards[index]!.partsRU[parts]}`,`Next part · ${partsEN[index]![parts]}`);
  }

  private instrumentUnlockLabel(index:number):string {
    return this.unlockText(config.collection.fragmentWinThresholds[index*partCount]!);
  }

  private openCard(index: number, parts: number, trigger: string, view:CardView): void {
    const card = config.cards[index]!;
    const body = document.getElementById('card-body')!;
    const names = this.language === 'en' ? partsEN[index]! : card.partsRU;
    document.getElementById('card-title')!.textContent = this.toolTitle(index);
    document.getElementById('close-card')!.textContent = trigger === this.reward.id
      ? this.t('К результату','Back to result') : this.t('В мастерскую','Back to workshop');
    body.replaceChildren(this.art(index,parts,view==='future'?'outline':view==='current'?'next':'earned'));
    const status=parts===partCount?this.t('Собрано · 4/4','Assembled · 4/4')
      : view==='future'?this.t('Позже в коллекции','Later in the collection')
      : view==='receipt'?this.t(`На момент награды · ${parts}/4`,`At the time of the reward · ${parts}/4`)
      : this.t(`Собрано · ${parts}/4`,`Assembled · ${parts}/4`);
    body.append(el('p','next-part',status));
    if(view==='future')body.append(el('p','muted',this.instrumentUnlockLabel(index)));
    if(view==='current')body.append(el('p','next-part',this.nextPartLabel(index,parts)));
    const list = el('ol', 'parts-list');
    names.forEach((name, i) => list.append(el('li', i < parts ? 'earned' : '', `${i < parts ? '✓ ' : ''}${name}`)));
    body.append(list);
    this.showCard(trigger);
  }

  private showCard(trigger: string): void {
    this.returnTarget = trigger;
    this.actions.blocking(true);
    this.dialog.showModal();
  }

  hideInstrumentReward(): void {
    this.reward.hidden = true;
    this.reward.classList.remove('arrived');
  }

  private renderUnlockAction(save:Save,detail:HTMLElement,disabled:boolean):void {
    const modes=save.result?.unlockedModes ?? [];
    const double=modes.includes('endless') && (modes.includes('challenge') || challengeUnlockWins===config.unlockProposal.endlessAfterNewWins);
    const daily=modes.includes('daily');
    const label=double?this.t('Выбрать новый режим','Choose a new mode')
      : daily?this.t('Открыть задачу дня','Open Daily challenge')
      : modes.includes('challenge')?this.t('Попробовать испытание','Try Challenge')
      : modes.includes('endless')?this.t('Попробовать Endless','Try Endless')
      : this.t('Попробовать спокойную игру','Try Relax');
    const action=detail.querySelector('button') ?? this.button('',()=>{},'result-unlock');
    action.className='win-unlock-action';
    action.textContent=label;
    action.disabled=disabled;
    action.onclick=()=>{
      if(double) {
        this.showModePage(save,'unlocked');
        if(!this.modeDialog.open)this.modeDialog.showModal();
        this.modeChoices.querySelector('button')?.focus({preventScroll:true});
      } else if(daily) this.actions.daily(save.meta.effectiveDay);
      else if(modes.includes('challenge')) this.actions.free('challenge');
      else if(modes.includes('endless')) this.actions.endless();
      else this.actions.free('relax');
    };
    if(double){action.setAttribute('aria-haspopup','dialog');action.setAttribute('aria-controls','mode-dialog');}
    else {action.removeAttribute('aria-haspopup');action.removeAttribute('aria-controls');}
    if(!detail.contains(action))detail.replaceChildren(action);
  }

  skipWorkshopReveal(): void { this.workshopReveal.skip(); }
  hideWorkshopReveal(): void { this.workshopReveal.hide(); }
  renderResult(save: Save, fresh = false, disabled = false): void {
    const r = save.result;
    const details = document.getElementById('reward-breakdown')!;
    details.replaceChildren();
    if (!r) return;
    const trophy = document.getElementById('daily-trophy-result')!;
    trophy.hidden = !r.dailyTrophyMonth;
    trophy.textContent = r.dailyTrophyMonth
      ? this.t(`Трофей ${this.monthName(r.dailyTrophyMonth,true)} получен`,`${this.monthName(r.dailyTrophyMonth)} trophy earned`) : '';
    const animateReward = fresh && !r.workshop;
    this.workshopReveal.show(r,this.language,{
      t:(ru,en)=>this.t(ru,en),
      part:(index,part)=>this.partName(index,part-1),
      art:(index,parts)=>this.art(index,parts,'next'),
    },fresh && !disabled);
    const award = instrumentAward(r);
    const announcement = unlockAnnouncement(this.language, r.unlockedModes);
    document.getElementById('result')!.classList.toggle('shows-unlock', Boolean(announcement));
    let title = '';
    if (award) {
      const { index, parts } = award;
      const complete = parts === partCount;
      if (this.reward.hidden || this.reward.dataset.result !== r.id) {
        const image = el('span','instrument-reward-art');
        image.setAttribute('aria-hidden','true');
        const art = this.art(index,parts);
        art.querySelector(`[data-part="${parts}"]`)?.classList.add('fitted-now');
        image.append(art);
        if (animateReward) {
          const motes = el('span','reward-motes');
          for (let i = 0; i < (complete ? 5 : 3); i++) motes.append(el('i'));
          image.append(motes);
        }
        this.reward.replaceChildren(image, el('span','instrument-reward-label'));
        this.reward.dataset.result = r.id;
        this.reward.dataset.complete = String(complete);
        this.reward.classList.toggle('arrived', animateReward);
        this.reward.hidden = false;
      }
      const card = config.cards[index]!;
      const name = this.t(card.partsRU[parts - 1]!, partsEN[index]![parts - 1]!);
      const label = this.reward.querySelector('.instrument-reward-label')!;
      label.textContent = complete ? this.t(`${this.toolTitle(index)} · собрано 4/4`, `${this.toolTitle(index)} · assembled 4/4`)
        : index === 0 && parts === 1 ? this.t('Рамка счётов · 1/4','Abacus frame · 1/4')
        : `${this.toolTitle(index)} · ${name} · ${parts}/4`;
      this.reward.disabled = disabled;
    } else {
      this.hideInstrumentReward();
    }
    if (!award && !announcement) {
      if (r.rankUps) title = this.t(`Новый ранг: ${r.rankLevel ?? save.profile.rank}`, `New rank: ${r.rankLevel ?? save.profile.rank}`);
      else if (r.setCoins) title = this.t('План дня выполнен','Daily goals complete');
    }
    const detail=document.getElementById('result-detail')!;
    if(announcement)this.renderUnlockAction(save,detail,disabled);
    else detail.textContent=title;
    const goal = document.getElementById('relax-goal-result')!;
    const count = r.relaxGoalProgress;
    const snapshot = r.trackGoal;
    goal.hidden = count === undefined && !snapshot;
    if (snapshot) {
      const label = this.trackGoalText(snapshot.id,snapshot.progress);
      goal.textContent = snapshot.stepComplete ? `${label} · ${this.t('Ступень пройдена','Step complete')}` : label;
    } else goal.textContent = count === undefined ? '' : `${count===relaxGoalTarget ? this.t('Цель выполнена','Goal complete') : this.t('Лёгкие поля','Easy boards')} · ${count}/${relaxGoalTarget}`;
    goal.classList.toggle('pending-goal',snapshot !== undefined && snapshot.progress < trackGoalDefinitions[snapshot.id].target);
    const sources:[string,number][]=[[this.t("За поле", "Board"),r.baseCoins??(r.first?config.difficultyRewards[getPuzzle(r.puzzleId).difficulty].coins:0)],[this.t("За дату", "Daily date"),r.dailyCoins??0],[this.t("За цели", "Goals"),r.taskCoins??0],[this.t("За весь план", "Full goal set"),r.setCoins??0],[this.t("За ранг", "Rank"),r.rankCoins??r.rankUps*config.rank.rewardCoins],[this.t("За прибор", "Instrument"),r.cardCoins]];
    for(const [name,coins] of sources)if(coins)details.append(el('p','',`${name}: +${coins}`));details.append(el('p','',this.t(`Опыт: +${r.xp}`, `XP: +${r.xp}`)));if(r.fragments)details.append(el('p','',this.t(`Новых деталей: ${r.fragments} · всего ${r.collectionFragments} / 48`, `New parts: ${r.fragments} · total ${r.collectionFragments} / 48`)));if(r.rankUps)details.append(el('p','',this.t(`Новый ранг: ${r.rankLevel??save.profile.rank}`, `New rank: ${r.rankLevel??save.profile.rank}`)));
    if (announcement) details.append(el('p','',announcement));
    if(r.stageScore!==undefined)details.append(el('p','',this.t(`За этап: +${r.stageScore} очков · В забеге: ${r.runScore}`, `Stage points: +${r.stageScore} · Run score: ${r.runScore}`)));for(const id of r.badges??[]){const badge=config.achievements.find(b=>b.id===id)!;details.append(el('p','',this.t(`Знак: ${badge.titleRU}`,`Badge: ${badge.titleEN}`)));}
  }
}
function disabledOrLocked(disabled:boolean,locked:boolean):boolean{return disabled||locked;}
