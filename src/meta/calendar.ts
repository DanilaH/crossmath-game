import { calendarDayIndex, isCalendarDay } from '@danilah/mini-games-kit/core';
import { config, routes } from '../content/catalog';
export { calendarDayIndex, isCalendarDay };
export function profileDay(instant:string,zone:string):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
  const field=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}
export const dayFromIndex=(index:number):string=>new Date(index*86_400_000).toISOString().slice(0,10);
export function calendarPuzzle(day:string):string {
  const offset=calendarDayIndex(day)-calendarDayIndex(routes.dailyEpoch),n=routes.dailySequence.length;
  return routes.dailySequence[((offset%n)+n)%n]!;
}
export function dateAvailable(createdAt:string,zone:string,effectiveDay:string,selected:string):boolean {
  if(!isCalendarDay(selected))return false;
  const lower=Math.max(calendarDayIndex(profileDay(createdAt,zone)),calendarDayIndex(effectiveDay)-config.calendar.previousDaysAccessible);
  return calendarDayIndex(selected)>=lower&&selected<=effectiveDay;
}
