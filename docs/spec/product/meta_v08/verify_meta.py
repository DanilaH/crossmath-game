"""Executable design checks. Run with Python 3.10+ from any directory."""
from collections import Counter
from copy import deepcopy
from dataclasses import dataclass, field
from itertools import combinations, product
from pathlib import Path
import csv
import json

HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / 'config.json').read_text())
GOALS = {goal['id']: goal for goal in CFG['goals']}
MILESTONES = CFG['collection']['fragmentWinThresholds']


@dataclass(frozen=True)
class Board:
    pid: str
    mode: str = 'campaign'
    ops: str = '+++'
    difficulty: str = 'easy'
    target_date: int = 0


def increment(goal_id, board, day):
    goal = GOALS[goal_id]
    metric = goal['metric']
    if metric == 'boards':
        return 1
    if metric == 'mode':
        return int(board.mode == goal['match'])
    if metric == 'today':
        return int(board.mode == 'daily' and board.target_date == day)
    if metric == 'op':
        return board.ops.count(goal['match'])
    return len(board.ops)


def witness(goals, progress, available, day):
    # Dated mode offers can share a puzzle ID. Only one first solve per ID/day contributes.
    for length in range(4):
        for boards in combinations(available, length):
            if len({b.pid for b in boards}) != length:
                continue
            if all(progress[i] + sum(increment(g, b, day) for b in boards) >= GOALS[g]['goal']
                   for i, g in enumerate(goals)):
                return list(boards)
    return None


def resolve(goals, progress, available, day):
    alternatives = ['win1', 'route', 'eq1']
    # Smallest number of substitutions first. Tie: third, then second, then first.
    masks = sorted(product([0, 1], repeat=3), key=lambda mask: (sum(mask), mask))
    for mask in masks:
        next_goals, next_progress = list(goals), list(progress)
        for i in range(3):
            if mask[i] and progress[i] < GOALS[goals[i]]['goal'] and goals[i] != alternatives[i]:
                next_goals[i], next_progress[i] = alternatives[i], 0
        path = witness(next_goals, next_progress, available, day)
        if path is not None:
            return next_goals, next_progress, path
    return None


def migrate_album(wins, saved_fragments, previously_completed_cards, receipt_ids):
    total = min(48, max(saved_fragments, 4*previously_completed_cards, fragment_count(wins)))
    legacy = {c['id'] for c in CFG['cards'][:max(previously_completed_cards,saved_fragments//4)]}
    known = set(receipt_ids) | legacy
    eligible = {c['id'] for c in CFG['cards'][:total//4]}
    owed = eligible - known
    return total, known | eligible, len(owed)*CFG['collection']['cardRewardCoins']


def date_available(profile_started, effective_day, selected_day):
    return max(profile_started,effective_day-CFG['calendar']['previousDaysAccessible']) <= selected_day <= effective_day


def fragment_count(wins):
    return sum(wins >= threshold for threshold in MILESTONES)


@dataclass
class Profile:
    wallet: int = CFG['initialCoins']
    rank: int = CFG['rank']['startLevel']
    xp: int = 0
    earned: Counter = field(default_factory=Counter)
    spent: int = 0
    paid: int = 0
    denied: int = 0
    credits: int = 0
    credit_used: int = 0
    ad_receipts: set = field(default_factory=set)
    hint_receipts: set = field(default_factory=set)
    paid_ids: set = field(default_factory=set)
    campaign_history: dict = field(default_factory=dict)
    dates: set = field(default_factory=set)
    transactions: set = field(default_factory=set)
    day_seen: set = field(default_factory=set)
    card_receipts: set = field(default_factory=set)
    full_days: set = field(default_factory=set)
    run_stages: dict = field(default_factory=dict)
    badges: set = field(default_factory=set)
    day: int = 0
    issued_days: int = 0
    goals: list = field(default_factory=list)
    progress: list = field(default_factory=list)
    slot_receipts: set = field(default_factory=set)
    def income(self, source, amount):
        self.earned[source] += amount
        self.wallet += amount
    def reward_ad(self, op):
        if op not in self.ad_receipts:
            self.ad_receipts.add(op)
            self.credits += CFG['rewardedHintCredits']
    def hint(self, op):
        if op in self.hint_receipts:
            return True
        if self.credits:
            self.credits -= 1
            self.credit_used += 1
        elif self.wallet >= CFG['hintCostCoins']:
            self.wallet -= CFG['hintCostCoins']
            self.spent += CFG['hintCostCoins']
            self.paid += 1
        else:
            self.denied += 1
            return False
        self.hint_receipts.add(op)
        return True
    def open_day(self, day, offers):
        if day < self.day:
            return
        if day > self.day:
            self.day = day
            self.day_seen = set()
            self.goals, self.progress = [], []
        if self.goals or len(self.paid_ids) < CFG['unlockProposal']['tasksAfterNewWins']:
            return
        template = CFG['rotation'][self.issued_days % len(CFG['rotation'])]
        proposal = resolve(template, [0,0,0], [b for b in offers if b.pid not in self.day_seen], day)
        if proposal:
            self.goals, self.progress, _ = proposal
            self.issued_days += 1
    def settle(self, op, board, run=None, stage=None):
        if op in self.transactions:
            return
        if board.mode == 'endless':
            assert run is not None and stage is not None
            stages = self.run_stages.setdefault(run,set())
            if stage in stages:
                return
            stages.add(stage)
        self.transactions.add(op)
        if board.mode == 'campaign':
            self.campaign_history[board.pid] = board
        if board.pid not in self.paid_ids:
            self.paid_ids.add(board.pid)
            award = CFG['difficultyRewards'][board.difficulty]
            self.income('boards', award['coins'])
            self.xp += award['xp']
            rank = CFG['rank']
            while self.xp >= min(rank['maxXpPerRank'],rank['baseXp']+rank['stepXp']*(self.rank-1)):
                self.xp -= min(rank['maxXpPerRank'],rank['baseXp']+rank['stepXp']*(self.rank-1))
                self.rank += 1
                self.income('ranks',rank['rewardCoins'])
            count = fragment_count(len(self.paid_ids)) // CFG['collection']['fragmentsPerCard']
            for card in CFG['cards'][:count]:
                if card['id'] not in self.card_receipts:
                    self.card_receipts.add(card['id'])
                    self.income('cards',CFG['collection']['cardRewardCoins'])
        if board.mode == 'daily' and board.target_date not in self.dates:
            self.dates.add(board.target_date)
            self.income('daily',CFG['dailyBonusCoins'])
        if self.goals and board.pid not in self.day_seen:
            for i,goal in enumerate(self.goals):
                target = GOALS[goal]['goal']
                self.progress[i] = min(target,self.progress[i]+increment(goal,board,self.day))
                key = (self.day,i)
                if self.progress[i] == target and key not in self.slot_receipts:
                    self.slot_receipts.add(key)
                    self.income('slots',CFG['taskRewardCoins'])
            if all((self.day,i) in self.slot_receipts for i in range(3)) and self.day not in self.full_days:
                self.full_days.add(self.day)
                self.income('sets',CFG['taskAllBonusCoins'])
        self.day_seen.add(board.pid)
        metrics = dict(distinctWins=len(self.paid_ids),dailyDates=len(self.dates),rank=self.rank,
                       completedCards=len(self.card_receipts),fullSets=len(self.full_days),
                       bestBoardsInRun=max((len(v) for v in self.run_stages.values()),default=0))
        for a in CFG['achievements']:
            if metrics[a['metric']] >= a['threshold']:
                self.badges.add(a['id'])


def sample(pid, mode, index, day):
    # Synthetic 2–5 equation fixtures. Same ID always has the same metadata.
    ops = ['++','+-+','+-*+','++/-+','+--'][index % 5]
    difficulty = 'easy' if index <= 15 else ['standard','easy','hard','standard'][index % 4]
    return Board(pid,mode,ops,difficulty,day if mode=='daily' else 0)


def offers(profile, day):
    n = len(profile.paid_ids)
    i = n + 1
    while 'p'+str(i) in profile.paid_ids:
        i += 1
    boards = [sample('p'+str(i),'campaign',i,day)]
    if n >= 3:
        boards += [sample('f'+str(n+1),'free',n+1,day)]
    if n >= 5 and day not in profile.dates:
        boards += [sample('d'+str(day),'daily',day,day)]
    if n >= 15:
        boards += [sample('e'+str(n+1),'endless',n+1,day)]
    replays=[b for b in reversed(profile.campaign_history.values()) if b.pid not in profile.day_seen]
    return boards + replays[:2]


def simulate(name, wins, spacing, hint_period, plan, video=False):
    p=Profile()
    rows=[]
    played=0
    for day in range(1,91):
        if (day-1) % spacing == 0:
            p.open_day(day,offers(p,day))
            for index in range(wins):
                choices=offers(p,day)
                path=witness(p.goals,p.progress,choices,day) if p.goals and plan else None
                # Prefer today's challenge, then use the first member of a feasible route.
                today=next((b for b in choices if b.mode=='daily'),None)
                board=today if plan and today else path[0] if path else choices[0]
                played+=1
                number=played
                if hint_period and number % hint_period == 0:
                    if video and number % 4 == 0:
                        p.reward_ad(('video',number))
                    p.hint(('hint',day,index))
                p.settle((day,index),board,day,index)
                p.open_day(day,offers(p,day))
        income=p.earned
        assert p.wallet == CFG['initialCoins']+sum(income.values())-p.spent and p.wallet >= 0
        rows.append(dict(scenario=name,day=day,boards_played=played,new_wins=len(p.paid_ids),rank=p.rank,xp=p.xp,
                         fragments=fragment_count(len(p.paid_ids)),cards=len(p.card_receipts),
                         boards=income['boards'],ranks=income['ranks'],daily=income['daily'],
                         slots=income['slots'],sets=income['sets'],cards_coins=income['cards'],
                         paid_hints=p.paid,credit_hints=p.credit_used,missed_hint_requests=p.denied,
                         spent=p.spent,coins=p.wallet,completed_sets=len(p.full_days)))
    return rows


def run_checks():
    checks=[]
    def check(name,condition):
        assert condition,name
        checks.append(name)
    check('48 strictly increasing milestones',len(set(MILESTONES))==48 and MILESTONES==sorted(MILESTONES))
    check('all card completions', [c['completionAt'] for c in CFG['cards']]==[8]+list(range(28,229,20)))
    check('old progress never reduced for wins 0..500',all(fragment_count(n)>=min(48,max(0,1+(n-3)//5)) for n in range(501)))
    check('all 12 achievements have unique IDs',len({a['id'] for a in CFG['achievements']})==12)
    legacy=migrate_album(8,2,0,set())
    check('migration catch-up grants one card', legacy==(4,{'abacus'},20))
    check('migration repeat is idempotent',migrate_album(8,legacy[0],1,legacy[1])==(4,{'abacus'},0))
    check('historic card without a receipt is grandfathered',migrate_album(8,4,1,set())==(4,{'abacus'},0))
    check('migration preserves ahead-of-schedule progress',migrate_album(4,9,2,set())[0::2]==(9,0))
    check('30-day limit inclusive and future excluded',all(date_available(1,40,x)==(10<=x<=40) for x in range(1,43)))
    check('calendar starts at profile creation',not date_available(35,40,34))
    p=Profile()
    for i in range(1,6):
        p.open_day(1,offers(p,1))
        p.settle(('camp',i),Board(str(i)))
    p.open_day(1,offers(p,1))
    check('fifth win unlocks tasks prospectively',p.goals and p.progress==[0,0,0] and p.issued_days==1)
    today=Board('overlap','daily','++++','easy',1)
    p.settle('today',today)
    check('same board can pay daily, slots and full set',p.full_days=={1} and p.earned['slots']==30 and p.earned['sets']==30)
    state=deepcopy(p)
    p.settle('today',today)
    check('duplicate completion leaves profile untouched',p==state)
    wallet=p.wallet
    p.settle('retry',today)
    check('replay is reward-neutral on the same date',p.wallet==wallet)
    p.open_day(3,offers(p,3))
    p.open_day(2,[])
    check('missed day and clock rollback',p.day==3 and p.issued_days==2)
    p.settle('archive',Board('overlap','daily','+++','easy',2))
    check('old puzzle in a different dated challenge',p.earned['daily']==60 and len(p.paid_ids)==6)
    check('archive excluded from today condition',increment('daily',Board('p','daily','+','easy',2),3)==0)
    z=Profile(wallet=0)
    check('insufficient resources',not z.hint('one') and z.wallet==0)
    z.reward_ad('ad');z.reward_ad('ad');z.hint('one');z.hint('one')
    check('rewarded callback and hint retry',z.credit_used==1 and z.credits==0 and z.wallet==0)
    for idx in range(228):
        z.settle(str(idx),Board(str(idx),'campaign','+','easy'))
    check('complete album at 228, all card receipts',len(z.card_receipts)==12 and z.earned['cards']==240 and 'gallery' in z.badges)
    for idx in range(228,250):
        z.settle(str(idx),Board(str(idx)))
    check('album saturates with no extra card income',fragment_count(250)==48 and z.earned['cards']==240)
    z.settle('run1',Board('A','endless'),1,1)
    before=deepcopy(z)
    z.settle('run1-redelivered',Board('A','endless'),1,1)
    check('endless stage dedupes a new transport ID',before==z)
    z.settle('run2',Board('B','endless'),2,1)
    z.settle('run3',Board('C','endless'),2,2)
    check('run achievement cannot span runs','run3' not in z.badges)
    z.settle('run4',Board('D','endless'),2,3)
    check('three boards in same run', 'run3' in z.badges)
    check('same pid contributes once to joint witness',witness(['win2'],[0],[Board('X'),Board('X','free')],1) is None)
    check('empty bank defers issuing the set',resolve(CFG['rotation'][0],[0,0,0],[],1) is None)
    partial=resolve(['win2','endless','eq6'],[1,0,2],[Board('P','campaign','++++')],3)
    check('unavailable mode only replaced, partial siblings retained',partial and partial[:2]==(['win2','route','eq6'],[1,0,2]))
    count=0
    for template in CFG['rotation']:
        for bitmask in range(32):
            options=[Board('R','campaign','+')]
            for j,(mode,ops) in enumerate([('free','+++'),('daily','/-'),('endless','**'),('campaign','---'),('campaign','+/')]):
                if bitmask & (1<<j):
                    options.append(Board('asset'+str(j),mode,ops,'easy',3))
            resolved=resolve(template,[0,0,0],options,3)
            check_path=resolved is not None and 1<=len(resolved[2])<=3
            assert check_path
            count+=1
    check('seven rotations across 32 inventories',count==224)
    frozen=resolve(['win2','endless','eq4'],[2,0,4],[Board('R')],3)
    check('already paid slots stay frozen',frozen[:2]==(['win2','route','eq4'],[2,0,4]))
    check('13 unique goal definitions',len(GOALS)==len(CFG['goals'])==13)
    check('all declared goals reachable',set().union(*(set(day) for day in CFG['rotation']),{'eq1'})==set(GOALS))
    expected=CFG['rank']['baseXp']
    p=Profile()
    for i in range(10):
        p.settle(str(i),Board(str(i)))
    check('first rank on 100th Easy XP',expected==100 and p.rank==2 and p.xp==0 and p.earned['ranks']==60)
    return checks


if __name__=='__main__':
    cases=run_checks()
    profiles=[('occasional',1,3,4,True,False),('daily',3,1,4,True,False),
              ('active',8,1,3,True,False),('campaign_only',3,1,0,False,False),
              ('heavy_help',3,1,1,True,False),('heavy_help_video',3,1,1,True,True)]
    data=[row for profile in profiles for row in simulate(*profile)]
    with (HERE/'economy.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(data[0]))
        w.writeheader()
        w.writerows(data)
    print(json.dumps({'checks':cases,'witness_inventories':224,'daily_rows':len(data),'status':'PASS'},indent=2))
