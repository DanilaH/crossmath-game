import type { FreeTrack } from '../content/rotation';
import type { Attempt, Difficulty, Mode } from '../core/types';
import type { Completion } from '../app/model';
import type { MonthlyTrophy } from './monthlyTrophy';
import type { TrackWinGoalId } from './trackGoals';
import type { FreeIssuance } from '../content/freeIssuance';
export const rootScreens=['home','calendar','modes','profile'] as const;
export type RootScreen=typeof rootScreens[number];
export type MetaScreen=RootScreen|'play'|'album'|'league';
export type NewGameChoice='campaign'|FreeTrack|'endless';
export interface Offer { puzzleId:string; mode:Mode; dayKey?:string; campaignPosition?:number; endlessStage?:number; freeTrack?:FreeTrack; freeIndex?:number; requiresSolved?:string[] }
export interface QuestSlot { goalId:string; target:number; progress:number; paid:boolean }
export interface QuestSet { dayKey:string; configVersion:string; issueIndex:number; slots:QuestSlot[]; witness:Offer[]; replacements:{slot:number;from:string;to:string;oldProgress:number}[] }
export interface SavedSlot { attempt:Attempt; result:Completion|null }
export interface MetaState {
  version:1; screen:MetaScreen; activeSlot:string; inactive:Record<string,SavedSlot>; freeDifficulty:Difficulty; freeProgress?:Record<FreeTrack,number>;
  effectiveDay:string; issuedDays:number; quests:QuestSet|null; contributedIds:string[];
  assignments:Record<string,{puzzleId:string;calendarVersion:string}>; completedDates:string[];
  archivedDailyResults?: Record<string,Completion>;
  slotReceipts:string[]; setReceipts:string[];
  relaxGoalIds?: string[];
  monthlyTrophies?: Record<string,MonthlyTrophy>;
  calendarTrophyMonth?: string;
  calendarSelectedDay?: string;
  albumOrigin?: 'home'|'profile';
  leagueOrigin?: 'home'|'profile';
  trackGoalWins?: Partial<Record<TrackWinGoalId,true>>;
  freeIssuance?: FreeIssuance;
}
