"""Build original Crossmath boards from an independent, seeded constructive grammar."""
from collections import Counter, defaultdict
from functools import lru_cache
from itertools import product
from pathlib import Path
import hashlib
import json
import random
from logic import trace

OUT = Path(__file__).resolve().parent
RNG = random.Random(88419027)
TRANSFORMS = [(1,0),(0,1)]


def segment(x,y,direction):
    dx,dy = TRANSFORMS[direction]
    return tuple((x+i*dx,y+i*dy) for i in range(5))


def equation(x,y,d,op,values):
    return (segment(x,y,d),op,values)


def build_board(eqs, hidden):
    coords = sorted({p for line,_,_ in eqs for p in line[::2]},key=lambda p:(p[1],p[0]))
    ids = {p:i for i,p in enumerate(coords)}
    xmin = min(x for x,y in coords)
    ymin = min(y for x,y in coords)
    values = {}
    expressions = []
    for line,op,triple in eqs:
        for p,v in zip(line[::2],triple):
            assert values.setdefault(p,v)==v
        expressions.append({'cells':[ids[p] for p in line[::2]],'op':op})
    cells = [{'id':ids[p],'x':p[0]-xmin,'y':p[1]-ymin,**({} if p in hidden else {'given':values[p]})} for p in coords]
    tray = [values[p] for p in sorted(hidden)]
    RNG.shuffle(tray)
    return {'width':max(c['x'] for c in cells)+1,'height':max(c['y'] for c in cells)+1,
            'cells':cells,'equations':expressions,'tray':tray},[values[p] for p in coords]


def tutorial():
    H,V=0,1
    # The same expression shares numeric nodes where coordinates coincide.
    lessons=[
        ([(0,0,H,'+',(2,3,5))],[(4,0)]),
        ([(0,0,H,'-',(9,4,5)),(2,0,V,'-',(4,1,3))],[(4,0),(2,4)]),
        ([(0,0,H,'+',(3,4,7)),(4,0,V,'-',(7,2,5))],[(4,0),(4,4)]),
        ([(0,0,H,'+',(4,5,9)),(4,0,V,'-',(9,2,7))],[(0,0),(4,4)]),
        ([(0,0,H,'-',(12,5,7)),(2,0,V,'+',(5,3,8)),(4,0,V,'-',(7,1,6))],[(2,0),(2,4),(4,4)]),
        ([(0,0,H,'+',(3,5,8)),(4,0,V,'+',(8,1,9))],[(4,0),(4,4)]),
        ([(0,0,H,'+',(5,5,10)),(0,0,V,'+',(5,2,7))],[(0,0),(2,0),(0,4)]),
        ([(0,0,H,'*',(3,4,12)),(4,0,V,'-',(12,2,10))],[(4,0),(4,4)]),
        ([(0,0,H,'/',(12,3,4)),(2,0,V,'*',(3,2,6))],[(2,0),(2,4)]),
        ([(0,0,H,'+',(4,5,9)),(0,0,V,'+',(4,6,10))],[(0,0),(2,0),(0,2)]),
        ([(0,0,H,'+',(3,5,8)),(0,0,V,'+',(3,4,7))],[(0,0),(2,0),(0,2)]),
        ([(0,0,H,'+',(7,4,11)),(0,0,V,'-',(7,5,2))],[(0,0),(2,0),(0,2)]),
        ([(0,0,H,'+',(4,5,9)),(0,0,V,'+',(4,6,10)),(4,0,V,'+',(9,3,12))],[(0,0),(2,0),(0,2),(4,2)]),
        ([(0,0,V,'-',(11,3,8)),(0,2,H,'+',(3,2,5))],[(0,2),(4,2)]),
        ([(0,0,H,'+',(3,5,8)),(0,0,V,'+',(3,4,7)),(4,0,V,'*',(8,2,16)),(4,4,H,'/',(16,4,4))],[(0,0),(2,0),(0,2),(4,2),(8,4)])]
    for eqs,holes in lessons:
        yield build_board([equation(*eq) for eq in eqs],set(holes))


def compatible(lines,candidate):
    existing={p for line in lines for p in line}
    shared=set(candidate)&existing
    if len(shared)!=1:
        return False
    joint,=shared
    if joint not in candidate[::2] or any(joint in line[1::2] for line in lines):
        return False
    if any(joint in line and (line[0][0]==line[1][0])==(candidate[0][0]==candidate[1][0]) for line in lines):
        return False
    coords=existing|set(candidate)
    if any(max(p[a] for p in coords)-min(p[a] for p in coords)>10 for a in (0,1)):
        return False
    for x,y in set(candidate)-shared:
        if any((x+dx,y+dy) in existing-shared for dx,dy in [(0,1),(0,-1),(1,0),(-1,0)]):
            return False
    return True


def geometry(n):
    lines=[segment(0,0,RNG.randrange(2))]
    while len(lines)<n:
        options=set()
        for line in lines:
            d=int(line[0][1]==line[1][1]) # perpendicular direction
            dx,dy=TRANSFORMS[d]
            for x,y in line[::2]:
                for i in (0,2,4):
                    cand=segment(x-i*dx,y-i*dy,d)
                    if compatible(lines,cand):
                        options.add(cand)
        if not options:
            return None
        lines.append(RNG.choice(sorted(options)))
    return lines


@lru_cache(None)
def catalog(limit):
    rows=defaultdict(list)
    for a,b in product(range(2,limit+1),repeat=2):
        for op,c in [('+',a+b),('-',a-b),('*',a*b),('/',a//b if a%b==0 else 0)]:
            if 2<=c<=limit:
                if op in '*/' and min(a,b,c)>10:
                    continue
                triple=(a,b,c)
                for idx,v in enumerate(triple):
                    rows[idx,v,op].append(triple)
                rows[-1,0,op].append(triple)
    return rows


def assign(lines,limit):
    known={}
    eqs=[]
    pool=catalog(limit)
    for line in lines:
        joint=[(i,known[p]) for i,p in enumerate(line[::2]) if p in known]
        idx,val=joint[0] if joint else (-1,0)
        ops=[op for op in '+-*/' if pool[idx,val,op]]
        if not ops:
            return None
        op=RNG.choice(ops)
        triple=RNG.choice(pool[idx,val,op])
        known.update(zip(line[::2],triple))
        eqs.append((line,op,triple))
    return eqs,sorted(known)


def signature(board,include_numbers):
    nodes={c['id']:c for c in board['cells']}
    views=[]
    for transpose in (False,True):
        def point(idx):
            c=nodes[idx]
            return (c['y'],c['x']) if transpose else (c['x'],c['y'])
        cells=sorted((point(i),c.get('given',0) if include_numbers else int('given' in c)) for i,c in nodes.items())
        eq=sorted((tuple(point(i) for i in e['cells']),e['op']) for e in board['equations'])
        views.append(json.dumps([cells,eq,sorted(board['tray']) if include_numbers else []],separators=(',',':')))
    return hashlib.sha256(min(views).encode()).hexdigest()


BANDS={
'easy':([3,4],(3,4),24),'standard':([4,5],(5,7),36),
'hard':([5,6,7],(7,9),48),'expert':([6,7,8],(8,11),70)}
CYCLES=[
['easy','standard','easy','standard','hard'],
['standard','hard','standard','easy','expert'],
['hard','standard','expert','easy','hard']]


def create():
    RNG.seed(88419027)
    tutorials=list(tutorial())
    boards=[]
    solutions={}
    public_hashes=set()
    patterns=set()
    for idx in range(1,241):
        tutorial_index=idx<=15
        band='easy' if idx<=9 or idx==14 else 'standard'
        attempts=0
        if tutorial_index:
            board,values=tutorials[idx-1]
            proof=trace(board)
            if proof is None: raise RuntimeError(f'tutorial {idx} lacks proof')
        else:
            k=idx-16
            cycle=CYCLES[(k//5)%len(CYCLES)]
            band=cycle[k%5]
            sizes,holes,limit=BANDS[band]
            while True:
                attempts+=1
                if attempts>35000:raise RuntimeError((idx,band,'budget exhausted'))
                geom=geometry(RNG.choice(sizes))
                assigned=assign(geom,limit) if geom else None
                if not assigned:continue
                eqs,coords=assigned
                board,values=build_board(eqs,set(RNG.sample(coords,RNG.randint(*holes))))
                pattern=signature(board,False)
                if pattern in patterns:continue
                proof=trace(board)
                if not proof:continue
                rules=Counter(s['rule'] for s in proof)
                if band=='easy' and (rules['tray'] or rules['intersection']):continue
                if band=='standard' and not rules['direct_inverse']:continue
                if band=='hard' and not (rules['intersection'] or rules['tray']):continue
                if band=='expert' and not (rules['intersection'] or rules['tray']>=2):continue
                break
        ident=f'cm-own-01-{idx:03}'
        key=signature(board,True)
        assert key not in public_hashes
        public_hashes.add(key)
        patterns.add(signature(board,False))
        board.update(puzzleId=ident,contentVersion=1,rulesetVersion='cm-integer-1',
                     difficulty=band,campaignPosition=idx,origin='crossmath-original-20261118',
                     decisionTags=sorted({s['rule'] for s in proof}))
        boards.append(board)
        solutions[ident]=dict(answer=values,steps=proof,publicHash=key)
    for filename,data in [('boards.json',boards),('author_solutions.json',solutions)]:
        (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')


if __name__=='__main__':
    create()
