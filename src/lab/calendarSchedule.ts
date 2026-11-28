import {dailyBank} from '../content/catalog';
import {calendarDayIndex} from '../meta/calendar';
import {labBanks} from './contentBank';

export interface LabDateAssignment {version:'content03-calendar-lab-1'|'calendar-v2';puzzleId:string}
const sequence=[...dailyBank,...labBanks.daily.map(p=>p.puzzleId)];
/** Offline schedule model. The production calendar does not import this module. */
export function labCalendarAssignment(day:string,pinned?:LabDateAssignment):LabDateAssignment{
 if(pinned)return {...pinned};
 const offset=calendarDayIndex(day)-calendarDayIndex('2028-02-01');
 return {version:'content03-calendar-lab-1',puzzleId:sequence[((offset%sequence.length)+sequence.length)%sequence.length]!};
}
