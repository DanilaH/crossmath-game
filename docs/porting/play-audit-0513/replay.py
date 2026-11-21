"""Run against served 0.5.13 APK web assets. Args: game checkout, extracted assets/public directory, output directory."""
import json
import sys
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

game, assets, out = map(Path, sys.argv[1:4])
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(assets)))
Thread(target=server.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:'+str(server.server_port)
out.mkdir(parents=True, exist_ok=True)
boards, answers, log = {}, {}, {}
for version in ('content_v09', 'content_v2'):
    folder = game / 'docs/spec/product' / version
    boards.update({b['puzzleId']: b for b in json.loads((folder / 'boards.json').read_text())})
    answers.update(json.loads((folder / 'author_solutions.json').read_text()))
key = 'crossmath.save.v1'
def save(p):
    return p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', key)
def tap(p, selector):
    p.locator(selector).tap()
    p.wait_for_function("!document.getElementById('home').disabled")
def setup(b, day='2026-11-21', prior=None):
    ctx = b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,locale='ru-RU',timezone_id='UTC',device_scale_factor=1)
    p = ctx.new_page()
    p.set_default_timeout(5000)
    p.clock.install(time=datetime.fromisoformat(day+'T12:00:00+00:00'))
    p.goto(url)
    p.locator('html[data-state=ready]').wait_for()
    if prior:
        p.evaluate('([key,data])=>localStorage.setItem(key,JSON.stringify(data))',[key,prior])
        p.reload()
        p.locator('html[data-state=ready]').wait_for()
    return p
def picture(p,name):
    p.screenshot(path=out / (name+'.png'))
def solve(p):
    a = save(p)['attempt']
    board = boards[a['puzzleId']]
    for cell in board['cells']:
        if 'given' in cell: continue
        a = save(p)['attempt']
        cell_id = cell['id']
        value = answers[a['puzzleId']]['answer'][cell_id]
        if str(cell_id) in a['placements']: continue
        token=next('t'+str(i) for i,v in enumerate(board['tray']) if v==value and 't'+str(i) not in a['placements'].values())
        tap(p, '[data-token="' + token + '"]')
        tap(p, '[data-cell="' + str(cell_id) + '"]')
    assert save(p)['attempt']['status']=='won'
def to_mode(p, selector):
    tap(p, '#home')
    tap(p, '#modes-open')
    tap(p, selector)
def log_write():
    (out/'observations.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n')
with sync_playwright() as w:
    b=w.chromium.launch(executable_path=os.getenv('CHROMIUM'),args=['--no-sandbox'])
    p=setup(b)
    snapshots={}
    for n in range(1,17):
        if n>1: tap(p,'#next')
        solve(p)
        if n in (1,5,15,16): snapshots[n]=save(p)
    log['freshCampaign']={n:{k:s['result'][k] for k in ('puzzleId','baseCoins','xp')} for n,s in snapshots.items()}
    picture(p,'campaign-win')
    to_mode(p,'#free-open')
    picture(p,'relax-entry')
    assert save(p)['attempt']['puzzleId']==snapshots[16]['attempt']['puzzleId']
    solve(p)
    s = save(p)
    picture(p,'relax-win')
    assert s['result']['first'] is False and s['result']['baseCoins']==0 and s['result']['xp']==0
    log['relaxAfterCampaign16']={'rotations':s['meta']['freeProgress'],'result':s['result'],'ui':p.locator('#result-rewards').inner_text()}
    log_write()
    tap(p, '#next')
    solve(p)
    free = s = save(p)
    to_mode(p,'#campaign-open')
    picture(p,'campaign-menu')
    log['fonts']={'campaignMenu':p.locator('#mode-dialog h2').first.evaluate('e=>getComputedStyle(e).fontFamily')}
    tap(p,'#last-result')
    picture(p,'wrong-result')
    returned=save(p)
    assert returned['attempt']['mode']=='free' and free['attempt']['puzzleId']!=snapshots[16]['attempt']['puzzleId']
    log['campaignLastResult']={'campaign':snapshots[16]['attempt']['puzzleId'],'free':free['attempt']['puzzleId'],'target':returned['attempt']['puzzleId'],'targetMode':returned['attempt']['mode']}
    log_write()
    e = setup(b, prior=snapshots[15])
    to_mode(e, '#endless-open')
    tap(e, '#help')
    tap(e, '#reveal')
    dialog = e.locator('#help-dialog').inner_text()
    picture(e, 'endless-before')
    tap(e,'#close-help')
    assert not save(e)['career']['run']['assisted']
    tap(e, '#help')
    tap(e, '#reveal')
    tap(e, '#apply-help')
    after = save(e)
    picture(e, 'endless-after')
    undo=e.locator('#undo').is_enabled()
    if undo: tap(e,'#undo')
    log['endlessHelp']={'beforeConfirmation':dialog,'afterLabel':e.locator('#run-kind').inner_text(),'coinsBefore':snapshots[15]['profile']['coins'],'coinsAfter':after['profile']['coins'],'creditBefore':snapshots[15]['profile']['hintCredits'],'creditAfter':after['profile']['hintCredits'],'assistedAfter':after['career']['run']['assisted'],'undoAvailable':undo,'assistedAfterUndo':save(e)['career']['run']['assisted']}
    log_write()
    assert after['career']['run']['assisted'] and save(e)['career']['run']['assisted']
    q = setup(b, prior=snapshots[1])
    tap(q, '#next')
    for i in range(12):
        t = save(q)
        tap(q, '#help')
        tap(q, '#reveal')
        if t['profile']['hintCredits']==0 and t['profile']['coins']<60:
            btn = q.locator('#apply-help')
            enabled = btn.is_enabled()
            label = btn.inner_text()
            tap(q, '#apply-help')
            post = save(q)
            log['insufficientHelp']={'coins':t['profile']['coins'],'credits':t['profile']['hintCredits'],'button':label,'enabled':enabled,'postMessage':q.locator('#help-description').inner_text(),'balanceAfter':post['profile']['coins'],'unchangedPlacements':post['attempt']['placements']==t['attempt']['placements']}
            picture(q, 'cannot-afford')
            log_write()
            break
        tap(q, '#apply-help')
        tap(q, '#undo')
    else: raise RuntimeError('insufficient balance not reached')
    a = setup(b, prior=snapshots[5])
    tap(a, '#home')
    tap(a, '#daily-primary')
    state=save(a)
    active=setup(b,'2026-12-22',state)
    tap(active, '#home')
    tap(active, '#calendar-open')
    active.get_by_role('button',name='2026-11-21 · продолжить').tap()
    active.locator('#help:enabled').wait_for()
    log['expiredPlayableControl']={'sameAttempt':save(active)['attempt']['id']==state['attempt']['id'],'lives':save(active)['attempt']['lives']}
    daily = boards[state['attempt']['puzzleId']]
    given = {c['id'] for c in daily['cells'] if 'given' in c}
    eq = min(daily['equations'], key=lambda e: len(set(e['cells']) - given))
    gaps = [i for i in eq['cells'] if i not in given]
    used = set()
    for i in gaps[:-1]:
        v = answers[daily['puzzleId']]['answer'][i]
        token = next((j for j, k in enumerate(daily['tray']) if k == v and j not in used))
        used.add(token)
        tap(a, '[data-token="t' + str(token) + '"]')
        tap(a, '[data-cell="' + str(i) + '"]')
    last = gaps[-1]
    correct = answers[daily['puzzleId']]['answer'][last]
    wrong = next((j for j, k in enumerate(daily['tray']) if k != correct and j not in used))
    for i in range(3):
        tap(a, '[data-token="t' + str(wrong) + '"]')
        tap(a, '[data-cell="' + str(last) + '"]')
        if i<2: tap(a,'#undo')
    failed=save(a)
    assert failed['attempt']['status']=='out-of-lives'
    tap(a, '#home')
    tap(a, '#modes-open')
    tap(a, '#free-open')
    archived=save(a)
    old=setup(b,'2026-12-22',archived)
    tap(old, '#home')
    tap(old, '#calendar-open')
    cta=old.get_by_role('button',name='2026-11-21 · продолжить')
    log['fonts']['earlierDates']=old.get_by_role('heading',name='Начатые ранее').evaluate('e=>getComputedStyle(e).fontFamily')
    cta.scroll_into_view_if_needed()
    picture(old, 'archive-offer')
    cta.tap()
    old.locator('#defeat').wait_for()
    picture(old, 'archive-dead-end')
    log['fonts']['dailyDefeat']=old.locator('#defeat h2').evaluate('e=>getComputedStyle(e).fontFamily')
    log['expiredLoss']={'day':failed['attempt']['dayKey'],'today':save(old)['meta']['effectiveDay'],'calendarCTA':'2026-11-21 · продолжить','status':save(old)['attempt']['status'],'message':old.locator('#defeat-detail').inner_text(),'retryEnabled':old.locator('#retry-daily').is_enabled()}
    tap(old,'#home')
    log['expiredLoss']['homeCTA']=old.locator('.resume-card button').inner_text().strip()
    tap(old,'#continue-game')
    log['expiredLoss']['homeAlsoReturnsToDefeat']=old.locator('#defeat').is_visible()
    h = setup(b, prior=snapshots[1])
    tap(h, '#next')
    a = save(h)['attempt']
    board = boards[a['puzzleId']]
    cell=next(c['id'] for c in board['cells'] if 'given' not in c)
    value = answers[a['puzzleId']]['answer'][cell]
    token = board['tray'].index(value)
    tap(h, '[data-token="t' + str(token) + '"]')
    tap(h, '[data-cell="' + str(cell) + '"]')
    before = save(h)
    tap(h, '#pause')
    tap(h, '#settings-options summary')
    h.locator('#theme').check()
    h.wait_for_function("JSON.parse(localStorage.getItem('crossmath.save.v1')).settings.theme==='dark'")
    tap(h, '#resume')
    h.reload()
    h.locator('html[data-state=ready]').wait_for()
    after=save(h)
    log['themeAndColdLoad']={'before':before['settings']['theme'],'after':after['settings']['theme'],'sameAttempt':before['attempt']['id']==after['attempt']['id'],'tokensBefore':before['attempt']['placements'],'tokensAfter':after['attempt']['placements'],'sameWallet':before['profile']['coins']==after['profile']['coins']}
    assert log['themeAndColdLoad']['sameAttempt'] and before['attempt']['placements']==after['attempt']['placements']
    log_write()
    b.close()
