import { rootScreens } from './types';
import { config, getPuzzle } from '../content/catalog';
import { isCalendarDay, profileDay } from './calendar';
import { restoreMonthlyTrophies, settleMonthlyTrophy, validateMonthlyTrophies } from './monthlyTrophy';
import { relaxGoalTarget, validateTrackGoalWins } from './trackGoals';
import { contribution, refreshQuests } from './missions';
import type { Save, Completion } from '../app/model';
import type { MetaState } from './types';

export function createMeta(createdAt:string,zone:string):MetaState {
  return {version:1,screen:'play',activeSlot:'campaign',inactive:{},freeDifficulty:'easy',effectiveDay:profileDay(createdAt,zone),issuedDays:0,quests:null,contributedIds:[],assignments:{},completedDates:[],slotReceipts:[],setReceipts:[]};
}
export function refreshDay(save:Save,now:string):void {
  restoreMonthlyTrophies(save);
  const day=profileDay(now,save.profile.timeZone),meta=save.meta;
  if(day>meta.effectiveDay){meta.effectiveDay=day;meta.quests=null;meta.contributedIds=[];}
  if(!meta.quests)refreshQuests(save);
}
export function settleDailyAndQuests(save:Save,receipt:Completion,now:string):void {
  const meta=save.meta,a=save.attempt;receipt.dailyCoins=0;receipt.taskCoins=0;receipt.setCoins=0;
  if(a.mode==='daily'&&a.dayKey&&!meta.completedDates.includes(a.dayKey)){
    meta.completedDates.push(a.dayKey);
    receipt.dailyCoins=config.dailyBonusCoins;
    settleMonthlyTrophy(save,receipt,a.dayKey,now);
  }
  if(!meta.contributedIds.includes(a.puzzleId)){
    const set=meta.quests;
    if(set)for(const [i,slot] of set.slots.entries()){
      slot.progress=Math.min(slot.target,slot.progress+contribution(slot.goalId,{puzzleId:a.puzzleId,mode:a.mode,...(a.dayKey?{dayKey:a.dayKey}:{})},meta.effectiveDay));
      const key=`${set.dayKey}:${i}`;
      if(slot.progress>=slot.target&&!meta.slotReceipts.includes(key)){meta.slotReceipts.push(key);slot.paid=true;receipt.taskCoins+=config.taskRewardCoins;}
    }
    if(set&&set.slots.every(s=>s.paid)&&!meta.setReceipts.includes(set.dayKey)){meta.setReceipts.push(set.dayKey);receipt.setCoins=config.taskAllBonusCoins;}
    meta.contributedIds.push(a.puzzleId);
  }
  const coins=receipt.dailyCoins+receipt.taskCoins+receipt.setCoins;receipt.coins+=coins;save.profile.coins+=coins;
  refreshQuests(save);
}
/** Pure legacy conversion. Persist schema 2 before exposing the migrated reward. */
export function upgradeSave(input:unknown):unknown {
  if(!input||typeof input!=='object'||(input as {schemaVersion?:unknown}).schemaVersion!==1)return input;
  const save=structuredClone(input) as Save;
  const p=save.profile;if(!p||!Array.isArray(p.solvedIds)||!Array.isArray(p.paidCardIds)||!Number.isSafeInteger(p.fragments))throw Error('Corrupt legacy profile');
  const historical=new Set([...p.paidCardIds,...config.cards.slice(0,Math.floor(p.fragments/4)).map(c=>c.id)]);
  const fragments=Math.min(48,Math.max(p.fragments,p.paidCardIds.length*4,config.collection.fragmentWinThresholds.filter(t=>t<=p.solvedIds.length).length));
  const eligible=config.cards.slice(0,Math.floor(fragments/4)).map(c=>c.id);
  const owed=eligible.filter(id=>!historical.has(id)).length*config.collection.cardRewardCoins;
  p.fragments=fragments;p.paidCardIds=[...new Set([...historical,...eligible])];p.coins+=owed;
  (save as unknown as {schemaVersion:number}).schemaVersion=2;save.meta=createMeta(p.createdAt,p.timeZone);
  if(save.attempt.mode==='daily')throw Error('Legacy slice did not support dated attempts');
  return save;
}
export function validateMeta(save:Save):void {
  const m=save.meta,nonnegative=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
  if(!m||m.version!==1||!['play','album',...rootScreens].includes(m.screen)||typeof m.activeSlot!=='string'||!isCalendarDay(m.effectiveDay)||!nonnegative(m.issuedDays)||!['easy','standard','hard','expert'].includes(m.freeDifficulty))throw Error('Corrupt meta header');
  if(m.albumOrigin!==undefined&&m.albumOrigin!=='home'&&m.albumOrigin!=='profile')throw Error('Corrupt workshop origin');
  if(m.calendarSelectedDay!==undefined&&(!isCalendarDay(m.calendarSelectedDay)||m.calendarSelectedDay>m.effectiveDay))throw Error('Corrupt calendar selection');
  for(const list of [m.completedDates,m.contributedIds,m.slotReceipts,m.setReceipts])if(!Array.isArray(list)||list.some(x=>typeof x!=='string')||new Set(list).size!==list.length)throw Error('Corrupt meta ledger');
  if(m.completedDates.some(d=>!isCalendarDay(d))||m.setReceipts.some(d=>!isCalendarDay(d)))throw Error('Corrupt meta dates');
  validateMonthlyTrophies(save);
  const goalIds = m.relaxGoalIds;
  if (goalIds !== undefined && (!Array.isArray(goalIds) || goalIds.length > relaxGoalTarget || new Set(goalIds).size !== goalIds.length ||
    goalIds.some(id => typeof id !== 'string' || !save.profile.solvedIds.includes(id) || getPuzzle(id).difficulty !== 'easy'))) throw Error('Corrupt Relax goal');
  validateTrackGoalWins(save);
  if(!m.inactive||Array.isArray(m.inactive)||!m.assignments||Array.isArray(m.assignments)||m.activeSlot in m.inactive)throw Error('Duplicate active slot');
  if(m.quests){const q=m.quests;if(q.dayKey!==m.effectiveDay||q.configVersion!==config.configVersion||!nonnegative(q.issueIndex)||!Array.isArray(q.slots)||q.slots.length!==3||!Array.isArray(q.witness)||q.witness.length>3||!Array.isArray(q.replacements))throw Error('Corrupt quest set');
    q.slots.forEach((s,i)=>{if(!config.goals.some(g=>g.id===s.goalId)||!nonnegative(s.target)||s.target<1||!nonnegative(s.progress)||s.progress>s.target||typeof s.paid!=='boolean'||s.paid!==m.slotReceipts.includes(`${q.dayKey}:${i}`)||s.paid&&s.progress!==s.target)throw Error('Corrupt quest slot');});
  }
}
