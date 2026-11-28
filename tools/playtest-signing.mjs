import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function playtestSigningProblems(config,env,certificate,hasFile=existsSync){
 const invalid=[],missing=[];
 const pin=config.playtestCertificateSha256;
 if(!/^[0-9a-f]{64}$/i.test(pin??''))invalid.push('android-project.json.playtestCertificateSha256');
 if(!env.ANDROID_PREVIEW_KEYSTORE){
  if(env.ANDROID_ALLOW_EPHEMERAL_PREVIEW!=='1')missing.push('ANDROID_PREVIEW_KEYSTORE');
 }else{
  if(!hasFile(env.ANDROID_PREVIEW_KEYSTORE))invalid.push('ANDROID_PREVIEW_KEYSTORE');
  if(certificate?.toLowerCase()!==pin?.toLowerCase())invalid.push('PLAYTEST_SIGNER_MISMATCH');
 }
 return {missing,invalid,identity:env.ANDROID_PREVIEW_KEYSTORE?'stable-playtest':'ephemeral-build-check'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 let cert;
 try{
  if(process.env.ANDROID_PREVIEW_KEYSTORE){
   // Only a public certificate leaves keytool; no key bytes or passwords are logged.
   const output=execFileSync('keytool',['-list','-v','-keystore',process.env.ANDROID_PREVIEW_KEYSTORE,'-storepass:env','CROSSMATH_PREVIEW_STORE_PASSWORD'],{encoding:'utf8',env:{...process.env,LC_ALL:'C',CROSSMATH_PREVIEW_STORE_PASSWORD:'android'},stdio:['ignore','pipe','pipe']});
   cert=output.match(/SHA256:\s*([A-Fa-f0-9:]+)/)?.[1].replaceAll(':','');
  }
  const result=playtestSigningProblems(JSON.parse(readFileSync('android-project.json','utf8')),process.env,cert);
  console.info(JSON.stringify(result));if(result.missing.length||result.invalid.length)process.exitCode=1;
 }catch{console.error('Playtest signer could not be verified; no replacement key generated.');process.exitCode=1;}
}
