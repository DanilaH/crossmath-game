# Test signing identity

The delivered 0.1.0 APK is an optimized, non-debuggable **releaseCheck** with package `com.danilah.crossmath.releasecheck`. It is not a store/production artifact.

An explicit Crossmath-only preview signer was selected. Public certificate SHA-256:

`4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0`

Private backup filename: `Crossmath_Preview_Signer_Backup_2026-11-18.zip`. Keep it private and outside this repository. Restore its `crossmath-preview.keystore`, then set `ANDROID_PREVIEW_KEYSTORE` to that private local path for compatible preview updates. The test alias/password instructions are inside the private backup. Do not use this signer for production.

CI's isolated releaseCheck signer is a separate throwaway check unless the retained preview key is explicitly supplied. Its successful build does not establish update compatibility with the distributed preview. Production `certificateSha256` stays null and production key creation/publication is not authorized by this test build.
