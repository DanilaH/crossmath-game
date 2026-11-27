"""Aggregate independent content/proof measurements; no change to gameplay policy."""
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
from statistics import median
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
spec=importlib.util.spec_from_file_location('gen',HERE/'generate.py')
gen=importlib.util.module_from_spec(spec);spec.loader.exec_module(gen)
proofs=ROOT/'.test-output/content03'
a=json.loads((proofs/'proofs.json').read_text())['fields']
b=json.loads((proofs/'proofs-b.json').read_text())['fields']
calibration=json.loads((proofs/'calibration.json').read_text())
banks=json.loads((HERE/'banks.json').read_text())
source=json.loads((ROOT/'docs/spec/product/content_v2/boards.json').read_text())
answers=json.loads((HERE/'author_solutions.json').read_text())
old_answers=json.loads((ROOT/'docs/spec/product/content_v2/author_solutions.json').read_text())
def spread(values):
 return {'min':min(values),'median':median(values),'max':max(values)}
def summary(boards,rows):
 shapes=Counter(gen.signature(p) for p in boards)
 operations=Counter(e['op'] for p in boards for e in p['equations'])
 runs=[r['runs'][0] if 'runs' in r else r['run'] for r in rows]
 metrics=['initialSingleEquations','peelResidual','peelRounds','distinctTray']
 numeric={**old_answers,**answers}
 return {'fields':len(boards),'d4Shapes':len(shapes),'largestD4':max(shapes.values()),'d4Masks':len({gen.signature(p,mask=True) for p in boards}),
  'd4NumericBases':len({gen.signature(p,numeric=numeric[p['puzzleId']]['answer']) for p in boards}),
  'equations':spread([len(p['equations']) for p in boards]),'holes':spread([len(p['tray']) for p in boards]),
  'operations':dict(operations),'multiplyDivideRatio':(operations['*']+operations['/'])/sum(operations.values()),
  **{k:spread([r[k] for r in rows]) for k in metrics},
  'directOnly':sum(r['nonDirect']==0 for r in runs),
  **{k:spread([r[k] for r in runs]) for k in ['nonDirect','advanced','maxNonDirectRun','proofUnitsMax','proofUnitsSum']}}
result={'baseline':{},'candidate':{},'maskExperiment':{}}
for bucket in sorted({p['bucket'] for p in source}):
 p=[p for p in source if p['bucket']==bucket]
 r=[r for r in calibration['baseline'] if r['bucket']==bucket]
 result['baseline'][bucket]=summary(p,r)
for name,ps in banks.items():
 rows=[r for r in a+b if r['bank']==name]
 result['candidate'][name]=summary(ps,rows)
masks=calibration['masks']
unique=[r for r in masks if r['outcome']=='unique']
changed=[]
for base in sorted({r['base'] for r in unique}):
 rs=[r for r in unique if r['base']==base]
 if len({(r['run']['nonDirect'],r['peelResidual'],r['initialSingleEquations']) for r in rs})>1:changed.append(base)
result['maskExperiment']={'attempts':len(masks),'outcomes':dict(Counter(r['outcome'] for r in masks)),
 'bases':len({r['base'] for r in masks}),'basesWithDifferentProofWork':len(changed),'changedBases':changed,
 'admittedAdvanced':sum(r['run']['advanced'] for r in unique)}
result['hashes']={name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in ['banks.json','author_solutions.json','masks.json']}
result['scope']='Independent own generator/value solver, actual Explain and proof verifier. Metrics are not observed human difficulty.'
(HERE/'measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k in ['candidate','maskExperiment']},indent=2))
