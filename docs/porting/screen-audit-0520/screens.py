"""python screens.py CHECKOUT APK_ASSETS OUTPUT [seed|routes|failures|edges|month|extra|final_board|feedback|contact|calendar_links|tools_and_timer]; set CHROMIUM to a Playwright-compatible executable."""
import json, os, sys
from pathlib import Path
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
game, assets, out = [Path(s).resolve() for s in sys.argv[1:4]]
group = sys.argv[4]
out.mkdir(parents=True, exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):

    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(assets)))
Thread(target=server.serve_forever, daemon=True).start()
url = 'http://127.0.0.1:' + str(server.server_port) + '/'
key = 'crossmath.save.v1'
boards = {}
answers = {}
log = {}
errors = []
for v in ['content_v2', 'content_v09']:
    d = game / 'docs/spec/product' / v
    boards.update({puzzle['puzzleId']: puzzle for puzzle in json.loads((d / 'boards.json').read_text())})
    answers.update(json.loads((d / 'author_solutions.json').read_text()))

def flush():
    (out / (group + '.json')).write_text(json.dumps({'screens': log, 'pageErrors': errors}, ensure_ascii=False, indent=2))

def ready(page):
    page.locator('html[data-state=ready]').wait_for()

def data(page):
    return page.evaluate('k=>JSON.parse(localStorage.getItem(k))', key)

def tap(page, selector):
    page.locator(selector).first.tap()
    page.wait_for_function("!document.querySelector('#home').disabled")

def pic(page, name):
    page.screenshot(path=str(out / (name + '.png')))

def capture(page, name, scope):
    node = page.locator(scope).first
    node.wait_for()
    log[name] = node.evaluate("el=>({text:el.innerText.slice(0,1050),font:[...el.querySelectorAll('h1,h2,strong')].filter(n=>n.getClientRects().length).slice(0,4).map(n=>[n.innerText,getComputedStyle(n).fontFamily]),width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,actions:[...el.querySelectorAll('button,summary')].filter(n=>n.getClientRects().length).slice(0,18).map(n=>[n.id||n.innerText.slice(0,35),n.disabled||false,Math.round(n.getBoundingClientRect().height)])})")
    pic(page, name)
    flush()

def restore(browser, name=None, day='2026-11-01', viewport=(390, 844), fixture=None):
    context = browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]}, device_scale_factor=1, is_mobile=True, has_touch=True, timezone_id='UTC', locale='ru-RU', reduced_motion='reduce')
    page = context.new_page()
    page.set_default_timeout(6500)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.clock.install(time=datetime.fromisoformat(day + 'T12:00:00+00:00'))
    page.goto(url)
    ready(page)
    if name or fixture:
        s = json.loads((out / (name + '.save')).read_text()) if name else fixture
        page.evaluate('([k,v])=>{localStorage.clear();localStorage.setItem(k,JSON.stringify(v))}', [key, s])
        page.reload()
        ready(page)
    return page

def snapshot(page, name):
    (out / (name + '.save')).write_text(json.dumps(data(page)))

def home(page):
    tap(page, '#home')

def modes(page):
    tap(page, '#modes-open')

def fill(page):
    s = data(page)
    attempt = s['attempt']
    board = boards[attempt['puzzleId']]
    used = set(attempt['placements'].values())
    for cell in board['cells']:
        if 'given' in cell or str(cell['id']) in attempt['placements']:
            continue
        v = answers[attempt['puzzleId']]['answer'][cell['id']]
        token = next(('t' + str(i) for i, n in enumerate(board['tray']) if n == v and 't' + str(i) not in used))
        used.add(token)
        tap(page, f'[data-token="{token}"]')
        tap(page, f'''[data-cell="{cell['id']}"]''')

def play(page):
    fill(page)
    assert data(page)['attempt']['status'] == 'won'

def seed(browser):
    page = restore(browser)
    capture(page, '01-first-board', '#play-screen')
    home(page)
    capture(page, '02-home-locked', '#hub')
    modes(page)
    capture(page, '03-modes-locked', '#mode-dialog')
    tap(page, '#close-modes')
    tap(page, '#continue-game')
    for n in range(1, 16):
        if n > 1:
            tap(page, '#next')
        play(page)
        if n in [1, 3, 5, 8, 15]:
            snapshot(page, 'win' + str(n))
            capture(page, 'win-' + str(n), '#result')
    page.context.close()

def routes(browser):
    page = restore(browser, 'win3')
    home(page)
    modes(page)
    tap(page, '#free-open')
    for i in range(5):
        if i:
            tap(page, '#next')
        play(page)
    assert data(page)['profile']['fragments'] >= 4
    home(page)
    modes(page)
    tap(page, '#campaign-open')
    tap(page, '#last-result')
    capture(page, '04-historic-receipt', '#result')
    before = data(page)
    badge = page.locator('#instrument-reward').inner_text()
    tap(page, '#instrument-reward')
    capture(page, '05-historic-card', '#card-dialog')
    log['historicAward'] = {'badge': badge, 'earnedParts': page.locator('#card-body .earned').count(), 'receiptParts': before['result']['collectionFragments'], 'shelf': before['profile']['fragments']}
    tap(page, '#close-card')
    tap(page, '#result-details summary')
    capture(page, '06-reward-breakdown', '#result')
    tap(page, '#result-details summary')
    home(page)
    capture(page, '07-home-open', '#hub')
    tap(page, '#album-open')
    capture(page, '08-workshop', '#hub')
    tap(page, '#workbench')
    capture(page, '09-workbench', '#card-dialog')
    tap(page, '#close-card')
    tap(page, '#profile-open')
    capture(page, '10-profile', '#hub')
    tap(page, '#profile-rank')
    capture(page, '11-rank', '#card-dialog')
    tap(page, '#close-card')
    tap(page, '#profile-statistics summary')
    capture(page, '12-stats', '#profile-statistics')
    tap(page, '#profile-statistics summary')
    tap(page, '#profile-badges summary')
    capture(page, '13-badges', '#profile-badges')
    tap(page, '#profile-back')
    tap(page, '#calendar-open')
    capture(page, '14-calendar', '#hub')
    tap(page, '#daily-upcoming summary')
    capture(page, '15-upcoming', '#daily-upcoming')
    tap(page, '#daily-upcoming summary')
    tap(page, '#daily-goals summary')
    capture(page, '16-missions', '#daily-goals')
    tap(page, '#daily-2026-11-01')
    capture(page, '17-daily', '#play-screen')
    play(page)
    capture(page, '18-daily-result', '#result')
    tap(page, '#next')
    tap(page, '#calendar-back')
    page.context.close()
    page = restore(browser, 'win15', viewport=(320, 568))
    home(page)
    modes(page)
    tap(page, '#campaign-open')
    tap(page, '.campaign-history summary')
    capture(page, '19-history', '#mode-dialog')
    tap(page, '#replay-cm-own-01-001')
    play(page)
    nextText = page.locator('#next').inner_text()
    tap(page, '#next')
    log['replayNext'] = {'label': nextText, 'from': 1, 'to': page.locator('#level').inner_text(), 'cursor': data(page)['profile']['campaignCursor']}
    home(page)
    modes(page)
    tap(page, '#free-open')
    capture(page, '20-relax', '#play-screen')
    home(page)
    modes(page)
    tap(page, '#challenge-open')
    capture(page, '21-replace', '#replace-dialog')
    tap(page, '#keep-board')
    tap(page, '#challenge-open')
    tap(page, '#replace-board')
    capture(page, '22-challenge', '#play-screen')
    play(page)
    capture(page, '23-challenge-goal', '#result')
    home(page)
    modes(page)
    tap(page, '#endless-open')
    snapshot(page, 'endless-open')
    capture(page, '24-endless', '#play-screen')
    tap(page, '#pause')
    capture(page, '25-pause', '#pause-dialog')
    tap(page, '#rules-options summary')
    capture(page, '26-rules', '#pause-dialog')
    tap(page, '#restart')
    capture(page, '27-restart-confirm', '#pause-dialog')
    tap(page, '#restart-no')
    tap(page, '#resume')
    tap(page, '#help')
    tap(page, '#explain')
    capture(page, '28-explain', '#help-dialog')
    tap(page, '#reveal')
    capture(page, '29-reveal', '#help-dialog')
    tap(page, '#close-help')
    home(page)
    tap(page, '#pause')
    capture(page, '30-settings', '#pause-dialog')
    tap(page, '#theme')
    page.locator('#language').select_option('en')
    page.locator('html[lang=en]').wait_for()
    tap(page, '#resume')
    tap(page, '#album-open')
    capture(page, '31-workshop-dark', '#hub')
    page.reload()
    ready(page)
    log['settingsPersist'] = [data(page)['settings']['language'], data(page)['settings']['theme']]
    flush()
    page.context.close()

def failures(browser):
    """Inject write failures only in isolated browser storage."""
    page = restore(browser, 'win1')
    tap(page, '#next')
    tap(page, '#pause')
    page.evaluate("()=>{let original=Storage.prototype.setItem;window.restoreWrites=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k==='crossmath.save.v1')throw Error('test: transient write failure');return original.call(this,k,v)}}")
    tap_target = page.locator('#settings-options summary')
    tap_target.tap()
    prev = data(page)['settings']['sound']
    page.locator('#sound').tap()
    page.locator('#save-error:not([hidden])').wait_for(state='attached')
    pic(page, '32-settings-write-retry')
    log['settingsError'] = page.evaluate("()=>({dialog:document.querySelector('dialog[open]')?.id,message:document.querySelector('#save-error').innerText,retryInModal:!!document.querySelector('dialog[open] #retry'),reloadInModal:!!document.querySelector('dialog[open] #reload'),retryReachable:(()=>{let e=document.querySelector('#retry'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()})")
    page.evaluate('()=>{window.restoreWrites()}')
    page.locator('#retry').tap()
    page.locator('#save-error').wait_for(state='hidden')
    log['settingsError']['requestedSound'] = not prev
    log['settingsError']['durableSound'] = data(page)['settings']['sound']
    assert data(page)['settings']['sound'] == (not prev)
    flush()
    page.context.close()
    page = restore(browser, 'win1')
    tap(page, '#next')
    before = data(page)
    page.evaluate("()=>{const orig=Storage.prototype.setItem;let once=true;Storage.prototype.setItem=function(k,v){if(k==='crossmath.save.v1'&&once){once=false;throw Error('test: first write fails')}return orig.call(this,k,v)}}")
    page.locator('[data-token]:visible').first.tap()
    page.locator('[data-cell].empty').first.tap()
    page.locator('#save-error').wait_for()
    capture(page, '33-save-retry', '#save-error')
    page.locator('#retry').tap()
    page.locator('#save-error').wait_for(state='hidden')
    log['boardRetry'] = {'before': before['attempt']['boardRevision'], 'after': data(page)['attempt']['boardRevision']}
    assert log['boardRetry']['after'] == log['boardRetry']['before'] + 1
    flush()
    page.evaluate('k=>localStorage.setItem(k,"invalid test data")', key)
    page.reload()
    ready(page)
    capture(page, '34-backup', '#storage-note')
    page.context.close()
    page = restore(browser)
    page.evaluate('k=>{localStorage.setItem(k,"invalid test data");localStorage.setItem(k+".backup","invalid test data")}', key)
    page.reload()
    page.locator('#startup button').wait_for()
    capture(page, '35-startup-error', '#startup')
    page.locator('#startup button').tap()
    page.locator('#startup button').wait_for()
    page.context.close()

def edges(browser):
    page = restore(browser, 'win1')
    tap(page, '#next')
    for _ in range(6):
        tap(page, '#help')
        tap(page, '#reveal')
        if page.locator('#apply-help').is_disabled():
            break
        tap(page, '#apply-help')
        tap(page, '#undo')
    assert page.locator('#apply-help').is_disabled()
    capture(page, '36-help-poor', '#help-dialog')
    initial = data(page)
    page.clock.set_system_time(datetime.fromisoformat('2026-11-02T12:00:00+00:00'))
    page.clock.run_for(2500)
    page.wait_for_function("JSON.parse(localStorage.getItem('crossmath.save.v1')).meta.effectiveDay==='2026-11-02'")
    enabled = page.locator('#apply-help').is_enabled()
    pic(page, '37-help-after-midnight')
    if enabled:
        tap(page, '#apply-help')
    log['helpMidnight'] = {'enabledAfterMidnight': enabled, 'coins': initial['profile']['coins'], 'afterCoins': data(page)['profile']['coins'], 'sameBoard': initial['attempt']['placements'] == data(page)['attempt']['placements'], 'message': page.locator('#help-shortage').inner_text()}
    flush()
    page.context.close()
    page = restore(browser, 'win15')
    home(page)
    tap(page, '#daily-primary')
    attempt = data(page)['attempt']
    board = boards[attempt['puzzleId']]
    solution = answers[attempt['puzzleId']]['answer']
    eq = min(board['equations'], key=lambda eq: sum(('given' not in board['cells'][i] for i in eq['cells'])))
    blanks = [i for i in eq['cells'] if 'given' not in board['cells'][i]]
    assert blanks
    for i in blanks[:-1]:
        used = set(data(page)['attempt']['placements'].values())
        t = next((j for j, v in enumerate(board['tray']) if v == solution[i] and 't' + str(j) not in used))
        tap(page, f'[data-token="t{t}"]')
        tap(page, f'[data-cell="{i}"]')
    i = blanks[-1]
    used = set(data(page)['attempt']['placements'].values())
    wrong = next((j for j, v in enumerate(board['tray']) if v != solution[i] and 't' + str(j) not in used))
    for life in [2, 1, 0]:
        tap(page, f'[data-token="t{wrong}"]')
        tap(page, f'[data-cell="{i}"]')
        assert data(page)['attempt']['lives'] == life
        if life:
            tap(page, '#undo')
    capture(page, '38-daily-defeat', '#defeat')
    snapshot(page, 'daily-loss')
    prev = data(page)
    tap(page, '#retry-daily')
    log['dailyFreeRestart'] = {'before': prev['attempt']['lives'], 'after': data(page)['attempt']['lives'], 'coinsDelta': data(page)['profile']['coins'] - prev['profile']['coins']}
    page.context.close()
    page = restore(browser, 'daily-loss', day='2026-12-03')
    capture(page, '39-expired-defeat', '#defeat')
    tap(page, '#defeat-calendar')
    assert data(page)['meta']['screen'] == 'calendar'
    flush()
    page.context.close()

def month(browser):
    page = restore(browser, day='2026-01-01')
    for n in range(5):
        if n:
            tap(page, '#next')
        play(page)
    home(page)
    tap(page, '#daily-primary')
    play(page)
    tap(page, '#next')
    for day in range(2, 31):
        date = f'2026-01-{day:02d}'
        page.clock.set_system_time(datetime.fromisoformat(date + 'T12:00:00+00:00'))
        page.clock.run_for(2100)
        tap(page, '#daily-' + date)
        play(page)
        tap(page, '#next')
    jan = data(page)
    assert len(jan['meta']['completedDates']) == 30
    snapshot(page, 'jan30')
    page.clock.set_system_time(datetime.fromisoformat('2026-03-01T12:00:00+00:00'))
    page.clock.run_for(2100)
    button = page.locator('.trophy-play-day[data-day="2026-01-31"]')
    for section in page.locator('#hub details').all():
        if section.locator('.trophy-play-day[data-day="2026-01-31"]').count():
            section.locator('summary').tap()
            break
    assert button.is_visible()
    capture(page, '40-jan-available', '[data-month="2026-01"]')
    tap(page, '.trophy-play-day[data-day="2026-01-31"]')
    play(page)
    check = data(page)
    assert check['result']['dailyTrophyMonth'] == '2026-01'
    assert check['result']['dailyCoins'] == 30
    tap(page, '#next')
    capture(page, '41-month-earned', '#month-trophy')
    tap(page, '#trophy-archive summary')
    capture(page, '42-trophy-archive', '#trophy-archive')
    page.reload()
    ready(page)
    assert len(data(page)['meta']['monthlyTrophies']) == 1
    log['januaryBackfill'] = {'earned': check['result']['dailyTrophyMonth'], 'date': check['attempt']['dayKey'], 'effective': check['meta']['effectiveDay'], 'amountForDate': check['result']['dailyCoins'], 'dates': len(check['meta']['completedDates'])}
    flush()
    page.context.close()

def extra(browser):
    page = restore(browser, 'win15')
    home(page)
    tap(page, '#album-open')
    bench = page.locator('#workbench').inner_text()
    last = page.locator('.collection-card').last
    name = last.inner_text()
    last.tap()
    capture(page, '43-future-item', '#card-dialog')
    log['futureItem'] = {'bench': bench, 'selected': name, 'caption': page.locator('#card-body .next-part').inner_text()}
    tap(page, '#close-card')
    tap(page, '#album-back')
    modes(page)
    tap(page, '#endless-open')
    fill(page)
    tap(page, '#submit')
    tap(page, '#next')
    tap(page, '[data-token]:visible')
    tap(page, '[data-cell].empty')
    before = data(page)
    tap(page, '#pause')
    capture(page, '44-live-run-exit', '#pause-dialog')
    tap(page, '#end-run')
    got = data(page)
    capture(page, '45-final-record', '#hub')
    tap(page, '#profile-back')
    modes(page)
    tap(page, '#endless-open')
    after = data(page)
    log['endRun'] = {'lives': before['attempt']['lives'], 'stage': before['attempt']['stageId'], 'points': before['career']['run']['score'], 'placements': len(before['attempt']['placements']), 'endReached': got['meta']['screen'], 'status': got['career']['run']['status'], 'newRun': after['career']['run']['id'] != before['career']['run']['id'], 'newStage': after['attempt']['stageId']}
    flush()
    page.context.close()
    page = restore(browser, 'win3', viewport=(320, 568))
    home(page)
    page.add_style_tag(content='html{font-size:200%!important}')
    tap(page, '#album-open')
    tap(page, '#workbench')
    tap(page, '#close-card')
    tap(page, '#album-back')
    tap(page, '#profile-open')
    tap(page, '#profile-rank')
    capture(page, '46-rank-200', '#card-dialog')
    tap(page, '#close-card')
    tap(page, '#profile-back')
    modes(page)
    tap(page, '#free-open')
    tap(page, '#help')
    tap(page, '#explain')
    capture(page, '47-help-200', '#help-dialog')
    tap(page, '#close-help')
    tap(page, '#pause')
    tap(page, '#settings-options summary')
    page.locator('#language').select_option('en')
    page.locator('html[lang=en]').wait_for()
    tap(page, '#resume')
    assert data(page)['settings']['language'] == 'en'
    flush()
    page.context.close()

def final_board(browser):
    f = json.loads((out / 'full-campaign.json').read_text())
    page = restore(browser, fixture=f)
    capture(page, '48-campaign-final', '#result')
    tap(page, '#result-home')
    tap(page, '#campaign-primary')
    capture(page, '49-full-history', '#mode-dialog')
    assert page.locator('.replay-list button').count() == 240
    tap(page, '#replay-cm-own-01-001')
    play(page)
    capture(page, '50-closed-replay', '#result')
    tap(page, '#result-home')
    assert page.locator('.campaign-history').evaluate('x=>x.open')
    page.context.close()
    old = json.loads((out / 'legacy-final.json').read_text())
    page = restore(browser, fixture=old)
    assert page.locator('#result-title').inner_text() == 'Маршрут пройден'
    log['legacyFinish'] = {'title': page.locator('#result-title').inner_text(), 'wallet': data(page)['profile']['coins'], 'unchanged': old['result'] == data(page)['result']}
    flush()
    page.context.close()

def feedback(browser):
    feedback_trace = {}
    for enabled in (True, False):
        page = restore(browser)
        page.emulate_media(reduced_motion='no-preference')
        tap(page, '#pause')
        tap(page, '#settings-options summary')
        for control in ['sound', 'vibration']:
            if page.locator('#' + control).is_checked() != enabled:
                tap(page, '#' + control)
        tap(page, '#resume')
        page.evaluate("""()=>{window.feedbackLog=[]; const entries=window.feedbackLog;
          const proto=window.AudioBufferSourceNode.prototype,original=proto.start;
          proto.start=function(...args){entries.push({audioMs:Math.round(1000*(this.buffer?.duration??0))});return original.apply(this,args)};
          const vibration=navigator.vibrate?.bind(navigator);
          navigator.vibrate=function(pattern){entries.push({pattern});return vibration?.(pattern)??false}
        }""")
        play(page)
        page.wait_for_timeout(550)
        feedback_trace[str(enabled)] = page.evaluate('feedbackLog')
        page.context.close()
    log['feedback'] = feedback_trace
    flush()

def tools_and_timer(browser):
    page = restore(browser, 'win15')
    tap(page, '#next')
    attempt = data(page)['attempt']
    board = boards[attempt['puzzleId']]
    num = lambda t: board['tray'][int(t[1:])]
    before = list(map(num, attempt['trayOrder']))
    if page.locator('#sort').is_enabled():
        tap(page, '#sort')
    sorted_values = list(map(num, data(page)['attempt']['trayOrder']))
    assert sorted_values == sorted(before)
    cell = next((e for e in board['cells'] if 'given' not in e))
    token = data(page)['attempt']['trayOrder'][0]
    tap(page, f'[data-token="{token}"]')
    tap(page, f'''[data-cell="{cell['id']}"]''')
    assert len(data(page)['attempt']['placements']) == 1
    tap(page, f'''[data-cell="{cell['id']}"]''')
    tap(page, '#return')
    assert not data(page)['attempt']['placements']
    tap(page, '#undo')
    assert len(data(page)['attempt']['placements']) == 1
    tap(page, '#pause')
    tap(page, '#settings-options summary')
    if not page.locator('#timer-visible').is_checked():
        tap(page, '#timer-visible')
    tap(page, '#resume')
    page.locator('#play-time').wait_for()
    page.clock.run_for(3000)
    time_at_pause = page.locator('#play-time').inner_text()
    tap(page, '#pause')
    time_at_pause = page.locator('#play-time').inner_text()
    page.clock.run_for(5000)
    time_while_paused = page.locator('#play-time').inner_text()
    tap(page, '#resume')
    page.clock.run_for(3000)
    time_after_resume = page.locator('#play-time').inner_text()
    log['fieldTools'] = {'inputValues': before, 'sortedValues': sorted_values, 'returned': token, 'undoRestored': True, 'timeBeforePause': time_at_pause, 'duringPause': time_while_paused, 'afterResume': time_after_resume}
    assert time_at_pause == time_while_paused and time_at_pause != time_after_resume
    tap(page, '#pause')
    tap(page, '#restart')
    tap(page, '#restart-yes')
    assert not data(page)['attempt']['placements']
    log['fieldTools']['restartClearsBoard'] = True
    page.context.close()
    flush()

def calendar_links(browser):
    page = restore(browser, 'win5')
    home(page)
    tap(page, '#calendar-open')
    tap(page, '#daily-goals summary')
    action = page.locator('[data-quest]:not([disabled])').first
    log['questStart'] = {'text': action.inner_text()}
    action.tap()
    page.locator('#play-screen').wait_for()
    assert data(page)['meta']['screen'] == 'play'
    log['questStart']['mode'] = data(page)['attempt']['mode']
    log['questStart']['puzzle'] = data(page)['attempt']['puzzleId']
    page.context.close()
    page = restore(browser, 'win5')
    home(page)
    tap(page, '#daily-primary')
    attempt = data(page)['attempt']
    board = boards[attempt['puzzleId']]
    cell = next((e for e in board['cells'] if 'given' not in e))
    correct = answers[attempt['puzzleId']]['answer'][cell['id']]
    i = board['tray'].index(correct)
    tap(page, f'[data-token="t{i}"]')
    tap(page, f'''[data-cell="{cell['id']}"]''')
    attempt = data(page)['attempt']
    assert len(attempt['placements']) == 1
    home(page)
    page.clock.set_system_time(datetime.fromisoformat('2026-12-03T12:00:00+00:00'))
    page.clock.run_for(2500)
    page.wait_for_function("JSON.parse(localStorage.getItem('crossmath.save.v1')).meta.effectiveDay==='2026-12-03'")
    tap(page, '#calendar-open')
    capture(page, '51-older-unfinished', '#older-dates')
    tap(page, '#resume-2026-11-01')
    after = data(page)['attempt']
    assert attempt['id'] == after['id'] and attempt['placements'] == after['placements']
    log['unfinished'] = {'issued': after['dayKey'], 'today': data(page)['meta']['effectiveDay'], 'retainedTiles': len(after['placements']), 'retainedLives': after['lives']}
    page.context.close()
    flush()

def contact(browser):
    results = []
    for size in [(390, 844), (320, 568)]:
        for motion in ['no-preference', 'reduce']:
            for run in range(2):
                context = browser.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=1, has_touch=True, is_mobile=True, locale='ru-RU', timezone_id='UTC', reduced_motion=motion)
                page = context.new_page()
                page.set_default_timeout(6000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(url)
                ready(page)
                tap(page, '#pause')
                tap(page, '#settings-options summary')
                for control in ['sound', 'vibration']:
                    if not page.locator('#' + control).is_checked():
                        tap(page, '#' + control)
                tap(page, '#resume')
                assert all((data(page)['settings'][k] for k in ['sound', 'vibration']))
                page.evaluate("""()=>{window.events=[];const a=AudioBufferSourceNode.prototype,src=a.start;
                  a.start=function(...args){events.push(['audio',Math.round((this.buffer?.duration||0)*1000)]);return src.apply(this,args)};
                  const vib=navigator.vibrate?.bind(navigator);
                  navigator.vibrate=function(pattern){events.push(['vibrate',pattern]);return vib?.(pattern)??false};
                  for(const method of ['play','cancel']){let orig=Animation.prototype[method];
                    Animation.prototype[method]=function(...args){const el=this.effect?.target;
                      if(el?.closest('#board')){let d=this.effect.getTiming().duration;events.push([method,el.className||el.tagName,d,method==='cancel'?new Error().stack.split('\\n').slice(2,6):null])}
                      return orig.apply(this,args)}}
                }""")
                page.wait_for_timeout(300)
                phases = []
                for i in range(1, 4):
                    if i > 1:
                        tap(page, '#next')
                        page.wait_for_timeout(220)
                    page.evaluate('()=>{window.events=[]}')
                    attempt = data(page)['attempt']
                    board = boards[attempt['puzzleId']]
                    for cell in board['cells']:
                        if 'given' in cell:
                            continue
                        attempt = data(page)['attempt']
                        used = set(attempt['placements'].values())
                        value = answers[attempt['puzzleId']]['answer'][cell['id']]
                        token = next(('t' + str(j) for j, v in enumerate(board['tray']) if v == value and 't' + str(j) not in used))
                        tap(page, f'[data-token="{token}"]')
                        tap(page, f'''[data-cell="{cell['id']}"]''')
                        page.wait_for_timeout(330)
                    assert data(page)['attempt']['status'] == 'won'
                    phases.append({'field': i, 'settings': {k: data(page)['settings'][k] for k in ['vibration', 'sound', 'reducedMotion']}, 'events': page.evaluate('events')})
                results.append({'size': size[0], 'motion': motion, 'run': run, 'fields': phases})
                context.close()
    log['contacts'] = results
    flush()
with sync_playwright() as w:
    browser = w.chromium.launch(executable_path=os.getenv('CHROMIUM'), args=['--no-sandbox'])
    groups = {case.__name__: case for case in (seed, routes, failures, edges, month, extra, final_board, feedback, contact, calendar_links, tools_and_timer)}
    try:
        groups[group](browser)
    finally:
        flush()
        browser.close()
        server.shutdown()
