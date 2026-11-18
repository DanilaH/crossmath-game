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
const bands:Record<Difficulty,string>={easy:'Легко',standard:'Обычно',hard:'Сложно',expert:'Эксперт'};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''):HTMLElementTagNameMap[K]=>{const n=document.createElement(tag);n.className=className;n.textContent=text;return n;};
export function cardArt(index:number,parts:number):HTMLElement {
  const wrapper=el('div','instrument');const card=config.cards[index]!;wrapper.innerHTML=artwork[`../../docs/spec/product/meta_v08/art/${card.id}.svg`]??'';
  const svg=wrapper.querySelector('svg');if(svg){svg.setAttribute('aria-label',`${card.titleRU}, ${parts} из 4 частей`);svg.querySelector('title')!.textContent=card.titleRU;
    for(let i=1;i<=4;i++){const layer=svg.querySelector(`[id="part-${i}"]`);if(layer){if(i>parts)layer.setAttribute('display','none');layer.setAttribute('data-part',String(i));layer.removeAttribute('id');}}
    svg.querySelector('[id="plate"]')?.removeAttribute('id');
  }return wrapper;
}
export function nextFragmentText(save:Save):string {
  if(save.profile.fragments>=48)return 'Мастерская собрана';
  const progress=getTierProgress(save.profile.solvedIds.length,config.collection.fragmentWinThresholds);
  const remaining=progress.complete?progress.nextTier?.remaining:progress.target-save.profile.solvedIds.length;
  return `Новых полей до детали: ${remaining??0}`;
}
interface Actions { navigate:(screen:MetaScreen)=>void; campaign:()=>void; free:(band:Difficulty)=>void; daily:(day:string)=>void; endless:()=>void; offer:(offer:Offer)=>void; quest:(index:number)=>void; blocking:(blocked:boolean)=>void }
export class MetaView {
  private readonly dialog=document.getElementById('card-dialog') as HTMLDialogElement;
  private disabled=false;
  constructor(private readonly root:HTMLElement,private readonly actions:Actions){this.dialog.addEventListener('close',()=>actions.blocking(false));document.getElementById('close-card')!.onclick=()=>this.dialog.close();}
  openRank(save:Save):void {if(this.disabled)return;const body=document.getElementById('card-body')!,p=save.profile;document.getElementById('card-title')!.textContent=`Ранг ${p.rank}`;body.replaceChildren(el('p','',`${p.xp} / ${rankThreshold(p.rank)} XP`),el('p','',`До следующего ранга: ${rankThreshold(p.rank)-p.xp} XP`),el('p','',`За повышение: +${config.rank.rewardCoins} монет`),el('p','muted',`Разных решённых полей: ${p.solvedIds.length} / 240`));document.getElementById('close-card')!.textContent='Продолжить';this.actions.blocking(true);this.dialog.showModal();}
  closeCard():boolean{if(!this.dialog.open)return false;this.dialog.close();return true;}
  private button(text:string,action:()=>void,id?:string,primary=false):HTMLButtonElement {const b=el('button',primary?'primary':'hub-button',text);b.type='button';b.disabled=this.disabled;b.onclick=action;if(id)b.id=id;return b;}
  private heading(title:string,subtitle=''):void{const head=el('div','hub-heading');head.append(el('p','kicker','СЧЁТНАЯ МАСТЕРСКАЯ'),el('h1','',title));if(subtitle)head.append(el('p','muted',subtitle));this.root.append(head);}
  render(save:Save,disabled:boolean):void {
    const screen=save.meta.screen;this.disabled=disabled;this.root.hidden=screen==='play';if(screen==='play')return;
    const selected=(document.getElementById('free-band') as HTMLSelectElement|null)?.value;
    const focused=document.activeElement?.id;this.root.replaceChildren();
    if(screen==='home')this.home(save,selected);else if(screen==='calendar')this.calendar(save);else if(screen==='profile')this.profile(save);else this.album(save);
    if(focused&&this.root.contains(document.getElementById(focused)))document.getElementById(focused)?.focus({preventScroll:true});
  }
  private home(save:Save,selected?:string):void {
    const a=save.attempt,p=getPuzzle(a.puzzleId),wins=save.profile.solvedIds.length;
    this.heading('Продолжим?','Одно число связывает сразу два равенства.');
    if(a.status!=='won'&&!(a.mode==='endless'&&save.career.run?.status==='ended'))this.root.append(this.button(`Продолжить · ${a.mode==='endless'?'Endless':a.mode==='daily'?a.dayKey:a.mode==='free'?'Свободная игра':'Поле '+p.campaignPosition}`,()=>this.actions.navigate('play'),'continue-game',true));
    else if(wins>=5&&!save.meta.completedDates.includes(save.meta.effectiveDay))this.root.append(this.button('Сегодняшняя задача',()=>this.actions.daily(save.meta.effectiveDay),'daily-primary',true));
    else this.root.append(this.button(save.profile.campaignCursor>=240?'Маршрут завершён ✓':'Продолжить маршрут',this.actions.campaign,'campaign-primary',true));
    const modes=el('section','hub-panel');modes.append(el('h2','','Играть'));
    modes.append(this.button('Маршрут · '+Math.min(240,save.profile.campaignCursor+1)+' / 240',this.actions.campaign,'campaign-open'));
    const free=el('div','free-row'),select=el('select');select.id='free-band';select.setAttribute('aria-label','Сложность свободной игры');select.disabled=disabledOrLocked(this.disabled,wins<3);
    for(const band of mastered(save)){const option=el('option','',bands[band]);option.value=band;select.append(option);}select.value=selected&&mastered(save).includes(selected as Difficulty)?selected:save.meta.freeDifficulty;if(!select.value&&select.options[0])select.value=select.options[0].value;
    const start=this.button(wins<3?'Свободная игра · после 3 побед':'Свободная игра',()=>this.actions.free(select.value as Difficulty),'free-open');start.disabled=this.disabled||wins<3;free.append(select,start);modes.append(free);
    const daily=this.button(wins<5?'Daily · после 5 побед':'Календарь · '+save.meta.effectiveDay,()=>this.actions.navigate('calendar'),'calendar-open');daily.disabled=this.disabled||wins<5;modes.append(daily);
    const endless=this.button(wins<15?'Endless · после 15 побед':save.career.run&&save.career.run.status!=='ended'?'Продолжить Endless':'Начать Endless',this.actions.endless,'endless-open');endless.disabled=this.disabled||wins<15;modes.append(endless);
    modes.append(this.button('Профиль и рекорды',()=>this.actions.navigate('profile'),'profile-open'));
    if(a.status==='won')modes.append(this.button('Последний результат',()=>this.actions.navigate('play'),'last-result'));
    this.root.append(modes);this.quests(save);
    const preview=el('section','hub-panel album-preview');preview.append(el('h2','','Мастерская счёта'));
    const index=Math.min(11,Math.floor(save.profile.fragments/4)),parts=Math.min(4,Math.max(0,save.profile.fragments-index*4));preview.append(cardArt(index,parts),el('p','',`${config.cards[index]!.titleRU} · ${parts}/4`),el('p','muted',nextFragmentText(save)));
    const album=this.button(`Открыть альбом · ${Math.floor(save.profile.fragments/4)} / 12`,()=>this.actions.navigate('album'),'album-open');album.disabled=this.disabled||wins<3;preview.append(album);if(wins<3)preview.append(el('p','muted','Первая деталь появится на третьей новой победе.'));this.root.append(preview);
    if(save.profile.campaignCursor){const details=el('details','hub-panel'),summary=el('summary','','Пройденные поля');details.append(summary);const list=el('div','replay-list');
      for(const id of routes.campaignSequence.slice(0,save.profile.campaignCursor)){const p=getPuzzle(id),button=this.button(String(p.campaignPosition),()=>this.actions.offer({puzzleId:id,mode:'campaign'}));button.setAttribute('aria-label',`Открыть поле ${p.campaignPosition}`);list.append(button);}details.append(list);this.root.append(details);}
  }
  private quests(save:Save):void {
    const panel=el('section','hub-panel');panel.append(el('h2','','Задания дня'));
    const set=save.meta.quests;if(!set){panel.append(el('p','muted',save.profile.solvedIds.length<5?'Откроются после пяти разных побед.':'Сегодня можно продолжить маршрут.'));this.root.append(panel);return;}
    for(const [i,slot] of set.slots.entries()){const goal=goals.get(slot.goalId)!,b=this.button('',()=>this.actions.quest(i));b.dataset.quest=String(i);b.disabled=this.disabled||slot.paid;b.classList.add('quest');b.append(el('span','',goal.ru),el('strong','',slot.paid?'✓ +10':`${slot.progress} / ${slot.target}`));panel.append(b);}
    panel.append(el('p','muted',set.slots.every(s=>s.paid)?'План выполнен · +30 монет получены':'За каждую цель +10, за весь план ещё +30 монет.'));
    if(set.replacements.length)panel.append(el('p','muted','Недоступная цель заменена. Для новой цели нужно одно действие.'));this.root.append(panel);
  }
  private calendar(save:Save):void {
    this.heading('Календарь','За каждую новую решённую дату — 30 монет. В попытке три жизни.');this.root.append(this.button('← На главную',()=>this.actions.navigate('home'),'calendar-back'));
    const grid=el('div','date-grid'),today=calendarDayIndex(save.meta.effectiveDay),created=calendarDayIndex(profileDay(save.profile.createdAt,save.profile.timeZone));
    for(let i=today+7;i>=Math.max(created,today-30);i--){const day=dayFromIndex(i),saved=storedSlot(save,'daily:'+day),completed=save.meta.completedDates.includes(day),future=i>today;
      const state=future?'Будет доступно':completed?'Решено ✓':saved?.attempt.status==='out-of-lives'?'Нет жизней':saved?'Начато':i===today?'Сегодня':'Доступно';
      const b=this.button('',()=>this.actions.daily(day));b.dataset.day=day;b.classList.add('date-card');b.classList.toggle('today',i===today);b.classList.toggle('completed',completed);b.disabled=this.disabled||future;b.append(el('strong','',day.slice(8,10)+'.'+day.slice(5,7)),el('span','',state));b.setAttribute('aria-label',`${day}, ${state}`);grid.append(b);
    }this.root.append(grid);
    const all=[{attempt:save.attempt,result:save.result},...Object.values(save.meta.inactive)].filter(s=>s.attempt.mode==='daily'&&s.attempt.status!=='won'&&!dateAvailable(save.profile.createdAt,save.profile.timeZone,save.meta.effectiveDay,s.attempt.dayKey!));
    if(all.length){const old=el('section','hub-panel');old.append(el('h2','','Начатые ранее'));for(const slot of all)old.append(this.button(slot.attempt.dayKey+' · продолжить',()=>this.actions.daily(slot.attempt.dayKey!)));this.root.append(old);}
  }
  private album(save:Save):void {
    this.heading('Мастерская счёта',`${Math.floor(save.profile.fragments/4)} из 12 приборов · ${nextFragmentText(save)}`);this.root.append(this.button('← На главную',()=>this.actions.navigate('home'),'album-back'));
    const grid=el('div','album-grid');for(let i=0;i<12;i++){const card=config.cards[i]!,parts=Math.min(4,Math.max(0,save.profile.fragments-4*i));const b=this.button('',()=>this.openCard(i,parts));b.dataset.card=card.id;b.classList.add('collection-card');b.append(cardArt(i,parts),el('strong','',card.titleRU),el('span','muted',`${parts} / 4 частей`));b.setAttribute('aria-label',`${card.titleRU}, ${parts} из 4 частей, рассмотреть`);grid.append(b);}this.root.append(grid);
  }
  private profile(save:Save):void {
    const p=save.profile,c=save.career;this.heading('Профиль',`Ранг ${p.rank} · ${p.xp} / ${rankThreshold(p.rank)} XP`);this.root.append(this.button('← На главную',()=>this.actions.navigate('home'),'profile-back'));
    const progress=el('section','hub-panel');progress.append(el('h2','','Ваш маршрут'),el('p','',`Разных решённых задач: ${p.solvedIds.length} / 240`),el('p','',`Пройдено в кампании: ${p.campaignCursor} / 240`),el('p','',`Решённых дат Daily: ${save.meta.completedDates.length}`),el('p','',`Полных планов дня: ${save.meta.setReceipts.length}`),el('p','',`Собранных приборов: ${p.paidCardIds.length} / 12`));this.root.append(progress);
    const stats=el('section','hub-panel');stats.append(el('h2','','Статистика'));
    if(c.partialHistory)stats.append(el('p','muted',`Подробный учёт с обновления ${profileDay(c.since,p.timeZone)}. Старые уникальные победы сохранены. Новые попытки и завершения считаются отдельно; ранее начатая партия тоже может завершиться после обновления.`));
    const labels={campaign:'Кампания',free:'Свободная игра',daily:'Daily',endless:'Endless'};
    for(const [mode,title] of Object.entries(labels)){const s=c.modes[mode as keyof typeof labels],box=el('div','stats-mode');box.dataset.stats=mode;box.append(el('h3','',title),el('p','',`Новых попыток: ${s.starts} · Завершений: ${s.completions}`),el('p','',`Активное время: ${Math.floor(s.seconds/60)} мин ${Math.floor(s.seconds%60)} с`),el('p','',`Ошибок: ${s.mistakes} · Отмен: ${s.undos} · Перезапусков: ${s.restarts}`),el('p','',`Объяснений: ${s.explains} · Раскрытий: ${s.reveals}`));stats.append(box);}this.root.append(stats);
    const records=el('section','hub-panel');records.append(el('h2','','Рекорды Endless'));const r=c.records[recordVersion];for(const [title,record] of [['Самостоятельно',r.solo],['С помощью',r.assisted]] as const)records.append(el('p','',record?`${title}: очки ${record.score} · поля ${record.boards}`:`${title}: пока нет завершённых забегов`));if(c.run&&c.run.status!=='ended')records.append(el('p','muted',`Текущий забег: очки ${c.run.score} · поля ${c.run.solvedStages}. Завершите его, чтобы сохранить рекорд.`));this.root.append(records);
    const badges=el('section','hub-panel');badges.append(el('h2','','Достижения'));for(const b of config.achievements){const earned=c.achievements[b.id],row=el('div','badge');row.dataset.badge=b.id;row.classList.toggle('earned',!!earned);row.append(el('strong','',`${earned?'✓ ':''}${b.titleRU}`),el('span','muted',earned?`Зафиксировано ${profileDay(earned.earnedAt,p.timeZone)}`:`${Math.min(b.threshold,achievementValue(save,b.metric))} / ${b.threshold}`));badges.append(row);}this.root.append(badges);
  }
  private openCard(index:number,parts:number):void {const card=config.cards[index]!,body=document.getElementById('card-body')!;document.getElementById('card-title')!.textContent=card.titleRU;document.getElementById('close-card')!.textContent='Вернуться в альбом';body.replaceChildren(cardArt(index,parts));const list=el('ol','parts-list');card.partsRU.forEach((part,i)=>list.append(el('li',i<parts?'earned':'',`${i<parts?'✓ ':''}${part}`)));body.append(list);this.actions.blocking(true);this.dialog.showModal();}
  renderResult(save:Save):void {
    const r=save.result,root=document.getElementById('reward-art')!,details=document.getElementById('reward-breakdown')!;root.replaceChildren();details.replaceChildren();if(!r)return;
    const total=r.collectionFragments;let title='';
    if(total!==undefined&&(r.fragments>0||r.cardCoins>0)){const index=Math.min(11,Math.floor((total-1)/4)),parts=Math.min(4,total-index*4);title=total===48&&r.fragments>0?'Мастерская собрана':r.cardCoins?`Прибор собран: ${config.cards[index]!.titleRU}`:r.unlockedModes?.includes('free')?'Открыта свободная игра':`${config.cards[index]!.titleRU} · ${parts}/4`;root.append(cardArt(index,parts));}
    else if(r.unlockedModes?.includes('endless'))title='Открыт Endless';else if(r.unlockedModes?.includes('daily'))title='Открыты Daily и задания дня';else if(r.unlockedModes?.includes('free'))title='Открыта свободная игра';else if(r.rankUps)title=`Новый ранг: ${r.rankLevel??save.profile.rank}`;else if(r.setCoins)title='План дня выполнен';
    document.getElementById('result-detail')!.textContent=title||(r.first?'Все равенства сходятся.':'Первая награда за это поле уже получена.');
    const sources:[string,number][]=[['За поле',r.baseCoins??(r.first?config.difficultyRewards[getPuzzle(r.puzzleId).difficulty].coins:0)],['За дату',r.dailyCoins??0],['За цели',r.taskCoins??0],['За весь план',r.setCoins??0],['За ранг',r.rankCoins??r.rankUps*config.rank.rewardCoins],['За прибор',r.cardCoins]];
    for(const [name,coins] of sources)if(coins)details.append(el('p','',`${name}: +${coins}`));details.append(el('p','',`Опыт: +${r.xp}`));if(r.fragments)details.append(el('p','',`Новых деталей: ${r.fragments} · всего ${r.collectionFragments} / 48`));if(r.rankUps)details.append(el('p','',`Новый ранг: ${r.rankLevel??save.profile.rank}`));for(const mode of r.unlockedModes??[])details.append(el('p','',mode==='endless'?'Открыт Endless':mode==='free'?'Открыта свободная игра':'Открыты Daily и задания дня'));if(r.stageScore!==undefined)details.append(el('p','',`За этап: +${r.stageScore} очков · В забеге: ${r.runScore}`));for(const id of r.badges??[])details.append(el('p','',`Знак: ${config.achievements.find(b=>b.id===id)!.titleRU}`));
  }
}
function disabledOrLocked(disabled:boolean,locked:boolean):boolean{return disabled||locked;}
