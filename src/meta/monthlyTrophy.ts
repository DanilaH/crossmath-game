import type { Completion, Save } from '../app/model';
import { calendarDayIndex, canResumeDaily, dateAvailable, dayFromIndex, isCalendarDay, profileDay } from './calendar';

export interface MonthlyTrophy { earnedAt: string | null }

export function isTrophyMonth(value: string): boolean {
  return typeof value === 'string' && isCalendarDay(`${value}-01`);
}

function monthBounds(month: string): { first: number; total: number } {
  const first = calendarDayIndex(`${month}-01`);
  const last = new Date(`${month}-01T00:00:00.000Z`);
  last.setUTCMonth(last.getUTCMonth()+1, 0);
  return {first,total:last.getUTCDate()};
}

function countDates(dates: readonly string[]): Map<string,number> {
  const counts = new Map<string,number>();
  for (const day of dates) {
    const month = day.slice(0,7);
    counts.set(month,(counts.get(month) ?? 0)+1);
  }
  return counts;
}

/** The original win date is known even when the historic award instant is unknown. */
export function restoreMonthlyTrophies(save: Save): void {
  if (save.meta.monthlyTrophies !== undefined) return;
  save.meta.monthlyTrophies = {};
  for (const [month,count] of countDates(save.meta.completedDates)) {
    if (count === monthBounds(month).total) save.meta.monthlyTrophies[month] = {earnedAt:null};
  }
}

export function settleMonthlyTrophy(save: Save, receipt: Completion, day: string, now: string): void {
  const month = day.slice(0,7);
  const trophies = save.meta.monthlyTrophies!;
  if (trophies[month] || save.meta.completedDates.filter(date=>date.startsWith(month)).length !== monthBounds(month).total) return;
  trophies[month] = {earnedAt:now};
  receipt.dailyTrophyMonth = month;
}

export function validateMonthlyTrophies(save: Save): void {
  const {monthlyTrophies,calendarTrophyMonth,completedDates} = save.meta;
  if (monthlyTrophies !== undefined) {
    if (!monthlyTrophies || typeof monthlyTrophies !== 'object' || Array.isArray(monthlyTrophies)) throw Error('Corrupt monthly trophies');
    const counts = countDates(completedDates);
    for (const [month,award] of Object.entries(monthlyTrophies)) {
      if (!isTrophyMonth(month) || !award || (award.earnedAt !== null &&
        (typeof award.earnedAt !== 'string' || !Number.isFinite(Date.parse(award.earnedAt)))) ||
        counts.get(month) !== monthBounds(month).total) throw Error('Corrupt monthly trophy');
    }
  }
  if (calendarTrophyMonth !== undefined && (!isTrophyMonth(calendarTrophyMonth) || !monthlyTrophies?.[calendarTrophyMonth])) {
    throw Error('Corrupt calendar trophy selection');
  }
}

export function trophyMonthStatus(save: Save, month: string) {
  const {first,total} = monthBounds(month);
  const {createdAt,timeZone} = save.profile;
  const {completedDates,effectiveDay,monthlyTrophies,inactive} = save.meta;
  const solved = new Set(completedDates.filter(date=>date.startsWith(month)));
  const base = {total,solved:solved.size};
  if (monthlyTrophies?.[month]) return {...base,kind:'earned'} as const;
  const created = profileDay(createdAt,timeZone);
  if (created.startsWith(month) && created !== `${month}-01`) {
    return {...base,kind:'partial',nextMonth:dayFromIndex(first+total).slice(0,7)} as const;
  }
  let playableDay: string | undefined;
  for (let index=first; index<first+total; index++) {
    const day = dayFromIndex(index);
    if (day > effectiveDay) break;
    if (solved.has(day)) continue;
    const slot = `daily:${day}`;
    const attempt = save.meta.activeSlot === slot ? save.attempt : inactive[slot]?.attempt;
    if (!dateAvailable(createdAt,timeZone,effectiveDay,day) && !canResumeDaily(attempt)) return {...base,kind:'missed'} as const;
    playableDay ??= day;
  }
  return {...base,kind:'available',playableDay} as const;
}
