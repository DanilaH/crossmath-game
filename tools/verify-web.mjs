import {readFile,readdir} from 'node:fs/promises';
const candidate=process.argv.includes('--release-candidate');
const win=process.argv.includes('--win-rv-lab'),league=process.argv.includes('--league-lab')||win,lab=process.argv.includes('--content-lab')||league,pilot=candidate||process.argv.includes('--issuance-pilot')||lab,release=process.argv.includes('--release')||pilot;
const config=JSON.parse(await readFile('android-project.json','utf8'));
const stamp=JSON.parse(await readFile('dist/native-build.json','utf8'));
if((stamp.releaseCandidate??false)!==candidate||(stamp.additionalBank??false)!==candidate||(stamp.leagueEnabled??false)!==(candidate||league))throw Error('Wrong product profile');
if(stamp.channel!==(release?'release':'playtest'))throw Error('Wrong web build channel');
if(stamp.freeIssuancePolicy!==(pilot?'d4-v2':'legacy'))throw Error('Wrong Free issuance policy');
if((stamp.leagueLab??false)!==league)throw Error('Wrong league channel');
if(stamp.contentLab!==lab)throw Error('Wrong laboratory channel');
if((stamp.winBonusCandidate??false)!==win)throw Error('Wrong win-bonus channel');
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
const files=await walk('dist');
for(const path of files){
 if(!win&&release&&/\.js$/.test(path)&&/win-rv-bonus/.test(await readFile(path,'utf8')))throw Error('Victory-bonus UI in regular web');
 if(!lab&&release&&(config.releaseExcludedPaths.includes(path.slice(5))||path.endsWith('/content-lab.html')))throw Error('Excluded path in web payload');
 if(!league&&!candidate&&release&&/\.js$/.test(path)&&/league-open|league-join/.test(await readFile(path,'utf8')))throw Error('Experimental league UI in production web');
 if(!lab&&release&&/\.js$/.test(path)&&/cm-lab-17-|crossmath\.content03\.lab|content-lab-open/.test(await readFile(path,'utf8')))throw Error('Experimental content in production web');
 if(release&&/\.(html|js)$/.test(path))for(const marker of config.releaseExcludedMarkers)if((await readFile(path,'utf8')).includes(marker))throw Error('Debug/laboratory marker in production web');
}
console.info('Built web channel and debug/laboratory exclusions verified.');
