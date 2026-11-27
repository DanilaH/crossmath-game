import {joinLeague,leagueEnabled,leagueUpdateDue} from '../meta/league';
import { challengeUnlockWins } from '../content/rotation';
import type { FreeTrack } from '../content/rotation';
import { beginInterstitial, canRequestReward, createRewardRequest, settleInterstitial, settleReward } from '../platform/adState';
import type { RewardEvent, RewardKind, RewardRequest } from '../platform/adState';
import type { InterstitialRequestOutcome } from '@danilah/mini-games-kit/platform';
import { campaignPuzzle, campaignSequence, config, dailyVersion, freeAssignmentVersion, getPuzzle, routes } from '../content/catalog';
import { applyCommand, applyHelpLayout, createAttempt } from '../core/engine';
import { prepareExplanation, verifyExplanation } from '../help/logic';
import type { ExplainPreparation } from '../help/logic';
import { materializeHelp, reveal } from '../help/reveal';
import { settleCompletion } from './model';
import type { HelpOutcome, HelpReceipt, Save, Settings } from './model';
import type { BoardAction, Command } from '../core/types';
import type { HintPlan } from '../help/logic';
import type { Transition } from '../core/engine';
import type { SaveRepository } from './saveRepository';
import { refreshDay } from '../meta/progress';
import { availableOffers, contribution, freeTrackOffer, mastered, refreshQuests } from '../meta/missions';
import { finishRun, recordTime, recordVersion } from '../meta/career';
import type { EndlessRun } from '../meta/career';
import { calendarPuzzle, canResumeDaily, dateAvailable, profileDay } from '../meta/calendar';
import type { Difficulty } from '../core/types';
import type { MetaScreen, NewGameChoice, Offer, SavedSlot } from '../meta/types';
import { endlessEnabled } from '../content/modeAvailability';
import { buildIssuancePolicy, pilotIssuancePolicy, pinFreeAssignment, preserveFreeAssignment, resolveFreeAssignment } from '../content/freeIssuance';
import type { FreeAssignment } from '../content/freeIssuance';

export function storedSlot(save:Save,key:string):SavedSlot|undefined{return save.meta.activeSlot===key?{attempt:save.attempt,result:save.result}:save.meta.inactive[key];}
export function campaignContinuation(save: Save): string | undefined {
  const saved = storedSlot(save, 'campaign');
  return saved?.attempt.status === 'playing' ? saved.attempt.puzzleId
    : campaignSequence(save.contentVersion)[save.profile.campaignCursor] ?? saved?.attempt.puzzleId;
}
export function dailyDayAvailable(save: Save, day: string): boolean {
  const {createdAt,timeZone}=save.profile;
  return canResumeDaily(storedSlot(save,'daily:'+day)?.attempt) || dateAvailable(createdAt,timeZone,save.meta.effectiveDay,day);
}

export function selectedDailyDay(save:Save):string {
  const day=save.meta.calendarSelectedDay ?? save.attempt.dayKey;
  return day && dailyDayAvailable(save,day) ? day : save.meta.effectiveDay;
}
export type OpenOutcome='opened'|'confirm_replace'|'unavailable';

export function hintPayment({coins, hintCredits}: Save['profile']) {
  const costCredits = hintCredits > 0 ? 1 : 0;
  const costCoins = costCredits ? 0 : config.hintCostCoins;
  return { costCredits, costCoins, missingCoins: Math.max(0, costCoins - coins) };
}

export class GameSession {
  private busy=false;
  private readonly writeWaiters = new Set<() => void>();

  get writing():boolean { return this.busy; }

  private finishWrite():void {
    this.busy=false;
    for(const resume of this.writeWaiters)resume();
    this.writeWaiters.clear();
  }

  async waitForWrite():Promise<void> {
    while(this.busy)await new Promise<void>(resolve=>this.writeWaiters.add(resolve));
  }

  private async receiveAdWrite(stillActive:()=>boolean, write:()=>Promise<void>):Promise<void> {
    while(this.busy)await this.waitForWrite();
    if(!stillActive())throw Error('Ad adapter disposed');
    this.busy=true;
    try{await write();}finally{this.finishWrite();}
  }

  async beginReward(kind:RewardKind,elapsed=0):Promise<RewardRequest|null> {
    if(this.busy)return null;
    this.busy=true;
    try{
      const next=structuredClone(this.state);
      refreshDay(next,this.now());
      if(!canRequestReward(next,kind))return null;
      const request=createRewardRequest(next,this.id(),kind);
      await this.persist(next,elapsed);
      return request;
    }finally{this.finishWrite();}
  }

  async acceptReward(event:RewardEvent,stillActive:()=>boolean):Promise<'applied'|'already-applied'> {
    let outcome:'applied'|'already-applied'='already-applied';
    await this.receiveAdWrite(stillActive,async()=>{
      const entry=this.state.ads.requests[event.id];
      if(!entry||event.profileId!==this.state.profile.id||!['earned','cancelled','failed'].includes(event.outcome)){
        throw Error('Unmatched ad receipt');
      }
      if(entry.settlement)return;
      const next=structuredClone(this.state);
      refreshDay(next,this.now());
      settleReward(next,event);
      await this.persist(next,0);
      outcome='applied';
    });
    return outcome;
  }

  async beginInterstitial(resultId:string, stillActive:()=>boolean):Promise<boolean> {
    let reserved=false;
    await this.receiveAdWrite(stillActive,async()=>{
      const next=structuredClone(this.state);
      if(!beginInterstitial(next,resultId))return;
      await this.persist(next,0);
      reserved=true;
    });
    return reserved;
  }

  recordInterstitial(resultId:string,outcome:InterstitialRequestOutcome,stillActive:()=>boolean):Promise<void> {
    return this.receiveAdWrite(stillActive,async()=>{
      const next=structuredClone(this.state);
      if(settleInterstitial(next,resultId,outcome))await this.persist(next,0);
    });
  }
  constructor(public state: Save, private readonly repository: SaveRepository, private readonly id:()=>string,private readonly now:()=>string=()=>new Date().toISOString()) {}
  async restore(): Promise<void> {
    if (endlessEnabled || this.state.meta.activeSlot !== 'endless') {
      await this.refreshDay();
      return;
    }
    const next = structuredClone(this.state);
    const {meta} = next;
    meta.inactive.endless = {attempt:next.attempt,result:next.result};
    const campaign = meta.inactive.campaign;
    if (campaign) {
      next.attempt = campaign.attempt;
      next.result = campaign.result;
      delete meta.inactive.campaign;
    } else {
      const index = Math.min(next.profile.campaignCursor,campaignSequence(next.contentVersion).length-1);
      next.attempt = createAttempt(campaignPuzzle(index,next.contentVersion),this.id());
      next.result = null;
    }
    meta.activeSlot = 'campaign';
    if (meta.screen === 'play') meta.screen = 'home';
    await this.persist(next,0);
  }

  private get suspendedAttempt(): boolean { return !endlessEnabled && this.state.attempt.mode === 'endless'; }

  private async persist(next: Save, elapsed: number): Promise<void> {
    next.attempt.elapsedPlaying+=Math.max(0,elapsed);
    recordTime(next,this.state.attempt.mode,elapsed);
    const timestamp=this.now();refreshDay(next,timestamp);next=settleCompletion(next,timestamp); next.revision=this.state.revision+1;
    this.state=await this.repository.commit(this.state.revision,next);
  }
  async command(action: BoardAction, elapsed=0, metadata?: {commandId:string;expectedRevision:number}): Promise<Transition> {
    const command={...action,commandId:metadata?.commandId ?? this.id(),expectedRevision:metadata?.expectedRevision ?? this.state.attempt.boardRevision} as Command;
    if (this.busy||this.suspendedAttempt||this.state.attempt.mode==='endless'&&this.state.career.run?.status!=='active') return {state:this.state.attempt,outcome:'unavailable',cue:'none'};
    this.busy=true;
    try {
      const result=applyCommand(getPuzzle(this.state.attempt.puzzleId),this.state.attempt,command);
      if (result.outcome==='applied') {const next={...structuredClone(this.state),attempt:result.state},stats=next.career.modes[next.attempt.mode];if(result.cue==='wrong')stats.mistakes++;if(action.type==='Undo')stats.undos++;
        if(next.attempt.mode==='endless'){const run=next.career.run!;run.lives=next.attempt.lives;if(run.lives===0)run.status='failed';}
        await this.persist(next,elapsed);}
      return {...result,state:this.state.attempt};
    } finally { this.finishWrite(); }
  }
  prepareHelp(kind:'explain'|'reveal', selectedCell?:number): HintPlan | null {
    if (this.suspendedAttempt) return null;
    if (kind === 'explain') {
      const result = this.prepareExplanation();
      return result.outcome === 'ready' ? result.plan : null;
    }
    const a = this.state.attempt;
    return reveal(getPuzzle(a.puzzleId),a,selectedCell);
  }
  prepareExplanation(): ExplainPreparation {
    const attempt = this.state.attempt;
    return prepareExplanation(getPuzzle(attempt.puzzleId),attempt);
  }
  async help(kind:'explain'|'reveal', operationId:string, expectedRevision:number, plan:HintPlan|null, elapsed=0): Promise<HelpReceipt> {
    const previous=this.state.helpReceipts[operationId]; if (previous) return previous;
    const receipt=(outcome:HelpOutcome,costCoins=0,costCredits=0):HelpReceipt=>({outcome,kind,costCoins,costCredits});
    if (this.busy || this.suspendedAttempt || this.state.attempt.userPaused||this.state.attempt.mode==='endless'&&this.state.career.run?.status!=='active') return receipt('busy');
    this.busy=true;
    try {
      const a=this.state.attempt,p=getPuzzle(a.puzzleId);
      const reject=async(outcome:HelpOutcome):Promise<HelpReceipt>=>{const result=receipt(outcome),next=structuredClone(this.state);next.helpReceipts[operationId]=result;await this.persist(next,elapsed);return result;};
      if (a.status!=='playing') return await reject('already_solved');
      if (a.boardRevision!==expectedRevision) return await reject('stale_snapshot');
      if (!plan) return await reject('no_step');
      if (plan.attemptId!==a.id) return await reject('stale_snapshot');
      if (plan.kind!==kind || plan.boardRevision!==a.boardRevision || plan.puzzleId!==p.puzzleId || kind==='explain' && !verifyExplanation(p,a,plan)) return await reject('invalid_proof');
      const layout=materializeHelp(p,a,plan); if (!layout) return await reject('invalid_proof');
      const {costCredits,costCoins,missingCoins}=hintPayment(this.state.profile);
      if (missingCoins > 0) return await reject('insufficient_resource');
      const next=structuredClone(this.state),result=receipt('applied',costCoins,costCredits);
      next.attempt=applyHelpLayout(p,a,layout,operationId);next.profile.coins-=costCoins;next.profile.hintCredits-=costCredits;next.helpReceipts[operationId]=result;
      next.career.modes[a.mode][kind==='explain'?'explains':'reveals']++;if(a.mode==='endless')next.career.run!.assisted=true;
      await this.persist(next,elapsed); return result;
    } finally { this.finishWrite(); }
  }
  async next(elapsed=0):Promise<boolean> {
    if(this.state.attempt.status!=='won')return false;
    if(this.state.attempt.mode==='daily')return this.navigate('calendar',elapsed,this.state.result?.dailyTrophyMonth);
    if(this.state.attempt.mode==='free') {
      const track = this.state.attempt.freeTrack;
      return (track ? await this.openFreeTrack(track, true, elapsed) : await this.openFree(this.state.meta.freeDifficulty,true,elapsed)) === 'opened';
    }
    if(this.state.attempt.mode==='endless')return this.nextStage();
    if (this.busy || this.state.profile.campaignCursor>=routes.campaignSequence.length) return false;
    this.busy=true;
    try { const next=structuredClone(this.state);next.attempt=createAttempt(campaignPuzzle(next.profile.campaignCursor,next.contentVersion),this.id());next.career.modes.campaign.starts++;next.result=null;await this.persist(next,elapsed);return true; } finally {this.finishWrite();}
  }
  async restart():Promise<boolean> {
    if(this.state.attempt.mode==='endless')return await this.newRun(true)==='opened';
    if (this.busy) return false;this.busy=true;
    try {
      const next=structuredClone(this.state);
      refreshDay(next,this.now());
      if(!this.canRestart(next))return false;
      const old=next.attempt, attempt=createAttempt(getPuzzle(old.puzzleId),this.id(),old.mode);
      const stats=next.career.modes[old.mode];stats.starts++;stats.restarts++;
      if (old.dayKey) attempt.dayKey=old.dayKey;
      if (old.freeTrack) {
        attempt.freeTrack=old.freeTrack;
        attempt.freeIndex=old.freeIndex!;
        if (old.freeAssignmentVersion!==undefined) attempt.freeAssignmentVersion=old.freeAssignmentVersion;
      }
      next.attempt=attempt;
      next.result=null;
      await this.persist(next,0);
      return true;
    } finally {this.finishWrite();}
  }
  async update(settings:Partial<Settings>, userPaused:boolean, elapsed=0):Promise<void> {
    if (this.busy) return;this.busy=true;
    try { const next=structuredClone(this.state);next.settings={...next.settings,...settings};next.attempt.userPaused=userPaused;await this.persist(next,elapsed); } finally {this.finishWrite();}
  }
  async checkpoint(elapsed:number):Promise<boolean> {
    if (this.busy || elapsed<=0 || this.state.attempt.status!=='playing') return false;
    this.busy=true;
    try {await this.persist(structuredClone(this.state),elapsed);return true;} finally {this.finishWrite();}
  }
  canRestart(save=this.state):boolean{return (endlessEnabled||save.attempt.mode!=='endless')&&(save.attempt.mode!=='daily'||dateAvailable(save.profile.createdAt,save.profile.timeZone,save.meta.effectiveDay,save.attempt.dayKey!));}
  hasLeagueUpdate():boolean{return leagueEnabled&&leagueUpdateDue(this.state.league,this.now());}
  async enterLeague():Promise<boolean>{
    if(this.busy||!leagueEnabled||this.state.leagueQuarantine)return false;
    const league=joinLeague(this.state.league,this.state.profile.id,this.state.profile.timeZone,this.now());
    if(!league)return false;
    this.busy=true;try{const next=structuredClone(this.state);next.league=league;await this.persist(next,0);return true;}finally{this.finishWrite();}
  }
  hasDayChange():boolean{return profileDay(this.now(),this.state.profile.timeZone)>this.state.meta.effectiveDay;}
  async refreshDay():Promise<boolean>{
    if(this.busy)return false;const next=structuredClone(this.state), previousSet=next.meta.quests;
    refreshDay(next,this.now());
    if(previousSet && next.meta.quests===previousSet)refreshQuests(next);
    if(JSON.stringify(next.meta)===JSON.stringify(this.state.meta)&&!this.hasLeagueUpdate())return false;
    this.busy=true;try{await this.persist(next,0);return true;}finally{this.finishWrite();}
  }
  async navigate(screen:MetaScreen,elapsed=0,calendarTrophyMonth?:string):Promise<boolean>{
    if(this.busy||screen==='league'&&!leagueEnabled||screen==='play'&&this.suspendedAttempt)return false;this.busy=true;
    try{
      const next=structuredClone(this.state);next.meta.screen=screen;next.attempt.userPaused=false;
      if(screen==='album')next.meta.albumOrigin=this.state.meta.screen==='profile'?'profile':'home';
      delete next.meta.calendarTrophyMonth;
      if(screen==='calendar' && calendarTrophyMonth)next.meta.calendarTrophyMonth=calendarTrophyMonth;
      await this.persist(next,next.attempt.status==='playing'?elapsed:0);return true;
    }finally{this.finishWrite();}
  }
  async selectDailyDay(day:string):Promise<boolean> {
    if(this.busy||this.state.meta.screen!=='calendar'||this.state.meta.calendarSelectedDay===day)return false;
    const next=structuredClone(this.state);
    refreshDay(next,this.now());
    if(!dailyDayAvailable(next,day))return false;
    this.busy=true;
    try {
      next.meta.calendarSelectedDay=day;
      delete next.meta.calendarTrophyMonth;
      await this.persist(next,0);
      return true;
    } finally { this.finishWrite(); }
  }
  newGame(choice:NewGameChoice,replace=false,elapsed=0):Promise<OpenOutcome> {
    if(choice==='endless')return this.newRun(replace,elapsed);
    if(choice!=='campaign')return this.openFreeTrack(choice,replace,elapsed,true);
    const id=campaignSequence(this.state.contentVersion)[this.state.profile.campaignCursor];
    return id?this.openOffer({puzzleId:id,mode:'campaign'},replace,elapsed,false,true):Promise.resolve('unavailable');
  }
  openCampaign(elapsed=0):Promise<OpenOutcome>{
    const id = campaignContinuation(this.state);
    return id?this.openOffer({puzzleId:id,mode:'campaign'},false,elapsed):Promise.resolve('unavailable');
  }
  openFree(band:Difficulty,replace=false,elapsed=0):Promise<OpenOutcome>{
    const saved=storedSlot(this.state,'free');
    const pool=routes.freePlayPools[band],unsolved=pool.filter(id=>!this.state.profile.solvedIds.includes(id));
    const index=saved?pool.indexOf(saved.attempt.puzzleId):-1;
    const id=saved?.attempt.status==='playing'&&getPuzzle(saved.attempt.puzzleId).difficulty===band&&!replace?saved.attempt.puzzleId:unsolved[0]??pool[(index+1)%pool.length];
    return id?this.openOffer({puzzleId:id,mode:'free'},replace,elapsed):Promise.resolve('unavailable');
  }
  openFreeTrack(track: FreeTrack, replace = false, elapsed = 0, restartPlaying = false): Promise<OpenOutcome> {
    const offer = freeTrackOffer(this.state,track,restartPlaying);
    return offer ? this.openOffer(offer,replace,elapsed,false,restartPlaying) : Promise.resolve('unavailable');
  }
  openDaily(day:string,elapsed=0):Promise<OpenOutcome>{return this.openOffer({puzzleId:this.state.meta.assignments[day]?.puzzleId??calendarPuzzle(day),mode:'daily',dayKey:day},false,elapsed);}
  async openOffer(offer:Offer,replace=false,elapsed=0,repeatCompleted=false,restartPlaying=false):Promise<OpenOutcome>{
    if(offer.mode==='endless')return this.openEndless(elapsed,repeatCompleted);
    if(this.busy)return 'unavailable';this.busy=true;
    try{
      const next=structuredClone(this.state);refreshDay(next,this.now());const puzzle=getPuzzle(offer.puzzleId),wins=next.profile.solvedIds.length;
      const key=offer.mode==='daily'?`daily:${offer.dayKey}`:offer.mode,saved=storedSlot(next,key);
      if(offer.mode==='campaign'&&(puzzle.campaignPosition-1>next.profile.campaignCursor||campaignSequence(next.contentVersion)[puzzle.campaignPosition-1]!==puzzle.puzzleId))return 'unavailable';
      const track = offer.freeTrack;
      const sameBoard=saved?.attempt.puzzleId===offer.puzzleId&&saved.attempt.freeTrack===track&&
        (!track||saved.attempt.freeIndex===offer.freeIndex);
      let assignment: FreeAssignment | undefined;
      if (track && offer.mode !== 'free') return 'unavailable';
      if (offer.mode === 'free') {
        const minimum = track === 'challenge' ? challengeUnlockWins : config.unlockProposal.freePlayAfterNewWins;
        if (wins < minimum) return 'unavailable';
        if (track) {
          assignment = resolveFreeAssignment(next,track,undefined,restartPlaying);
          if (!assignment || assignment.puzzleId!==puzzle.puzzleId || assignment.index!==offer.freeIndex) return 'unavailable';
        } else if (!mastered(next).includes(puzzle.difficulty) || !routes.freePlayPools[puzzle.difficulty].includes(puzzle.puzzleId)) return 'unavailable';
      }
      if (offer.mode === 'daily' && (wins < config.unlockProposal.dailyAfterNewWins || !offer.dayKey ||
        (!canResumeDaily(saved?.attempt) && !dateAvailable(next.profile.createdAt, next.profile.timeZone, next.meta.effectiveDay, offer.dayKey)))) return 'unavailable';
      const replacing=saved?.attempt.status==='playing'&&(!sameBoard||restartPlaying);
      if(replacing&&!replace)return 'confirm_replace';
      const continuing=Boolean(sameBoard&&!replacing&&!(saved.attempt.status==='won'&&(track||repeatCompleted)));
      if(offer.mode==='free'&&!track&&!continuing&&next.profile.solvedIds.includes(offer.puzzleId)&&routes.freePlayPools[puzzle.difficulty].some(id=>!next.profile.solvedIds.includes(id)))return 'unavailable';
      if(offer.mode==='daily'){
        const assignment=next.meta.assignments[offer.dayKey!];
        if(assignment&&assignment.puzzleId!==offer.puzzleId||!assignment&&calendarPuzzle(offer.dayKey!)!==offer.puzzleId)return 'unavailable';
        if (!assignment) next.meta.assignments[offer.dayKey!]={puzzleId:offer.puzzleId,calendarVersion:dailyVersion};
        next.meta.calendarSelectedDay=offer.dayKey!;
      }
      if(next.attempt.status==='playing'){next.attempt.elapsedPlaying+=Math.max(0,elapsed);recordTime(next,next.attempt.mode,elapsed);}
      if(next.meta.activeSlot!==key)next.meta.inactive[next.meta.activeSlot]={attempt:structuredClone(next.attempt),result:next.result};
      const keepFreePin = buildIssuancePolicy()===pilotIssuancePolicy || next.meta.freeIssuance!==undefined;
      if (offer.mode==='free' && !continuing && keepFreePin) preserveFreeAssignment(next,saved?.attempt);
      const target=continuing?saved!:{attempt:createAttempt(puzzle,this.id(),offer.mode),result:null};
      if(!continuing)next.career.modes[offer.mode].starts++;
      if(replacing&&restartPlaying)next.career.modes[offer.mode].restarts++;
      next.attempt=structuredClone(target.attempt);next.result=structuredClone(target.result);next.attempt.userPaused=false;
      if(offer.mode==='daily')next.attempt.dayKey=offer.dayKey!;
      if (track && assignment && !continuing) {
        next.attempt.freeTrack = track;
        next.attempt.freeIndex = assignment.index;
        next.attempt.freeAssignmentVersion = freeAssignmentVersion;
        if (keepFreePin) pinFreeAssignment(next.meta,track,assignment);
      }
      delete next.meta.inactive[key];next.meta.activeSlot=key;next.meta.screen='play';if(offer.mode==='free')next.meta.freeDifficulty=puzzle.difficulty;
      if (offer.mode === 'free' && !continuing) refreshQuests(next);
      await this.persist(next,0);return 'opened';
    }finally{this.finishWrite();}
  }
  questOffer(index:number):Offer|null{
    const set=this.state.meta.quests,slot=set?.slots[index];if(!set||!slot||slot.paid)return null;
    const available = availableOffers(this.state);
    if (!endlessEnabled && slot.goalId==='endless') return null;
    const witness = set.witness.flatMap(offer=>{
      if (offer.mode==='endless'&&!endlessEnabled) return [];
      if (!offer.freeTrack) return [offer];
      const current=available.find(entry=>entry.freeTrack===offer.freeTrack && entry.puzzleId===offer.puzzleId &&
        (offer.freeIndex===undefined || offer.freeIndex===entry.freeIndex));
      return current ? [current] : [];
    });
    return witness.find(o=>contribution(slot.goalId,o,set.dayKey)>0&&!this.state.meta.contributedIds.includes(o.puzzleId)&&(o.campaignPosition===undefined||o.campaignPosition<=this.state.profile.campaignCursor)&&!o.requiresSolved?.length)??witness[0]??available.find(o=>!this.state.meta.contributedIds.includes(o.puzzleId))??null;
  }
  questStartsNewRun(index: number): boolean {
    return this.state.career.run?.status === 'failed' && this.questOffer(index)?.mode === 'endless';
  }
  openQuest(index: number, replace = false, elapsed = 0): Promise<OpenOutcome> {
    const offer = this.questOffer(index);
    if (!offer) return Promise.resolve('unavailable');
    if (offer.mode === 'endless' && this.state.career.run?.status === 'failed') return this.newRun(false, elapsed);
    return this.openOffer(offer, replace, elapsed, true);
  }
  async openEndless(elapsed=0,advanceWon=false):Promise<OpenOutcome>{
    if(!endlessEnabled||this.busy||this.state.profile.solvedIds.length<config.unlockProposal.endlessAfterNewWins)return 'unavailable';
    const saved=storedSlot(this.state,'endless');if(!saved||this.state.career.run?.status==='ended')return this.newRun(false,elapsed);
    this.busy=true;try{const next=structuredClone(this.state);if(next.attempt.status==='playing'){next.attempt.elapsedPlaying+=Math.max(0,elapsed);recordTime(next,next.attempt.mode,elapsed);}
      if(next.meta.activeSlot!=='endless')next.meta.inactive[next.meta.activeSlot]={attempt:structuredClone(next.attempt),result:next.result};
      next.attempt=structuredClone(saved.attempt);next.result=structuredClone(saved.result);delete next.meta.inactive.endless;next.meta.activeSlot='endless';next.meta.screen='play';next.attempt.userPaused=false;
      if(advanceWon&&next.attempt.status==='won'&&next.career.run!.status==='active')this.advanceStage(next);
      await this.persist(next,0);return 'opened';
    }finally{this.finishWrite();}
  }
  async newRun(replace=false,elapsed=0):Promise<OpenOutcome>{
    if(!endlessEnabled||this.busy||this.state.profile.solvedIds.length<config.unlockProposal.endlessAfterNewWins)return 'unavailable';
    if(this.state.career.run?.status==='active'&&!replace)return 'confirm_replace';
    this.busy=true;try{const next=structuredClone(this.state);if(next.attempt.status==='playing'){next.attempt.elapsedPlaying+=Math.max(0,elapsed);recordTime(next,next.attempt.mode,elapsed);}
      finishRun(next,this.now());if(next.meta.activeSlot!=='endless')next.meta.inactive[next.meta.activeSlot]={attempt:structuredClone(next.attempt),result:next.result};
      if(next.career.run)next.career.modes.endless.restarts++;
      const run:EndlessRun={id:this.id(),version:recordVersion,stage:0,solvedStages:0,score:0,lives:config.endlessLives,assisted:false,status:'active'};next.career.run=run;
      next.attempt=createAttempt(getPuzzle(routes.endlessSequence[0]!),this.id(),'endless');next.attempt.runId=run.id;next.attempt.stageId=0;next.attempt.lives=run.lives;next.result=null;next.career.modes.endless.starts++;
      delete next.meta.inactive.endless;next.meta.activeSlot='endless';next.meta.screen='play';refreshQuests(next);await this.persist(next,0);return 'opened';
    }finally{this.finishWrite();}
  }
  private advanceStage(next:Save):void {
    const run=next.career.run!;run.stage++;next.attempt=createAttempt(getPuzzle(routes.endlessSequence[run.stage%routes.endlessSequence.length]!),this.id(),'endless');
    next.attempt.runId=run.id;next.attempt.stageId=run.stage;next.attempt.lives=run.lives;next.attempt.assisted=run.assisted;next.result=null;next.career.modes.endless.starts++;
  }
  private async nextStage():Promise<boolean>{
    if(!endlessEnabled||this.busy||this.state.attempt.mode!=='endless'||this.state.attempt.status!=='won'||this.state.career.run?.status!=='active')return false;
    this.busy=true;try{const next=structuredClone(this.state);this.advanceStage(next);refreshQuests(next);await this.persist(next,0);return true;}finally{this.finishWrite();}
  }
  async endRun(elapsed=0):Promise<boolean>{
    if(!endlessEnabled||this.busy||this.state.attempt.mode!=='endless'||!this.state.career.run||this.state.career.run.status==='ended')return false;
    this.busy=true;try{const next=structuredClone(this.state);finishRun(next,this.now());next.attempt.userPaused=false;next.meta.screen='profile';await this.persist(next,next.attempt.status==='playing'?elapsed:0);return true;}finally{this.finishWrite();}
  }
}
