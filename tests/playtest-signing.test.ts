import {expect,it} from 'vitest';
// @ts-expect-error Node-only build helper.
import {playtestSigningProblems} from '../tools/playtest-signing.mjs';
it('preserves the public playtest signer and fails closed without a key',()=>{
 const cfg={playtestCertificateSha256:'5'.repeat(64)};
 expect(playtestSigningProblems(cfg,{},undefined).missing).toEqual(['ANDROID_PREVIEW_KEYSTORE']);
 expect(playtestSigningProblems(cfg,{ANDROID_ALLOW_EPHEMERAL_PREVIEW:'1'},undefined).identity).toBe('ephemeral-build-check');
 expect(playtestSigningProblems(cfg,{ANDROID_PREVIEW_KEYSTORE:'/private/key'},'5'.repeat(64),()=>true)).toEqual({missing:[],invalid:[],identity:'stable-playtest'});
 expect(playtestSigningProblems(cfg,{ANDROID_PREVIEW_KEYSTORE:'/private/key',ANDROID_ALLOW_EPHEMERAL_PREVIEW:'1'},'a'.repeat(64),()=>true).invalid).toContain('PLAYTEST_SIGNER_MISMATCH');
 expect(playtestSigningProblems(cfg,{ANDROID_PREVIEW_KEYSTORE:'/private/key'},'5'.repeat(64),()=>false).invalid).toContain('ANDROID_PREVIEW_KEYSTORE');
});
