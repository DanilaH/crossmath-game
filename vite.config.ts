import {productProfile} from './src/product/releaseProfile.js';
import { defineConfig } from 'vite';
export default defineConfig(({mode})=>{
  const win=mode==='win-rv-lab',league=mode==='league-lab'||win,lab=mode==='content-lab'||league;
  const profile=productProfile(mode);
  const pilot = profile.issuance==='d4-v2';
  const stamp = {
    schema:2,releaseCandidate:profile.candidate,additionalBank:profile.additionalBank,leagueEnabled:profile.league,kitRef:'b1bf2026eda7dd68a5ccbc883946191e03d235af',
    channel:mode==='release'||pilot?'release':'playtest',freeIssuancePolicy:pilot?'d4-v2':'legacy',contentLab:lab,leagueLab:league,winBonusCandidate:win,
  };
  return {
    define:{__CROSSMATH_LEAGUE__:JSON.stringify(profile.league),__CROSSMATH_ADDITIONAL_BANK__:JSON.stringify(profile.additionalBank)},
    base:'./',build:{target:'es2022',sourcemap:false,...(lab?{rollupOptions:{input:['index.html','content-lab.html']}}:{})},resolve:{dedupe:['phaser']},
    plugins:[{name:'android-build-channel',generateBundle(){this.emitFile({type:'asset',fileName:'native-build.json',source:JSON.stringify(stamp)});}}],
  };
});
