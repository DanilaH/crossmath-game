"""Args: extracted 0.5.19 assets/public, controls output. Time input-to-visible-and-enabled DOM for the same campaign board."""
import json, os, sys, statistics
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

assets, out = map(Path,sys.argv[1:])
server = ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(assets)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'; summary={}
with sync_playwright() as w:
    b=w.chromium.launch(executable_path=os.getenv('CHROMIUM'),args=['--no-sandbox'])
    for days in [0,180,30,365]:
        c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True,reduced_motion='reduce',timezone_id='UTC')
        p=c.new_page();p.set_default_timeout(12000)
        f=json.loads((out/f'archive-{days}.json').read_text())
        p.clock.set_fixed_time(datetime.fromisoformat(f['meta']['effectiveDay']+'T12:00:00+00:00'))
        p.goto(url);p.locator('html[data-state=ready]').wait_for()
        p.evaluate('s=>{localStorage.clear();localStorage.setItem("crossmath.save.v1",JSON.stringify(s))}',f)
        p.reload();p.locator('html[data-state=ready]').wait_for()
        p.locator('#home').tap();p.locator('#campaign-primary').tap()
        square=p.locator('[data-cell].empty').first
        idx=square.get_attribute('data-cell');selector=f'[data-cell="{idx}"]'
        board=p.evaluate('JSON.parse(localStorage.getItem("crossmath.save.v1")).attempt.puzzleId')
        samples=[]
        print('start',days,board,idx,flush=True)
        for i in range(9):
            p.locator('[data-token]:visible').first.tap()
            p.evaluate('''sel=>{
              const target=document.querySelector(sel);
              window.moveTime=null;
              window.addEventListener('pointerup',()=>{
                const t=performance.now();
                const watch=new MutationObserver(()=>{
                  if(target.classList.contains('placed') && !target.disabled){
                    window.moveTime=performance.now()-t;watch.disconnect()
                  }
                });
                watch.observe(document.getElementById('board'),{attributes:true,subtree:true,childList:true});
              },{capture:true,once:true});
            }''',selector)
            p.locator(selector).tap()
            p.wait_for_function('window.moveTime !== null')
            if i>=2:samples.append(round(p.evaluate('moveTime'),1))
            p.locator('#undo').tap();p.locator(selector+'.empty').wait_for()
        summary[days]={'board':board,'samplesMs':samples,'medianMs':round(statistics.median(samples),1)}
        c.close()
    b.close()
server.shutdown()
assert len({v['board'] for v in summary.values()})==1
(out/'timing.json').write_text(json.dumps(summary,indent=2)+'\n')
