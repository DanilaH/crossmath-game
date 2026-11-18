"""Visible-information hints for the supplied a op b = c boards."""
from collections import Counter
from itertools import product


def arithmetic(op, a, b, c):
    if op == '+':
        return a+b == c
    if op == '-':
        return a-b == c
    if op == '*':
        return a*b == c
    return b*c == a


def options(equation, known, tray):
    cells = equation['cells']
    domains = [[known[cell]] if cell in known else tray.keys() for cell in cells]
    possibilities = []
    for values in product(*domains):
        if arithmetic(equation['op'], *values):
            used = Counter(v for c,v in zip(cells,values) if c not in known)
            if all(tray[v] >= n for v,n in used.items()):
                possibilities.append(values)
    return possibilities


def next_step(board, known, tray):
    alternatives = {}
    proposals = []
    for i, eq in enumerate(board['equations']):
        unknown = [c for c in eq['cells'] if c not in known]
        if not unknown:
            continue
        forms = options(eq,known,tray)
        if not forms:
            return None
        for cell in unknown:
            pos = eq['cells'].index(cell)
            values = {t[pos] for t in forms}
            alternatives.setdefault(cell,[]).append((i,values))
            if len(values)==1:
                kind = ('direct_result' if pos==2 else 'direct_inverse') if len(unknown)==1 else 'tray'
                proposals.append((0 if len(unknown)==1 else 2,i,cell,kind,[(i,values)]))
    for cell, evidence in alternatives.items():
        if len(evidence)>1 and all(len(s)>1 for _,s in evidence):
            if len(set.intersection(*(s for _,s in evidence)))==1:
                proposals.append((1,evidence[0][0],cell,'intersection',evidence))
    if not proposals:
        return None
    _,_,cell,kind,evidence = min(proposals,key=lambda p:p[:3])
    value, = set.intersection(*(s for _,s in evidence))
    return dict(cell=cell,value=value,rule=kind,support=[{'eq':i,'values':sorted(s)} for i,s in evidence])


def trace(board):
    known = {c['id']:c['given'] for c in board['cells'] if 'given' in c}
    tray = Counter(board['tray'])
    proof = []
    while tray:
        step = next_step(board,known,tray)
        if step is None:
            return None
        proof.append(step)
        known[step['cell']] = step['value']
        tray.subtract([step['value']])
        tray = +tray
    return proof
