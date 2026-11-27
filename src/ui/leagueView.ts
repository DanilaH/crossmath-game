import type {Save} from '../app/model';
import {botNames,leagueRows,leaguePeriod} from '../meta/league';
import type {LeagueResult,LeagueRow} from '../meta/league';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
export function leagueAvatar(id:string):HTMLElement{
 const avatar=el('span','league-avatar',id==='self'?'●':['◇','⌁','✦','⊕','△','⬡','∥','◒','◎'][Number(id.slice(4))]);
 avatar.setAttribute('aria-hidden','true');return avatar;
}
export function leagueEntry(save:Save,open:()=>void,disabled:boolean):HTMLButtonElement{
 const en=save.settings.language==='en',button=el('button','mode-option league-entry');button.id='league-open';button.disabled=disabled;
 const state=save.league,week=state?.active,self=week&&leagueRows(week,state.lastSeenAt).find(r=>r.id==='self');
 const copy=el('span','quick-copy');copy.append(el('strong','',en?'Offline league':'Офлайн-лига'),
  el('span','quick-status',self?(en?`Place ${self.place} · ${self.points} points`:`Место ${self.place} · ${self.points} очк.`):(save.leagueQuarantine?(en?'League data needs recovery':'Данные лиги требуют восстановления'):(en?'You and 9 computer opponents':'Вы и 9 компьютерных соперников'))));
 button.append(leagueAvatar('bot-2'),copy,el('span','quick-arrow','›'));button.onclick=open;return button;
}
export function leagueView(save:Save,join:()=>void,disabled:boolean,now=new Date().toISOString()):HTMLElement{
 const en=save.settings.language==='en',t=(ru:string,eng:string)=>en?eng:ru,root=el('section','league-page');
 const state=save.league,week=state?.active,last=state?.history.at(-1);
 if(week)root.classList.add('is-active');
 const heading=el('div','hub-heading');heading.append(el('p','kicker',t('ЭКСПЕРИМЕНТ','EXPERIMENT')),el('h1','','Офлайн-лига'));
 heading.querySelector('h1')!.textContent=t('Офлайн-лига','Offline league');
 heading.append(el('p','muted',t('Вы и девять компьютерных соперников','You and nine computer opponents')));root.append(heading);
 if(save.leagueQuarantine){root.append(el('p','league-warning',t('Не удалось прочитать данные лиги. Обычные партии, монеты и награды сохранены. Данные лиги оставлены для восстановления; новая неделя пока недоступна.','League data could not be read. Ordinary boards, coins and rewards are preserved. League data is retained for recovery; joining a new week is unavailable.')));return root;}
 const clockBack=!!state&&Date.parse(now)<state.lastSeenAt;
 if(clockBack)root.append(el('p','league-warning',t('Часы переведены назад. Лига продолжится, когда время профиля восстановится. Обычная игра доступна.','The clock moved backwards. League scoring resumes when profile time catches up. Ordinary play is available.')));
 function button(text:string){const b=el('button','primary',text);b.id='league-join';b.disabled=disabled||clockBack;b.onclick=join;return b;}
 function date(day:string){return new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));}
 function results(result:LeagueResult,primary=false){
  const box=el('section','league-finish');if(primary)box.id='league-finish';
  const medal=el('span',`league-medal ${result.medal.tier}`,String(result.rank));medal.setAttribute('aria-label',t(`Медаль недели · место ${result.rank}`,`Weekly medal · place ${result.rank}`));
  const copy=el('div');copy.append(el('h2','',t('Неделя завершена','Week complete')),el('p','',t(`Место ${result.rank} из 10 · ${result.points} очк.`,`Place ${result.rank} of 10 · ${result.points} points`)),el('p','muted',date(result.startDay)+' — '+date(result.endDay)));
  box.append(medal,copy);return box;
 }
 function table(rows:LeagueRow[]){
  const list=el('ol','league-table');list.id='league-table';list.setAttribute('aria-label',t('Недельная таблица','Weekly standings'));
  for(const row of rows){
   const li=el('li',row.id==='self'?'league-row is-self':'league-row');li.dataset.opponent=row.id;
   const name=el('span','league-name');name.append(el('strong','',row.name[en?1:0]),el('span','muted',row.id==='self'?t('Игрок','Player'):t('Бот','Bot')));
   li.append(el('span','league-place',String(row.place)),leagueAvatar(row.id),name,el('strong','league-points',String(row.points)));list.append(li);
  }
  return list;
 }
 if(week&&state){
  const rows=leagueRows(week,state.lastSeenAt),self=rows.find(r=>r.id==='self')!,left=Math.max(0,week.endAt-Math.max(Date.parse(now),state.lastSeenAt));
  const days=Math.floor(left/86_400_000),hours=Math.floor(left%86_400_000/3_600_000);
  const status=el('section','league-status');
  status.append(el('strong','',t(`${self.place} место · ${self.points} очк.`,`Place ${self.place} · ${self.points} points`)),
   Object.assign(el('span','muted',t(`До итога: ${days} д ${hours} ч`,`Ends in ${days}d ${hours}h`)),{id:'league-remaining'}));
  root.append(status,table(rows));
 }else{
  if(last)root.append(results(last,true));
  else{
   const invite=el('section','league-invite');invite.append(el('h2','',t('Обычные поля — общий счёт','Ordinary boards, weekly points')),
    el('p','',t('Решайте в своём темпе. Соперники набирают очки в разное время дня.','Play at your own pace. Computer opponents score at different times of day.')));
   const roster=el('div','league-roster');for(let i=0;i<9;i++){const a=leagueAvatar('bot-'+i);a.title=botNames[i]![en?1:0];roster.append(a);}invite.append(roster);root.append(invite);
  }
  const current=leaguePeriod(now,save.profile.timeZone);
  if(!last||last.startDay!==current.startDay)root.append(button(last?t('Вступить в новую неделю','Join the new week'):t('Вступить в лигу','Join the league')));
  if(last)root.append(table(last.rows));
 }
 const rules=el('details','hub-panel');rules.id='league-rules';rules.append(el('summary','',t('Как считаются очки','How points work')));
 rules.append(el('p','',t('Легко — 1 · Обычно — 2 · Сложно — 3 · Эксперт — 4.','Easy — 1 · Normal — 2 · Hard — 3 · Expert — 4.')),
  el('p','',t('Кампания, Relax, Challenge и День. Одно поле засчитывается раз за неделю, в том числе ранее решённое. Explain и Reveal дают те же очки.','Campaign, Relax, Challenge and Daily. Each board counts once per week, including previously solved boards. Explain and Reveal earn the same points.')),
  el('p','',t('Вступление добровольное. При вступлении все начинают с нуля; учитывается оставшаяся часть недели. Новая неделя начинается в понедельник в 00:00 по времени профиля.','Joining is optional. Everyone starts at zero on joining; the remaining part of the week counts. A new week starts Monday at 00:00 in profile time.')),
  el('p','',t('При равных очках игрок выше. Медаль сохраняется автоматически, без монет и подсказок. Без очков — медаль участника. Реклама очки не умножает.','Ties favour the player. The medal saves automatically, with no coins or hints. Zero points earn a participation medal. Ads never multiply league points.')),
  el('p','muted',save.profile.timeZone+' · '+t('Параметры экспериментальные','Experimental parameters')));root.append(rules);
 const history=state?.history;
 if(history?.length){const archive=el('details','hub-panel');archive.id='league-history';archive.append(el('summary','',t(`Медали недель · ${history.length}`,`Weekly medals · ${history.length}`)));for(const result of [...history].reverse())archive.append(results(result));root.append(archive);}
 return root;
}
