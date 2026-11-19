import { localize } from './locale';
import type { Language } from './locale';
import { getTierProgress } from '@danilah/mini-games-kit/core';
import { config, getPuzzle, routes } from '../content/catalog';
import { storedSlot } from '../app/session';
import { mastered, goals } from '../meta/missions';
import { calendarDayIndex, dateAvailable, dayFromIndex, profileDay } from '../meta/calendar';
import type { Save } from '../app/model';
import { rankThreshold } from '../app/model';
import { achievementValue, recordVersion } from '../meta/career';
import type { Difficulty } from '../core/types';
import type { MetaScreen, Offer } from '../meta/types';

const artwork=import.meta.glob('../../docs/spec/product/meta_v08/art/*.svg',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const bandName=(language:Language,difficulty:Difficulty)=>{const t=(ru:string,en:string)=>localize(language,ru,en);return {easy:t("Легко", "Easy"),standard:t("Обычно", "Normal"),hard:t("Сложно", "Hard"),expert:t("Эксперт", "Expert")}[difficulty];};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
function cardArt(index:number,parts:number,language:Language):HTMLElement {
  const wrapper=el('div','instrument');const card=config.cards[index]!;wrapper.innerHTML=artwork[`../../docs/spec/product/meta_v08/art/${card.id}.svg`]??'';
  const title=language==='en'?card.titleEN:card.titleRU;
  const svg=wrapper.querySelector('svg');if(svg){svg.setAttribute('aria-label',localize(language,`${title}, ${parts} из 4 частей`,`${title}, ${parts} of 4 parts`));svg.querySelector('title')!.textContent=title;
    for(let i=1;i<=4;i++){const layer=svg.querySelector(`[id="part-${i}"]`);if(layer){if(i>parts)layer.setAttribute('display','none');layer.setAttribute('data-part',String(i));layer.removeAttribute('id');}}
    svg.querySelector('[id="plate"]')?.removeAttribute('id');
  }return wrapper;
}
export function nextFragmentText(save:Save):string {
  if(save.profile.fragments>=48)return localize(save.settings.language,'Мастерская собрана','Workshop complete');
  const progress=getTierProgress(save.profile.solvedIds.length,config.collection.fragmentWinThresholds);
  const remaining=progress.complete?progress.nextTier?.remaining:progress.target-save.profile.solvedIds.length;
  return localize(save.settings.language,`Новых полей до детали: ${remaining??0}`,`New boards until next part: ${remaining??0}`);
}
interface Actions { navigate:(screen:MetaScreen)=>void; campaign:()=>void; free:(band:Difficulty)=>void; daily:(day:string)=>void; endless:()=>void; offer:(offer:Offer)=>void; quest:(index:number)=>void; blocking:(blocked:boolean)=>void }
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
  private disabled=false;
  constructor(private readonly root:HTMLElement,private readonly actions:Actions){this.dialog.addEventListener('close',()=>actions.blocking(false));document.getElementById('close-card')!.onclick=()=>this.dialog.close();}
  openRank(save:Save):void {if(this.disabled)return;this.language=save.settings.language;const body=document.getElementById('card-body')!,p=save.profile;document.getElementById('card-title')!.textContent=this.t(`Ранг ${p.rank}`, `Rank ${p.rank}`);body.replaceChildren(el('p','',`${p.xp} / ${rankThreshold(p.rank)} XP`),el('p','',this.t(`До следующего ранга: ${rankThreshold(p.rank)-p.xp} XP`, `${rankThreshold(p.rank)-p.xp} XP to next rank`)),el('p','',this.t(`За повышение: +${config.rank.rewardCoins} монет`, `Rank-up reward: +${config.rank.rewardCoins} coins`)),el('p','muted',this.t(`Разных решённых полей: ${p.solvedIds.length} / 240`, `Unique boards solved: ${p.solvedIds.length} / 240`)));document.getElementById('close-card')!.textContent=this.t('Продолжить','Continue');this.actions.blocking(true);this.dialog.showModal();}
  closeCard():boolean{if(!this.dialog.open)return false;this.dialog.close();return true;}
  private button(text:string,action:()=>void,id?:string,primary=false):HTMLButtonElement {const b=el('button',primary?'primary':'hub-button',text);b.type='button';b.disabled=this.disabled;b.onclick=action;if(id)b.id=id;return b;}
  private heading(title:string,subtitle=''):void{const head=el('div','hub-heading');head.append(el('p','kicker',this.t("СЧЁТНАЯ МАСТЕРСКАЯ", "THE COUNTING WORKSHOP")),el('h1','',title));if(subtitle)head.append(el('p','muted',subtitle));this.root.append(head);}
  render(save:Save,disabled:boolean):void {
    this.language=save.settings.language;const screen=save.meta.screen;this.disabled=disabled;this.root.hidden=screen==='play';if(screen==='play')return;
    const selected=(document.getElementById('free-band') as HTMLSelectElement|null)?.value;
    const focused=document.activeElement?.id;this.root.replaceChildren();
    if(screen==='home')this.home(save,selected);else if(screen==='calendar')this.calendar(save);else if(screen==='profile')this.profile(save);else this.album(save);
    if(focused&&this.root.contains(document.getElementById(focused)))document.getElementById(focused)?.focus({preventScroll:true});
  }
  private home(save:Save,selected?:string):void {
    const a=save.attempt,p=getPuzzle(a.puzzleId),wins=save.profile.solvedIds.length;
    const boardName=this.t(`Поле ${p.campaignPosition}`,`Board ${p.campaignPosition}`);
    const resumeName=a.mode==='endless'?'Endless':a.mode==='daily'?a.dayKey:a.mode==='free'?this.t('Свободная игра','Free Play'):boardName;
    this.heading(this.t("Продолжим?", "Ready to play?"),this.t("Одно число связывает сразу два равенства.", "One number can connect two equations."));
    if(a.status!=='won'&&!(a.mode==='endless'&&save.career.run?.status==='ended'))this.root.append(this.button(this.t(`Продолжить · ${resumeName}`,`Resume · ${resumeName}`),()=>this.actions.navigate('play'),'continue-game',true));
    else if(wins>=5&&!save.meta.completedDates.includes(save.meta.effectiveDay))this.root.append(this.button(this.t("Сегодняшняя задача", "Today's challenge"),()=>this.actions.daily(save.meta.effectiveDay),'daily-primary',true));
    else this.root.append(this.button(save.profile.campaignCursor>=240?this.t("Маршрут завершён ✓", "Campaign complete ✓"):this.t("Продолжить маршрут", "Continue campaign"),this.actions.campaign,'campaign-primary',true));
    const modes=el('section','hub-panel');modes.append(el('h2','',this.t("Играть", "Play")));
    modes.append(this.button(this.t("Маршрут · ", "Campaign · ")+Math.min(240,save.profile.campaignCursor+1)+' / 240',this.actions.campaign,'campaign-open'));
    const free=el('div','free-row'),select=el('select');select.id='free-band';select.setAttribute('aria-label',this.t("Сложность свободной игры", "Free Play difficulty"));select.disabled=disabledOrLocked(this.disabled,wins<3);
    for(const band of mastered(save)){const option=el('option','',bandName(this.language,band));option.value=band;select.append(option);}select.value=selected&&mastered(save).includes(selected as Difficulty)?selected:save.meta.freeDifficulty;if(!select.value&&select.options[0])select.value=select.options[0].value;
    const start=this.button(wins<3?this.t("Свободная игра · после 3 побед", "Free Play · after 3 wins"):this.t("Свободная игра","Free Play"),()=>this.actions.free(select.value as Difficulty),'free-open');start.disabled=this.disabled||wins<3;free.append(select,start);modes.append(free);
    const daily=this.button(wins<5?this.t("Daily · после 5 побед", "Daily · after 5 wins"):this.t("Календарь · ", "Calendar · ")+save.meta.effectiveDay,()=>this.actions.navigate('calendar'),'calendar-open');daily.disabled=this.disabled||wins<5;modes.append(daily);
    const endless=this.button(wins<15?this.t("Endless · после 15 побед", "Endless · after 15 wins"):save.career.run&&save.career.run.status!=='ended'?this.t("Продолжить Endless", "Resume Endless"):this.t("Начать Endless", "Start Endless"),this.actions.endless,'endless-open');endless.disabled=this.disabled||wins<15;modes.append(endless);
    modes.append(this.button(this.t("Профиль и рекорды", "Profile and records"),()=>this.actions.navigate('profile'),'profile-open'));
    if(a.status==='won')modes.append(this.button(this.t("Последний результат", "Last result"),()=>this.actions.navigate('play'),'last-result'));
    this.root.append(modes);this.quests(save);
    const preview=el('section','hub-panel album-preview');preview.append(el('h2','',this.t("Мастерская счёта", "The Counting Workshop")));
    const index=Math.min(11,Math.floor(save.profile.fragments/4)),parts=Math.min(4,Math.max(0,save.profile.fragments-index*4));preview.append(this.art(index,parts),el('p','',`${this.toolTitle(index)} · ${parts}/4`),el('p','muted',nextFragmentText(save)));
    const album=this.button(this.t(`Открыть альбом · ${Math.floor(save.profile.fragments/4)} / 12`, `Open album · ${Math.floor(save.profile.fragments/4)} / 12`),()=>this.actions.navigate('album'),'album-open');album.disabled=this.disabled||wins<3;preview.append(album);if(wins<3)preview.append(el('p','muted',this.t("Первая деталь появится на третьей новой победе.", "Solve three different boards to earn your first part.")));this.root.append(preview);
    if(save.profile.campaignCursor){const details=el('details','hub-panel'),summary=el('summary','',this.t("Пройденные поля", "Completed boards"));details.append(summary);const list=el('div','replay-list');
      for(const id of routes.campaignSequence.slice(0,save.profile.campaignCursor)){const p=getPuzzle(id),button=this.button(String(p.campaignPosition),()=>this.actions.offer({puzzleId:id,mode:'campaign'}));button.setAttribute('aria-label',this.t(`Открыть поле ${p.campaignPosition}`, `Open board ${p.campaignPosition}`));list.append(button);}details.append(list);this.root.append(details);}
  }
  private quests(save:Save):void {
    const panel=el('section','hub-panel');panel.append(el('h2','',this.t("Задания дня", "Daily goals")));
    const set=save.meta.quests;if(!set){panel.append(el('p','muted',save.profile.solvedIds.length<5?this.t("Откроются после пяти разных побед.", "Solve five different boards to unlock goals."):this.t("Сегодня можно продолжить маршрут.", "You can continue the campaign today.")));this.root.append(panel);return;}
    for(const [i,slot] of set.slots.entries()){const goal=goals.get(slot.goalId)!,b=this.button('',()=>this.actions.quest(i));b.dataset.quest=String(i);b.disabled=this.disabled||slot.paid;b.classList.add('quest');b.append(el('span','',this.t(goal.ru,goal.en)),el('strong','',slot.paid?'✓ +10':`${slot.progress} / ${slot.target}`));panel.append(b);}
    panel.append(el('p','muted',set.slots.every(s=>s.paid)?this.t("План выполнен · +30 монет получены", "All goals complete · 30 coins earned"):this.t("За каждую цель +10, за весь план ещё +30 монет.", "Earn 10 coins per goal and 30 more for the full set.")));
    if(set.replacements.length)panel.append(el('p','muted',this.t("Недоступная цель заменена. Для новой цели нужно одно действие.", "An unavailable goal was replaced. The new goal takes one action.")));this.root.append(panel);
  }
  private calendar(save:Save):void {
    this.heading(this.t("Календарь", "Calendar"),this.t("За каждую новую решённую дату — 30 монет. В попытке три жизни.", "Earn 30 coins for each date you clear. Each attempt starts with three lives."));this.root.append(this.button(this.t("← На главную", "← Home"),()=>this.actions.navigate('home'),'calendar-back'));
    const grid=el('div','date-grid'),today=calendarDayIndex(save.meta.effectiveDay),created=calendarDayIndex(profileDay(save.profile.createdAt,save.profile.timeZone));
    for(let i=today+7;i>=Math.max(created,today-30);i--){const day=dayFromIndex(i),saved=storedSlot(save,'daily:'+day),completed=save.meta.completedDates.includes(day),future=i>today;
      const state=future?this.t("Будет доступно", "Upcoming"):completed?this.t("Решено ✓", "Solved ✓"):saved?.attempt.status==='out-of-lives'?this.t("Нет жизней", "Out of lives"):saved?this.t("Начато", "In progress"):i===today?this.t("Сегодня", "Today"):this.t("Доступно", "Available");
      const b=this.button('',()=>this.actions.daily(day));b.dataset.day=day;b.classList.add('date-card');b.classList.toggle('today',i===today);b.classList.toggle('completed',completed);b.disabled=this.disabled||future;b.append(el('strong','',day.slice(8,10)+'.'+day.slice(5,7)),el('span','',state));b.setAttribute('aria-label',`${day}, ${state}`);grid.append(b);
    }this.root.append(grid);
    const all=[{attempt:save.attempt,result:save.result},...Object.values(save.meta.inactive)].filter(s=>s.attempt.mode==='daily'&&s.attempt.status!=='won'&&!dateAvailable(save.profile.createdAt,save.profile.timeZone,save.meta.effectiveDay,s.attempt.dayKey!));
    if(all.length){const old=el('section','hub-panel');old.append(el('h2','',this.t("Начатые ранее", "Earlier unfinished boards")));for(const slot of all)old.append(this.button(slot.attempt.dayKey+this.t(" · продолжить", " · resume"),()=>this.actions.daily(slot.attempt.dayKey!)));this.root.append(old);}
  }
  private album(save:Save):void {
    this.heading(this.t("Мастерская счёта", "The Counting Workshop"),this.t(`${Math.floor(save.profile.fragments/4)} из 12 приборов · ${nextFragmentText(save)}`, `${Math.floor(save.profile.fragments/4)} of 12 instruments · ${nextFragmentText(save)}`));this.root.append(this.button(this.t("← На главную", "← Home"),()=>this.actions.navigate('home'),'album-back'));
    const grid=el('div','album-grid');for(let i=0;i<12;i++){const card=config.cards[i]!,parts=Math.min(4,Math.max(0,save.profile.fragments-4*i));const b=this.button('',()=>this.openCard(i,parts));b.dataset.card=card.id;b.classList.add('collection-card');b.append(this.art(i,parts),el('strong','',this.toolTitle(i)),el('span','muted',this.t(`${parts} / 4 частей`, `${parts} / 4 parts`)));b.setAttribute('aria-label',this.t(`${card.titleRU}, ${parts} из 4 частей, рассмотреть`,`${card.titleEN}, ${parts} of 4 parts, inspect`));grid.append(b);}this.root.append(grid);
  }
  private profile(save:Save):void {
    const p=save.profile,c=save.career;this.heading(this.t("Профиль", "Profile"),this.t(`Ранг ${p.rank} · ${p.xp} / ${rankThreshold(p.rank)} XP`, `Rank ${p.rank} · ${p.xp} / ${rankThreshold(p.rank)} XP`));this.root.append(this.button(this.t("← На главную", "← Home"),()=>this.actions.navigate('home'),'profile-back'));
    const progress=el('section','hub-panel');progress.append(el('h2','',this.t("Ваш маршрут", "Your progress")),el('p','',this.t(`Разных решённых задач: ${p.solvedIds.length} / 240`, `Unique boards solved: ${p.solvedIds.length} / 240`)),el('p','',this.t(`Пройдено в кампании: ${p.campaignCursor} / 240`, `Campaign boards cleared: ${p.campaignCursor} / 240`)),el('p','',this.t(`Решённых дат Daily: ${save.meta.completedDates.length}`, `Daily dates solved: ${save.meta.completedDates.length}`)),el('p','',this.t(`Полных планов дня: ${save.meta.setReceipts.length}`, `Daily goal sets completed: ${save.meta.setReceipts.length}`)),el('p','',this.t(`Собранных приборов: ${p.paidCardIds.length} / 12`, `Instruments completed: ${p.paidCardIds.length} / 12`)));this.root.append(progress);
    const stats=el('section','hub-panel');stats.append(el('h2','',this.t("Статистика", "Statistics")));
    if(c.partialHistory)stats.append(el('p','muted',this.t(`Подробный учёт с обновления ${profileDay(c.since,p.timeZone)}. Старые уникальные победы сохранены. Новые попытки и завершения считаются отдельно; ранее начатая партия тоже может завершиться после обновления.`, `Detailed tracking began on ${profileDay(c.since,p.timeZone)}. Earlier unique wins still count. Boards started before the update can count as completions after it.`)));
    const labels={campaign:this.t("Кампания", "Campaign"),free:this.t("Свободная игра","Free Play"),daily:'Daily',endless:'Endless'};
    for(const [mode,title] of Object.entries(labels)){const s=c.modes[mode as keyof typeof labels],box=el('div','stats-mode');box.dataset.stats=mode;box.append(el('h3','',title),el('p','',this.t(`Новых попыток: ${s.starts} · Завершений: ${s.completions}`, `New attempts: ${s.starts} · Completions: ${s.completions}`)),el('p','',this.t(`Активное время: ${Math.floor(s.seconds/60)} мин ${Math.floor(s.seconds%60)} с`, `Time played: ${Math.floor(s.seconds/60)}m ${Math.floor(s.seconds%60)}s`)),el('p','',this.t(`Ошибок: ${s.mistakes} · Отмен: ${s.undos} · Перезапусков: ${s.restarts}`, `Mistakes: ${s.mistakes} · Undos: ${s.undos} · Restarts: ${s.restarts}`)),el('p','',this.t(`Объяснений: ${s.explains} · Раскрытий: ${s.reveals}`, `Explanations: ${s.explains} · Reveals: ${s.reveals}`)));stats.append(box);}this.root.append(stats);
    const records=el('section','hub-panel');records.append(el('h2','',this.t("Рекорды Endless", "Endless records")));const r=c.records[recordVersion];for(const [title,record] of [[this.t("Самостоятельно", "Solo"),r.solo],[this.t("С помощью", "Assisted"),r.assisted]] as const)records.append(el('p','',record?this.t(`${title}: очки ${record.score} · поля ${record.boards}`, `${title}: score ${record.score} · boards ${record.boards}`):this.t(`${title}: пока нет завершённых забегов`, `${title}: no completed runs yet`)));if(c.run&&c.run.status!=='ended')records.append(el('p','muted',this.t(`Текущий забег: очки ${c.run.score} · поля ${c.run.solvedStages}. Завершите его, чтобы сохранить рекорд.`, `Current run: score ${c.run.score} · boards ${c.run.solvedStages}. End the run to save the result.`)));this.root.append(records);
    const badges=el('section','hub-panel');badges.append(el('h2','',this.t("Достижения", "Achievements")));for(const b of config.achievements){const earned=c.achievements[b.id],row=el('div','badge');row.dataset.badge=b.id;row.classList.toggle('earned',!!earned);row.append(el('strong','',`${earned?'✓ ':''}${this.t(b.titleRU,b.titleEN)}`),el('span','muted',earned?this.t(`Зафиксировано ${profileDay(earned.earnedAt,p.timeZone)}`, `Recorded ${profileDay(earned.earnedAt,p.timeZone)}`):`${Math.min(b.threshold,achievementValue(save,b.metric))} / ${b.threshold}`));badges.append(row);}this.root.append(badges);
  }
  private openCard(index:number,parts:number):void {const card=config.cards[index]!,body=document.getElementById('card-body')!;document.getElementById('card-title')!.textContent=this.toolTitle(index);document.getElementById('close-card')!.textContent=this.t("Вернуться в альбом", "Back to album");body.replaceChildren(this.art(index,parts));const list=el('ol','parts-list');(this.language==='en'?partsEN[index]!:card.partsRU).forEach((part,i)=>list.append(el('li',i<parts?'earned':'',`${i<parts?'✓ ':''}${part}`)));body.append(list);this.actions.blocking(true);this.dialog.showModal();}
  renderResult(save:Save):void {
    const r=save.result,root=document.getElementById('reward-art')!,details=document.getElementById('reward-breakdown')!;root.replaceChildren();details.replaceChildren();if(!r)return;
    const total=r.collectionFragments;let title='';
    if(total!==undefined&&(r.fragments>0||r.cardCoins>0)){const index=Math.min(11,Math.floor((total-1)/4)),parts=Math.min(4,total-index*4);title=total===48&&r.fragments>0?this.t('Мастерская собрана','Workshop complete'):r.cardCoins?this.t(`Прибор собран: ${this.toolTitle(index)}`,`Instrument complete: ${this.toolTitle(index)}`):r.unlockedModes?.includes('free')?this.t("Открыта свободная игра", "Free Play unlocked"):`${this.toolTitle(index)} · ${parts}/4`;root.append(this.art(index,parts));}
    else if(r.unlockedModes?.includes('endless'))title=this.t("Открыт Endless", "Endless unlocked");else if(r.unlockedModes?.includes('daily'))title=this.t("Открыты Daily и задания дня", "Daily and daily goals unlocked");else if(r.unlockedModes?.includes('free'))title=this.t("Открыта свободная игра", "Free Play unlocked");else if(r.rankUps)title=this.t(`Новый ранг: ${r.rankLevel??save.profile.rank}`, `New rank: ${r.rankLevel??save.profile.rank}`);else if(r.setCoins)title=this.t("План дня выполнен", "Daily goals complete");
    document.getElementById('result-detail')!.textContent=title||(r.first?this.t("Все равенства сходятся.", "All equations are correct."):this.t("Первая награда за это поле уже получена.", "You already earned this board's first-clear reward."));
    const sources:[string,number][]=[[this.t("За поле", "Board"),r.baseCoins??(r.first?config.difficultyRewards[getPuzzle(r.puzzleId).difficulty].coins:0)],[this.t("За дату", "Daily date"),r.dailyCoins??0],[this.t("За цели", "Goals"),r.taskCoins??0],[this.t("За весь план", "Full goal set"),r.setCoins??0],[this.t("За ранг", "Rank"),r.rankCoins??r.rankUps*config.rank.rewardCoins],[this.t("За прибор", "Instrument"),r.cardCoins]];
    for(const [name,coins] of sources)if(coins)details.append(el('p','',`${name}: +${coins}`));details.append(el('p','',this.t(`Опыт: +${r.xp}`, `XP: +${r.xp}`)));if(r.fragments)details.append(el('p','',this.t(`Новых деталей: ${r.fragments} · всего ${r.collectionFragments} / 48`, `New parts: ${r.fragments} · total ${r.collectionFragments} / 48`)));if(r.rankUps)details.append(el('p','',this.t(`Новый ранг: ${r.rankLevel??save.profile.rank}`, `New rank: ${r.rankLevel??save.profile.rank}`)));for(const mode of r.unlockedModes??[])details.append(el('p','',mode==='endless'?this.t("Открыт Endless", "Endless unlocked"):mode==='free'?this.t("Открыта свободная игра", "Free Play unlocked"):this.t("Открыты Daily и задания дня", "Daily and daily goals unlocked")));if(r.stageScore!==undefined)details.append(el('p','',this.t(`За этап: +${r.stageScore} очков · В забеге: ${r.runScore}`, `Stage points: +${r.stageScore} · Run score: ${r.runScore}`)));for(const id of r.badges??[]){const badge=config.achievements.find(b=>b.id===id)!;details.append(el('p','',this.t(`Знак: ${badge.titleRU}`,`Badge: ${badge.titleEN}`)));}
  }
}
function disabledOrLocked(disabled:boolean,locked:boolean):boolean{return disabled||locked;}
