import { defineConfig } from 'vite';
export default defineConfig(({mode})=>{
  const pilot = mode==='issuance-pilot';
  const stamp = {
    schema:1,kitRef:'b1bf2026eda7dd68a5ccbc883946191e03d235af',
    channel:mode==='release'||pilot?'release':'playtest',freeIssuancePolicy:pilot?'d4-v2':'legacy',
  };
  return {
    base:'./',build:{target:'es2022',sourcemap:false},resolve:{dedupe:['phaser']},
    plugins:[{name:'android-build-channel',generateBundle(){this.emitFile({type:'asset',fileName:'native-build.json',source:JSON.stringify(stamp)});}}],
  };
});
