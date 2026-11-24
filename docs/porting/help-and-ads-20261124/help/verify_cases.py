#!/usr/bin/env python3
"""Independent physical-token oracle + unchanged TS baseline reproduction. No product implementation."""
import hashlib
import itertools
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'CASES.json').read_text())

def arithmetic(op, a, b, c):
    if op == '+': return a + b == c
    if op == '-': return a - b == c
    if op == '*': return a * b == c
    return b > 0 and a == b * c

def enumerate_solutions(puzzle, placements):
    # Enumerate token identities, deduplicate equal-value board assignments afterwards.
    known = {cell['id']: cell['given'] for cell in puzzle['cells'] if 'given' in cell}
    placed_ids = {item['tokenId'] for item in placements}
    assert len(placed_ids) == len(placements)
    for placement in placements:
        known[placement['cellId']] = puzzle['tray'][int(placement['tokenId'][1:])]
    free_cells = [cell['id'] for cell in puzzle['cells'] if cell['id'] not in known]
    free_tokens = [i for i in range(len(puzzle['tray'])) if 't' + str(i) not in placed_ids]
    assert len(free_cells) == len(free_tokens)
    solutions = set()
    for order in itertools.permutations(free_tokens):
        values = dict(known)
        values.update(zip(free_cells, (puzzle['tray'][index] for index in order)))
        if all(arithmetic(eq['op'], *(values[c] for c in eq['cells'])) for eq in puzzle['equations']):
            solutions.add(tuple(values[cell['id']] for cell in puzzle['cells']))
    return sorted(solutions)

def main():
    oracle = []
    for case in DATA['cases']:
        solutions = enumerate_solutions(DATA['puzzles'][case['puzzle']], case['placements'])
        assert len(solutions) == case['expectedIndependentSolutions'], (case['id'], solutions)
        oracle.append({'id':case['id'], 'independentSolutionCount':len(solutions), 'solutionsByCellId':solutions})
    process = subprocess.run(['node', str(ROOT / 'reproduce.mjs')], check=True, text=True, capture_output=True, cwd=ROOT)
    baseline = json.loads(process.stdout)
    assert baseline['status'] == 'PASS' and baseline['cases'] == len(DATA['cases'])
    by_id = {item['id']:item for item in baseline['results']}
    assert by_id['proof_budget_42']['compatibility'] == {'count':1,'exhausted':False}
    assert by_id['proof_budget_42']['currentPlan'] is None
    assert by_id['proof_budget_normal_control']['currentPlan'] is not None
    assert by_id['endless_incompatible_preview']['futureUiProjection'] == by_id['endless_no_supported_preview']['futureUiProjection']
    for ident in ['endless_full_correct_before_submit', 'endless_full_wrong_before_submit']:
        assert by_id[ident]['attemptStatus'] == 'playing'
        assert by_id[ident]['currentPlan'] is None
        assert by_id[ident]['futureUiProjection'] == 'neutral_no_plan'
    result = {'schema':'crossmath-help-delivery-reproduction-v1','status':'PASS', 'scope':'Current-code reproduction plus independent small-fixture arithmetic oracle; not acceptance of the future contract or native Guru execution.', 'baseline':baseline,'independentOracle':oracle, 'artifacts':[]}
    for filename in ['CASES.json','reproduce.mjs','loader.mjs','verify_cases.py','baseline/MANIFEST.json']:
        data = (ROOT / filename).read_bytes()
        result['artifacts'].append({'path':filename,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
    if len(sys.argv) == 2:
        (ROOT / sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status':'PASS','cases':len(oracle),'exactGitBlobs':baseline['verifiedGitBlobs'],'futureContractImplemented':False,'independentUniqueFixture':[5,4,1,2,2]}, ensure_ascii=False))

if __name__ == '__main__': main()
