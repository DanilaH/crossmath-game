import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
assert.ok(process.env.OLD_LEAGUE22_WEB,'Extract the previous verified APK and set OLD_LEAGUE22_WEB');
const out=resolve('.test-output/league22-ui-compat');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'};
const servers=[];
async function serve(folder){const root=resolve(folder),server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert.ok(p===root||p.startsWith(root+sep));res.setHeader('Content-Type',mime[extname(p)]??'text/html');res.end(await readFile(p===root?root+'/index.html':p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));servers.push(server);return `http://127.0.0.1:${server.address().port}`;}
const fixture=JSON.parse(await readFile('tests/fixtures/league-v2-active-win.json','utf8')),browser=await chromium.launch(),cases=[];
try{
 const urls=[await serve(process.env.OLD_LEAGUE22_WEB),await serve(process.env.LEAGUE22_WEB??'dist')];
 for(const [width,height] of [[320,568],[390,844]])for(const language of ['ru','en'])for(const theme of ['light','dark'])for(const screen of ['home','league']){
  const name=`${width}x${height}-${language}-${theme}-${screen}`;
  for(let version=0;version<3;version++){
   const seed=structuredClone(fixture);seed.settings.language=language;seed.settings.theme=theme;seed.settings.reducedMotion=true;seed.meta.screen=screen;
   const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'UTC'}),p=await c.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-23T09:00:00Z'));await p.addInitScript(seed=>localStorage.setItem('crossmath.save.v1',JSON.stringify(seed)),seed);
   await p.goto(urls[version===2?1:0]);await p.locator('html[data-state=ready]').waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1200);
   assert.deepEqual(errors,[]);const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('crossmath.save.v1')));assert.deepEqual(saved.profile,seed.profile);assert.deepEqual(saved.league,seed.league);
   const geometry=await p.evaluate(()=>[...document.querySelectorAll('#screen-header,#root-tabs,#hub > *,#hub button,.league-row,.league-avatar')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {id:n.id,cls:n.className,x:r.x,y:r.y,w:r.width,h:r.height,font:s.font,color:s.color,background:s.background,border:s.border};}));await writeFile(resolve(out,`${name}-${version}.json`),JSON.stringify(geometry));
   await p.screenshot({path:resolve(out,`${name}-${version}.png`)});await c.close();
  }
  cases.push(name);
 }
 await writeFile(resolve(out,'cases.json'),JSON.stringify(cases));
 const result=spawnSync('python3',['-c',`from PIL import Image,ImageChops
import json,sys,pathlib,re
root=pathlib.Path(sys.argv[1]);rows=[]
for case in json.loads((root/'cases.json').read_text()):
 old=json.loads(re.sub(r'http://127[.]0[.]0[.]1:[0-9]+','',(root/(case+'-0.json')).read_text()));current=json.loads(re.sub(r'http://127[.]0[.]0[.]1:[0-9]+','',(root/(case+'-2.json')).read_text()));assert old==current,case
 a=Image.open(root/(case+'-0.png')).convert('RGB');b=Image.open(root/(case+'-2.png')).convert('RGB');control=Image.open(root/(case+'-1.png')).convert('RGB')
 diff=list(ImageChops.difference(a,b).getdata());repeat=list(ImageChops.difference(a,control).getdata());rows.append({'case':case,'differentPixels':sum(p!=(0,0,0) for p in diff),'maxChannelDelta':max(max(p) for p in diff),'oldRepeatDifferentPixels':sum(p!=(0,0,0) for p in repeat),'geometryAndStyles':'EXACT','profileAndPlans':'EXACT'})
print(json.dumps({'status':'PASS','source':'Previous verified v2 APK vs current runtime on identical frozen v2 winning profile; Rules collapsed. Positions, computed styles, wallet and plans checked exactly. Raster deltas and same-old-build control are reported separately; no byte-identical raster claim.','rows':rows},indent=2))
`,out],{encoding:'utf8'});await writeFile(resolve(out,'report.json'),result.stdout);assert.equal(result.status,0,result.stderr||result.stdout);console.log(`League UI compatibility PASS · ${cases.length} pairs: exact geometry/styles, wallet and frozen v2 plans; raster differences reported separately`);
}finally{await browser.close();servers.forEach(s=>s.close());}
