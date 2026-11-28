import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,symlink,realpath,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
export const baselineSpecs=[
 {name:'rc528',ref:'4a76f388f9582c15d7f264914042b8a16c092706',policy:'league-lab-3',mode:'release-candidate'},
 {name:'league-v1',ref:'a57ceabc8570e57c0fcbf8aabdd5ee74674a7147',policy:'league-lab-1'},
 {name:'league-v2',ref:'097b9fc69b669c100ef1e6fa8b1063cb6cb56008',policy:'league-lab-2'},
 {name:'league-v3',ref:'fc09706c91282aed827a11215de6afc2ec884465',policy:'league-lab-3'},
 {name:'playtest526',ref:'1c6e5fb84cbb303831c393eb29f98d21e3d80ccf',policy:'league-lab-3'},
 {name:'rc527',ref:'4fb5ff6d60eb718b67ffb3ff22d75cab95dfe5cb',policy:'league-lab-3',mode:'release-candidate'},
];
export const baselineRoot=resolve(process.env.RC30_BASELINES??'../rc30-baselines');
const hash=b=>createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--prepare')){
 await mkdir(baselineRoot,{recursive:true});
 for(const spec of baselineSpecs){
  const root=resolve(baselineRoot,spec.name);await mkdir(root,{recursive:true});
  try{execFileSync('git',['cat-file','-e',spec.ref],{stdio:'ignore'});}catch{execFileSync('git',['fetch','--no-tags','origin',spec.ref],{stdio:'inherit'});}
  execFileSync('tar',['-x','-C',root],{input:execFileSync('git',['archive',spec.ref],{maxBuffer:80*1024*1024})});
  try{await access(root+'/node_modules');}catch{await symlink(await realpath('node_modules'),root+'/node_modules','dir');}
  const pkg=JSON.parse(await readFile(root+'/package.json','utf8'));
  assert.ok(pkg.dependencies['@danilah/mini-games-kit'].endsWith('#b1bf2026eda7dd68a5ccbc883946191e03d235af'));
  const mode=spec.mode??'league-lab';
  // SSR fixture servers set NODE_ENV=development in this parent process. Historical
  // playtest executables must retain production transforms, never that inherited flag.
  execFileSync(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'build','--mode',mode],{cwd:root,env:{...process.env,NODE_ENV:'production'},stdio:'inherit'});
  execFileSync(process.execPath,['tools/verify-web.mjs',mode==='release-candidate'?'--release-candidate':'--league-lab'],{cwd:root,stdio:'inherit'});
  const stamp=JSON.parse(await readFile(root+'/dist/native-build.json','utf8'));
  assert.equal(stamp.freeIssuancePolicy,'d4-v2');assert.equal(stamp.leagueLab,mode==='league-lab');
  const provenance={...spec,version:JSON.parse(await readFile(root+'/android-project.json','utf8')),mode,nodeEnv:'production',stamp,indexSha256:hash(await readFile(root+'/dist/index.html')),sourceTree:execFileSync('git',['rev-parse',spec.ref+'^{tree}'],{encoding:'utf8'}).trim(),origin:'Historical executable rebuilt from exact commit, not a delivered APK or new decoder fixture'};
  await writeFile(root+'/provenance.json',JSON.stringify(provenance,null,2));
  if(spec.name==='playtest526'){
   const archive=resolve('tests/fixtures/playtest526-web.zip');
   assert.equal(hash(await readFile(archive)),'d13cfba3a0c30d8e5265af5cca39e78bf800696615d299abb69ed316f20ce5bc');
   execFileSync('python3',['-m','zipfile','-e',archive,root+'/artifact-web']);
   provenance.artifact={apkSha256:'561be8d8045893dce17b6dd6632faa3b01e73da285fce249dec70f964997fc20',versionName:'0.5.26',versionCode:31,webArchiveSha256:hash(await readFile(archive)),scope:'Exact public web payload extracted from the delivered owner playtest APK; native installation not simulated'};
  }
  if(spec.name==='rc527'){
   const archive=resolve('tests/fixtures/playtest527-web.zip');
   assert.equal(hash(await readFile(archive)),'c3dbe3044b1b9b4da1d70af3d9a12a88239dfcb9889e4153dcb4aedc2bf6ce46');
   execFileSync('python3',['-m','zipfile','-e',archive,root+'/artifact-web']);
   provenance.artifact={apkSha256:'d2dba24f4a3134ba8382cc8491d04b37c43fcd50b68989e2526a6f1c13c46977',versionName:'0.5.27',versionCode:32,webArchiveSha256:hash(await readFile(archive)),scope:'Exact delivered integrated RC web; native installation not simulated'};
  }
  if(spec.name==='rc528'){
   const archive=resolve('tests/fixtures/playtest528-web.zip');
   assert.equal(hash(await readFile(archive)),'cb9c7b3f488c81ae4d2f760dcd2f71054f479995af8df438df07319862c80152');
   execFileSync('python3',['-m','zipfile','-e',archive,root+'/artifact-web']);
   provenance.artifact={apkSha256:'aae1f10dfd607c2da8371019f6789b84e1ae55a13ec374142940924eb5847445',versionName:'0.5.28',versionCode:33,webArchiveSha256:hash(await readFile(archive)),scope:'Exact delivered RC-QA web; native installation not simulated'};
  }
  const modules=await createServer({root,mode,server:{middlewareMode:true,watch:null},appType:'custom'});
  try{
   const {createSave,decodeSave}=await modules.ssrLoadModule('/src/app/model.ts'),{GameSession}=await modules.ssrLoadModule('/src/app/session.ts'),{SaveRepository}=await modules.ssrLoadModule('/src/app/saveRepository.ts'),{getPuzzle}=await modules.ssrLoadModule('/src/content/catalog.ts');
   const answers={...JSON.parse(await readFile(root+'/docs/spec/product/content_v09/author_solutions.json','utf8')),...JSON.parse(await readFile(root+'/docs/spec/product/content_v2/author_solutions.json','utf8'))};
   if(['rc527','rc528'].includes(spec.name)){
    const map=JSON.parse(await readFile(root+'/docs/acceptance/release29/content-map.json','utf8')),raw=JSON.parse(await readFile(root+'/docs/experiments/content03/author_solutions.json','utf8'));
    for(const entry of map)answers[entry.product]=raw[entry.source];
   }
   let serial=0,now='2026-11-16T12:00:00Z';const data=new Map(),initial=createSave('rc30-'+spec.name,'2026-01-01T12:00:00Z','UTC','initial');
   const repo=new SaveRepository({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);},removeItem:async k=>{data.delete(k);}},()=>structuredClone(initial));
   const session=new GameSession(await repo.load(),repo,()=>spec.name+'-'+(++serial),()=>now);
   async function win(){const p=getPuzzle(session.state.attempt.puzzleId);for(const cell of p.cells.filter(c=>c.given===undefined)){
    const used=new Set(Object.values(session.state.attempt.placements)),i=p.tray.findIndex((v,i)=>v===answers[p.puzzleId].answer[cell.id]&&!used.has('t'+i));
    assert.equal((await session.command({type:'PlaceFromTray',tokenId:'t'+i,cellId:cell.id},2)).outcome,'applied');
   }assert.equal(session.state.attempt.status,'won');}
   for(let n=0;n<15;n++){await win();await session.next();}
   await session.enterLeague();assert.equal(session.state.league.active.policy.version,spec.policy);
   await win();await session.next();now='2026-11-23T12:00:00Z';await session.refreshDay();
   assert.equal(session.state.league.history.length,1);const completed=structuredClone(session.state);
   await session.enterLeague();assert.equal(session.state.league.active.policy.version,spec.policy);
   await win();await session.next();
   now='2026-11-28T12:00:00Z';await session.refreshDay();
   assert.equal(await session.openFreeTrack('relax'),'opened');
   await session.navigate('home');const issued=structuredClone(session.state);await session.navigate('play');
   const p=getPuzzle(session.state.attempt.puzzleId),cell=p.cells.find(c=>c.given===undefined),i=p.tray.findIndex(v=>v===answers[p.puzzleId].answer[cell.id]);
   await session.command({type:'PlaceFromTray',tokenId:'t'+i,cellId:cell.id});await session.command({type:'SortTray'});
   assert.ok(JSON.stringify(session.state.meta.freeIssuance).includes('d4-v2'),'D4 pin is written by old implementation');
   await session.openDaily('2026-11-23');await win();await session.next();
   // Exercise a real old whole-set claim, not just an empty setReceipts array.
   for(let n=0;n<3&&session.state.meta.quests?.slots.some(s=>!s.paid);n++){
    const index=session.state.meta.quests.slots.findIndex(s=>!s.paid);
    assert.equal(await session.openQuest(index,true),'opened');await win();await session.next();
   }
   assert.ok(session.state.meta.setReceipts.length>0,'Old executable model earns the complete quest-set receipt');
   await session.openDaily('2026-11-24');
   const d=getPuzzle(session.state.attempt.puzzleId),dc=d.cells.find(c=>c.given===undefined),di=d.tray.findIndex(v=>v===answers[d.puzzleId].answer[dc.id]);
   await session.command({type:'PlaceFromTray',tokenId:'t'+di,cellId:dc.id});
   await session.navigate('home');const active=structuredClone(session.state);decodeSave(active);decodeSave(completed);
   await writeFile(root+'/fixtures.json',JSON.stringify({provenance,active,completed,issued,scope:'Historical GameSession/engine/repository created all placements, wins, D4 pins, paid whole quest sets, calendar and League plans; model-assisted preconditions, not manual UI play'},null,2));
   console.log(spec.name+' old executable fixtures PASS');
  }finally{await modules.close();}
 }
 // Preserve the older legacy/1100-day/maximum-profile regression as well.
 const legacy=resolve(baselineRoot,'legacy526');await mkdir(legacy,{recursive:true});
 execFileSync('tar',['-x','-C',legacy],{input:execFileSync('git',['archive','1c6e5fb84cbb303831c393eb29f98d21e3d80ccf'],{maxBuffer:80*1024*1024})});
 try{await access(legacy+'/node_modules');}catch{await symlink(await realpath('node_modules'),legacy+'/node_modules','dir');}
 execFileSync(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'build','--mode','release'],{cwd:legacy,env:{...process.env,NODE_ENV:'production'},stdio:'inherit'});
 execFileSync(process.execPath,['tools/verify-web.mjs','--release'],{cwd:legacy,stdio:'inherit'});
 execFileSync(process.execPath,['tools/meta18-fixtures.mjs'],{cwd:legacy,stdio:'inherit'});
}
