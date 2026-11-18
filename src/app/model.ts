import { config, getPuzzle, routes, campaignPuzzle } from '../content/catalog';
import { createAttempt } from '../core/engine';
import { assertInventory, isSolved } from '../core/types';
import type { Attempt } from '../core/types';

export interface Settings { theme: 'light' | 'dark'; sound: boolean; vibration: boolean; reducedMotion: boolean; language: 'ru' | 'en' }
export interface Completion {
  id: string; attemptId: string; puzzleId: string; first: boolean; coins: number; xp: number;
  rankUps: number; fragments: number; cardCoins: number; elapsedPlaying: number;
}
export type HelpOutcome = 'applied' | 'no_step' | 'stale_snapshot' | 'busy' | 'already_solved' | 'insufficient_resource' | 'invalid_proof';
export interface HelpReceipt { outcome: HelpOutcome; kind: 'explain' | 'reveal'; costCoins: number; costCredits: number }
export interface Save {
  schemaVersion: 1; revision: number; contentVersion: 'content-v1'; balanceVersion: string;
  profile: { id: string; createdAt: string; timeZone: string; coins: number; hintCredits: number;
    rank: number; xp: number; solvedIds: string[]; campaignCursor: number; fragments: number; paidCardIds: string[] };
  settings: Settings; attempt: Attempt; result: Completion | null; helpReceipts: Record<string,HelpReceipt>;
}
export function createSave(id: string, now: string, timeZone: string, attemptId: string): Save {
  return {schemaVersion:1,revision:0,contentVersion:'content-v1',balanceVersion:config.configVersion,
    profile:{id,createdAt:now,timeZone,coins:config.initialCoins,hintCredits:config.initialHintCredits,rank:1,xp:0,solvedIds:[],campaignCursor:0,fragments:0,paidCardIds:[]},
    settings:{theme:'light',sound:false,vibration:false,reducedMotion:false,language:'ru'},
    attempt:createAttempt(campaignPuzzle(0),attemptId),result:null,helpReceipts:{}};
}
export const rankThreshold = (rank: number): number => Math.min(config.rank.baseXp+config.rank.stepXp*(rank-1),config.rank.maxXpPerRank);
export function settleCompletion(save: Save): Save {
  if (save.attempt.status !== 'won' || save.result?.attemptId === save.attempt.id) return save;
  const next=structuredClone(save), p=getPuzzle(next.attempt.puzzleId), profile=next.profile;
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
  if (next.attempt.mode === 'campaign' && routes.campaignSequence[profile.campaignCursor] === p.puzzleId) profile.campaignCursor++;
  next.result={id:`win:${next.attempt.id}`,attemptId:next.attempt.id,puzzleId:p.puzzleId,first,coins,xp:reward.xp,rankUps,fragments:profile.fragments-previousFragments,cardCoins,elapsedPlaying:next.attempt.elapsedPlaying};
  return next;
}

/** Strict root validation. Unknown future schemas/versions never reset the user's profile. */
export function decodeSave(input: unknown): Save {
  const fail=():never => { throw Error('Unsupported or corrupt Crossmath save'); };
  if (!input || typeof input !== 'object') return fail();
  const s=input as Save;
  const nonnegative=(n:unknown):n is number => Number.isSafeInteger(n) && Number(n)>=0;
  if (s.schemaVersion !== 1 || !nonnegative(s.revision) || s.contentVersion !== 'content-v1' || s.balanceVersion !== config.configVersion) return fail();
  if (!s.profile || !s.settings || !s.attempt || !s.helpReceipts || typeof s.helpReceipts !== 'object' || Array.isArray(s.helpReceipts)) return fail();
  const p=s.profile,a=s.attempt;
  if (typeof p.id !== 'string' || !p.id || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt)) || typeof p.timeZone !== 'string') return fail();
  try { new Intl.DateTimeFormat('en',{timeZone:p.timeZone}); } catch { return fail(); }
  if (![p.coins,p.hintCredits,p.xp,p.rank,p.campaignCursor,p.fragments].every(nonnegative) || p.rank<1 || p.xp>=rankThreshold(p.rank) || p.campaignCursor>240 || p.fragments>48) return fail();
  if (!Array.isArray(p.solvedIds) || new Set(p.solvedIds).size!==p.solvedIds.length || !Array.isArray(p.paidCardIds) || new Set(p.paidCardIds).size!==p.paidCardIds.length || p.paidCardIds.some(id=>!config.cards.some(c=>c.id===id))) return fail();
  try { for (const id of p.solvedIds) getPuzzle(id); } catch { return fail(); }
  if (!['light','dark'].includes(s.settings.theme) || !['ru','en'].includes(s.settings.language) || !['sound','vibration','reducedMotion'].every(k=>typeof s.settings[k as keyof Settings]==='boolean')) return fail();
  const puzzle=getPuzzle(a.puzzleId);
  if (typeof a.id !== 'string' || !a.id || a.contentVersion!==puzzle.contentVersion || a.rulesetVersion!==puzzle.rulesetVersion || !['campaign','free','daily','endless'].includes(a.mode) || !['playing','won','out-of-lives'].includes(a.status)) return fail();
  if (![a.boardRevision,a.hintsUsed,a.lives].every(nonnegative) || a.lives>3 || !Number.isFinite(a.elapsedPlaying) || a.elapsedPlaying<0 || typeof a.assisted!=='boolean' || typeof a.userPaused!=='boolean' || !(a.lastRejectedSignature===null || typeof a.lastRejectedSignature==='string')) return fail();
  if (!Array.isArray(a.history) || !Array.isArray(a.commandIds) || a.commandIds.some(id=>typeof id!=='string') || new Set(a.commandIds).size!==a.commandIds.length) return fail();
  assertInventory(puzzle,a); for (const layout of a.history) assertInventory(puzzle,layout);
  if (a.status==='won' && (!isSolved(puzzle,a) || !s.result || s.result.attemptId!==a.id || s.result.puzzleId!==a.puzzleId || s.result.id!==`win:${a.id}` || !p.solvedIds.includes(a.puzzleId))) return fail();
  if (a.status!=='won' && s.result!==null) return fail();
  if (s.result && (![s.result.coins,s.result.xp,s.result.rankUps,s.result.fragments,s.result.cardCoins].every(nonnegative) || typeof s.result.first!=='boolean' || !Number.isFinite(s.result.elapsedPlaying) || s.result.elapsedPlaying<0)) return fail();
  for (const receipt of Object.values(s.helpReceipts)) if (!receipt || !['applied','no_step','stale_snapshot','busy','already_solved','insufficient_resource','invalid_proof'].includes(receipt.outcome) || !['explain','reveal'].includes(receipt.kind) || !nonnegative(receipt.costCoins) || !nonnegative(receipt.costCredits)) return fail();
  return structuredClone(s);
}
