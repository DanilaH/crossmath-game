"""Check board geometry, enumerate all value solutions up to two, then verify each hint.
No imports from the generator or hint-engine code. Python standard library.
"""
from collections import Counter
from copy import deepcopy
from itertools import permutations
from pathlib import Path
import csv
import hashlib
import json

ROOT=Path(__file__).resolve().parent


def valid(op, values):
    a,b,c=values
    if op=='+':return c-a==b
    if op=='-':return b+c==a
    if op=='*':return c%a==0 and c//a==b
    if op=='/':return a%b==0 and a//b==c
    raise ValueError(op)


def scan_board(board):
    nodes={c['id']:(c['x'],c['y']) for c in board['cells']}
    assert len(nodes)==len(board['cells'])==len(set(nodes.values()))
    assert set(nodes)==set(range(len(nodes)))
    assert all(k not in board for k in ('steps','answer','solution'))
    assert all(set(c)<= {'id','x','y','given'} for c in board['cells'])
    assert all(type(v) is int and 1<=v<=99 for v in board['tray']+[c['given'] for c in board['cells'] if 'given' in c])
    assert len(board['tray'])==sum('given' not in c for c in board['cells'])
    assert min(x for x,y in nodes.values())==min(y for x,y in nodes.values())==0
    assert 1<=board['width']==max(x for x,y in nodes.values())+1<=11
    assert 1<=board['height']==max(y for x,y in nodes.values())+1<=11
    glyph={p:'N' for p in nodes.values()}
    expected=set()
    used=set()
    for eq in board['equations']:
        a,b,c=(nodes[i] for i in eq['cells'])
        used.update(eq['cells'])
        dx,dy=b[0]-a[0],b[1]-a[1]
        assert (dx,dy) in {(2,0),(0,2)} and c==(b[0]+dx,b[1]+dy)
        dx//=2;dy//=2
        assert eq['op'] in ('+','-','*','/')
        for offset,symbol in [(1,eq['op']),(3,'=')]:
            pos=(a[0]+offset*dx,a[1]+offset*dy)
            assert pos not in glyph
            glyph[pos]=symbol
        expected.add(tuple((a[0]+i*dx,a[1]+i*dy) for i in range(5)))
    assert len(expected)==len(board['equations']) and used==set(nodes)
    found=set()
    for x,y in glyph:
        for dx,dy in [(0,1),(1,0)]:
            if (x-dx,y-dy) in glyph:continue
            row=[]
            xx,yy=x,y
            while (xx,yy) in glyph:
                row.append((xx,yy));xx+=dx;yy+=dy
            if len(row)>1:found.add(tuple(row))
    assert expected==found,'unintended adjacent glyphs or missing sequence'
    visited={next(iter(glyph))}
    queue=list(visited)
    while queue:
        x,y=queue.pop()
        for neighbor in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if neighbor in glyph and neighbor not in visited:
                visited.add(neighbor);queue.append(neighbor)
    assert visited==set(glyph)
    return glyph


def enumerate_form(eq,placed,remaining):
    free=[cell for cell in eq['cells'] if cell not in placed]
    # Physical instances can repeat, but solutions are counted by cell values.
    rows=set()
    for candidate in permutations(remaining,len(free)):
        if candidate in rows:continue
        local=dict(zip(free,candidate))
        triple=tuple(placed[cell] if cell in placed else local[cell] for cell in eq['cells'])
        if valid(eq['op'],triple):rows.add(candidate)
    return free,sorted(rows)


def solutions(board,initial=None,cap=2):
    fixed={c['id']:c['given'] for c in board['cells'] if 'given' in c}
    remaining=list(board['tray'])
    for cell,value in (initial or {}).items():
        if cell in fixed or value not in remaining:return []
        fixed[cell]=value;remaining.remove(value)
    found=[]
    def search(placed,bag):
        best=None
        for eq in board['equations']:
            free,rows=enumerate_form(eq,placed,bag)
            if not rows:return
            if free and (best is None or len(rows)<len(best[1])):best=(free,rows)
        if best is None:
            if not bag:found.append(tuple(placed[i] for i in range(len(placed))))
            return
        free,rows=best
        for row in rows:
            next_bag=bag.copy()
            for v in row:next_bag.remove(v)
            search(placed|dict(zip(free,row)),next_bag)
            if len(found)>=cap:return
    search(fixed,remaining)
    return found


def verify_steps(board,steps):
    placed={c['id']:c['given'] for c in board['cells'] if 'given' in c}
    bag=list(board['tray'])
    for step in steps:
        cell,value=step['cell'],step['value']
        assert cell not in placed and value in bag
        supports=step['support']
        assert len({s['eq'] for s in supports})==len(supports)
        assert len(supports)==(2 if step['rule']=='intersection' else 1)
        domains=[]
        for support in supports:
            eq=board['equations'][support['eq']]
            free,rows=enumerate_form(eq,placed,bag)
            actual={row[free.index(cell)] for row in rows}
            assert sorted(actual)==support['values']
            if step['rule']=='intersection':assert len(actual)>=2
            elif step['rule']=='tray':assert len(free)>=2
            elif step['rule']=='direct_inverse':assert len(free)==1 and cell!=eq['cells'][2]
            elif step['rule']=='direct_result':assert len(free)==1 and cell==eq['cells'][2]
            else:raise AssertionError(step['rule'])
            domains.append(actual)
        assert set.intersection(*domains)=={value}
        placed[cell]=value
        bag.remove(value)
    assert not bag
    return tuple(placed[i] for i in range(len(placed)))


def visible_key(board,structural=False):
    nodes={c['id']:c for c in board['cells']}
    serial=[]
    for flip in (True,False):
        def pos(idx):
            c=nodes[idx]
            return (c['y'],c['x']) if flip else (c['x'],c['y'])
        tiles=sorted((pos(i),int('given' in c) if structural else c.get('given') or 0) for i,c in nodes.items())
        formulas=sorted((tuple(pos(i) for i in e['cells']),e['op']) for e in board['equations'])
        serial.append(json.dumps([tiles,formulas,[] if structural else sorted(board['tray'])],separators=(',',':')))
    return hashlib.sha256(min(serial).encode()).hexdigest()


def main():
    boards=json.loads((ROOT/'boards.json').read_text())
    data=json.loads((ROOT/'author_solutions.json').read_text())
    logs=[]
    for i,board in enumerate(boards,1):
        assert board['campaignPosition']==i
        ident=board['puzzleId']
        glyph=scan_board(board)
        found=solutions(board)
        assert len(found)==1,ident
        record=data[ident]
        assert found[0]==tuple(record['answer'])==verify_steps(board,record['steps'])
        key=visible_key(board)
        assert key==record['publicHash']
        logs.append(dict(position=i,puzzleId=ident,difficulty=board['difficulty'],equations=len(board['equations']),
                         blanks=len(board['tray']),unique_solutions=len(found),steps=len(record['steps']),
                         strategies=','.join(board['decisionTags']),publicHash=key,structure=visible_key(board,True)))
    assert len(logs)==len(data)==len({r['puzzleId'] for r in logs})==len({r['publicHash'] for r in logs})==240
    assert len({r['structure'] for r in logs[15:]})==225
    # Negative controls deliberately change a certified board or its trace.
    unsat=deepcopy(boards[0]);unsat['tray']=[6]
    assert solutions(unsat)==[]
    ambiguous=deepcopy(boards[0]);ambiguous['cells'][0].pop('given');ambiguous['cells'][1].pop('given')
    ambiguous['cells'][2]['given']=5;ambiguous['tray']=[2,3]
    assert len(solutions(ambiguous))==2
    duplicate=deepcopy(ambiguous);duplicate['cells'][2]['given']=6;duplicate['tray']=[3,3]
    assert len(solutions(duplicate))==1
    wrong=deepcopy(data[boards[9]['puzzleId']]['steps']);wrong[0]['support'][0]['values']=[4]
    try:verify_steps(boards[9],wrong)
    except AssertionError:pass
    else:raise AssertionError('accepted false proof support')
    # Teaching example 12: a correct local equation can form a globally impossible state.
    example=boards[11];left,right,total=example['equations'][0]['cells']
    assert valid('+',(4,7,11)) and solutions(example,{left:4,right:7})==[]
    # The tray of lesson 11 contains only one 4, eliminating 4+4=8.
    assert Counter(boards[10]['tray'])[4]==1 and data[boards[10]['puzzleId']]['steps'][0]['value']==3
    assert data[boards[9]['puzzleId']]['steps'][0]['support']==[{'eq':0,'values':[4,5]},{'eq':1,'values':[4,6]}]
    assert len(set(boards[14]['decisionTags']))>=2
    with (ROOT/'audit.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(logs[0]))
        writer.writeheader();writer.writerows(logs)
    stats=dict(boards=len(boards),positions=len(logs),unique_solutions=len(logs),full_proofs=len(logs),
               checked_assignments=sum(r['steps'] for r in logs),distinct_structural_signatures=len({r['structure'] for r in logs}),
               difficulty=dict(Counter(b['difficulty'] for b in boards)),intersection_boards=sum('intersection' in b['decisionTags'] for b in boards),
               bank_sha256=hashlib.sha256((ROOT/'boards.json').read_bytes()).hexdigest(),status='PASS')
    (ROOT/'verification.json').write_text(json.dumps(stats,indent=2)+'\n')
    print(json.dumps(stats))


if __name__=='__main__':main()
