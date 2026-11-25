import { defineConfig } from 'vite';
export default defineConfig(({mode})=>({
  base:'./',build:{target:'es2022',sourcemap:false},resolve:{dedupe:['phaser']},
  plugins:[{name:'android-build-channel',generateBundle(){this.emitFile({type:'asset',fileName:'native-build.json',source:JSON.stringify({schema:1,kitRef:'b1bf2026eda7dd68a5ccbc883946191e03d235af',channel:mode==='release'?'release':'playtest'})});}}],
}));
