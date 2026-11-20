# Crossmath 0.5.4 preview — R1, U1, U2

Baseline `0cc129df6dcf033e5e6f7281b924db1ca74fc8ec` on `feat/play-screen-0.5`. Gameplay source tree `7b2121b99c7c0cbd058a2b4b43cc4cca8837262a`. The scope includes [R1 delivery](spec/product/content_v2/README.md) and [R2 APK evidence](spec/R2_APK_BALANCE_RU.md). No competition runtime has been enabled.

| Check | Result |
| --- | --- |
| `npm run check` | TypeScript, 72 Vitest tests and web bundle verifier passed. The integration test solved all 240 campaign positions with engine commands and real save operations. |
| `npm run content:verify` | Historical bank, routes, progression and v2 passed. Independent solver verified all 275 new boards, their opening gap, and supplied Reveal values. |
| Chromium three suites | First 25 actual campaign fields, both Free tracks, active save restore, Daily v2, exact single payment, local records and Endless neutrality passed. Compact layout measurements covered 320×568 and 390×844. |
| U1 | Mobile viewport at 390×844. Cold Russian and English sessions kept the attempt and token after cancellation. Origin control recaptured focus. Confirm created a different attempt. Scripted primary write failure showed an inline retry without replacing the durable board. |
| U2 | Field 12, two active errors. Second placement announced the row, third announced the new column `5 − 7 ≠ 2`. Re-selecting the row returned its own announcement. Endless correctness stayed neutral before Submit. |
| Android | Release web sync, actual debug and R8 `releaseCheck` built. Exact APK verified with build-tools signature, certificate, package/version, 16 KiB alignment and WebView debug exclusions. |

Preview `com.danilah.crossmath.releasecheck`, versionCode `9`, APK SHA-256 `a23a45218ac5adf216cffe8302663a95c6527ebe6675037fa3209706ecff9e60` (1,267,901 bytes). Preview certificate SHA-256 `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0`. Native Back, TalkBack, in-place install/runtime, and touch/audio on a device remain pending. Hell on 320 CSS px has an inner horizontal scroll for 48 CSS px targets. GitHub CI and production release are distinct from these checks. KIT IMPACT — NONE.
