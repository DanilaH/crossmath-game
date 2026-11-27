import {JsonStorageRepository} from '@danilah/mini-games-kit/platform';
import {createStorage} from '../app/storage';
import {createPlatform} from '../app/platform';
import {createAttempt,applyCommand,applyHelpLayout} from '../core/engine';
import type {Attempt,BoardAction} from '../core/types';
import {assertInventory,isSolved} from '../core/types';
import {prepareExplanation,verifyExplanation} from '../help/logic';
import {materializeHelp} from '../help/reveal';
import {BoardView,equationText} from '../ui/board';
import type {HintPlan} from '../help/logic';
import {Feedback} from '../ui/feedback';
import {acceptedFeedback} from '../ui/playFeedback';
import type {MoveFeedback} from '../ui/playFeedback';
import type {Settings} from '../app/model';
import {labBanks} from './contentBank';
import type {LabBank} from './contentBank';

const node=(id:string)=>document.getElementById(id)!;
const banks=Object.keys(labBanks) as LabBank[];
interface LabState {version:1;bank:LabBank;index:number;attempt:Attempt;settings:Settings}
const puzzle=(state:LabState)=>labBanks[state.bank][state.index]!;
function decode(input:unknown):LabState{
 const s=input as LabState,p=s&&banks.includes(s.bank)&&Number.isSafeInteger(s.index)&&puzzle(s);
 if(!s||s.version!==1||!p||!s.settings||!['ru','en'].includes(s.settings.language)||!['light','dark'].includes(s.settings.theme))throw Error('Invalid laboratory save');
 if(s.attempt.puzzleId!==p.puzzleId||s.attempt.contentVersion!==p.contentVersion||!s.attempt.id||
  !Array.isArray(s.attempt.history)||!Array.isArray(s.attempt.commandIds)||!Number.isSafeInteger(s.attempt.boardRevision)||
  !['playing','won'].includes(s.attempt.status)||s.attempt.status==='won'&&!isSolved(p,s.attempt))throw Error('Invalid laboratory attempt');
 assertInventory(p,s.attempt);s.attempt.history.forEach(layout=>assertInventory(p,layout));
 return structuredClone(s);
}
const repository=new JsonStorageRepository<LabState>({storage:createStorage(),key:'crossmath.content03.lab.v1',codec:{decode},createDefault:()=>({
 version:1,bank:'easy9',index:0,attempt:createAttempt(labBanks.easy9[0]!,crypto.randomUUID()),
 settings:{theme:'light',language:'ru',sound:true,vibration:true,reducedMotion:false,timerVisible:false},
})});
let state=await repository.load(),busy=false,blocked=false;
const platform=createPlatform(()=>{node('home').click();return true;});
const feedback=new Feedback(()=>state.settings);
const t=(ru:string,en:string)=>state.settings.language==='ru'?ru:en;
const controls=document.createElement('div');
controls.className='content-lab-controls';
controls.innerHTML='<select id="lab-bank" aria-label="Банк"></select><button id="lab-prev" type="button">‹</button><button id="lab-next" type="button">›</button>';
for(const bank of banks){
 const option=document.createElement('option');
 option.value=bank;option.textContent=bank==='easy9'?'Easy Short · 9×9':'Контроль · 7×7';
 controls.querySelector('select')!.append(option);
}
controls.id='level';node('level').replaceWith(controls);
const board=new BoardView(node('board'),node('tray'),node('note'),feedback,()=>busy||blocked,
 ()=>state.settings.reducedMotion,command,()=>state.settings.language);
async function commit(next:LabState,move?:MoveFeedback){
 if(busy)return;
 busy=true;render();
 try{await repository.write(next);state=next;node('save-error').hidden=true;render(move);}
 catch{node('save-error').hidden=false;node('save-error-text').textContent=t('Не удалось сохранить лабораторную партию. Перезапустите экран.','Could not save the laboratory attempt. Reload this screen.');}
 finally{busy=false;render();}
}
function command(action:BoardAction,metadata:{commandId:string;expectedRevision:number}={commandId:crypto.randomUUID(),expectedRevision:state.attempt.boardRevision}){
 if(busy||blocked)return;
 const before=state.attempt,result=applyCommand(puzzle(state),before,{...action,...metadata});
 if(result.outcome==='applied')void commit({...structuredClone(state),attempt:result.state},
  acceptedFeedback(action,metadata.commandId,before,result.state,result.outcome,result.cue));
}
function render(move?:MoveFeedback){
 const p=puzzle(state);
 document.documentElement.lang=state.settings.language;
 document.body.classList.add('in-play');
 document.body.classList.toggle('dark',state.settings.theme==='dark');
 document.body.classList.toggle('calm',state.settings.reducedMotion);
 node('level').hidden=false;
 for(const option of controls.querySelectorAll('option')){
  const bank=option.value as LabBank;
  option.textContent=({easy9:'Easy 9×9',control7:'Easy 7×7',daily:'Daily',ops:'× ÷'}[bank])+
   (bank===state.bank?' · '+(state.index+1)+'/'+labBanks[bank].length:'');
 }
 node('play-screen').classList.toggle('is-solving',state.attempt.status==='playing');
 node('root-tabs').hidden=true;
 node('hub').hidden=true;
 (node('lab-bank') as HTMLSelectElement).value=state.bank;
 for(const id of ['sort','help','undo','lab-prev','lab-next','lab-bank']){
  (node(id) as HTMLButtonElement).disabled=busy||blocked||(id==='undo'&&!state.attempt.history.length);
 }
 (node('lab-prev') as HTMLButtonElement).disabled=busy||state.index===0;
 (node('lab-next') as HTMLButtonElement).disabled=busy||state.index===labBanks[state.bank].length-1;
 node('storage-note').textContent=t('Экспериментальный банк · без наград','Experimental bank · rewards disabled');
 node('result').hidden=state.attempt.status!=='won';
 node('result-title').textContent=t('Поле решено','Board solved');
 node('result-main').hidden=true;
 node('result-details').hidden=true;
 node('next').textContent=t('Следующее поле','Next board');
 (node('next') as HTMLButtonElement).disabled=busy||state.index===labBanks[state.bank].length-1;
 board.update(p,state.attempt,move);
 requestAnimationFrame(board.resize);
}
function select(bank:LabBank,index:number){
 if(busy||!labBanks[bank][index])return;
 void commit({...structuredClone(state),bank,index,attempt:createAttempt(labBanks[bank][index]!,crypto.randomUUID())});
}
node('lab-bank').onchange=()=>select((node('lab-bank') as HTMLSelectElement).value as LabBank,0);
node('lab-prev').onclick=()=>select(state.bank,state.index-1);
node('lab-next').onclick=node('next').onclick=()=>select(state.bank,state.index+1);
node('home').onclick=()=>{location.href='index.html';};
node('pause').onclick=()=>{(node('pause-dialog') as HTMLDialogElement).showModal();};
node('resume').onclick=()=>{(node('pause-dialog') as HTMLDialogElement).close();};
node('home-from-pause').onclick=()=>{location.href='index.html';};
node('restart').onclick=()=>{(node('pause-dialog') as HTMLDialogElement).close();select(state.bank,state.index);};
node('undo').onclick=()=>command({type:'Undo'});
node('sort').onclick=()=>command({type:'SortTray'});
node('return').onclick=()=>board.returnSelected();
node('reload').onclick=()=>location.reload();
node('retry').hidden=true;
let prepared:HintPlan|undefined;
node('help').onclick=()=>{
 const p=puzzle(state),result=prepareExplanation(p,state.attempt);
 if(result.outcome!=='ready'||!verifyExplanation(p,state.attempt,result.plan))return;
 prepared=result.plan;
 const assignment=prepared.assignments[0]!;
 const equations=assignment.evidence.map(e=>equationText(p,state.attempt,e.equationIndex));
 node('help-description').textContent=t('Число ','Number ')+assignment.value+' · '+equations.join(' · ');
 node('help-cost').textContent=t('Лаборатория · без списания','Laboratory · no charge');
 node('reveal').hidden=true;node('ad-hint').hidden=true;
 (node('apply-help') as HTMLButtonElement).disabled=false;
 (node('help-dialog') as HTMLDialogElement).showModal();
};
node('close-help').onclick=()=>{prepared=undefined;(node('help-dialog') as HTMLDialogElement).close();};
node('apply-help').onclick=()=>{
 if(!prepared||busy||!verifyExplanation(puzzle(state),state.attempt,prepared))return;
 const layout=materializeHelp(puzzle(state),state.attempt,prepared);
 if(!layout)return;
 prepared=undefined;(node('help-dialog') as HTMLDialogElement).close();
 void commit({...structuredClone(state),attempt:applyHelpLayout(puzzle(state),state.attempt,layout,crypto.randomUUID())});
};
for(const key of ['sound','vibration','reducedMotion','theme'] as const){
 const id=key==='reducedMotion'?'reduced':key;
 const input=node(id) as HTMLInputElement;
 input.checked=key==='theme'?state.settings.theme==='dark':state.settings[key];
 input.onchange=()=>void commit({...structuredClone(state),settings:{...state.settings,[key]:key==='theme'?(input.checked?'dark':'light'):input.checked}});
}
(node('language') as HTMLSelectElement).value=state.settings.language;
node('language').onchange=()=>void commit({...structuredClone(state),settings:{...state.settings,language:(node('language') as HTMLSelectElement).value==='en'?'en':'ru'}});
platform.activity.onBlockedChange(value=>{blocked=value;feedback.setActive(!value);render();});
platform.activity.setGameplayDesired(true);
for(const id of ['timer-visible','rules-options'])node(id)?.closest('label,details')?.setAttribute('hidden','');
render();node('startup').hidden=true;document.documentElement.dataset.state='ready';
