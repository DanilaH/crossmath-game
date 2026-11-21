import type { FreeTrack } from '../content/rotation';
import type { Attempt, Difficulty, Mode } from '../core/types';
import type { Completion } from '../app/model';
export type MetaScreen='play'|'home'|'calendar'|'album'|'profile';
export interface Offer { puzzleId:string; mode:Mode; dayKey?:string; campaignPosition?:number; endlessStage?:number; freeTrack?:FreeTrack; requiresSolved?:string[] }
export interface QuestSlot { goalId:string; target:number; progress:number; paid:boolean }
export interface QuestSet { dayKey:string; configVersion:string; issueIndex:number; slots:QuestSlot[]; witness:Offer[]; replacements:{slot:number;from:string;to:string;oldProgress:number}[] }
export interface SavedSlot { attempt:Attempt; result:Completion|null }
export interface MetaState {
  version:1; screen:MetaScreen; activeSlot:string; inactive:Record<string,SavedSlot>; freeDifficulty:Difficulty; freeProgress?:Record<FreeTrack,number>;
  effectiveDay:string; issuedDays:number; quests:QuestSet|null; contributedIds:string[];
  assignments:Record<string,{puzzleId:string;calendarVersion:string}>; completedDates:string[];
  slotReceipts:string[]; setReceipts:string[];
  relaxGoalIds?: string[];
}
