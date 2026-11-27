"""Controlled mask-only experiment over sixteen generated numerical bases."""
from collections import Counter
import copy
import importlib.util
import json
from pathlib import Path
import random
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('content_generator',HERE/'generate.py')
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
spec=importlib.util.spec_from_file_location('content_verify',HERE/'verify.py')
verify=importlib.util.module_from_spec(spec);spec.loader.exec_module(verify)
banks=json.loads((HERE/'banks.json').read_text())
solutions=json.loads((HERE/'author_solutions.json').read_text())
rng=random.Random(2026112717)
rows=[]
for base in banks['easy9'][:16]:
 answer=solutions[base['puzzleId']]['answer']
 for index in range(8):
  board=copy.deepcopy(base)
  hidden=set(rng.sample(range(len(board['cells'])),len(board['tray'])))
  for c in board['cells']:
   c.pop('given',None)
   if c['id'] not in hidden:c['given']=answer[c['id']]
  board['tray']=[answer[i] for i in sorted(hidden)]
  board['puzzleId']=base['puzzleId']+f'-mask{index}'
  try:
   n=verify.solver.count_solutions(board)
   outcome='unique' if n==1 else 'nonunique' if n>1 else 'invalid'
  except RuntimeError:
   outcome='budget_exhausted'
  rows.append({'base':base['puzzleId'],'mask':index,'outcome':outcome,'board':board})
(HERE/'masks.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(dict(Counter(r['outcome'] for r in rows)),indent=2))
