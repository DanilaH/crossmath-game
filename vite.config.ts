import { defineConfig } from 'vite';
export default defineConfig(({mode})=>{
  const win=mode==='win-rv-lab',league=mode==='league-lab'||win,lab=mode==='content-lab'||league;
  const pilot = mode==='issuance-pilot'||lab;
  const stamp = {
    schema:1,kitRef:'b1bf2026eda7dd68a5ccbc883946191e03d235af',
    channel:mode==='release'||pilot?'release':'playtest',freeIssuancePolicy:pilot?'d4-v2':'legacy',contentLab:lab,leagueLab:league,winBonusCandidate:win,
  };
  return {
    base:'./',build:{target:'es2022',sourcemap:false,...(lab?{rollupOptions:{input:['index.html','content-lab.html']}}:{})},resolve:{dedupe:['phaser']},
    plugins:[{name:'android-build-channel',generateBundle(){this.emitFile({type:'asset',fileName:'native-build.json',source:JSON.stringify(stamp)});}}],
  };
});
