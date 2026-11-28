import {quantity} from './locale';
import type {Save} from '../app/model';
import {leagueRows,leaguePeriod,leaguePolicy,leagueRoster,leagueDisplayRow} from '../meta/league';
import type {LeagueResult,LeagueRow} from '../meta/league';
import portraits from './league-art/league-portraits.webp';
import {menuIcon} from './icons';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
export function leagueAvatar(id:string,portrait=0):HTMLElement{
 const avatar=el('span','league-avatar');avatar.setAttribute('aria-hidden','true');
 if(id==='self'){avatar.classList.add('is-self');avatar.append(menuIcon('profile'));}
 else {avatar.style.backgroundImage=`url("${portraits}")`;avatar.style.backgroundPosition=`${portrait%4*100/3}% ${Math.floor(portrait/4)*100/3}%`;}
 return avatar;
}
export function leagueMedal(place:number,tier:string):HTMLElement{
 const medal=el('span',`league-medal ${tier}`);medal.setAttribute('aria-hidden','true');
 medal.append(el('i','medal-ribbon left'),el('i','medal-ribbon right'),el('span','medal-disc',String(place)));
 return medal;
}
export function leagueEntry(save:Save,open:()=>void,disabled:boolean):HTMLButtonElement{
 const en=save.settings.language==='en',button=el('button','mode-option league-entry');button.id='league-open';button.disabled=disabled;
 const state=save.league,week=state?.active,self=week&&leagueRows(week,state.lastSeenAt).find(r=>r.id==='self');
 const copy=el('span','quick-copy');copy.append(el('strong','',en?'League':'Лига'),el('span','quick-status',save.leagueQuarantine?(en?'Temporarily unavailable':'Временно недоступна'):self?(en?`${self.place} place · ${self.points} points`:`${self.place} место · ${self.points} очк.`):(en?'Weekly standings':'Недельная таблица')));
 button.append(leagueMedal(self?.place??1,'gold'),copy,el('span','quick-arrow','›'));button.onclick=open;return button;
}
export function leagueView(save:Save,join:()=>void,disabled:boolean,now=new Date().toISOString()):HTMLElement{
 const en=save.settings.language==='en',t=(ru:string,eng:string)=>en?eng:ru,root=el('section','league-page');
 const state=save.league,week=state?.active,last=state?.history.at(-1);
 if(week)root.classList.add('is-active');
 const heading=el('div','hub-heading');heading.append(el('h1','',t('Лига','League')),el('p','muted',t('Решайте поля. Поднимайтесь выше.','Solve boards. Climb the standings.')));root.append(heading);
 if(save.leagueQuarantine){root.append(el('p','league-warning',t('Лига временно недоступна. Ваши партии, монеты и награды сохранены.','League is temporarily unavailable. Your boards, coins and rewards are preserved.')));return root;}
 const clockBack=!!state&&Date.parse(now)<state.lastSeenAt;
 if(clockBack)root.append(el('p','league-warning',t('Проверьте дату и время устройства. Остальная игра доступна.','Check the device date and time. Ordinary play remains available.')));
 function button(text:string){const b=el('button','primary',text);b.id='league-join';b.disabled=disabled||clockBack;b.onclick=join;return b;}
 function date(day:string){return new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));}
 function results(result:LeagueResult,primary=false){
  const box=el('section','league-finish');if(primary)box.id='league-finish';box.dataset.medal=result.id;
  const medal=leagueMedal(result.rank,result.medal.tier);medal.setAttribute('aria-hidden','false');medal.setAttribute('aria-label',t(`Медаль недели · место ${result.rank}`,`Weekly medal · place ${result.rank}`));
  const copy=el('div');copy.append(el('p','league-finish-kicker',t('ВАШ ИТОГ','YOUR RESULT')),el('h2','',t(`${result.rank} место`,`${result.rank} place`)),el('p','',t(`${quantity('ru',result.points,'point')} за неделю`,`${result.points} points this week`)),el('p','muted',date(result.startDay)+' — '+date(new Date(Date.parse(result.endDay+'T12:00:00Z')-86_400_000).toISOString().slice(0,10))));
  box.append(medal,copy);return box;
 }
 function table(rows:LeagueRow[],scope:string){
  const list=el('ol','league-table');list.id='league-table';list.dataset.week=scope;list.setAttribute('aria-label',t('Недельная таблица','Weekly standings'));
  for(const source of rows){
   const row=leagueDisplayRow(source,scope),li=el('li',row.id==='self'?'league-row is-self':'league-row');li.dataset.opponent=row.id;li.dataset.points=String(row.points);li.dataset.place=String(row.place);
   if(row.place<=3)li.classList.add('leader','leader-'+row.place);
   const rank=el('span','league-place',String(row.place));rank.setAttribute('aria-label',t(`Место ${row.place}`,`Place ${row.place}`));
   li.append(rank,leagueAvatar(row.id,row.avatar),el('strong','league-name',row.name[en?1:0]),el('strong','league-points',String(row.points)));list.append(li);
  }
  return list;
 }
 if(week&&state){
  const rows=leagueRows(week,state.lastSeenAt),self=rows.find(r=>r.id==='self')!,left=Math.max(0,week.endAt-Math.max(Date.parse(now),state.lastSeenAt));
  const days=Math.floor(left/86_400_000),hours=Math.floor(left%86_400_000/3_600_000),status=el('section','league-status');
  const place=el('span','league-standing');place.append(el('b','',String(self.place)),el('span','',t('место','place')));
  const score=el('span','league-total');score.append(el('b','',String(self.points)),el('span','',t(quantity('ru',self.points,'point').split(' ').slice(1).join(' '),'points')));
  status.append(place,score,Object.assign(el('span','league-countdown',t(`Итог через ${days} д ${hours} ч`,`Ends in ${days}d ${hours}h`)),{id:'league-remaining'}));
  root.append(status,table(rows,week.id));
 }else{
  if(last)root.append(results(last,true));
  else{
   const invite=el('section','league-invite');invite.append(leagueMedal(1,'gold'),el('h2','',t('За место в тройке','Aim for the top three')),el('p','',t('Решайте привычные головоломки, набирайте очки и заберите медаль недели.','Solve your usual puzzles, earn points and collect your weekly medal.')));
   const period=leaguePeriod(now,save.profile.timeZone),roster=leagueRoster(`${save.profile.id}:${period.startDay}:${leaguePolicy.version}`),faces=el('div','league-roster');
   for(const [i,identity] of roster.entries()){const face=leagueAvatar('bot-'+i,identity.avatar);face.title=identity.name[en?1:0];faces.append(face);}invite.append(faces);root.append(invite);
  }
  const current=leaguePeriod(now,save.profile.timeZone);
  if(!last||last.startDay!==current.startDay)root.append(button(last?t('В новую неделю','Join the new week'):t('Участвовать','Join the league')));
  if(last)root.append(table(last.rows,last.id));
 }
 const rules=el('details','hub-panel');rules.id='league-rules';rules.append(el('summary','',t('Правила лиги','League rules')));
 rules.append(el('p','',t('В Лиге девять компьютерных соперников. Их очки рассчитываются на устройстве по заранее заданным планам, интернет не нужен.','League has nine computer opponents. Their points follow saved activity plans on your device; no internet is needed.')),
  el('p','',t('Легко — 1 · Обычно — 2 · Сложно — 3 · Эксперт — 4.','Easy — 1 · Normal — 2 · Hard — 3 · Expert — 4.')),
  el('p','',t('Засчитываются Кампания, Relax, Challenge и День. Одно поле — один зачёт за неделю. Explain и Reveal дают те же очки.','Campaign, Relax, Challenge and Daily count. Each board scores once per week. Explain and Reveal earn the same points.')),
  el('p','',t('Новая неделя начинается в понедельник в 00:00. При позднем вступлении соперники сохраняют очки с начала недели.','A new week begins Monday at 00:00. On late entry, opponents keep their points from the start of the week.')),
  el('p','',t('При равных очках вы выше. Медаль сохраняется автоматически, без дополнительных монет или подсказок. Без очков — медаль участника. Реклама очки не умножает.','Ties favour you. Your medal saves automatically, with no extra coins or hints. Zero points earn a participation medal. Ads never multiply points.')));
 if(week&&week.policy.version!=='league-lab-3')rules.append(el('p','muted',t('Ваша начатая неделя продолжается с прежними очками и расписаниями. Обновлённые расписания действуют со следующей недели.','Your started week keeps its points and schedules. Updated activity plans apply from the next week.')));
 root.append(rules);
 const history=state?.history;
 if(history?.length){const archive=el('details','hub-panel');archive.id='league-history';archive.append(el('summary','',t(`Ваши медали · ${history.length}`,`Your medals · ${history.length}`)));for(const result of [...history].reverse())archive.append(results(result));root.append(archive);}
 return root;
}
