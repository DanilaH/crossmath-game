"""Seeded original boards. The reference supplies sizes and difficulty statistics only."""
from collections import Counter, defaultdict
from functools import lru_cache
from itertools import product
from pathlib import Path
import argparse
import json
import random

OUT = Path(__file__).resolve().parent
# equations, holes, grid bound, value cap, bank size, single-blank finishes
BUCKETS = {
    'easy-short': (8, 8, 7, 30, 40, 40),
    'easy-long': (10, 10, 9, 30, 40, 40),
    'normal-short': (10, 11, 9, 30, 20, 2),
    'normal-long': (16, 18, 11, 40, 20, 0),
    'hard-short': (10, 12, 9, 50, 70, 0),
    'expert-short': (16, 20, 11, 80, 18, 0),
    'hell-short': (23, 28, 13, 99, 17, 0),
    'daily': (16, 17, 11, 50, 50, 20),
}
BANDS = dict(easy='easy', normal='standard', hard='hard', expert='expert', hell='expert', daily='standard')
NEIGHBORS = ((1, 0), (-1, 0), (0, 1), (0, -1))


@lru_cache(None)
def shape_options(size):
    options = []
    for dx, dy in ((1, 0), (0, 1)):
        for x, y in product(range(size - 4 * dx), range(size - 4 * dy)):
            line = tuple((x + i * dx, y + i * dy) for i in range(5))
            options.append(line)
    return options


@lru_cache(None)
def geometry_graph(size):
    options = shape_options(size)
    incompatible = [set() for _ in options]
    touches = [set() for _ in options]
    for i, a in enumerate(options):
        for j, b in enumerate(options[:i]):
            shared = set(a) & set(b)
            if shared and (not shared <= set(a[::2]) & set(b[::2]) or
                           (a[0][0] == a[1][0]) == (b[0][0] == b[1][0])):
                clash = True
            else:
                clash = any((x + dx, y + dy) in set(b) - shared
                            for x, y in set(a) - shared for dx, dy in NEIGHBORS)
            if clash:
                incompatible[i].add(j)
                incompatible[j].add(i)
            elif shared:
                touches[i].add(j)
                touches[j].add(i)
    return incompatible, touches


def geometry(size, count, rng):
    lines = shape_options(size)
    incompatible, touches = geometry_graph(size)
    initial = rng.randrange(len(lines))
    chosen = [initial]
    blocked = incompatible[initial] | {initial}
    boundary = touches[initial].copy()
    while len(chosen) < count:
        candidates = sorted(boundary - blocked)
        if not candidates:
            return None
        # Prefer extending the perimeter while keeping room for future crossings.
        # Avoid an all-even grid occupying the full middle of the larger boards.
        nxt = max(rng.choices(candidates, k=4), key=lambda i: len(touches[i] - blocked) - .3 * len(incompatible[i] - blocked))
        chosen.append(nxt)
        boundary.update(touches[nxt])
        blocked.update(incompatible[nxt] | {nxt})
    return [lines[i] for i in chosen]


@lru_cache(None)
def rows(cap):
    known = defaultdict(list)
    for a, b in product(range(1, cap + 1), repeat=2):
        for op, c in (('+', a + b), ('-', a - b), ('*', a * b), ('/', a // b if a % b == 0 else 0)):
            if 0 < c <= cap and not (op in '*/' and min(a, b, c) == 1):
                known[-1, 0].append((a, b, c, op))
                for i, value in enumerate((a, b, c)):
                    known[i, value].append((a, b, c, op))
    return known


def assign(lines, cap, rng):
    known = {}
    expressions = {}
    catalog = rows(cap)
    counts = Counter(p for line in lines for p in line[::2])
    visits = 0

    def search(remaining):
        nonlocal visits
        visits += 1
        if visits > 750:
            return False
        if not remaining:
            return True
        line = max(remaining, key=lambda line: (sum(p in known for p in line[::2]), sum(counts[p] for p in line[::2])))
        cells = line[::2]
        fixed = [(i, known[p]) for i, p in enumerate(cells) if p in known]
        possible = [row for row in catalog[fixed[0] if fixed else (-1, 0)] if all(row[i] == n for i, n in fixed)]
        rng.shuffle(possible)
        # Favor simpler numbers on crossings, which participate in two equations.
        already = set(known.values())
        possible.sort(key=lambda row: sum((n in already) * .5 + n / cap for n, p in zip(row, cells) if p not in known) + rng.random() * 2)
        new = [i for i, p in enumerate(cells) if p not in known]
        rest = [other for other in remaining if other != line]
        for row in possible[:22]:
            known.update((cells[i], row[i]) for i in new)
            expressions[line] = row[3]
            if search(rest):
                return True
            for i in new:
                del known[cells[i]]
            if visits > 750:
                break
        return False

    return (known, expressions) if search(lines) else None


def singleton_progress(lines, hidden):
    remaining = set(hidden)
    initial = sum(len(hole_ids & remaining) == 1 for hole_ids in lines)
    while remaining:
        singles = {next(iter(hole_ids & remaining)) for hole_ids in lines if len(hole_ids & remaining) == 1}
        if not singles:
            break
        remaining -= singles
    return initial, not remaining


def layout(lines, known, assigned, hidden, rng):
    coords = sorted(known, key=lambda p: (p[1], p[0]))
    ids = {p: i for i, p in enumerate(coords)}
    min_x, min_y = min(p[0] for p in coords), min(p[1] for p in coords)
    cells = [dict(id=ids[p], x=p[0]-min_x, y=p[1]-min_y, **({} if p in hidden else {'given': known[p]})) for p in coords]
    eqs = [dict(cells=[ids[p] for p in line[::2]], op=assigned[line]) for line in lines]
    tray = [known[p] for p in sorted(hidden)]
    rng.shuffle(tray)
    return dict(width=max(c['x'] for c in cells)+1, height=max(c['y'] for c in cells)+1, cells=cells, equations=eqs, tray=tray)


def create(verify):
    rng = random.Random(2026111901)
    boards = []
    solutions = {}
    signatures = set()
    for bucket, (median_eqs, median_holes, size, cap, quantity, easy_finishes) in BUCKETS.items():
        found = []
        candidates = 0
        geometries = defaultdict(list)
        while len(found) < quantity:
            candidates += 1
            if candidates > 70000:
                raise RuntimeError((bucket, len(found), 'content budget exhausted'))
            require_finish = (len(found) + 1) * easy_finishes // quantity > len(found) * easy_finishes // quantity
            index = len(found)
            if bucket == 'hard-short':
                offset = -int(index % 35 == 0)
            elif bucket in ('easy-short', 'easy-long', 'normal-short'):
                offset = -int(index % 5 == 0)
            else:
                offset = {0: -1, 4: 1}.get(index % 7, 0)
            eqs = median_eqs + offset
            blank_count = median_holes + offset
            if require_finish:
                blank_count = min(eqs, blank_count)
            shapes = geometries[eqs]
            lines = geometry(size, eqs, rng) if not shapes or candidates % 4 <= 1 else rng.choice(shapes)
            if lines is None:
                continue
            if lines not in shapes and len(shapes) < 32:
                shapes.append(lines)
            pinsets = [set(line[::2]) for line in lines]
            coords = sorted(set.union(*pinsets))
            if len(coords) < blank_count:
                continue
            for _ in range(80):
                hidden = set(rng.sample(coords, blank_count))
                initial, finish = singleton_progress(pinsets, hidden)
                if initial and finish == require_finish:
                    break
            else:
                continue
            assigned = assign(lines, cap, rng)
            if not assigned:
                continue
            known, expressions = assigned
            if len(set(expressions.values())) < 3:
                continue
            board = layout(lines, known, expressions, hidden, rng)
            signature = json.dumps([board['cells'], sorted((q['cells'], q['op']) for q in board['equations']), sorted(board['tray'])])
            if signature in signatures or not verify(board):
                continue
            signatures.add(signature)
            found.append(board)
            board.update(puzzleId=f'cm-own-02-{len(boards)+1:03}', contentVersion=2, rulesetVersion='cm-integer-1',
                         difficulty=BANDS[bucket.split('-')[0]], bucket=bucket, campaignPosition=1, decisionTags=[])
            boards.append(board)
            solutions[board['puzzleId']] = {'answer': [known[p] for p in sorted(coords, key=lambda p: (p[1], p[0]))]}
            if len(found) % 10 == 0 or len(found) == quantity:
                print(bucket, len(found), candidates, 'attempts', flush=True)
    pools = {bucket: [board for board in boards if board['bucket'] == bucket] for bucket in BUCKETS}
    positions = Counter()
    groups = (
        (120, ('easy-short', 'easy-long', 'normal-short', 'easy-short', 'easy-long', 'normal-long')),
        (105, ('hard-short', 'hard-short', 'expert-short', 'hard-short', 'hard-short', 'hell-short')),
    )
    position = 15
    for length, pattern in groups:
        for index in range(length):
            bucket = pattern[index % len(pattern)]
            position += 1
            pools[bucket][positions[bucket]]['campaignPosition'] = position
            positions[bucket] += 1
    return boards, solutions


if __name__ == '__main__':
    from verify import count_solutions
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=OUT / 'boards.json')
    args = parser.parse_args()
    boards, solutions = create(lambda board: count_solutions(board) == 1)
    args.out.write_text('[\n' + ',\n'.join(json.dumps(board, separators=(',', ':')) for board in boards) + '\n]\n')
    args.out.with_name('author_solutions.json').write_text('{\n' + ',\n'.join(json.dumps(key) + ':' + json.dumps(value, separators=(',', ':')) for key, value in solutions.items()) + '\n}\n')
