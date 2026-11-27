"""Independent replay of exported income and wallet traces; imports no game JS."""
import json
import sys
from collections import defaultdict
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.test-output/meta18-economy')
report = json.loads((root / 'report.json').read_text())
journeys = json.loads((root / 'journeys.json').read_text())
ranks = json.loads((root / 'ranks.json').read_text())
assert report['liveVariant'] == 'compact-same-rules' and report['livePrizes'] is False
assert len(journeys) == report['cohortWeeks'] == 54
assert len(ranks) == report['rankReplays'] == 5400
rank_index = {(r['seed'], r['week'], r['cohort'], r['scenario']): r for r in ranks}
events = 0
for j in journeys:
    counts, distinct, weekly = defaultdict(int), defaultdict(set), set()
    income, points = defaultdict(int), 0
    for e in j['trace']:
        events += 1
        grants = e['grants']
        assert all(isinstance(n, int) and n >= 0 for n in grants.values())
        assert grants['taskCoins'] in [0, 10, 20, 30] and grants['setCoins'] in [0, 30]
        assert grants['dailyCoins'] in [0, 30]
        actual = sum(grants.values())
        assert actual == e['coins']['current'] == e['coins']['compact-same-rules']
        nonquest = actual - grants['taskCoins'] - grants['setCoins']
        assert e['coins']['off-candidate'] == nonquest
        day = e['day']
        simple = 0 if e['puzzleId'] in distinct[day] else [10, 10, 40, 0][min(3, len(distinct[day]))]
        distinct[day].add(e['puzzleId'])
        assert simple == e['simpleQuestCoins']
        assert e['coins']['simple-3-candidate'] == nonquest + simple
        counts[day] += simple
        assert counts[day] <= 60
        if e['puzzleId'] not in weekly:
            points += {'easy': 1, 'standard': 2, 'hard': 3, 'expert': 4}[e['difficulty']]
            weekly.add(e['puzzleId'])
        for k, n in grants.items():
            income[k] += n
    assert dict(income) == j['income'] and points == j['points']
    assert sum(income.values()) == j['afterCoins'] - j['beforeCoins']
    for variant in report['variants']:
        assert sum(e['coins'][variant] for e in j['trace']) == j['coins'][variant]
    for seed in range(100):
        assert rank_index[seed, j['week'], j['cohort'], j['scenario']]['points'] == points

def prize(rank, option):
    index = rank['place'] - 1
    return option['places'][index] if rank['points'] and index < len(option['places']) else {'coins': 0, 'hints': 0}

options = {o['id']: o for o in report['rewards']}
wallet_samples = 0
for row in report['wallet']:
    weeks = sorted([j for j in journeys if j['cohort'] == row['cohort'] and j['scenario'] == row['scenario']], key=lambda j: j['week'])
    option = options[row['proposal']]
    results = []
    # Integer strides avoid sharing JS floating-point demand arithmetic.
    stride = {0.25: 4, 0.5: 2, 1: 1}[row['hintsPerBoard']]
    for seed in range(100):
        coins, credits, seen, need, unfunded = weeks[0]['beforeCoins'], 0, 0, 0, 0
        assert coins == row['startingCoins']
        for week in weeks:
            for event in week['trace']:
                seen += 1
                if seen % stride == 0:
                    need += 1
                    if credits:
                        credits -= 1
                    elif coins >= 60:
                        coins -= 60
                    else:
                        unfunded += 1
                coins += event['coins'][row['variant']]
            award = prize(rank_index[seed, week['week'], row['cohort'], row['scenario']], option)
            coins += award['coins']
            credits += award['hints']
        assert need == row['hintDemand']
        results.append((unfunded, coins, credits))
        wallet_samples += 1
    assert sum(x[0] for x in results) / 100 == row['unfundedRequests']
    assert sum(x[1] for x in results) / 100 == row['endingCoins']
    assert sum(x[2] for x in results) / 100 == row['endingCredits']

print(json.dumps({'status': 'PASS', 'cohortWeeks': len(journeys), 'settledEvents': events,
                  'rankReplays': len(ranks), 'walletReplays': wallet_samples,
                  'method': 'Independent Python integer-stride demand and receipt sums; no production JS imports'}, indent=2))
