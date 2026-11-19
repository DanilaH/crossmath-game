"""Independent value-domain search. Inputs are public boards and token counts."""
from collections import Counter
from itertools import product


def count_solutions(board):
    bag = Counter(board['tray'])
    fixed = {c['id']: c['given'] for c in board['cells'] if 'given' in c}
    domains = {c['id']: (c['given'],) if 'given' in c else tuple(bag) for c in board['cells']}
    operation = {
        '+': lambda a, b, c: a + b == c,
        '-': lambda a, b, c: b + c == a,
        '*': lambda a, b, c: a * b == c,
        '/': lambda a, b, c: b != 0 and a == b * c,
    }
    tables = []
    for eq in board['equations']:
        ids = eq['cells']
        blank_indices = [i for i, cid in enumerate(ids) if cid not in fixed]
        free = [ids[i] for i in blank_indices]
        tuples = set()
        for a, b in product(domains[ids[0]], domains[ids[1]]):
            c = {'+': a + b, '-': a - b, '*': a * b, '/': a // b}[eq['op']]
            row = (a, b, c)
            if c in domains[ids[2]] and operation[eq['op']](*row):
                reduced = tuple(row[i] for i in blank_indices)
                if not Counter(reduced) - bag:
                    tuples.add(reduced)
        tables.append((free, tuples))
    visits = 0

    def solve(allowed):
        nonlocal visits
        visits += 1
        if visits > 10000:
            raise RuntimeError('Independent solver exhausted')
        while True:
            before = [len(d) for d in allowed.values()]
            known = Counter(next(iter(d)) for d in allowed.values() if len(d) == 1)
            if known - bag:
                return 0
            full = {v for v in bag if known[v] == bag[v]}
            for d in allowed.values():
                if len(d) > 1:
                    d.difference_update(full)
            for free, tuples in tables:
                feasible = [t for t in tuples if all(v in allowed[c] for c, v in zip(free, t))]
                if not feasible:
                    return 0
                for i, cid in enumerate(free):
                    allowed[cid].intersection_update(t[i] for t in feasible)
            if any(not d for d in allowed.values()):
                return 0
            if before == [len(d) for d in allowed.values()]:
                break
        branch = min((cid for cid in allowed if len(allowed[cid]) > 1), key=lambda cid: len(allowed[cid]), default=None)
        if branch is None:
            return 1
        total = 0
        for value in sorted(allowed[branch]):
            restricted = {cid: d.copy() for cid, d in allowed.items()}
            restricted[branch] = {value}
            total += solve(restricted)
            if total >= 2:
                return 2
        return total

    return solve({cid: set(d) for cid, d in domains.items() if cid not in fixed})


def measure(boards):
    from statistics import median

    starts = finishes = 0
    for board in boards:
        pending = {c['id'] for c in board['cells'] if 'given' not in c}
        equations = [set(eq['cells']) for eq in board['equations']]
        while pending:
            singles = {next(iter(eq & pending)) for eq in equations if len(eq & pending) == 1}
            if not singles:
                break
            if len(pending) == len(board['tray']):
                starts += 1
            pending -= singles
        finishes += not pending
    return {
        'boards': len(boards),
        'equations': median(len(board['equations']) for board in boards),
        'holes': median(len(board['tray']) for board in boards),
        'start': starts,
        'single_gap_finish': finishes,
        'shapes': len({tuple((c['x'], c['y']) for c in board['cells']) for board in boards}),
    }


if __name__ == '__main__':
    import json
    from pathlib import Path

    current = Path(__file__).resolve().parent
    previous = current.with_name('content_v09')
    old = json.loads((previous / 'boards.json').read_text())
    old_by_id = {board['puzzleId']: board for board in old}
    routes = json.loads((previous / 'routes.json').read_text())
    new = json.loads((current / 'boards.json').read_text())
    answers = json.loads((current / 'author_solutions.json').read_text())
    operations = {
        '+': lambda a, b, c: a + b == c,
        '-': lambda a, b, c: a == b + c,
        '*': lambda a, b, c: a * b == c,
        '/': lambda a, b, c: a == b * c and b > 0,
    }
    assert len(new) == len(answers) == 275
    for board in new:
        assert count_solutions(board) == 1, board['puzzleId']
        answer = answers[board['puzzleId']]['answer']
        assert len(answer) == len(board['cells'])
        assert all(answer[c['id']] == c['given'] for c in board['cells'] if 'given' in c)
        assert Counter(board['tray']) == Counter(answer[c['id']] for c in board['cells'] if 'given' not in c)
        assert all(operations[eq['op']](*(answer[i] for i in eq['cells'])) for eq in board['equations'])
    baseline = {band: measure([b for b in old[15:] if b['difficulty'] == band]) for band in ('easy', 'standard', 'hard', 'expert')}
    baseline['daily'] = measure([old_by_id[pid] for pid in routes['dailySequence']])
    buckets = {bucket: measure([b for b in new if b['bucket'] == bucket]) for bucket in dict.fromkeys(b['bucket'] for b in new)}
    assert all(bucket['start'] == bucket['boards'] for bucket in buckets.values())
    print(json.dumps({'before': baseline, 'after': buckets, 'unique_solutions': len(new)}, indent=2))
