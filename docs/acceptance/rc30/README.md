# RC-QA-01 · Crossmath 0.5.28 / 33

Scope: owner issue #30 over PR #4 `ed029d6d4662346fbb6526fb789f373bd4d6c035` (reviewed gameplay `4fb5ff6d`,0.5.27/32). Runtime remains `b1bf2026eda7dd68a5ccbc883946191e03d235af`. This is a final **playtest candidate**, without publication, new mechanics, SDK or economy changes.

## Acceptance matrix

| Gate | Automated evidence | Boundary |
| --- | --- | --- |
| RC-01 | `rc30-baselines.mjs --prepare` + `rc30-update-browser.mjs`: 17 historical upgrade cases, League v1/v2/v3 active/completed, D4 pin/placements/tray/Undo, Daily v2 issued and settled dates, a real unissued v2→v3 date, paid quest slots/receipts and reachable remaining routes, old League/receipt quarantine, pending/earned/ACK recovery. Old source engine/session/repository creates the starting data; old UI writes it, then RC replaces code with storage retained. Exact before/after snapshots are retained. | Real old **executables**, not just decoding fixtures. Three historical League source builds report their actual0.5.24/29 version, and delivered0.5.26/31 +0.5.27/32 APK web payloads are frozen test inputs. Model-assisted setup is labelled; browser update is not Android installation. |
| Earlier migration coverage | Existing `release29-update-browser.mjs` stays in CI with the legacy0.5.26 baseline: active/parked touched boards,1100 played dates, maximum counters, RU/EN/theme. | Retained in addition to pilot migration. |
| RC-02 | `rc30-banner-browser.mjs`: all90 × RU/EN × light/dark ×320×430/518 usable area =720 cases; last tray token reached through arrows, real taps/drag, Undo, banner hide/show and resumed layout/state,24 cold restores, measurements and24 representative screens. | The native transport reserves50px from full320×480/568; it paints no ad. No native SDK creative/fill or finger-size claim. |
| RC-03 | `rc30-protocol-browser.mjs`: six actual packaged-adapter/UI episodes: absent dispatch, prepared-only dispatch, admitted/unknown, cancelled→late earned, ACK rejected before write, lost ACK reply. Duplicate admission is rejected; unknown stays pending after10 virtual minutes and blocks interstitial; late delivery/reloads credit once; ordinary reward/interstitial eligibility returns after proven completion. | A test-only protocol3 transport exercises the real `androidAds.ts` and game UI. Java admission/journal tests remain separate; this is not an SDK test. |
| RC-04 signing | Public playtest certificate pinned; explicit key/certificate verification before canonical releaseCheck. Missing/wrong key fails closed. CI's explicit ephemeral build-check is labelled **NOT-UPDATE**. | Same package/key as the delivered0.5.27 APK. Old0.5.26 signer aa59… cannot be recreated from an APK. Android install/update and device behaviour stay blocked until the matching device/key is available. |

Project CI (`.github/workflows/ci.yml`, consumer repository only) runs the existing full CORE/META/League/content/issuance/help/ads/feel regression, new RC-01–03, debug/JVM/optimized APK and exact-payload verification. Per-commit result and artifact links are recorded in PR #4. Reports in `.test-output/rc30-*` are retained with the existing evidence; raw historical build trees and signing material are excluded. No kit CI or runtime bump is needed.

## Reproduced layout defect and fix

At320×430, cm-own-03-005's9-row board was162px tall inside a150.16px port; its bottom cells were clipped behind a108px two-row tray. English Daily cm-own-03-041's11-row board needed198px while the port had196.38px. At usable heights≤510px the existing compact one-row tray now applies to all boards, with2px play-area gaps. Existing paging controls keep every physical token reachable. BoardView, engine, gestures, tile typography, help and reward animations are byte-identical. The invariant tool permits only this exact compact CSS block and the earlier calendar decoder exception; every other guarded byte still hashes to its baseline. No check of two-digit fit or hit testing is relaxed.

## Signing and final device checklist

- Canonical playtest package: `com.danilah.crossmath.releasecheck`;0.5.28/33.
- Stable certificate SHA-256: `5f4432685e6ae74b9777454c1606828dbc1a5aee385662c296ef719ebc44ad22`, matching the delivered0.5.27/32. The test key has a separate private owner backup; it is never in Git, CI artifacts or the media ZIP.
- Old0.5.26 certificate: `aa59fbbf75788165ad7e51444729fca882ea2bdfaca1ee460064986b442ac1d4`. Without that original key, the canonical APK cannot update that package on the same device. Preserve that installation/progress; a clean install on another device is not migration acceptance.
- `ANDROID_PREVIEW_KEYSTORE` selects the existing stable test key. `tools/playtest-signing.mjs` checks its public certificate. CI alone opts into `ANDROID_ALLOW_EPHEMERAL_PREVIEW=1`; its APK is a reproducible build-check and must be re-signed with the pinned key before owner delivery. `verify-apk.py --stable-playtest` independently checks the final APK certificate, identity/version, web payload and exclusions.
- Physical Android: **NOT RUN** (no connected adb device); no device model is invented. Pending: install matching prior APK first, upgrade without data removal, touch/Back/pause/resume/cold restart, sound/haptics/offline, saved League/Daily and native banner lifecycle. Current provider remains Unconfigured; SDK selection and its separate test/live gate remain open by owner decision.

## Preserved scope and KIT IMPACT

515 original puzzles/campaign/solutions,90 integrated additions, D4 algorithm/rotations, League plans/results, resource payouts, protected first5 wins and180/120/420/30 active-second ad limits, atomic save/receipt writer and fixed100% type remain unchanged. No League coin/hint prize or permanent win bonus is enabled.729 reference IDs and their status/comparison projection remain unchanged; current-game tests do not prove original-game runtime parity.

Reusable acceptance candidate: retain an old executable **and its real build stamp**, create data under that code, replace code at the same origin without replacing storage, retain exact snapshots, then exercise UI. Combine full-content geometry with reserved native area and gesture tests; use a protocol3 scripted transport for failure injection while keeping device/SDK proof separate. Signing pin + fail-closed canonical build + explicit ephemeral CI label is reusable. No new shared runtime abstraction was necessary.
