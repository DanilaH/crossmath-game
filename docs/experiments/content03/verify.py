"""Second value solver, independently of Explain and the generator's answer."""
from collections import Counter
import importlib.util
import json
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('independent', ROOT / 'docs/spec/product/content_v2/verify.py')
solver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solver)


def verify_board(board, answer):
    assert len(answer) == len(board['cells'])
    assert Counter(board['tray']) == Counter(answer[c['id']] for c in board['cells'] if 'given' not in c)
    assert all(1 <= value <= (50 if board['bucket']=='daily' else 30) for value in answer)
    assert all(answer[c['id']] == c['given'] for c in board['cells'] if 'given' in c)
    for eq in board['equations']:
        a, b, c = [answer[i] for i in eq['cells']]
        assert {'+': a+b==c, '-': a==b+c, '*': a*b==c, '/': a==b*c and b>0}[eq['op']]
    # In this independent solver budget exhaustion raises instead of becoming a unique result.
    assert solver.count_solutions(board) == 1, board['puzzleId']


if __name__ == '__main__':
    bank=json.loads((HERE/'banks.json').read_text())
    solutions=json.loads((HERE/'author_solutions.json').read_text())
    for boards in bank.values():
        for board in boards:
            verify_board(board, solutions[board['puzzleId']]['answer'])
    print(json.dumps({'status':'PASS','independentUnique':sum(map(len,bank.values())),'banks':{k:len(v) for k,v in bank.items()}}))
