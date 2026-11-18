import { campaignPuzzle, config, getPuzzle, routes } from '../content/catalog';
import { applyCommand, applyHelpLayout, createAttempt } from '../core/engine';
import { explain, verifyExplanation } from '../help/logic';
import { materializeHelp, reveal } from '../help/reveal';
import { settleCompletion } from './model';
import type { HelpOutcome, HelpReceipt, Save, Settings } from './model';
import type { BoardAction, Command } from '../core/types';
import type { HintPlan } from '../help/logic';
import type { Transition } from '../core/engine';
import type { SaveRepository } from './saveRepository';

export class GameSession {
  private busy=false;
  constructor(public state: Save, private readonly repository: SaveRepository, private readonly id:()=>string) {}
  private async persist(next: Save, elapsed: number): Promise<void> {
    next.attempt.elapsedPlaying+=Math.max(0,elapsed);
    next=settleCompletion(next); next.revision=this.state.revision+1;
    this.state=await this.repository.commit(this.state.revision,next);
  }
  async command(action: BoardAction, elapsed=0, metadata?: {commandId:string;expectedRevision:number}): Promise<Transition> {
    const command={...action,commandId:metadata?.commandId ?? this.id(),expectedRevision:metadata?.expectedRevision ?? this.state.attempt.boardRevision} as Command;
    if (this.busy) return {state:this.state.attempt,outcome:'unavailable',cue:'none'};
    this.busy=true;
    try {
      const result=applyCommand(getPuzzle(this.state.attempt.puzzleId),this.state.attempt,command);
      if (result.outcome==='applied') await this.persist({...structuredClone(this.state),attempt:result.state},elapsed);
      return {...result,state:this.state.attempt};
    } finally { this.busy=false; }
  }
  prepareHelp(kind:'explain'|'reveal', selectedCell?:number): HintPlan | null {
    const p=getPuzzle(this.state.attempt.puzzleId),a=this.state.attempt;
    return kind==='explain' ? explain(p,a) : reveal(p,a,selectedCell);
  }
  async help(kind:'explain'|'reveal', operationId:string, expectedRevision:number, plan:HintPlan|null, elapsed=0): Promise<HelpReceipt> {
    const previous=this.state.helpReceipts[operationId]; if (previous) return previous;
    const receipt=(outcome:HelpOutcome,costCoins=0,costCredits=0):HelpReceipt=>({outcome,kind,costCoins,costCredits});
    if (this.busy || this.state.attempt.userPaused) return receipt('busy');
    this.busy=true;
    try {
      const a=this.state.attempt,p=getPuzzle(a.puzzleId);
      const reject=async(outcome:HelpOutcome):Promise<HelpReceipt>=>{const result=receipt(outcome),next=structuredClone(this.state);next.helpReceipts[operationId]=result;await this.persist(next,elapsed);return result;};
      if (a.status!=='playing') return await reject('already_solved');
      if (a.boardRevision!==expectedRevision) return await reject('stale_snapshot');
      if (!plan) return await reject('no_step');
      if (plan.kind!==kind || plan.boardRevision!==a.boardRevision || plan.puzzleId!==p.puzzleId || kind==='explain' && !verifyExplanation(p,a,plan)) return await reject('invalid_proof');
      const layout=materializeHelp(p,a,plan); if (!layout) return await reject('invalid_proof');
      const costCredits=this.state.profile.hintCredits>0 ? 1 : 0, costCoins=costCredits ? 0 : config.hintCostCoins;
      if (this.state.profile.coins<costCoins) return await reject('insufficient_resource');
      const next=structuredClone(this.state),result=receipt('applied',costCoins,costCredits);
      next.attempt=applyHelpLayout(p,a,layout,operationId);next.profile.coins-=costCoins;next.profile.hintCredits-=costCredits;next.helpReceipts[operationId]=result;
      await this.persist(next,elapsed); return result;
    } finally { this.busy=false; }
  }
  async next(elapsed=0):Promise<boolean> {
    if (this.busy || this.state.attempt.status!=='won' || this.state.profile.campaignCursor>=routes.campaignSequence.length) return false;
    this.busy=true;
    try { const next=structuredClone(this.state);next.attempt=createAttempt(campaignPuzzle(next.profile.campaignCursor),this.id());next.result=null;await this.persist(next,elapsed);return true; } finally {this.busy=false;}
  }
  async restart():Promise<boolean> {
    if (this.busy) return false;this.busy=true;
    try { const next=structuredClone(this.state);next.attempt=createAttempt(getPuzzle(next.attempt.puzzleId),this.id(),next.attempt.mode);next.result=null;await this.persist(next,0);return true; } finally {this.busy=false;}
  }
  async update(settings:Partial<Settings>, userPaused:boolean, elapsed=0):Promise<void> {
    if (this.busy) return;this.busy=true;
    try { const next=structuredClone(this.state);next.settings={...next.settings,...settings};next.attempt.userPaused=userPaused;await this.persist(next,elapsed); } finally {this.busy=false;}
  }
  async checkpoint(elapsed:number):Promise<boolean> {
    if (this.busy || elapsed<=0 || this.state.attempt.status!=='playing') return false;
    this.busy=true;
    try {await this.persist(structuredClone(this.state),elapsed);return true;} finally {this.busy=false;}
  }
}
