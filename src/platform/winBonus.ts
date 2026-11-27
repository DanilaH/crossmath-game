import type { Save } from '../app/model';
import { config, getPuzzle } from '../content/catalog';

// Isolated research candidate. Never read from remote config or a player's save.
// Numeric eligibility is a proposal, not production policy.
export const winBonusCandidate = import.meta.env.MODE === 'win-rv-lab';
export interface WinBonusTarget {
  policy:'win-rv-lab-1'; resultId:string; puzzleId:string; baseCoins:number; delta:number;
}
export function winBonusOffer(save:Save, enabled=winBonusCandidate):WinBonusTarget|null {
  const result=save.result;
  if(!enabled || save.meta.screen!=='play' || save.attempt.status!=='won' ||
    !['campaign','free'].includes(save.attempt.mode) || !result?.first ||
    result.id!==`win:${save.attempt.id}` || save.profile.solvedIds.length<=5 ||
    !result.baseCoins || result.baseCoins!==config.difficultyRewards[getPuzzle(result.puzzleId).difficulty].coins ||
    Object.values(save.ads.requests).some(entry=>entry.request.win?.resultId===result.id &&
      (entry.settlement===undefined || entry.settlement==='earned'))) return null;
  return {policy:'win-rv-lab-1',resultId:result.id,puzzleId:result.puzzleId,baseCoins:result.baseCoins,delta:2*result.baseCoins};
}
export function validWinBonusTarget(target:unknown):target is WinBonusTarget {
  if(!target || typeof target!=='object' || Array.isArray(target))return false;
  const t=target as WinBonusTarget;
  try {
    return t.policy==='win-rv-lab-1' && typeof t.resultId==='string' && t.resultId.startsWith('win:') && t.resultId.length>4 &&
      t.baseCoins===config.difficultyRewards[getPuzzle(t.puzzleId).difficulty].coins && t.delta===2*t.baseCoins;
  } catch {return false;}
}
