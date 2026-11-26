"""Args: game checkout, 0.5.16/0.5.19 assets/public, 0.5.16 first-finish JSON, control output directory."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from datetime import datetime
from tempfile import TemporaryDirectory
import json, os, sys
from playwright.sync_api import sync_playwright

game, old, new, final, out = map(lambda s:Path(s).resolve(),sys.argv[1:])
key = 'crossmath.save.v1'
results = {}
answers, boards = {}, {}
for v in ['content_v2','content_v09']:
    base=game/'docs/spec/product'/v
    answers.update(json.loads((base/'author_solutions.json').read_text()))
    boards.update({p['puzzleId']:p for p in json.loads((base/'boards.json').read_text())})

def ready(p):
    p.locator('html[data-state=ready]').wait_for()
def state(p):
    return p.evaluate('key=>JSON.parse(localStorage.getItem(key))',key)
def tap(p,selector):
    p.locator(selector).tap()
    p.wait_for_function("!document.getElementById('home').disabled")
def shot(p,name):
    p.screenshot(path=str(out/(name+'.png')))
def solve(p):
    a=state(p)['attempt'];board=boards[a['puzzleId']]
    for c in board['cells']:
        a=state(p)['attempt'];idx=c['id']
        if 'given' in c or str(idx) in a['placements']:continue
        wanted=answers[board['puzzleId']]['answer'][idx]
        token=next('t'+str(i) for i,v in enumerate(board['tray']) if v==wanted and 't'+str(i) not in a['placements'].values())
        tap(p,'[data-token="'+token+'"]');tap(p,'[data-cell="'+str(idx)+'"]')
    assert state(p)['attempt']['status']=='won'

with TemporaryDirectory() as temp, sync_playwright() as w:
    root=Path(temp)
    (root/'old').symlink_to(old);(root/'new').symlink_to(new)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=temp))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/'
    b=w.chromium.launch(executable_path=os.getenv('CHROMIUM'),args=['--no-sandbox'])
    def boot(fixture,day,prefix):
        c=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,timezone_id='UTC',locale='ru-RU',device_scale_factor=1,reduced_motion='reduce')
        p=c.new_page();p.set_default_timeout(6000)
        p.clock.install(time=datetime.fromisoformat(day+'T12:00:00+00:00'))
        p.goto(url+prefix+'/');ready(p)
        p.evaluate('([k,s])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(s))}',[key,fixture])
        p.reload();ready(p)
        return p
    # Preserve the same storage origin across the two bundles.
    f=json.loads(final.read_text());p=boot(f,'2026-11-21','old')
    original=p.locator('#result-title').inner_text();shot(p,'finish-old')
    old_state=state(p)
    p.goto(url+'new/');ready(p);changed=p.locator('#result-title').inner_text();shot(p,'finish-new')
    updated=state(p)
    assert original=='Маршрут пройден' and changed=='Поле 240 решено повторно'
    assert old_state['result']==updated['result'] and updated['result']['first'] and updated['profile']['coins']==old_state['profile']['coins']
    results['upgrade']={'from':original,'to':changed,'attempt':updated['attempt']['id'],'base':updated['result']['baseCoins'],
      'first':updated['result']['first'],'cursor':updated['profile']['campaignCursor'],'walletDelta':0}
    p.context.close()
    f=json.loads((out/'jan30.json').read_text())
    p=boot(f,'2026-03-01','new')
    tap(p,'#next')
    current=p.locator('#month-trophy').get_attribute('data-month')
    tap(p,'#previous-trophy-month summary')
    prev=p.locator('#previous-trophy-month [data-month]').get_attribute('data-month')
    assert prev=='2026-02' and current=='2026-03'
    assert not p.locator('[data-month="2026-01"]').count()
    d=p.locator('#daily-2026-01-31')
    assert d.is_enabled()
    shot(p,'jan-missing')
    d.scroll_into_view_if_needed();shot(p,'jan-playable')
    tap(p,'#daily-2026-01-31');solve(p)
    won=state(p)
    assert won['result']['dailyTrophyMonth']=='2026-01' and won['result']['dailyCoins']==30
    shot(p,'jan-won');tap(p,'#next')
    assert p.locator('#month-trophy').get_attribute('data-month')=='2026-01'
    shot(p,'jan-earned')
    results['january']={'today':won['meta']['effectiveDay'],'before':[current,prev],'januaryProgressBefore':30,
      'date':'2026-01-31','dateBonus':won['result']['dailyCoins'],'trophyMonth':won['result']['dailyTrophyMonth'],
      'after':p.locator('#month-trophy').inner_text()}
    b.close();server.shutdown()
(out/'ui.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
