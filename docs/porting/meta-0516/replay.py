"""Run against served 0.5.16 APK web assets. Args: game checkout, extracted assets/public directory, output directory."""
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
def fill(p):
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
def solve(p):
    fill(p)
    assert save(p)['attempt']['status']=='won'
def to_mode(p, selector):
    tap(p, '#home')
    tap(p, '#modes-open')
    tap(p, selector)
def log_write():
    (out/'observations.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n')
def modes(p):
    tap(p,'#home')
    tap(p,'#modes-open')

def restored(p):
    p.reload()
    p.locator('html[data-state=ready]').wait_for()

with sync_playwright() as w:
    b=w.chromium.launch(executable_path=os.getenv('CHROMIUM'),args=['--no-sandbox'])
    p=setup(b)
    reached={}
    for n in range(1,17):
        if n>1: tap(p,'#next')
        solve(p)
        if n in (1,3,5,15,16): reached[n]=save(p)
    assert reached[16]['result']['puzzleId']=='cm-own-02-001'
    modes(p)
    tap(p,'#free-open')
    steps=[]
    for step in range(5):
        if step: tap(p,'#next')
        solve(p)
        s=save(p)
        receipt=s['result']
        steps.append({'puzzle':receipt['puzzleId'],'baseCoins':receipt['baseCoins'],
          'progress':len(s['meta'].get('relaxGoalIds',[])),'resultText':p.locator('#relax-goal-result').inner_text() if p.locator('#relax-goal-result').is_visible() else None})
        if step==1: restored(p)
        if step==3: picture(p,'c-finish')
    assert [v['progress'] for v in steps]==[1,2,2,3,3]
    assert steps[0]['puzzle']=='cm-own-02-040'
    modes(p)
    card=p.locator('#free-open').inner_text()
    picture(p,'c-card')
    tap(p,'#campaign-open')
    tap(p,'#last-result')
    assert save(p)['attempt']['mode']=='campaign' and save(p)['result']['puzzleId']==reached[16]['result']['puzzleId']
    log['A_B_C']={'campaignAfterFree':save(p)['result']['puzzleId'],'freeSequence':steps,'menuAfterCompletion':card}
    log_write()
    h=setup(b,prior=reached[1]);tap(h,'#next')
    for i in range(5):
        s=save(h);tap(h,'#help');tap(h,'#reveal')
        if s['profile']['coins']<60:
            msg=h.locator('#help-shortage').inner_text()
            assert h.locator('#apply-help').is_disabled() and '50' in msg
            log['poorWallet']={'coins':s['profile']['coins'],'notice':msg}
            break
        tap(h,'#apply-help');tap(h,'#undo')
    e=setup(b,prior=reached[15]);to_mode(e,'#endless-open');tap(e,'#help');tap(e,'#reveal')
    assert e.locator('#help-impact').is_visible()
    msg=e.locator('#help-impact').inner_text();tap(e,'#close-help')
    assert not save(e)['career']['run']['assisted']
    log['endlessHelp']=msg
    r=setup(b,prior=reached[3]);to_mode(r,'#free-open');solve(r)
    assert save(r)['attempt']['puzzleId']=='cm-own-02-040'
    r2=setup(b,prior=reached[15]);to_mode(r2,'#challenge-open')
    log['challengeFirst']=save(r2)['attempt']['puzzleId']
    assert log['challengeFirst']=='cm-own-02-190'
    d=setup(b,prior=reached[5]);tap(d,'#home');tap(d,'#daily-primary')
    start=save(d)
    future=setup(b,'2026-12-22',start);tap(future,'#home');tap(future,'#calendar-open')
    tap(future,'#resume-2026-11-21')
    assert save(future)['attempt']['id']==start['attempt']['id']
    solve(future)
    s=save(future)
    assert s['meta']['completedDates']==['2026-11-21'] and s['result']['dailyCoins']==30
    log['lateDaily']={'playedOn':s['meta']['effectiveDay'],'creditedDates':s['meta']['completedDates'],'dateReward':s['result']['dailyCoins']}
    tap(future,'#next')
    log['lateCalendar']={'dayListed':future.locator('#daily-2026-11-21').count(),'archivedSection':future.locator('#older-dates').count()}
    first=setup(b,prior=reached[5]);tap(first,'#home');tap(first,'#daily-primary');solve(first)
    s1=save(first);nextDate=setup(b,'2027-01-10',s1);tap(nextDate,'#home');tap(nextDate,'#daily-primary');solve(nextDate)
    s2=save(nextDate)
    assert s1['result']['puzzleId']==s2['result']['puzzleId'] and s2['result']['dailyCoins']==30 and s2['result']['baseCoins']==0
    log['daily50']={'samePuzzle':s1['result']['puzzleId'],'dates':s2['meta']['completedDates'],'baseOnRepeat':s2['result']['baseCoins'],'dailyBonusOnRepeat':s2['result']['dailyCoins']}
    log_write()
    lost=setup(b,prior=reached[15])
    to_mode(lost,'#endless-open')
    fill(lost);tap(lost,'#submit');tap(lost,'#next')
    fill(lost)
    puzzle=boards[save(lost)['attempt']['puzzleId']]
    gaps=[c['id'] for c in puzzle['cells'] if 'given' not in c]
    for j in (1,2,3):
        tap(lost,'[data-cell="'+str(gaps[0])+'"]')
        tap(lost,'[data-cell="'+str(gaps[j])+'"]')
        tap(lost,'#submit')
    assert save(lost)['attempt']['status']=='out-of-lives'
    state=save(lost)
    for date in ('2026-11-22','2026-11-23','2026-11-24','2026-11-25'):
        nxt=setup(b,date,state)
        state=save(nxt)
    assert any(sl['goalId']=='endless' for sl in state['meta']['quests']['slots'])
    tap(nxt,'#home');tap(nxt,'#calendar-open');tap(nxt,'#daily-goals summary')
    task=nxt.get_by_role('button',name='Решите одно поле в забеге',exact=False)
    label=task.inner_text();task.scroll_into_view_if_needed();picture(nxt,'endless-quest')
    task.tap()
    nxt.wait_for_function("JSON.parse(localStorage.getItem('crossmath.save.v1')).meta.screen==='play'")
    after=save(nxt)
    log['endlessQuestAfterLoss']={'label':label,'status':after['attempt']['status'],'lives':after['attempt']['lives'],'sameRun':state['career']['run']['id']==after['career']['run']['id'],'defeatVisible':nxt.locator('#defeat').is_visible(),'retryAvailable':nxt.locator('#retry-daily').is_enabled()}
    picture(nxt,'endless-quest-target');log_write()
    fixture=out/'full-campaign.json'
    if fixture.exists():
        final=setup(b,prior=json.loads(fixture.read_text()))
        assert save(final)['profile']['campaignCursor']==240
        log['replayAfterFinal']={'actualFinal':final.locator('#result-title').inner_text()}
        modes(final)
        tap(final,'#campaign-open')
        log['replayAfterFinal']['menuPrimary']=final.locator('#campaign-continue').inner_text()
        tap(final,'.campaign-history summary')
        tap(final,'#replay-cm-own-01-001')
        assert save(final)['attempt']['status']=='playing'
        first=save(final)['profile']['coins']
        solve(final)
        log['replayAfterFinal'].update({'puzzle':save(final)['attempt']['puzzleId'],
          'first':save(final)['result']['first'],'title':final.locator('#result-title').inner_text(),
          'walletDelta':save(final)['profile']['coins']-first,'nextVisible':final.locator('#next').is_visible()})
        picture(final,'final-replay')
        tap(final,'#result-home')
        tap(final,'#modes-open')
        tap(final,'#campaign-open')
        log['replayAfterFinal']['menuAfterReplay']=final.locator('#campaign-continue').inner_text()
        picture(final,'final-menu')
    log_write()
    b.close()
