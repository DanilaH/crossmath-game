import { calendarDayIndex, isCalendarDay } from '@danilah/mini-games-kit/core';
import { config, dailyBank, releaseDailyBank, dailyVersion, routes } from '../content/catalog';
import type { Attempt } from '../core/types';
export { calendarDayIndex, isCalendarDay };
export function profileDay(instant:string,zone:string):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
  const field=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}
export const dayFromIndex=(index:number):string=>new Date(index*86_400_000).toISOString().slice(0,10);
export function calendarPuzzle(day:string, legacy = false):string {
  const sequence = legacy ? routes.dailySequence : dailyVersion==='calendar-v3'?releaseDailyBank:dailyBank;
  const offset = calendarDayIndex(day) - calendarDayIndex(routes.dailyEpoch);
  return sequence[((offset % sequence.length) + sequence.length) % sequence.length]!;
}
export function dateAvailable(createdAt:string,zone:string,effectiveDay:string,selected:string):boolean {
  if(!isCalendarDay(selected))return false;
  return selected>=dailyArchiveStart(createdAt,zone,effectiveDay)&&selected<=effectiveDay;
}

export function dailyArchiveStart(createdAt:string,zone:string,effectiveDay:string):string {
  const oldest=dayFromIndex(calendarDayIndex(effectiveDay)-config.calendar.previousDaysAccessible);
  const created=profileDay(createdAt,zone);
  return created>oldest?created:oldest;
}

export function canResumeDaily(attempt: Attempt | undefined): boolean {
  return attempt?.mode === 'daily' && attempt.status === 'playing' && attempt.lives > 0;
}
