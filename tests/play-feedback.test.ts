import {describe, expect, it} from 'vitest';
import {createSave} from '../src/app/model';
import {applyCommand, createAttempt} from '../src/core/engine';
import {getPuzzle} from '../src/content/catalog';
import type {BoardAction, Command} from '../src/core/types';
import {acceptedFeedback, moveIsCurrent, victoryFeedback} from '../src/ui/playFeedback';
import {vibrationFor} from '../src/ui/feedback';

const first = getPuzzle('cm-own-01-001');
const action = {type:'PlaceFromTray',cellId:2,tokenId:'t0'} as const;
const date = '2026-11-26T11:00:00Z';
const command = (action:BoardAction, commandId = 'move', expectedRevision = 0):Command => ({...action,commandId,expectedRevision});

describe('accepted gameplay feedback',()=>{
  it('binds a single winning contact to the accepted physical placement',()=>{
    const before = createAttempt(first,'attempt');
    const transition = applyCommand(first,before,command(action));
    const event = acceptedFeedback(action,'move',before,transition.state,transition.outcome,transition.cue)!;
    expect(event).toMatchObject({cue:'win',cell:2,detail:{contact:'wood'},attemptId:'attempt',revision:1});
    expect(moveIsCurrent(event,transition.state)).toBe(true);
    expect(moveIsCurrent(event,{...transition.state,id:'other'})).toBe(false);
    expect(moveIsCurrent(event,{...transition.state,commandIds:['move','next']})).toBe(false);
    expect(acceptedFeedback(action,'move',transition.state,transition.state,'applied','win')).toBeUndefined();
  });

  it.each(['duplicate','stale_snapshot','unavailable','no_change'] as const)('emits nothing for %s',outcome=>{
    const before = createAttempt(first,'attempt');
    expect(acceptedFeedback(action,'move',before,before,outcome,'win')).toBeUndefined();
  });

  it('keeps the two physical contacts in one exchange and keeps Endless neutral before Submit',()=>{
    const second = getPuzzle('cm-own-01-002');
    const before = {...createAttempt(second,'stage','endless'),placements:{2:'t1',4:'t0'}};
    const swap = {type:'MoveCell',from:2,to:4} as const;
    const transition = applyCommand(second,before,command(swap));
    const event = acceptedFeedback(swap,'move',before,transition.state,transition.outcome,transition.cue)!;
    expect(event).toMatchObject({cue:'place',cell:4,detail:{contact:'exchange'}});
    expect(transition.state.placements).toEqual({2:'t0',4:'t1'});
    expect(transition.state.commandIds).toEqual(['move']);
    const submit = {type:'SubmitEndless'} as const;
    const wrong = applyCommand(second,transition.state,command(submit,'submit',1));
    expect(acceptedFeedback(submit,'submit',transition.state,wrong.state,wrong.outcome,wrong.cue))
      .toMatchObject({cue:'wrong',detail:{lifeLost:true},revision:1});
    expect(applyCommand(second,wrong.state,command(submit,'retry',1)).outcome).toBe('no_change');
  });

  it.each([['Undo','undo'],['SortTray','sort'],['ReturnToTray','return']] as const)(
    'keeps %s neutral even if the returned layout contains a newly valid line',(type,cue)=>{
      const before = createAttempt(first,'attempt');
      const after = {...before,boardRevision:1,commandIds:['move']};
      expect(acceptedFeedback(type==='ReturnToTray'?{type,cellId:2}:{type},'move',before,after,'applied','right'))
        .toMatchObject({cue,detail:{}});
      expect(vibrationFor(cue,{})).toBeUndefined();
    });

  it('uses one haptic pattern for the grasp, double row and real life loss',()=>{
    expect(vibrationFor('pick',{})).toBeUndefined();
    expect(vibrationFor('pick',{grasp:true})).toBe(5);
    expect(vibrationFor('right',{double:true})).toEqual([7,17,7]);
    expect(vibrationFor('wrong',{lifeLost:true})).toEqual([15,22,9]);
    expect(vibrationFor('win',{rank:true})).not.toEqual(vibrationFor('win',{}));
  });
});

describe('victory projections',()=>{
  it('includes a monthly trophy in the same committed victory cue without replaying it',()=>{
    const before=createSave('player',date,'UTC','attempt'),after=structuredClone(before);
    after.result={id:'win:attempt',attemptId:'attempt',puzzleId:first.puzzleId,first:false,coins:30,
      xp:0,rankUps:0,fragments:0,cardCoins:0,elapsedPlaying:4,dailyTrophyMonth:'2026-11'};
    const saved=structuredClone(after);
    expect(victoryFeedback(before,after)).toEqual({id:'win:attempt',detail:{goal:'complete'},quests:[]});
    expect(victoryFeedback(after,after)).toBeUndefined();expect(after).toEqual(saved);
  });
  it('describes only changed goals of the same plan and keeps rank and instrument distinct',()=>{
    const before = createSave('player',date,'UTC','attempt');
    before.meta.quests = {dayKey:'2026-11-26',configVersion:'test',issueIndex:2,witness:[],replacements:[],slots:[
      {goalId:'first',target:3,progress:1,paid:false},
      {goalId:'second',target:1,progress:0,paid:false},
      {goalId:'unaffected',target:2,progress:1,paid:false},
    ]};
    const after = structuredClone(before);
    after.meta.quests!.slots[0]!.progress = 2;
    after.meta.quests!.slots[1] = {goalId:'second',target:1,progress:1,paid:true};
    after.result = {id:'win:attempt',attemptId:'attempt',puzzleId:first.puzzleId,first:true,coins:90,
      xp:10,rankUps:1,fragments:1,cardCoins:20,elapsedPlaying:4};
    const state = structuredClone(after);
    expect(victoryFeedback(before,after)).toEqual({
      id:'win:attempt',detail:{workshop:'instrument',rank:true,goal:'complete'},
      quests:[{from:1,to:2,target:3},{from:0,to:1,target:1}],
    });
    expect(victoryFeedback(after,after)).toBeUndefined();
    expect(after).toEqual(state);
    after.meta.quests!.issueIndex++;
    expect(victoryFeedback(before,after)?.quests).toEqual([]);
  });
});
