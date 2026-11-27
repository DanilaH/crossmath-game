import type { Save } from '../app/model';
import type { Transition } from '../core/engine';
import type { Attempt, BoardAction } from '../core/types';

export type Cue = 'pick' | 'place' | 'right' | 'wrong' | 'win' | 'return' | 'sort' | 'undo' | 'start';
export type Contact = 'wood' | 'exchange';
export type GoalAccent = 'step' | 'complete';
export interface CueDetail {
  contact?: Contact;
  grasp?: true;
  double?: true;
  workshop?: 'part' | 'instrument';
  rank?: true;
  goal?: GoalAccent;
  lifeLost?: true;
}
export interface MoveFeedback {
  cue: Exclude<Cue, 'pick' | 'start'>;
  before: Attempt;
  attemptId: string;
  revision: number;
  commandId: string;
  cell?: number;
  detail: CueDetail;
}
type FeedbackAction = BoardAction | {type:'Help'; cellId:number};

export function acceptedFeedback(
  action: FeedbackAction, commandId: string, before: Attempt, after: Attempt,
  outcome: Transition['outcome'], cue: Transition['cue'],
): MoveFeedback | undefined {
  if (outcome !== 'applied' || before.id !== after.id || before.commandIds.includes(commandId)
    || after.commandIds.at(-1) !== commandId) return;
  const move = {before, attemptId:after.id, revision:after.boardRevision, commandId, detail:{} as CueDetail};
  if (action.type === 'Undo') return {...move, cue:'undo'};
  if (action.type === 'SortTray') return {...move, cue:'sort'};
  if (action.type === 'ReturnToTray') return {...move, cue:'return'};
  if (cue === 'none') return;
  if (cue === 'wrong' && after.lives < before.lives) move.detail.lifeLost = true;
  if (action.type === 'SubmitEndless') return {...move, cue};
  const cell = action.type === 'MoveCell' ? action.to : action.cellId;
  move.detail.contact = action.type === 'MoveCell' && before.placements[cell] !== undefined ? 'exchange' : 'wood';
  return {...move, cue, cell};
}

export function moveIsCurrent(move: MoveFeedback, attempt: Attempt): boolean {
  return move.attemptId === attempt.id && move.revision === attempt.boardRevision && move.commandId === attempt.commandIds.at(-1);
}

export interface GoalProgress {
  from: number;
  to: number;
  target: number;
}
export interface VictoryFeedback {
  id: string;
  detail: CueDetail;
  quests: GoalProgress[];
}

export function victoryFeedback(before: Save, after: Save): VictoryFeedback | undefined {
  const receipt = after.result;
  if (!receipt || receipt.id === before.result?.id || receipt.attemptId !== after.attempt.id) return;
  const detail: CueDetail = {};
  if (receipt.fragments) detail.workshop = receipt.cardCoins ? 'instrument' : 'part';
  if (receipt.rankUps) detail.rank = true;

  const a = before.meta.quests, b = after.meta.quests;
  const quests = a && b && a.dayKey === b.dayKey && a.issueIndex === b.issueIndex ? b.slots.flatMap((slot, index) => {
    const old = a.slots[index];
    return old?.goalId === slot.goalId && old.target === slot.target && slot.progress > old.progress
      ? [{from:old.progress,to:slot.progress,target:slot.target}] : [];
  }) : [];
  if (quests.length) detail.goal = quests.some(goal=>goal.to >= goal.target) ? 'complete' : 'step';
  return {id:receipt.id,detail,quests};
}
