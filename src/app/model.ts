import {advanceLeague,leagueEnabled,leagueRows,recordLeagueWin,validateLeague} from '../meta/league';
import type {LeagueState} from '../meta/league';
import { bucketTurn, challengeUnlockWins, isFreeTrack } from '../content/rotation';
import type { ContentVersion } from '../content/rotation';
import { createAdState, validateAdState } from '../platform/adState';
import type { AdState } from '../platform/adState';
import { config, getPuzzle, routes, campaignPuzzle, campaignSequence, dailyVersion, freeAssignmentVersion, freeTrackPuzzle } from '../content/catalog';
import { createAttempt } from '../core/engine';
import { assertInventory, isSolved } from '../core/types';
import type { Attempt } from '../core/types';
import type { MetaState } from '../meta/types';
import { createMeta, refreshDay, settleDailyAndQuests, upgradeSave, validateMeta } from '../meta/progress';
import { activeTrackGoal, settleTrackGoal, validTrackGoalReceipt } from '../meta/trackGoals';
import type { TrackGoalReceipt } from '../meta/trackGoals';
import { dailyArchiveStart, isCalendarDay } from '../meta/calendar';
import { createCareer, settleAchievements, settleStage, upgradeCareer, validateCareer } from '../meta/career';
import type { Career } from '../meta/career';
import type { WorkshopReceipt } from '../meta/workshopProgress';
import { endlessEnabled } from '../content/modeAvailability';
import { closeFreeAssignment, validateFreeIssuance } from '../content/freeIssuance';

export interface Settings { theme: 'light' | 'dark'; sound: boolean; vibration: boolean; reducedMotion: boolean; language: 'ru' | 'en'; timerVisible: boolean }
export interface Completion {
  id: string; attemptId: string; puzzleId: string; first: boolean; coins: number; xp: number;
  rankUps: number; fragments: number; cardCoins: number; elapsedPlaying: number;
  baseCoins?: number; rankCoins?: number; dailyCoins?: number; taskCoins?: number; setCoins?: number; unlockedModes?: string[];
  collectionFragments?:number; rankLevel?:number;
  stageScore?:number; runScore?:number; stageKey?:string; badges?:string[];
  relaxGoalProgress?: number;
  campaignFinished?: boolean;
  dailyTrophyMonth?: string;
  trackGoal?: TrackGoalReceipt;
  workshop?: WorkshopReceipt;
  interstitialRequested?: true;
  league?: {weekId:string;points:number;fromPoints?:number;toPoints?:number;fromPlace?:number;toPlace?:number};
}
export type HelpOutcome = 'applied' | 'no_step' | 'stale_snapshot' | 'busy' | 'already_solved' | 'insufficient_resource' | 'invalid_proof';
export interface HelpReceipt { outcome: HelpOutcome; kind: 'explain' | 'reveal'; costCoins: number; costCredits: number }
export interface Save {
  schemaVersion: 4; revision: number; contentVersion: ContentVersion; balanceVersion: string;
  profile: { id: string; createdAt: string; timeZone: string; coins: number; hintCredits: number;
    rank: number; xp: number; solvedIds: string[]; campaignCursor: number; fragments: number; paidCardIds: string[] };
  settings: Settings; attempt: Attempt; result: Completion | null; helpReceipts: Record<string,HelpReceipt>;
  meta: MetaState;
  career:Career;
  ads:AdState;
  league?:LeagueState;
  leagueQuarantine?:{version:1;raw:unknown};
  leagueReceiptQuarantine?:Record<string,unknown>;
}
export function createSave(id: string, now: string, timeZone: string, attemptId: string, contentVersion: ContentVersion = 'content-v2'): Save {
  const career=createCareer(now);career.modes.campaign.starts=1;
  return {schemaVersion:4,revision:0,contentVersion,balanceVersion:config.configVersion,meta:createMeta(now,timeZone),career,ads:createAdState(),
    profile:{id,createdAt:now,timeZone,coins:config.initialCoins,hintCredits:config.initialHintCredits,rank:1,xp:0,solvedIds:[],campaignCursor:0,fragments:0,paidCardIds:[]},
    settings:{theme:'light',sound:false,vibration:false,reducedMotion:false,language:'ru',timerVisible:false},
    attempt:createAttempt(campaignPuzzle(0, contentVersion),attemptId),result:null,helpReceipts:{}};
}
export const rankThreshold = (rank: number): number => Math.min(config.rank.baseXp+config.rank.stepXp*(rank-1),config.rank.maxXpPerRank);

export function campaignResultStatus(save:Save): 'finish'|'complete'|'replay'|null {
  const {attempt,result}=save;
  if (attempt.mode!=='campaign' || !result) return null;
  const campaign=campaignSequence(save.contentVersion);
  if (save.profile.campaignCursor!==campaign.length) return null;
  if (result.campaignFinished===true) return 'finish';
  if (result.campaignFinished===undefined && result.puzzleId===campaign.at(-1)) return result.first?'finish':'complete';
  return 'replay';
}
const modeUnlockThresholds: ReadonlyArray<readonly [string, number]> = [
  ['free', config.unlockProposal.freePlayAfterNewWins],
  ['daily', config.unlockProposal.dailyAfterNewWins],
  ['challenge', challengeUnlockWins],
  ['endless', config.unlockProposal.endlessAfterNewWins],
];

export function settleCompletion(save: Save, now=new Date().toISOString()): Save {
  if(leagueEnabled&&save.league){save=structuredClone(save);advanceLeague(save.league!,now);}
  if (save.attempt.status !== 'won' || save.result?.attemptId === save.attempt.id) return save;
  const next=structuredClone(save);refreshDay(next,now);const p=getPuzzle(next.attempt.puzzleId), profile=next.profile;
  const previousWins=profile.solvedIds.length;
  const first=!profile.solvedIds.includes(p.puzzleId), reward=first ? config.difficultyRewards[p.difficulty] : {coins:0,xp:0};
  const previousFragments=profile.fragments; let coins=reward.coins, rankUps=0, cardCoins=0;
  if (first) {
    profile.solvedIds.push(p.puzzleId); profile.xp+=reward.xp;
    while (profile.xp >= rankThreshold(profile.rank)) { profile.xp-=rankThreshold(profile.rank); profile.rank++; rankUps++; coins+=config.rank.rewardCoins; }
    profile.fragments=Math.max(profile.fragments,config.collection.fragmentWinThresholds.filter(t => t <= profile.solvedIds.length).length);
    for (let i=0;i<Math.floor(profile.fragments/config.collection.fragmentsPerCard);i++) {
      const id=config.cards[i]!.id;
      if (!profile.paidCardIds.includes(id)) { profile.paidCardIds.push(id); cardCoins+=config.collection.cardRewardCoins; }
    }
  }
  coins+=cardCoins; profile.coins+=coins;
  const campaign = campaignSequence(next.contentVersion);
  const previousCursor = profile.campaignCursor;
  if (next.attempt.mode === 'campaign' && campaign[previousCursor] === p.puzzleId) profile.campaignCursor++;
  const track = next.attempt.freeTrack;
  const activeGoal = track ? activeTrackGoal(next,track) : null;
  if (track) {
    const progress = next.meta.freeProgress ??= {relax: 0, challenge: 0};
    if (next.attempt.freeIndex === progress[track]) {
      closeFreeAssignment(next.meta,track,progress[track]);
      progress[track]++;
    }
  }
  next.result={id:`win:${next.attempt.id}`,attemptId:next.attempt.id,puzzleId:p.puzzleId,first,coins,xp:reward.xp,rankUps,fragments:profile.fragments-previousFragments,cardCoins,elapsedPlaying:next.attempt.elapsedPlaying,baseCoins:reward.coins,rankCoins:rankUps*config.rank.rewardCoins,
    collectionFragments:profile.fragments,rankLevel:profile.rank,workshop:{from:previousWins,to:profile.solvedIds.length},unlockedModes:modeUnlockThresholds
      .filter(([mode, threshold]) => (endlessEnabled || mode !== 'endless') && previousWins < threshold && profile.solvedIds.length >= threshold)
      .map(([mode]) => mode)};
  if (next.attempt.mode==='campaign' && profile.campaignCursor===campaign.length) {
    next.result.campaignFinished=previousCursor<campaign.length;
  }
  settleDailyAndQuests(next,next.result,now);
  settleTrackGoal(next,next.result,activeGoal);
  next.career.modes[next.attempt.mode].completions++;
  if(next.attempt.mode==='endless'){next.result.stageScore=settleStage(next);next.result.runScore=next.career.run!.score;next.result.stageKey=`${next.attempt.runId}:${next.attempt.stageId}`;}
  next.result.badges=settleAchievements(next,now,next.result.id);
  if(leagueEnabled&&next.league?.active){
    const weekId=next.league.active.id;
    const before=leagueRows(next.league.active,Date.parse(now)).find(row=>row.id==='self')!;
    const points=recordLeagueWin(next.league,{profileId:profile.id,weekId,receiptId:next.result.id,puzzleId:p.puzzleId,
      mode:next.attempt.mode,difficulty:p.difficulty,assisted:next.attempt.assisted,at:Date.parse(now)},now);
    if(points||next.league.active.contributions[p.puzzleId]){
      const after=leagueRows(next.league.active,Date.parse(now)).find(row=>row.id==='self')!;
      next.result.league=points?{weekId,points,fromPoints:before.points,toPoints:after.points,fromPlace:before.place,toPlace:after.place}:{weekId,points};
    }
  }
  return next;
}

/** Strict root validation. Unknown future schemas/versions never reset the user's profile. */
export function decodeSave(input: unknown): Save {
  const fail=():never => { throw Error('Unsupported or corrupt Crossmath save'); };
  if (!input || typeof input !== 'object') return fail();
  const upgraded=upgradeCareer(upgradeSave(input));
  const isSchema3=(upgraded as {schemaVersion?:number})?.schemaVersion===3;
  const s=(isSchema3?structuredClone(upgraded):upgraded) as Save;
  if(isSchema3 && s.settings){
    s.schemaVersion=4;
    s.settings.timerVisible=false;
    s.ads=createAdState();
  }
  const nonnegative=(n:unknown):n is number => Number.isSafeInteger(n) && Number(n)>=0;
  if (s.schemaVersion !== 4 || !nonnegative(s.revision) || !['content-v1', 'content-v2'].includes(s.contentVersion) || s.balanceVersion !== config.configVersion) return fail();
  if (!s.profile || !s.settings || !s.attempt || !s.helpReceipts || typeof s.helpReceipts !== 'object' || Array.isArray(s.helpReceipts)) return fail();
  const p=s.profile,a=s.attempt;
  if (typeof p.id !== 'string' || !p.id || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt)) || typeof p.timeZone !== 'string') return fail();
  try { new Intl.DateTimeFormat('en',{timeZone:p.timeZone}); } catch { return fail(); }
  if (![p.coins,p.hintCredits,p.xp,p.rank,p.campaignCursor,p.fragments].every(nonnegative) || p.rank<1 || p.xp>=rankThreshold(p.rank) || p.campaignCursor>240 || p.fragments>48) return fail();
  if (!Array.isArray(p.solvedIds) || new Set(p.solvedIds).size!==p.solvedIds.length || !Array.isArray(p.paidCardIds) || new Set(p.paidCardIds).size!==p.paidCardIds.length || p.paidCardIds.some(id=>!config.cards.some(c=>c.id===id))) return fail();
  try { for (const id of p.solvedIds) getPuzzle(id); } catch { return fail(); }
  if (!['light','dark'].includes(s.settings.theme) || !['ru','en'].includes(s.settings.language) || !['sound','vibration','reducedMotion','timerVisible'].every(k=>typeof s.settings[k as keyof Settings]==='boolean')) return fail();
  validateMeta(s);
  if(s.meta.freeProgress && ![s.meta.freeProgress.relax,s.meta.freeProgress.challenge].every(nonnegative)) return fail();
  validateFreeIssuance(s.meta);
  validateCareer(s);
  validateAdState(s);
  if(s.leagueQuarantine!==undefined&&(!s.leagueQuarantine||s.leagueQuarantine.version!==1||!('raw' in s.leagueQuarantine)||s.league!==undefined))fail();
  if(s.league!==undefined){
    try{validateLeague(s.league,s.profile);if(s.league.active)for(const [id,c] of Object.entries(s.league.active.contributions)){if(!s.profile.solvedIds.includes(id)||getPuzzle(id).difficulty!==c.difficulty)throw Error('Unmatched league contribution');}}
    catch{ s.leagueQuarantine={version:1,raw:structuredClone(s.league)};delete s.league; }
  }
  if(s.leagueReceiptQuarantine!==undefined&&(!s.leagueReceiptQuarantine||typeof s.leagueReceiptQuarantine!=='object'||Array.isArray(s.leagueReceiptQuarantine))){s.leagueReceiptQuarantine={legacy:structuredClone(s.leagueReceiptQuarantine)};}
  const isolateLeagueReceipt=(result:Completion,location:string):void=>{
    if(result.league===undefined)return;
    const value=result.league as unknown;
    let valid=false;
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      const r=value as NonNullable<Completion['league']>,match=typeof r.weekId==='string'&&r.weekId.match(/^(.*):(\d{4}-\d{2}-\d{2}):league-lab-[12]$/);
      const expected={easy:1,standard:2,hard:3,expert:4}[getPuzzle(result.puzzleId).difficulty];
      valid=!!match&&match[1]===p.id&&nonnegative(r.points)&&(r.points===0||r.points===expected);
      const fields=[r.fromPoints,r.toPoints,r.fromPlace,r.toPlace];
      if(fields.some(v=>v!==undefined))valid=valid&&fields.every(nonnegative)&&(r.toPoints! - r.fromPoints!)===r.points&&r.fromPlace!>=1&&r.fromPlace!<=10&&r.toPlace!>=1&&r.toPlace!<=r.fromPlace!;
      const active=s.league?.active;
      if(active&&active.id===r.weekId){const c=active.contributions[result.puzzleId];valid=valid&&!!c&&(r.points===0||c.receiptId===result.id&&c.points===r.points);}
      else valid=valid&&(!!s.leagueQuarantine||!!s.league?.history.some(week=>week.id===r.weekId));
      if(location==='endless')valid=false;
    }
    if(!valid){(s.leagueReceiptQuarantine??={})[`${location}:${result.id}`]={location,resultId:result.id,raw:structuredClone(value)};delete result.league;}
  };
  const validateReceipt=(result:Completion,location:string):void=>{
    if (![result.coins,result.xp,result.rankUps,result.fragments,result.cardCoins].every(nonnegative) || typeof result.first!=='boolean' || !Number.isFinite(result.elapsedPlaying) || result.elapsedPlaying<0) fail();
    isolateLeagueReceipt(result,location);
    if (result.interstitialRequested !== undefined && result.interstitialRequested !== true) fail();
    if (result.workshop !== undefined) {
      const {workshop, collectionFragments: total, fragments} = result;
      if (!workshop || !nonnegative(workshop.from) || !nonnegative(workshop.to) ||
        workshop.from > workshop.to || workshop.to > p.solvedIds.length || !nonnegative(total) ||
        total > config.collection.fragmentWinThresholds.length || fragments > total) fail();
    }
    if (result.badges&&(!Array.isArray(result.badges)||result.badges.some(id=>!config.achievements.some(b=>b.id===id)))) fail();
  };
  const validateDailyTrophyReceipt=(result:Completion,day:string):void=>{
    if (result.dailyTrophyMonth !== undefined && (day.slice(0,7) !== result.dailyTrophyMonth ||
      !s.meta.monthlyTrophies?.[result.dailyTrophyMonth]?.earnedAt || result.dailyCoins !== config.dailyBonusCoins)) fail();
  };
  const validateAttempt=(a:Attempt,result:Completion|null,slot:string):void=>{
  const puzzle=getPuzzle(a.puzzleId);
  if (a.freeTrack !== undefined) {
    if (a.mode !== 'free' || !isFreeTrack(a.freeTrack)) return fail();
    const cursor = s.meta.freeProgress?.[a.freeTrack] ?? 0;
    if (!nonnegative(a.freeIndex) || a.freeIndex < cursor-1 || a.freeIndex > cursor-Number(a.status === 'won')) return fail();
    const matchesAssignment = a.freeAssignmentVersion === undefined
      ? freeTrackPuzzle(a.freeTrack, a.freeIndex).puzzleId === a.puzzleId
      : a.freeAssignmentVersion === freeAssignmentVersion && puzzle.bucket === bucketTurn(a.freeTrack, a.freeIndex).bucket;
    if (!matchesAssignment) return fail();
  } else if (a.freeIndex !== undefined || a.freeAssignmentVersion !== undefined || a.mode === 'free' && puzzle.contentVersion === 2) return fail();
  if(a.mode==='endless'?typeof a.runId!=='string'||!nonnegative(a.stageId):a.runId!==undefined||a.stageId!==undefined)fail();
  if(slot!==(a.mode==='daily'?`daily:${a.dayKey}`:a.mode)||a.mode==='daily'&&(!isCalendarDay(a.dayKey)||s.meta.assignments[a.dayKey]?.puzzleId!==a.puzzleId)||a.mode!=='daily'&&a.dayKey!==undefined)fail();
  if (typeof a.id !== 'string' || !a.id || a.contentVersion!==puzzle.contentVersion || a.rulesetVersion!==puzzle.rulesetVersion || !['campaign','free','daily','endless'].includes(a.mode) || !['playing','won','out-of-lives'].includes(a.status)) return fail();
  if (![a.boardRevision,a.hintsUsed,a.lives].every(nonnegative) || a.lives>3 || !Number.isFinite(a.elapsedPlaying) || a.elapsedPlaying<0 || typeof a.assisted!=='boolean' || typeof a.userPaused!=='boolean' || !(a.lastRejectedSignature===null || typeof a.lastRejectedSignature==='string')) return fail();
  if (!Array.isArray(a.history) || !Array.isArray(a.commandIds) || a.commandIds.some(id=>typeof id!=='string') || new Set(a.commandIds).size!==a.commandIds.length) return fail();
  assertInventory(puzzle,a); for (const layout of a.history) assertInventory(puzzle,layout);
  if (a.status==='won' && (!isSolved(puzzle,a) || !result || result.attemptId!==a.id || result.puzzleId!==a.puzzleId || result.id!==`win:${a.id}` || !p.solvedIds.includes(a.puzzleId))) return fail();
  if (a.status!=='won' && result!==null) return fail();
  if (result) validateReceipt(result,slot);
  if (result?.campaignFinished !== undefined && (typeof result.campaignFinished!=='boolean' || a.mode!=='campaign' ||
    p.campaignCursor!==campaignSequence(s.contentVersion).length || result.campaignFinished && campaignSequence(s.contentVersion).at(-1)!==a.puzzleId)) fail();
  if (result?.dailyTrophyMonth !== undefined) {
    if (a.mode !== 'daily' || !a.dayKey) return fail();
    validateDailyTrophyReceipt(result,a.dayKey);
  }
  if (result?.relaxGoalProgress !== undefined && (a.mode !== 'free' || a.freeTrack !== 'relax' ||
    !nonnegative(result.relaxGoalProgress) || result.relaxGoalProgress > (s.meta.relaxGoalIds?.length ?? 0))) fail();
  if (result?.trackGoal !== undefined && (result.relaxGoalProgress !== undefined || !validTrackGoalReceipt(s,a,result.trackGoal))) fail();
  };
  validateAttempt(a,s.result,s.meta.activeSlot);
  const attempts=new Set([a.id]);
  for(const [key,slot] of Object.entries(s.meta.inactive)){if(!slot||attempts.has(slot.attempt?.id))return fail();attempts.add(slot.attempt.id);validateAttempt(slot.attempt,slot.result,key);}
  for(const [day,assignment] of Object.entries(s.meta.assignments)){if(!isCalendarDay(day)||![routes.version,dailyVersion].includes(assignment.calendarVersion)) return fail();const puzzle=getPuzzle(assignment.puzzleId);if (assignment.calendarVersion === dailyVersion ? puzzle.bucket !== 'daily' : puzzle.contentVersion !== 1) return fail();}
  const archive=s.meta.archivedDailyResults;
  if (archive !== undefined) {
    if (!archive || typeof archive!=='object' || Array.isArray(archive)) return fail();
    const first=dailyArchiveStart(p.createdAt,p.timeZone,s.meta.effectiveDay);
    const completed=new Set(s.meta.completedDates);
    const solved=new Set(p.solvedIds);
    for (const [day,receipt] of Object.entries(archive)) {
      const slot=`daily:${day}`;
      if (!receipt || day>=first || !completed.has(day) || s.meta.assignments[day]?.puzzleId!==receipt.puzzleId || !solved.has(receipt.puzzleId) ||
        slot===s.meta.activeSlot || Object.hasOwn(s.meta.inactive,slot) || typeof receipt.attemptId!=='string' || !receipt.attemptId ||
        attempts.has(receipt.attemptId) || receipt.id!==`win:${receipt.attemptId}` || receipt.campaignFinished!==undefined ||
        receipt.relaxGoalProgress!==undefined || receipt.trackGoal!==undefined) return fail();
      attempts.add(receipt.attemptId);
      validateReceipt(receipt,`archive:${day}`);
      validateDailyTrophyReceipt(receipt,day);
    }
  }
  for (const receipt of Object.values(s.helpReceipts)) if (!receipt || !['applied','no_step','stale_snapshot','busy','already_solved','insufficient_resource','invalid_proof'].includes(receipt.outcome) || !['explain','reveal'].includes(receipt.kind) || !nonnegative(receipt.costCoins) || !nonnegative(receipt.costCredits)) return fail();
  return structuredClone(s);
}
