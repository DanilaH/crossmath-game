"""Integrate the actual content bank with revision 0.8 daily-task and album rules."""
from datetime import date,timedelta
from pathlib import Path
import hashlib
import json
import sys

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent/'meta_v08'))
from verify_meta import Board, Profile, CFG, resolve, GOALS, increment, fragment_count

def play_as(definition,mode,day=0):
    return Board(definition['puzzleId'],mode,''.join(e['op'] for e in definition['equations']),
                 definition['difficulty'],day if mode=='daily' else 0)


def main():
    boards=json.loads((ROOT/'boards.json').read_text())
    cfg=CFG['unlockProposal']
    easy_daily=sorted([b['puzzleId'] for b in boards[15:] if b['difficulty'] in ('easy','standard')],
                      key=lambda pid:hashlib.sha256(('calendar-v1/'+pid).encode()).hexdigest())
    manifest={'version':'content-v1','dailyEpoch':'2026-01-01','dailySequence':easy_daily,
              'campaignSequence':[b['puzzleId'] for b in boards],
              'freePlayPools':{band:[b['puzzleId'] for b in boards[15:] if b['difficulty']==band]
                               for band in CFG['difficultyRewards']},
              'endlessSequence':[b['puzzleId'] for b in boards[15:]]}
    byid={b['puzzleId']:b for b in boards}
    p=Profile()
    for i,b in enumerate(boards,1):
        p.settle(i,play_as(b,'campaign'))
        if i==228:assert len(p.card_receipts)==12 and fragment_count(len(p.paid_ids))==48
    assert len(p.paid_ids)==240 and p.earned['cards']==240
    profile_states=[5,8,15,50,228,240]
    solves=0
    with_substitutions=0
    for wins in profile_states:
        for day_i in range(7):
            for played_today in (False,True):
                available=[play_as(row,'campaign') for row in boards[max(0,wins-3):min(wins+1,len(boards))]]
                mastered={b['difficulty'] for b in boards[:wins]}
                for band in sorted(mastered):
                    pool=manifest['freePlayPools'][band]
                    # Choose an actually attainable board from each open pool.
                    if wins>=cfg['freePlayAfterNewWins']:
                        available.append(play_as(byid[pool[0]],'free'))
                if wins>=cfg['endlessAfterNewWins']:
                    available.append(play_as(byid[manifest['endlessSequence'][0]],'endless'))
                actual_day=date(2026,11,18)+timedelta(days=day_i)
                offset=(actual_day-date.fromisoformat(manifest['dailyEpoch'])).days
                daily_id=easy_daily[offset%len(easy_daily)]
                if played_today:
                    available=[b for b in available if b.pid!=daily_id]
                else:
                    available.append(play_as(byid[daily_id],'daily',day_i+1))
                wanted=CFG['rotation'][day_i]
                goals,progress,path=resolve(wanted,[0,0,0],available,day_i+1)
                assert 1<=len(path)<=3 and len(set(b.pid for b in path))==len(path)
                assert all(sum(increment(g,b,day_i+1) for b in path)>=GOALS[g]['goal'] for g in goals)
                with_substitutions+=int(goals!=wanted)
                solves+=1
    manifest['dailySequenceLength']=len(easy_daily)
    (ROOT/'routes.json').write_text(json.dumps(manifest,indent=2)+'\n')
    result=dict(realBankCalendarAndMissionFixtures=solves,fixturesRequiringSubstitution=with_substitutions,
                testedNewWinCounts=profile_states,dailyPool=len(easy_daily),campaignDistinct=len(p.paid_ids),
                albumCompleteAt=228,coinsFromCards=p.earned['cards'],status='PASS')
    (ROOT/'routes_verification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(result)


if __name__=='__main__':main()
