import type { FreeTrack } from '../content/rotation';
import type { Attempt, Difficulty, Mode } from '../core/types';
import type { Completion } from '../app/model';
import type { MonthlyTrophy } from './monthlyTrophy';
import type { TrackWinGoalId } from './trackGoals';
export const rootScreens=['home','calendar','modes','profile'] as const;
export type RootScreen=typeof rootScreens[number];
export type MetaScreen=RootScreen|'play'|'album';
export interface Offer { puzzleId:string; mode:Mode; dayKey?:string; campaignPosition?:number; endlessStage?:number; freeTrack?:FreeTrack; requiresSolved?:string[] }
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
  trackGoalWins?: Partial<Record<TrackWinGoalId,true>>;
}
