"""Independent check of saved v3 plans. Reads no production JS or author answers.
Constants transcribed from Guru 4.17 native-static report, PP 0xed90/0xed98.
Proof covers quotas/batches/clock windows, not live Guru execution or RNG parity.
"""
import json,math,sys,datetime
patterns=[([0,1],[.8,.2]),([0,2],[.7,.3]),([0,3],[.4,.6]),([1,2],[.4,.6]),([1,3],[.2,.8]),([2,3],[.3,.7]),([0,1,2],[.5,.2,.3]),([0,1,3],[.35,.15,.5]),([1,2,3],[.15,.25,.6])]
seconds=[(29400,39599),(39600,57599),(57600,68399),(68400,82799)]
checks=0;multi=0
for state in json.load(open(sys.argv[1])):
 week=state['active'];assert week['policy']['version']=='league-lab-3'
 # These fixtures explicitly use UTC. Frozen windows are verified independently
 # against the calendar rather than accepted just because their checksum matches.
 midnight=int(datetime.datetime.fromisoformat(week['startDay']).replace(tzinfo=datetime.timezone.utc).timestamp()*1000)
 for d,bounds in enumerate(week['activityWindows']):assert bounds==[[midnight+d*86400000+a*1000,midnight+d*86400000+b*1000] for a,b in seconds]
 for bot in week['bots']:
  assert 'due' not in bot and 'pattern' not in bot
  stamps=set();previous=-1
  for e in bot['events']:
   assert e['at']>previous and e['at'] not in stamps and type(e['points']) is int and 1<=e['points']<=4
   stamps.add(e['at']);previous=e['at'];multi+=e['points']>1
  covered=0
  for day in range(7):
   target=bot['dailyTargets'][day];selected,weights=patterns[bot['dailyPatterns'][day]];quota=[0]*4;remaining=target
   for index,window in enumerate(selected):
    quota[window]=remaining if index==len(selected)-1 else min(remaining,math.ceil(target*weights[index]));remaining-=quota[window]
   assert sum(quota)==target and min(quota)>=0
   for window,(start,end) in enumerate(week['activityWindows'][day]):
    active=[e for e in bot['events'] if start<=e['at']<end];covered+=len(active);assert sum(e['points'] for e in active)==quota[window]
   checks+=1
  assert covered==len(bot['events'])
assert checks and multi
print(json.dumps({'status':'PASS','dayPlans':checks,'multiPointEvents':multi,'reference':'Independent Python implementation of source constants/quotas and saved event checks; not original runtime.'},indent=2))
