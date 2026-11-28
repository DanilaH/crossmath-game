# MONETIZATION #27 / isolated WIN-RV-01 #14 · 0.5.26 / 31

Owner instruction 28.11.2026; base PR #4 HEAD `157b133bf58be8323c43a10656eb092fe277b97c`, including the independent META review. Runtime kit **b1bf2026eda7dd68a5ccbc883946191e03d235af**; guidance469928d; reference inventory95f01f5, 729 IDs. This is a provider-integration preparation/playtest, **not live Android advertising acceptance or a production release**. Exact source/tree/APK/certificate and measured results are in the delivered manifest/CI, not inferred from a filename.

## Audited architecture and changes

| Boundary | Baseline / defect | Result and evidence |
| --- | --- | --- |
| Android integration | TS required `CrossmathAds`; native registered only GameStorage, no provider dependency | Registered app-owned `CrossmathAdsPlugin`, protocol2, explicit `CrossmathAdProvider` seam. Default `Unconfigured`: every format unavailable, no SDK, ID, network request or fabricated reward. |
| Fullscreen admission | Existing explicit result Next, saved reservation, shared active-time gate | Same placement and 180/120/420/30, first five unique wins protected. One unresolved presentation; native `willOpen` claim before SDK call, elapsed-time pre-show deadline, no autoplay from preload. Opened fullscreen has no generic timeout. Protocol2 `cancelUnopened` atomically confirms native closed vs opened when the JS opened event is delayed; no release under an actual SDK view. Legacy late opened re-blocks until its genuine terminal result. No new menu/entry/loss/foreground placement. |
| Durable reward | Request and game grant already persisted; native implementation absent | Native atomic journal commits/readbacks receipt before event. Shared GameSession writer commits credit + ledger + cooldown before exact ack. Native journal reloads authoritative state on the shared IO executor, including old-Activity callbacks after recreation. It retains pending on failure/restart and dedup tombstones; no arbitrary receipt trimming. |
| Cancel/late earned | A cancellation permanently settled request; id-only ack could erase a newer receipt | Earned can supersede cancelled/failed once; earned/expired never grant twice. Queue identity `(requestId,outcome)` retains a late earned during cancellation ack. Native ack compares both. Profile matching remains mandatory. |
| Unknown request | A dismissed but unresolved request allowed another rewarded request | Persisted unresolved request gates further ads, including after restart; ordinary play, help purchase and navigation stay usable. No timeout invents terminality or reward. SDK-specific recovery must provide evidence, never expire by age. |
| Banner | Serialized TS intents and recovery already existed | Preserved. Native host owns one SDK view as a bottom **sibling**: measured native height is reserved by shrinking WebView, never overlaying the field. Root alone owns safe insets. Current-width view, focus/background/fullscreen/modal holds, stale-show prevention, disposal. No-fill should retain measured neutral view; actual SDK height/paint not measured yet. |
| Diagnostics | No built-in production analytics provider | Optional bounded-format trace of intent/eligibility/reservation/provider/open/terminal/receipt/commit/ack. No raw save/profile/request IDs/ad IDs. Trace is **not** an impression or revenue counter. |

Key code: `src/platform/{adState,ads,androidAds,winBonus}.ts`, `src/app/session.ts`, native `CrossmathAdsPlugin.java`, `ads/{AdReceiptJournal,FullscreenLease,CrossmathAdProvider,NativeBannerHost}.java`. Existing `ActionInterstitialGate` and `DurableReceiptQueue` are reused; no runtime/API bump or kit fork.

## #14 candidate, not release policy

Only `--mode win-rv-lab` compiles the button. Ordinary development/release/League/content builds omit it; web verifier checks absence, production Gradle refuses candidate stamp, exact-APK verifier rejects it. Delivered main APK has **candidate=false**. Old optional candidate requests are decoded/honored even after the flag is removed, so switching builds cannot discard an already earned receipt.

Proposal: after >5 different solved boards; first solution in Campaign/Free only; separate voluntary **additional** `2 × baseCoins`, current ordinary Continue remains above it. Daily/Endless/replay/unknown pending/claimed/offline/unsupported provider have no offer. Protocol2 **and** explicit `win-bonus` capability required; old providers support no new placement implicitly. No rewarded→interstitial fallback. Starting candidate consumes this result's forced opportunity even on cancel: no same-result chaining.

| Difficulty | Existing base | Proposed extra | Base + proposed extra |
| --- | ---: | ---: | ---: |
| Easy | 10 | 20 | 30 |
| Standard | 15 | 30 | 45 |
| Hard | 20 | 40 | 60 |
| Expert | 25 | 50 | 75 |

These numbers/eligibility remain owner proposals. Example base10 + rank60 already credited70; candidate adds20, resulting90 from those sources, not210. Tasks, Daily, rank, cards, XP, parts and medals are never multiplied. With hypothetical 25% earned participation, expected base-only income is15/22.5/30/37.5, before all other sources; this arithmetic is **not** a conversion/earnings forecast. Existing META economy model and League A–D remain unchanged. No candidate payout is created in the main APK. The optional button stays disabled until the existing coin/score readouts and Workshop presentation naturally finish; ordinary Continue retains its existing skip behavior. No animation durations/effects are modified.

Durable request snapshots `profileId + resultId + puzzleId + immutable base/delta + policy`. Receipt matches this request; SDK/UI never supply an authoritative amount. Dedup by both request and result; late earned targets the saved claim after Next/reload, not a new board's result. Failed write retains both entitlement and native receipt. Cancel/no-fill yields zero; truthful late earned remains receivable. Same-result requests with different IDs cannot pay twice. No native test provider is shipped.

## Reproduction and acceptance

- `node tools/monetization27-invariants.mjs`:34 exact baseline files (core/help/banks/payout config/coin feedback), plus2 files with only candidate-mode admission added;729 IDs/statuses retained.
- `npm run check`, `npm run test:league`, `npm run test:win-rv`, `npm run content:verify`.
- `npm run build:league-lab && node tools/meta18-fixtures.mjs && node tools/monetization27-browser.mjs`.
- `npm run build:win-rv-lab && MON27_OUT=.test-output/mon27-win-ui node tools/monetization27-browser.mjs`.
- Standard browser suite and prior #16/#17/#22/META regression in **game CI**. Full strict two-digit fitting/Explain checks retained.
- `npm run android:sync:release`; Gradle `testDebugUnitTest assembleDebug assembleReleaseCheck`; `tools/verify-apk.py` requires actual ads bridge methods surviving R8, exact web bytes, candidate=false, v2 signer/16KiB/nondbg.

Tests cover first5 and 180/120/420/30 boundaries, duplicate/late receipts, cancelled→earned during ack, unknown pending/restart, write/ack failure and spending, unmatched profile, no SDK/network, pre-show hang vs actually opened fullscreen, delayed listener cleanup, banner intent recovery, all four bonus base amounts, result-level dedup, target swap, ordinary payment and zero on mere close. JVM journal tests use real encoded bytes/reopen/failing-disk doubles (including ambiguous committed writes and1100 tombstones), not Android filesystem execution. JVM lease tests cover deadline boundary, background, duplicate opening and no timeout of shown ads.

Browser proof uses the **actual built Capacitor JS adapter** with an explicitly scripted native transport in Playwright init only. Valid near-finish snapshots are generated via real GameSession settlement; final moves/Help/Apply/Next are actual touches. Fixture bank/near-complete history are labelled, not claimed as human play. RU/EN, light/dark, 320×480/568/390×844; 320×430/518 usable WebView sizes model a50px native sibling reservation, **not SDK measurements**. No test transport enters dist/APK. A shown/unknown native presentation remains blocked until trustworthy cancellation/open/close; a hung cancellation RPC is not proof of absence. The controlled native cancellation method does not call the SDK. GIF/video is1× browser UI without captured sound; no ad creative, impression or provider earnings claim.

## RESEARCHER_REVIEW reconciliation

- **UX-01:** allegation of “0 boards to next part” at48/48 was **not reproduced** at baseline: `nextFragmentText` already returned “Мастерская собрана / Workshop complete” when fragments>=48, and existing browser test asserted it. Album now uses the explicit completed branch with identical copy; new small-screen RU/EN/light/dark coverage ensures no future-part/countdown. Do not claim a pre-existing bug was reproduced.
- **UX-02:** date40px/minimum and arrows38px were not evidence of finger accuracy. Browser hit testing/coordinates are distinct from physical fingers/safe bars. Actual phone audit remains open; do not shrink tests or claim device PASS. Calendar architecture retained.
- Review's CI counts479 include bundled kit tests; local subset counts do not replace actual CI totals. Report both environments correctly.
- Production still excludes #16/#17/#22 laboratories; candidate mode adds no permanent activation/migration. Delivered playtest preserves all three labs. No #19/store/IAP/forced placements introduced.

## Open decision/device gates

See [provider handoff and real-device checklist](PROVIDER_HANDOFF.md). SDK/vendor/version/consent/real unit IDs, physical phone, live fill, actual impression/earned/order, audio/Back/update and production signer are **NOT RUN / NOT SELECTED**, not replaced by CI/browser/JVM results. No connected Android device is available. Select SDK/IDs and review payout eligibility separately after this concrete preparation. Keep issues open for owner acceptance.

**KIT IMPACT: REUSE** shared gate, durable queue, coordinated writer and guidance. Native consumer bridge is app-owned; it is not an extracted generic SDK. No other game or runtime pin changed.

### Economy regression

The complete META model report was rerun on this package:54 synthetic weeks/1014 actual GameSession settlements,5400 League rank replays and108000 independent Python wallet replays. The entire report is identical to the previous META artifact, including all payouts, sensitivities and A–D proposals. This verifies unchanged existing model outputs; it is not live ad revenue or proof of human participation. #14 numerical table above remains a separate inactive proposal.

### #14 latest source clarification

[Issue comment7201351751](https://github.com/DanilaH/crossmath-game/issues/14#issuecomment-7201351751) / [102-control Guru native replay](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md): deee14 guards are `multiCoinTextAnimation` and `buttonHideAnimation`, not recovered game-mode exclusions. Separate ef2a path remains unresolved. First-claim flag is telemetry, not a dedup ledger. Our candidate waits for its own existing readout/Workshop presentation states and deduplicates by durable result/request; Daily/Endless exclusions and extra2×base are own inactive proposals, not inferred original enums/30-coin wallet totals. Browser early-touch regression verifies zero ad calls until animations naturally finish.
