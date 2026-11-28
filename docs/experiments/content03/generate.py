"""Deterministic content lab; imports the existing own geometry/arithmetic tools."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import random

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('own_v2', ROOT / 'docs/spec/product/content_v2/build.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
SEED = 2026112703


def signature(board, mask=False, numeric=None):
    keys = []
    for t in range(8):
        points = []
        for cell in board['cells']:
            x, y = cell['x'], cell['y']
            if t & 1:
                x, y = y, x
            points.append(((-x if t & 2 else x), (-y if t & 4 else y), cell))
        mx, my = min(p[0] for p in points), min(p[1] for p in points)
        keys.append(';'.join(sorted(f'{x-mx},{y-my}' + (f':{numeric[c["id"]]}' if numeric else
                        ':h' if mask and 'given' not in c else ':g' if mask else '') for x, y, c in points)))
    return min(keys)


def geometry(size, count, rng):
    lines = base.shape_options(size)
    incompatible, touches = base.geometry_graph(size)
    first = rng.randrange(len(lines))
    chosen = [first]
    boundary, blocked = touches[first].copy(), incompatible[first] | {first}
    while len(chosen) < count:
        candidates = sorted(boundary - blocked)
        if not candidates:
            return None
        selected = rng.choice(candidates)
        chosen.append(selected)
        boundary |= touches[selected]
        blocked |= incompatible[selected] | {selected}
    return [lines[i] for i in chosen]


def build(size, label):
    rng = random.Random(SEED + size)
    accepted, solutions, counts, rejected = [], {}, Counter(), Counter()
    attempts = 0
    # Preserve the control's exact eight 7/7 and thirty-two 8/8 distribution.
    while len(accepted) < 40 and attempts < 12000:
        attempts += 1
        count = 7 if len(accepted) % 5 == 0 else 8
        lines = geometry(size, count, rng)
        if not lines:
            rejected['geometry_incomplete'] += 1
            continue
        coords = sorted(set(p for line in lines for p in line[::2]))
        proto = {'cells': [{'id': i, 'x': p[0], 'y': p[1]} for i, p in enumerate(coords)]}
        shape = signature(proto)
        # Small-bound matched control has only three eight-equation shape classes.
        cap = 8 if size == 9 else 16
        if counts[shape] >= cap:
            rejected['shape_concentration'] += 1
            continue
        pinsets = [set(line[::2]) for line in lines]
        for _ in range(120):
            hidden = set(rng.sample(coords, count))
            initial, finish = base.singleton_progress(pinsets, hidden)
            if initial and finish:
                break
        else:
            rejected['mask_not_direct'] += 1
            continue
        assigned = base.assign(lines, 30, rng)
        if not assigned:
            rejected['numeric_assignment_budget'] += 1
            continue
        known, operators = assigned
        board = base.layout(lines, known, operators, hidden, rng)
        board.update(puzzleId=f'cm-lab-17-{label}-{len(accepted)+1:03}',contentVersion=2,rulesetVersion='cm-integer-1',
                     bucket='easy-short',difficulty='easy',campaignPosition=len(accepted)+1,decisionTags=['content03-lab'])
        accepted.append(board)
        solutions[board['puzzleId']] = {'answer': [known[p] for p in sorted(coords, key=lambda p: (p[1],p[0]))]}
        counts[shape] += 1
    if len(accepted) != 40:
        raise RuntimeError(f'Budget exhausted: {label}, accepted={len(accepted)}, attempts={attempts}, rejects={rejected}')
    if size == 9 and (len(counts) < 12 or max(counts.values()) > 8):
        raise RuntimeError('Geometry gate failed')
    return accepted, solutions, {'seed':SEED+size,'attemptBudget':12000,'attempts':attempts,
        'accepted':len(accepted),'rejected':dict(sorted(rejected.items())),'d4Shapes':len(counts),'largestClass':max(counts.values())}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    report, banks, answers = {}, {}, {}
    for size, label in [(7,'control7'),(9,'easy9')]:
        boards, solutions, stats = build(size, label)
        banks[label] = boards
        answers.update(solutions)
        report[label] = stats
    files = {'banks.json':banks,'author_solutions.json':answers}
    for name, data in files.items():
        raw = (json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
        (args.out/name).write_bytes(raw)
        report[name] = {'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    (args.out/'generation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__ == '__main__':
    main()
