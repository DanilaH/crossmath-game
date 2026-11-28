# UX-QA-01 #32 · Crossmath 0.5.30 / 35

Product baseline: PR #4 at `291cb971ec4c9a577851ada6a1c53dbf7d9b8fe2` (delivered FUNC31 0.5.29/34). Independent audit baseline: `4a76f388f9582c15d7f264914042b8a16c092706`, 0.5.28/33; researcher `research/ui-feel-audit-20261128@c1260ac124e7435c6142ae51c572cd70ad26b0ac`, project CI [46143344755](https://github.com/DanilaH/crossmath-game/actions/runs/46143344755), artifact15263046996 SHA256 `75f68c3129c6cab5e2adcea8bac4eb85ba0e35e2066e9bbca1666f99e18932af`. Research branch is unchanged. Project routes: existing UX/art and UI motion; actual kit API `OwnedDomMotion` inspected at the installed runtime `b1bf2026eda7dd68a5ccbc883946191e03d235af`. Guidance remains469928d0.

## Corrections

| Finding | Before | Current behavior / proof |
| --- | --- | --- |
| UX01 | Five-row preview squeezed into48px; overlapping glyphs. | Both-axis aspect fit. At short container heights a single complete **real** equation from the same crop replaces the mini-grid. Real values/placements and accessible equation description remain. Existing wooden paper, menu composition and action targets remain. `resumePreview.ts`, `ux32.css`; original310-state visual matrix and actual taps. |
| UX02 | Home → League → Back went to Profile. | Optional persisted `leagueOrigin` records Home/Profile; header and Android Back use the same route, survive cold launch, legacy missing origin falls back to Profile. Workshop origin is independent. Unit tests and native-bridge UI scenarios. |
| UX03 | Today's dated home card opened the previous archive selection. | Only that explicit shortcut atomically refreshes the day and selects effectiveDay in the same save. Root Day retains archive selection. No attempt or issued assignment is reset. Failed write retains the prior selection. |
| UX06 | Restart confirmation below settings remained outside the viewport; detailed help scrolled its title away. | Confirmation occupies the current pause dialog with warning and both choices visible, safe Cancel focused. Cancel/Back restores settings and Restart focus; second Back resumes. Help title and footer stay outside the scrollable content; detailed help can grow to82svh. Payment/preview/atomic Apply unchanged. |
| UX04 | Labels9.92px, disabled Return invisible, ambiguous sorting pictogram. | Four stable controls,11.5px labels, visible disabled Return, own number/arrow SVG and theme-role line icons. English uses the concise visible label “Return” with a full localized accessible name; wrapping “Return to tray” otherwise grew the toolbar and reduced short-screen boards. The toolbar now stays48px in both languages. `layout-baseline.json` freezes all16 original RU/EN medium/dense measurements; CI asserts no target or digit shrink in any of them.140ms keyed FLIP on visible token **faces**, only after durable sort; final button targets never move. Input/Undo/navigation/background cancel presentation. Reduced motion is instant; already sorted creates no fake command. Engine, IDs and Undo algorithm unchanged. |
| UX05 | Medium boards capped at30px pitch despite tall-screen space. | Tall usable viewports permit up to46px pitch, still constrained by available board/tray/banner space; short rules retain30px cap and18px packed minimum.390×844 medium digits15.6→20.7px. Dense width-limited boards retain their geometry. Calendar arrows enlarge to44/48px high and48px wide. No zoom/pan system or promise of48px dense cells. |
| UX07 | Unchanged ad availability polls rebuilt hub DOM; Russian League score suffix ignored plurals. | Identical immutable save/disabled/reduced state reuses existing DOM, focus and scroll. Local120ms section response respects reduced motion. League uses the existing Russian quantity formatter; navigation icons have a brighter dark variant. Existing move/win/coin sound/haptic timing is preserved. |

## Regression and evidence

`tools/ui32-browser.mjs` ports the independent runner into **asserting** product regression: all310 original states/40 original probes, with only the authorized UX02/03 route expectations changed. It fails on page/route errors, horizontal overflow, enabled-centre occlusion and unintended text clipping. Deliberately hidden League duplicate heading and one-pixel `.sr-only`/`.readout-accessible` nodes are classified as intentional, not visual defects. The compact preview is inspected, not excluded. Source screenshot matrix includes RU/EN, both themes,320×480/568 and390×844; dense/medium boards additionally320×430. Original16 sort probes retain exact sorting/revision expectations. Static layout snapshots await the natural completion of finite tray animations before inspecting text/scrollWidth; the140ms FLIP deliberately moves a complete face outside its fixed hit button. Mid-animation input/cancellation is tested separately by the interaction suite and recorded at1×. No clipping/overflow expectation is waived and no animation is cancelled or accelerated for these snapshots.

`tools/ui32-interactions.mjs`: eight additional real packaged-web scenarios, scripted Capacitor host,320×430/480/568 and390×844 × RU/light and EN/dark. Both League origins across reload and Android Back callback; archive root vs today shortcut;4200ms availability polling with DOM/focus/scroll identity; visible four tools; committed140ms sort, immediate next touch at final hit targets, Undo/IDs; already-sorted no-op; reduced motion; restart Cancel/Back and help title/footer. These are transport simulations, not execution on a phone.

`tests/ui32-navigation.test.ts`: five durable context/rollback/legacy validation cases in RC; two League cases intentionally skip in profiles where League is unavailable. Existing FUNC31605 Reveal/CAS/paging/strict pending-settings tests and all prior CORE/META/FEEL/ad tests remain. Seven historical executables now include exact delivered0.5.29 public web, yielding29 upgrade/recovery cases alongside the retained1100-date stress path.720 new-bank banner cases and four delayed-layout faults remain mandatory. CI keeps regular and coherent RC browser suites, content/issuance/League/META/economy and Android JVM/R8/APK verification.

### Measured layout (Chromium CSS pixels, synthetic valid profiles)

| Scene | Minimum cell target before → after | Minimum given digit before → after |
| --- | --- | --- |
|320×430 dense|18→18|9.5→9.5|
|320×480 dense|21.8→21.8|12.1→12.1|
|320×568 medium|48→48|15.6→15.6|
|390×844 medium|48→48|15.6→20.7|
|390×844 dense|48→48|13.9→13.9|

The extreme dense320×430 physical-finger gate remains open. Browser scheduling timestamps do not establish speaker/motor latency or subjective phone feel. No physical Android device/live SDK is available here. Stable playtest certificate `5f4432685e6ae74b9777454c1606828dbc1a5aee385662c296ef719ebc44ad22` is retained; actual install/update on Android remains a device gate. The final delivery report records the green project CI, exact source/tree, APK SHA and signer. No publication.

### Adaptive viewport test timing

The first project-CI run46151657212 failed the original touch-drag check at browser-smoke:139. Instrumented reproduction recorded a target sampled at(126,80) before the adaptive board settled; the actual short-view target is around(130,123.6). Resize changed pitch46→30 between coordinate sampling and input. This is a harness sampling race exposed by the new adaptive layout, not permission to change gesture cancellation. The geometry helper already waited two animation frames inside its matrix, but its final viewport restoration and subsequent drag setup omitted that wait. Both now use the same paint boundary; centre hit-testing is additionally asserted. The real CDP drag, unobscured ghost/target, hover, TouchCancel, empty placements and all geometry assertions remain unchanged. No retries, ignored drag failures or longer timeouts were added. Diagnostics and a24-transition control are retained in delivery evidence; the control alone did not reproduce the intermittent full-journey race.

## Scope guards and source adoption

No bank, grammar, issuance, solver, economy, grants/receipts, persistence codec/CAS or kit pin change. Optional origin is additive and old saves remain valid. `authorized-board-presentation.json` records only the exact BoardView presentation/layout diff; the invariant runner reverses those spans and still requires the original full-file hash. Existing core/gesture dispatch and MON27 invariants remain enforced. Separate normalization allows only the one optional origin validator.

Related sourceFeatureIds: guru-ui-home-continue-new, guru-ui-home-context-shortcuts, guru-ui-daily-full-tab, easy-daily-archive, guru-ui-four-tab-shell, guru-sort-tray, guru-guide-sort-trigger, guru-guide-revert-trigger, guru-ui-play-immersive, easy-pause, easy-restart-confirm, guru-ui-win-popup-queue, guru-feedback-vibration-correct, easy-feedback-correct-audio, ref-haptics. Exact inventory95f01f566adb07f29100b9fac86f73c8149a2a22 /729 IDs retained. Current-game browser proof does not upgrade original-source MATCH/ACCEPTED or physical feel status.

KIT IMPACT: REUSE OwnedDomMotion; CANDIDATE audit guidance on intentional clipping vs local overflow, origin-aware Back, explicit date context and both-axis compact previews. No runtime change or mass consumer update.
