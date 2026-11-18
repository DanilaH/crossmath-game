import { config, getPuzzle, routes } from '../content/catalog';
import { calendarPuzzle } from './calendar';
import type { Save } from '../app/model';
import type { Difficulty } from '../core/types';
import type { Offer, QuestSet, QuestSlot } from './types';
export const goals=new Map(config.goals.map(g=>[g.id,g]));
export const mastered=(save:Save):Difficulty[]=>[...new Set(save.profile.solvedIds.map(id=>getPuzzle(id).difficulty))];
export function availableOffers(save:Save):Offer[] {
  const {profile,meta}=save,offers:Offer[]=[];
  // Three successive campaign entries have real prerequisites; replays are already reachable.
  for(let i=0;i<Math.min(profile.campaignCursor+3,routes.campaignSequence.length);i++)offers.push({puzzleId:routes.campaignSequence[i]!,mode:'campaign',campaignPosition:i});
  if(profile.solvedIds.length>=config.unlockProposal.freePlayAfterNewWins)for(const band of mastered(save)){
    const pool=routes.freePlayPools[band],remaining=pool.filter(id=>!profile.solvedIds.includes(id));
    for(const id of remaining.length?remaining:pool)offers.push({puzzleId:id,mode:'free'});
    if(remaining.length>0&&remaining.length<3)for(const id of pool.filter(id=>profile.solvedIds.includes(id)))offers.push({puzzleId:id,mode:'free',requiresSolved:remaining});
  }
  if(profile.solvedIds.length>=config.unlockProposal.dailyAfterNewWins&&!meta.completedDates.includes(meta.effectiveDay))offers.push({puzzleId:meta.assignments[meta.effectiveDay]?.puzzleId??calendarPuzzle(meta.effectiveDay),mode:'daily',dayKey:meta.effectiveDay});
  // Endless is not a usable inventory source until stage E actually ships its host.
  return offers;
}
export function contribution(goalId:string,offer:Offer,day:string):number {
  const goal=goals.get(goalId);if(!goal)throw Error('Unknown quest goal');
  if(goal.metric==='boards')return 1;
  if(goal.metric==='mode')return Number(offer.mode===goal.match);
  if(goal.metric==='today')return Number(offer.mode==='daily'&&offer.dayKey===day);
  const eqs=getPuzzle(offer.puzzleId).equations;
  return goal.metric==='op'?eqs.filter(e=>e.op===goal.match).length:eqs.length;
}
/** Bounded, actual <=3-board route. Canonical IDs cannot contribute in two modes. */
export function findWitness(slots:readonly QuestSlot[],available:readonly Offer[],day:string,cursor:number,seen:readonly string[]=[],budget=80_000):Offer[]|null {
  const complete=(progress:number[])=>slots.every((s,i)=>progress[i]!>=s.target);
  if(complete(slots.map(s=>s.progress)))return [];
  // At most three representatives of each equivalent offer are needed by a three-ID route.
  const groups=new Map<string,Offer[]>();
  for(const o of available){const prerequisite=o.campaignPosition!==undefined&&o.campaignPosition>=cursor;if(seen.includes(o.puzzleId)&&!prerequisite)continue;const vector=slots.map(s=>seen.includes(o.puzzleId)?0:Math.min(s.target,contribution(s.goalId,o,day)));if(vector.every(v=>!v)&&!prerequisite)continue;
    const key=JSON.stringify([vector,o.campaignPosition!==undefined&&o.campaignPosition>=cursor?o.campaignPosition:null,o.requiresSolved??[]]);
    const group=groups.get(key)??[];if(group.length<3&&!group.some(x=>x.puzzleId===o.puzzleId))group.push(o);groups.set(key,group);
  }
  const candidates=[...groups.values()].flat();let visits=0;
  if(slots.some(s=>s.progress+Math.max(0,...candidates.filter(o=>!seen.includes(o.puzzleId)).map(o=>contribution(s.goalId,o,day)))*3<s.target))return null;
  const search=(path:Offer[],progress:number[],nextCampaign:number,depth:number):Offer[]|null=>{
    if(++visits>budget)return null;
    if(complete(progress))return path;
    if(path.length===depth)return null;
    for(const offer of candidates){
      if(path.some(p=>p.puzzleId===offer.puzzleId))continue;
      if(offer.campaignPosition!==undefined&&offer.campaignPosition>nextCampaign)continue;
      if(offer.requiresSolved?.some(id=>!path.some(p=>p.puzzleId===id)))continue;
      const next=slots.map((s,i)=>Math.min(s.target,progress[i]!+(seen.includes(offer.puzzleId)?0:contribution(s.goalId,offer,day))));
      if(next.every((v,i)=>v===progress[i])&&offer.campaignPosition!==nextCampaign)continue;
      const result=search([...path,offer],next,nextCampaign+Number(offer.campaignPosition===nextCampaign),depth);if(result)return result;
    }
    return null;
  };
  for(let depth=1;depth<=3;depth++){const result=search([],slots.map(s=>s.progress),cursor,depth);if(result)return result;if(visits>budget)return null;}
  return null;
}
export function resolveQuests(set:QuestSet,available:Offer[],cursor:number,seen:string[]):QuestSet|null {
  const alternatives=config.missionRules.fallbackOrder.alternativesBySlot;
  // Fewest changed slots; numeric mask 1 changes slot 3 before slot 2 before slot 1.
  const eligible=set.slots.reduce((mask,s,i)=>mask|(!s.paid&&s.goalId!==alternatives[i]?1<<(2-i):0),0);
  const masks=[...new Set(Array.from({length:8},(_,i)=>i&eligible))].sort((a,b)=>a.toString(2).replaceAll('0','').length-b.toString(2).replaceAll('0','').length||a-b);
  for(const mask of masks){const next=structuredClone(set);
    next.slots.forEach((s,i)=>{const goal=alternatives[i]!;if(mask&(1<<(2-i))&&!s.paid&&s.goalId!==goal){next.replacements.push({slot:i,from:s.goalId,to:goal,oldProgress:s.progress});s.goalId=goal;s.target=1;s.progress=0;}});
    const path=findWitness(next.slots,available,next.dayKey,cursor,seen);if(path!==null){next.witness=path;return next;}
  }
  return null;
}
export function refreshQuests(save:Save):void {
  const meta=save.meta;if(save.profile.solvedIds.length<config.unlockProposal.tasksAfterNewWins)return;
  const set:QuestSet=meta.quests??{dayKey:meta.effectiveDay,configVersion:config.configVersion,issueIndex:meta.issuedDays,
    slots:config.rotation[meta.issuedDays%config.rotation.length]!.map(id=>({goalId:id,target:goals.get(id)!.goal,progress:0,paid:false})),witness:[],replacements:[]};
  const next=resolveQuests(set,availableOffers(save),save.profile.campaignCursor,meta.contributedIds);
  if(next){if(!meta.quests)meta.issuedDays++;meta.quests=next;}
}
