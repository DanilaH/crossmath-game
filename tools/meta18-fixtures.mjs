import {createServer} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='.test-output/meta18';await mkdir(out,{recursive:true});
const server=await createServer({mode:'league-lab',server:{middlewareMode:true},appType:'custom'});
try{
 const {createSave,decodeSave}=await server.ssrLoadModule('/src/app/model.ts');
 const {GameSession}=await server.ssrLoadModule('/src/app/session.ts');
 const {SaveRepository}=await server.ssrLoadModule('/src/app/saveRepository.ts');
 const {config,getPuzzle}=await server.ssrLoadModule('/src/content/catalog.ts');
 const {calendarDayIndex,dayFromIndex}=await server.ssrLoadModule('/src/meta/calendar.ts');
 const answers={...JSON.parse(await readFile('docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile('docs/spec/product/content_v2/author_solutions.json','utf8'))};
 let serial=0,now='2026-11-23T12:00:00Z';
 const seed=createSave('meta18-proof','2026-11-01T12:00:00Z','UTC','initial'),data=new Map();
 const repo=new SaveRepository({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}},()=>structuredClone(seed));
 const session=new GameSession(await repo.load(),repo,()=>`meta18-${++serial}`,()=>now),fixtures={};
 const capture=(name,screen)=>{const s=structuredClone(session.state);s.meta.screen=screen;decodeSave(s);fixtures[name]=s;};
 function prepareLastMove(){
  const p=getPuzzle(session.state.attempt.puzzleId),used=new Set(),cells=p.cells.filter(c=>c.given===undefined),answer=answers[p.puzzleId].answer;
  session.state.attempt.placements={};
  for(const cell of cells.slice(0,-1)){const i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));assert.ok(i>=0);used.add(i);session.state.attempt.placements[cell.id]='t'+i;}
  return {cell:cells.at(-1),p,answer,used};
 }
 async function win(){
  const {cell,p,answer,used}=prepareLastMove(),i=p.tray.findIndex((v,i)=>v===answer[cell.id]&&!used.has(i));
  session.state.attempt.placements[cell.id]='t'+i;session.state.attempt.status='won';await session.navigate('home');decodeSave(session.state);
 }
 capture('new','profile');
 for(let i=1;i<=228;i++){
  if([8,10,228].includes(i)){prepareLastMove();capture('before-'+i,'play');}
  await win();
  if([5,8,15,227,228].includes(i)){capture('after-'+i,'profile');}
  if(i<228)await session.next();
 }
 // Labelled synthetic calendar histories. Only the final move below is played in the browser.
 const calendar=structuredClone(fixtures['after-15']);
 calendar.profile.createdAt='2026-10-01T12:00:00Z';calendar.meta.effectiveDay='2026-11-30';calendar.meta.quests=null;calendar.meta.contributedIds=[];
 calendar.meta.monthlyTrophies={};calendar.meta.completedDates=Array.from({length:29},(_,i)=>dayFromIndex(calendarDayIndex('2026-11-01')+i));
 now='2026-11-30T12:00:00Z';session.state=decodeSave(calendar);data.clear();data.set('crossmath.save.v1',JSON.stringify(session.state));
 await session.openDaily('2026-11-30');prepareLastMove();capture('trophy-before','play');
 await win();capture('trophy-result','play');await session.next();capture('trophy-calendar','calendar');
 const archive=structuredClone(session.state);archive.meta.completedDates.unshift(...Array.from({length:31},(_,i)=>dayFromIndex(calendarDayIndex('2026-10-01')+i)));
 archive.meta.monthlyTrophies['2026-10']={earnedAt:null};archive.meta.screen='profile';fixtures.archive=decodeSave(archive);
 const partial=structuredClone(fixtures['after-15']);partial.profile.createdAt='2026-11-16T12:00:00Z';partial.career.since=partial.profile.createdAt;partial.meta.screen='calendar';fixtures.partial=decodeSave(partial);
 const missed=structuredClone(archive);missed.meta.completedDates=missed.meta.completedDates.filter(day=>!day.startsWith('2026-10'));delete missed.meta.monthlyTrophies['2026-10'];delete missed.meta.calendarTrophyMonth;missed.meta.calendarSelectedDay='2026-10-31';missed.meta.screen='calendar';fixtures.missed=decodeSave(missed);
 const past=structuredClone(calendar);past.meta.effectiveDay='2026-12-01';now='2026-12-01T12:00:00Z';session.state=decodeSave(past);data.clear();data.set('crossmath.save.v1',JSON.stringify(session.state));
 await session.openDaily('2026-11-30');prepareLastMove();capture('past-trophy-before','play');
 const history=structuredClone(fixtures['after-228']),last=calendarDayIndex('2026-11-30');history.profile.createdAt=dayFromIndex(last-1099)+'T00:00:00Z';history.meta.effectiveDay='2026-11-30';history.meta.completedDates=Array.from({length:1100},(_,i)=>dayFromIndex(last-1099+i));delete history.meta.monthlyTrophies;history.meta.quests=null;history.meta.screen='profile';fixtures.history1100=decodeSave(history);
 const maximum=structuredClone(fixtures['after-228']);maximum.profile.rank=10000;maximum.profile.xp=299;maximum.profile.coins=999999999;maximum.career.modes.campaign.seconds=9876543.6489;fixtures.maximum=decodeSave(maximum);
 await writeFile(out+'/fixtures.json',JSON.stringify({provenance:'Synthetic valid snapshots through actual GameSession settlement; near-month history and maximum counters explicitly seeded, not claimed as UI play.',fixtures},null,2)+'\n');
 console.log('META fixtures PASS · '+Object.keys(fixtures).join(', '));
}finally{await server.close();}
