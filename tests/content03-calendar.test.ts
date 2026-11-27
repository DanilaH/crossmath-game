import {describe,it,expect} from 'vitest';
import {labCalendarAssignment} from '../src/lab/calendarSchedule';
import {calendarDayIndex,dayFromIndex,calendarPuzzle} from '../src/meta/calendar';
import type {LabDateAssignment} from '../src/lab/calendarSchedule';
describe('CONTENT-03 isolated calendar schedule',()=>{
 it('pins a 100-day schedule across leap day, reverse archive entry, cold JSON restore and clock rollback',()=>{
  const days=Array.from({length:100},(_,i)=>dayFromIndex(calendarDayIndex('2028-02-01')+i));
  expect(days).toContain('2028-02-29');
  const forward=Object.fromEntries(days.map(day=>[day,labCalendarAssignment(day)]));
  const reverse:Record<string,LabDateAssignment>={};
  for(const day of [...days].reverse())reverse[day]=labCalendarAssignment(day);
  expect(reverse).toEqual(forward);
  expect(new Set(Object.values(forward).map(x=>x.puzzleId)).size).toBe(100);
  expect(new Set(days.map(day=>calendarPuzzle(day))).size).toBe(50);
  const restored=JSON.parse(JSON.stringify(forward));
  for(const day of [days[99]!,days[0]!,days[28]!,days[70]!,days[3]!]){
   expect(labCalendarAssignment(day,restored[day])).toEqual(forward[day]);
  }
  const old={version:'calendar-v2' as const,puzzleId:calendarPuzzle('2028-02-29')};
  expect(labCalendarAssignment('2028-02-29',old)).toEqual(old);
  expect(labCalendarAssignment('2028-05-11').puzzleId).toBe(forward['2028-02-01']!.puzzleId);
 });
});
