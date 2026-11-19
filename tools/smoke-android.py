"""Own releaseCheck game on an isolated USER Android device; no JS injection.

Run from repo root. A clean test profile is required; --fresh-profile explicitly
clears ONLY the .releasecheck application's test data. Does not change radio,
rotation or other device settings. This script is not a physical-phone signoff.
"""
import argparse, hashlib, json, re, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('apk',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--fresh-profile',action='store_true');a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
cfg=json.loads(Path('android-project.json').read_text());package=cfg['appId']+'.releasecheck'
def adb(*args):return subprocess.check_output(['adb',*args],stderr=subprocess.STDOUT,timeout=45)
def shell(*args):return adb('shell',*args).decode(errors='replace').strip()
def tree(name):
    shell('uiautomator','dump','/sdcard/crossmath-test-window.xml')
    raw=adb('exec-out','cat','/sdcard/crossmath-test-window.xml');(a.out/(name+'.xml')).write_bytes(raw)
    return ET.fromstring(raw)
def wait(text,name,enabled=False):
    deadline=time.monotonic()+60
    while time.monotonic()<deadline:
        try:
            current=tree(name)
            found=next((n for n in current.iter('node') if any(text in (n.get(k) or '') for k in ['text','content-desc']) and (not enabled or n.get('enabled')=='true')),None)
            if found is not None:return current,found
        except (subprocess.CalledProcessError,ET.ParseError):pass
        time.sleep(.5)
    raise AssertionError('Expected game control: '+text)
def bounds(node):return tuple(map(int,re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',node.get('bounds')).groups()))
def tap(node):
    x1,y1,x2,y2=bounds(node);assert x2>x1 and y2>y1
    shell('input','tap',str((x1+x2)//2),str((y1+y2)//2))
def launch():shell('am','start','-W','-n',package+'/'+cfg['appId']+'.MainActivity')
def shot(name):(a.out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))

assert shell('getprop','ro.build.type')=='user' and shell('getprop','ro.debuggable')=='0','Use isolated USER image; userdebug forces WebView inspection'
assert 'Success' in adb('install','-r',str(a.apk)).decode()
if a.fresh_profile:assert 'Success' in shell('pm','clear',package)
adb('logcat','-c');launch()
current,number=wait('Число 5, экземпляр 1','field1',True)
web=next(n for n in current.iter('node') if n.get('class')=='android.webkit.WebView')
x1,y1,x2,y2=bounds(number);left,top,right,bottom=bounds(web);density=int(re.findall(r'\d+',shell('wm','density'))[-1])/160
assert left<=x1<x2<=right and top<=y1<y2<=bottom and top>0
assert min(x2-x1,y2-y1)+1>=48*density,'Numeric hit area below 48dp'
tap(number);_,cell=wait('Строка 1, столбец 5.','target',True);tap(cell)
wait('Поле решено','won');wait('+10 монет','first-reward');shot('first-reward')
shell('am','force-stop',package);launch();wait('Поле решено','cold-result');shot('cold-result')
_,home=wait('Crossmath — на главную','return-from-result',True);tap(home)
wait('130 монет','reward-still-once')
_,modes=wait('Режимы и рекорды','open-modes',True);tap(modes)
_,result=wait('Последний результат','last-result',True);tap(result)
wait('Поле решено','returned-result')
shell('input','keyevent','4');wait('Продолжить','native-back-pause',True);shot('native-back-pause')
shell('am','force-stop',package);launch();_,resume=wait('Продолжить','user-pause-restored',True);tap(resume)
_,next_button=wait('Следующее поле','next',True);tap(next_button);wait('Поле 2','second-field');shot('second-field')
pid=shell('pidof',package);assert re.fullmatch(r'\d+',pid)
assert not re.search(r'@webview_devtools_remote_'+pid+r'(?:\s|$)',shell('cat','/proc/net/unix'))
assert 'FATAL EXCEPTION' not in adb('logcat','-d','-s','AndroidRuntime:E').decode(errors='replace')
report={'package':package,'apkSha256':hashlib.sha256(a.apk.read_bytes()).hexdigest(),'androidApi':shell('getprop','ro.build.version.sdk'),'systemBuild':'user','installed':True,'firstFieldInput':True,'coldResultRestore':True,'rewardRemains130':True,'backOpensPause':True,'persistentUserPause':True,'secondField':True,'debugSocketAbsent':True,'scope':'Actual R8 APK on isolated USER device, UIAutomator gestures/AX; no injected JS/seeded profile. No live ads/analytics or physical feel acceptance.'}
(a.out/'runtime.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
