import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=JSON.parse(await readFile('docs/acceptance/monetization27/BASELINE.json','utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
for(const {path,sha256} of base.unchanged){
 let bytes=await readFile(path);
 if(path==='src/help/reveal.ts'){
  // FUNC-01 authorizes only the frozen additional table, not different Reveal mechanics.
  const added="// Frozen public IDs only: no laboratory catalog or answer dependency in Explain.\nimport additionalAnswers from '../content/additionalAnswers.json';\n";
  const text=bytes.toString();assert.equal(text.split(added).length,2);
  bytes=Buffer.from(text.replace(added,'').replace('{...answers, ...newAnswers, ...additionalAnswers}','{...answers, ...newAnswers}'));
 }
 if(path==='src/app/model.ts')bytes=Buffer.from(bytes.toString().replace("[routes.version,'calendar-v2','calendar-v3'].includes(assignment.calendarVersion)","[routes.version,dailyVersion].includes(assignment.calendarVersion)").replace("assignment.calendarVersion !== routes.version ?","assignment.calendarVersion === dailyVersion ?"));
 if(path==='src/ui/play.css'){
  // RC-02 permits precisely this compact-viewport fix, not a blanket new baseline.
  // All other CSS and the complete BoardView/gesture implementation still hash to MON27.
  const current=`@media (max-height: 510px) {
  #play-screen.is-solving .play-area { gap: 2px; }
  #play-screen.is-solving .traybox { --tray-rows: 1; }
  #play-screen.is-solving .traybox:has(#tray-nav:not([hidden])) .tray {
    margin-inline-end: 101px;
  }
  #play-screen.is-solving #tray-nav { grid-auto-flow: column; }
}`;
  const original=current.replace('  #play-screen.is-solving .play-area { gap: 2px; }\n','').replaceAll('#play-screen.is-solving ','#play-screen.is-solving .has-tall-board ');
  const text=bytes.toString();assert.equal(text.split(current).length,2,'Exactly one authorized RC-02 block');
  bytes=Buffer.from(text.replace(current,original));
 }
 assert.equal(sha(bytes),sha256,path+' immutable contract (calendar decoder / exact RC-02 layout block only)');
}
for(const {path,sha256,removeOnly} of base.onlyCandidateModeFlag){
 let text=await readFile(path,'utf8');
 text=text.replace("import {productProfile} from '../product/releaseProfile';\n",'').replace("import {product} from '../product/releaseProfile';\n",'');
 text=text.replace('productProfile(import.meta.env.MODE).issuance',"['issuance-pilot','content-lab','league-lab','win-rv-lab'].includes(import.meta.env.MODE) ? pilotIssuancePolicy : 'legacy'");
 text=text.replace('export const leagueEnabled=__CROSSMATH_LEAGUE__;',"export const leagueEnabled=import.meta.env.MODE==='league-lab'||import.meta.env.MODE==='win-rv-lab';");
 assert.equal(sha(text.replace(removeOnly,'')),sha256,path+' product availability flags only; algorithms immutable');
}
const ledger=JSON.parse(await readFile('docs/porting/ADOPTION_LEDGER.json','utf8'));
assert.equal(sha(JSON.stringify(ledger.features.map(f=>[f.id,f.status,f.comparison]))),base.sourceProjectionSha256);
assert.equal(ledger.features.length,base.sourceIDs);assert.deepEqual(ledger.sourceInventory,base.sourceInventory);
console.log('MON27 invariant hashes PASS · '+base.unchanged.length+' contracts (exact files + calendar decoder / exact RC-02 layout block), '+base.onlyCandidateModeFlag.length+' flag-only files, '+base.sourceIDs+' reference IDs');
