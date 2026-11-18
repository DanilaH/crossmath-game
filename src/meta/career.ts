import { config, getPuzzle, routes } from '../content/catalog';
import type { Save } from '../app/model';
import type { Attempt, Mode } from '../core/types';

export const recordVersion='cm-integer-1/content-v1/score-v1';
export interface ModeStats { starts:number; completions:number; seconds:number; mistakes:number; undos:number; explains:number; reveals:number; restarts:number }
export interface RunRecord { runId:string; score:number; boards:number; endedAt:string }
export interface EndlessRun { id:string; version:typeof recordVersion; stage:number; solvedStages:number; score:number; lives:number; assisted:boolean; status:'active'|'failed'|'ended' }
export interface Career {
  version:1; since:string; partialHistory:boolean; modes:Record<Mode,ModeStats>;
  achievements:Record<string,{earnedAt:string;eventId:string}>;
  run:EndlessRun|null; bestBoardsInRun:number;
  records:Record<typeof recordVersion,{solo:RunRecord|null;assisted:RunRecord|null}>;
}
const modes:Mode[]=['campaign','free','daily','endless'];
const empty=():ModeStats=>({starts:0,completions:0,seconds:0,mistakes:0,undos:0,explains:0,reveals:0,restarts:0});
export function createCareer(now:string,partialHistory=false):Career {
  return {version:1,since:now,partialHistory,modes:{campaign:empty(),free:empty(),daily:empty(),endless:empty()},achievements:{},run:null,bestBoardsInRun:0,records:{[recordVersion]:{solo:null,assisted:null}}};
}
export function recordTime(save:Save,mode:Mode,seconds:number):void {save.career.modes[mode].seconds+=Math.max(0,seconds);}
export function achievementValue(save:Save,metric:string):number {
  switch(metric){case 'distinctWins':return save.profile.solvedIds.length;case 'dailyDates':return save.meta.completedDates.length;case 'fullSets':return save.meta.setReceipts.length;case 'bestBoardsInRun':return save.career.bestBoardsInRun;case 'completedCards':return save.profile.paidCardIds.length;case 'rank':return save.profile.rank;default:throw Error('Unknown achievement metric');}
}
export function settleAchievements(save:Save,now:string,eventId:string):string[] {
  const earned:string[]=[];
  for(const badge of config.achievements)if(!save.career.achievements[badge.id]&&achievementValue(save,badge.metric)>=badge.threshold){save.career.achievements[badge.id]={earnedAt:now,eventId};earned.push(badge.id);}
  return earned;
}
export function upgradeCareer(input:unknown,now=new Date().toISOString()):unknown {
  if(!input||typeof input!=='object'||(input as {schemaVersion?:unknown}).schemaVersion!==2)return input;
  const save=structuredClone(input) as Save;
  // Schema2 never shipped an Endless run. Reject forged run fields instead of inventing history.
  if(save.attempt?.mode==='endless'||Object.values(save.meta?.inactive??{}).some(slot=>slot.attempt?.mode==='endless'))throw Error('Undated legacy run');
  save.schemaVersion=3;save.career=createCareer(now,true);settleAchievements(save,now,'migration:3');return save;
}
export function finishRun(save:Save,now:string):void {
  const run=save.career.run;if(!run||run.status==='ended')return;
  run.status='ended';const records=save.career.records[run.version],key=run.assisted?'assisted':'solo',best=records[key];
  // Finalize only when the player ends/replaces the run, so later help/continuation cannot taint a solo record.
  if(run.solvedStages>0&&(!best||run.score>best.score))records[key]={runId:run.id,score:run.score,boards:run.solvedStages,endedAt:now};
}
export function settleStage(save:Save):number {
  const a=save.attempt,run=save.career.run;if(a.mode!=='endless')return 0;
  if(!run||run.id!==a.runId||run.stage!==a.stageId||run.status!=='active')throw Error('Run identity changed');
  if(run.solvedStages!==run.stage)return 0;
  const p=getPuzzle(a.puzzleId),points=config.endless.scorePerEquation*p.equations.length*config.endless.multipliers[p.difficulty];
  run.score+=points;run.solvedStages++;run.assisted ||= a.assisted;save.career.bestBoardsInRun=Math.max(save.career.bestBoardsInRun,run.solvedStages);return points;
}
export function runAttemptMatches(save:Save,a:Attempt):boolean {
  const run=save.career.run;return !!run&&a.runId===run.id&&a.stageId===run.stage&&a.puzzleId===routes.endlessSequence[run.stage%routes.endlessSequence.length]&&a.lives===run.lives&&a.assisted===run.assisted;
}
export function validateCareer(save:Save):void {
  const c=save.career,int=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0,instant=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
  if(!c||c.version!==1||!instant(c.since)||typeof c.partialHistory!=='boolean'||!int(c.bestBoardsInRun)||!c.achievements||Array.isArray(c.achievements)||!c.records?.[recordVersion])throw Error('Corrupt career');
  for(const mode of modes){const s=c.modes?.[mode];if(!s||!Number.isFinite(s.seconds)||s.seconds<0||Object.entries(s).some(([key,value])=>key!=='seconds'&&!int(value)))throw Error('Corrupt statistics');for(const key of ['starts','completions','mistakes','undos','explains','reveals','restarts'])if(!int(s[key as keyof ModeStats]))throw Error('Missing statistic');}
  for(const [id,badge] of Object.entries(c.achievements))if(!config.achievements.some(b=>b.id===id)||!instant(badge.earnedAt)||typeof badge.eventId!=='string'||!badge.eventId)throw Error('Corrupt badge');
  for(const r of Object.values(c.records[recordVersion]))if(r&&(!int(r.score)||!int(r.boards)||r.boards<1||!instant(r.endedAt)||typeof r.runId!=='string'||!r.runId))throw Error('Corrupt record');
  const r=c.run;if(r&&(typeof r.id!=='string'||!r.id||r.version!==recordVersion||!['active','failed','ended'].includes(r.status)||![r.stage,r.solvedStages,r.score,r.lives].every(int)||r.lives>3||r.solvedStages<r.stage||r.solvedStages>r.stage+1||typeof r.assisted!=='boolean'||r.status==='active'&&r.lives===0||r.status==='failed'&&r.lives!==0))throw Error('Corrupt run');
  const slot=save.meta.activeSlot==='endless'?{attempt:save.attempt,result:save.result}:save.meta.inactive.endless;
  if(!!r!==!!slot||slot&&(!runAttemptMatches(save,slot.attempt)||r!.solvedStages!==r!.stage+Number(slot.attempt.status==='won')||r!.status==='failed'&&slot.attempt.status!=='out-of-lives'))throw Error('Run/slot divergence');
  if(slot?.attempt.status==='won'&&(!slot.result||slot.result.stageKey!==`${r!.id}:${r!.stage}`||slot.result.runScore!==r!.score||!int(slot.result.stageScore)))throw Error('Corrupt stage receipt');
}
