"""Lab B, enabled only after Lab A's solver, Explain and browser gates pass."""
from collections import Counter
import argparse
import importlib.util
import json
from pathlib import Path
import random
SOURCE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--out',type=Path,default=SOURCE)
HERE=parser.parse_args().out
spec=importlib.util.spec_from_file_location('gen',SOURCE/'generate.py')
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
spec=importlib.util.spec_from_file_location('validation',SOURCE/'verify.py')
validation=importlib.util.module_from_spec(spec);spec.loader.exec_module(validation)
BASE=gen.ROOT/'docs/spec/product/content_v2'
banks=json.loads((HERE/'banks.json').read_text());answers=json.loads((HERE/'author_solutions.json').read_text())
control=[p for p in json.loads((BASE/'boards.json').read_text()) if p['bucket']=='daily']
report={}
rng=random.Random(2026112731)
found=[];shapes=Counter();rejected=Counter();attempts=0
while len(found)<50 and attempts<12000:
 attempts+=1
 template=control[len(found)]
 eqs=len(template['equations']);holes=len(template['tray'])
 is_direct=gen.base.singleton_progress([set(e['cells']) for e in template['equations']],
  {c['id'] for c in template['cells'] if 'given' not in c})[1]
 lines=gen.geometry(11,eqs,rng)
 if not lines:rejected['geometry_incomplete']+=1;continue
 coords=sorted({p for line in lines for p in line[::2]})
 shape=gen.signature({'cells':[{'id':i,'x':p[0],'y':p[1]} for i,p in enumerate(coords)]})
 if shapes[shape]>=5:rejected['shape_concentration']+=1;continue
 for _ in range(300):
  hidden=set(rng.sample(coords,holes))
  initial,finish=gen.base.singleton_progress([set(line[::2]) for line in lines],hidden)
  if initial and finish==is_direct:break
 else:rejected['mask_class_budget']+=1;continue
 assigned=gen.base.assign(lines,50,rng)
 if not assigned:rejected['numeric_assignment_budget']+=1;continue
 known,operators=assigned
 board=gen.base.layout(lines,known,operators,hidden,rng)
 board.update(puzzleId=f'cm-lab-17-daily-{len(found)+1:03}',contentVersion=2,rulesetVersion='cm-integer-1',
  difficulty='standard',bucket='daily',campaignPosition=len(found)+1,decisionTags=['content03-lab'])
 try:n=validation.solver.count_solutions(board)
 except RuntimeError:rejected['uniqueness_budget']+=1;continue
 if n!=1:rejected['nonunique']+=1;continue
 found.append(board);shapes[shape]+=1
 answers[board['puzzleId']]={'answer':[known[p] for p in sorted(coords,key=lambda p:(p[1],p[0]))]}
if len(found)!=50:raise RuntimeError(('Daily budget exhausted',len(found),attempts,rejected))
banks['daily']=found
report['daily']={'seed':2026112731,'attempts':attempts,'attemptBudget':12000,'accepted':len(found),'rejected':dict(rejected),
 'd4Shapes':len(shapes),'largestClass':max(shapes.values())}

pairs=[];rejects=Counter()
rng=random.Random(2026112732)
for original in banks['easy9'][:16]:
 coords={c['id']:(c['x'],c['y']) for c in original['cells']}
 lines=[]
 for e in original['equations']:
  a,b,c=[coords[i] for i in e['cells']]
  lines.append(tuple((a[0]+i*(b[0]-a[0])//2,a[1]+i*(b[1]-a[1])//2) for i in range(5)))
 hidden={coords[c['id']] for c in original['cells'] if 'given' not in c}
 for attempt in range(1000):
  assigned=gen.base.assign(lines,30,rng)
  if not assigned:rejects['numeric_assignment_budget']+=1;continue
  known,operations=assigned
  ratio=sum(op in '*/' for op in operations.values())/len(lines)
  if not .2<=ratio<=.3:rejects['operation_band']+=1;continue
  board=gen.base.layout(lines,known,operations,hidden,rng)
  board.update(puzzleId=f'cm-lab-17-ops-{len(pairs)+1:03}',contentVersion=2,rulesetVersion='cm-integer-1',difficulty='easy',
   bucket='easy-short',campaignPosition=len(pairs)+1,decisionTags=['content03-lab','paired:'+original['puzzleId']])
  if validation.solver.count_solutions(board)!=1:rejects['nonunique']+=1;continue
  pairs.append(board);answers[board['puzzleId']]={'answer':[known[p] for p in sorted(known,key=lambda p:(p[1],p[0]))]}
  break
 else:raise RuntimeError(('Operations budget exhausted',original['puzzleId']))
banks['ops']=pairs
report['ops']={'seed':2026112732,'accepted':len(pairs),'rejected':dict(rejects),'attemptBudgetPerPair':1000}
(HERE/'banks.json').write_text(json.dumps(banks,indent=2)+'\n')
(HERE/'author_solutions.json').write_text(json.dumps(answers,indent=2)+'\n')
(HERE/'generation-b.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)
