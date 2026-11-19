# Play screen preview — 19 November 2026

Crossmath 0.5.0, Android versionCode 5, save schema 4.

The owner approved starting with the field, first move and completion. The play screen uses a compact header, a free-standing board, amber movable pieces, a tray beneath the puzzle and a compact toolbar. The win panel keeps the next action in view. The darker play palette and reduced-motion setting cover the same states. Wallet and rank are available on the existing hub. Campaign, Free Play, Daily and Endless share the new play layout.

## Reference and evidence

[Guru's Play listing](https://play.google.com/store/apps/details?id=math.puzzle.games.crossmath.number.puzzles.free) shows the field, separated tray and bottom tools. A [recorded Guru session](https://www.youtube.com/watch?v=xxoueeCnA6A&t=32s) shows the completion overlay and main continuation action. Crossmath uses original palette, piece treatment, controls and authored fields. Reference motion timing and device feel were not measured.

The two portrait GIFs record the same actual browser input on Crossmath 0.4.0 and 0.5.0. Both reach campaign field 12 from a fresh profile, place the same conflicting numbers, swap them by drag, show the result and tap through to field 13. The recording scrolls in 0.4.0 to reach the next action. Screen captures also cover first move, field 12 conflict and win, and the dense field on a small viewport.

| At normal text size | 0.4.0 | 0.5.0 |
| --- | --- | --- |
| Field 12, Next at 390×844 | Starts at y=908 | Entirely in view |
| Field 25, last tray row at 320×568 | Bottom at y=694 | Bottom at y=489 |
| Fields 1, 12 and 25 at 320×568 and 390×844 | Baseline measured above | Board, tray and main controls fit without scrolling |

- Chromium 141 completed 25 campaign fields with real tap/drag/keyboard interactions. It checked field 12 conflict and atomic swap, durable result and replay with no second reward, dense targets at least 48 CSS pixels, no overlapping number targets, first-move guide cancellation, dark mode and reduced motion. The final touch cannot activate the newly revealed Next button.
- The meta and Endless UI regressions also passed. They include Daily +100, cold result and unlocks, explicit Endless scoring, parked slots, RU/EN and the optional timer.
- All 68 Vitest tests passed. Content verification covered all 240 boards, routes and meta fixtures. The web release audit and Capacitor release sync passed.

## Installable preview

| Item | Value |
| --- | --- |
| APK | `Crossmath_0.5.0_Preview.apk` |
| Source commit | `927c90707b1732fe01f204901d00a1e68eb9d611` |
| Source tree | `1eb962bbed1b4b16789645d2017a109ae52ead59` |
| APK SHA-256 | `6e4b523c37625e5040ffe4d2faa6712fb1c3754efbf3927158c0b8cc3cb0bd18` |
| Package | `com.danilah.crossmath.releasecheck` |
| Certificate SHA-256 | `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0` |

Debug and optimized Gradle builds passed. The exact releaseCheck APK passed signature, 16K alignment, package/version, portrait, debugging flags, release web-payload and storage bridge checks. The retained preview signer and monotonic versionCode allow an in-place update. Installation and migration on an Android device, physical feel, TalkBack and live ads were not exercised.

KIT IMPACT — REUSE. Committed tile/equation feedback and cancelled-gesture treatment use the existing motion owner. Lifecycle and one-shot feedback keep the pinned kit contracts.

## 0.5.1 — continuous board

The field now has one grid surface across numbers, operators and intersections. Inactive coordinates leave the surrounding space open. Movable pieces and recessed sockets remain legible within their squares. The surface is decorative and hit targets are still the semantic button layer.

Chromium verified a square under each active number and operator, aligned centers and touching neighbor edges in both axes on fields 1, 12 and 25 at 320×568 and 390×844. The normal play layout fits without scrolling. All three browser suites and 68 Vitest tests passed. The field 12 recording shows placement, a shared-cell conflict, drag swap and victory.

- APK `Crossmath_0.5.1_Preview.apk`, versionCode 6
- Source commit `2ccb03a297661f79b767621ce60f6bc2b0013568`, source tree `0cd3483caecf4e5c633dbbaa93f43b7b308160c9`
- APK SHA-256 `e977bc3b37601208dc6504efb29b8487718cbc919c413fbb16b45c432b4642bf`
- Preview certificate SHA-256 `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0`

Debug and optimized builds passed. The exact APK passed release inspection. Device runtime remains pending.

KIT IMPACT — NONE. The grid is rendered from Crossmath's existing puzzle coordinates.

## 0.5.2 — tactile field and victory

- The table uses a matte ink-blue surface, warm grid and amber pieces with an enamel edge. The dark setting tones down the grid. The field remains visible on victory, with the ordinary result and continuation docked below it.
- The drag preview scales to the target square and exposes a dashed footprint. A committed landing settles into the cell. A newly correct equation lights along its own axis. An invalid line shows an edge mark and `≠`, keeping shared numbers neutral. Endless follows its existing explicit check. Reduced motion retains the target and equation states.
- The first part of the abacus is labelled `Рамка счётов · 1/4` on the third win. A simultaneous unlock is available in the expanded rewards. The sound setting enables a synthetic 32ms contact click on accepted placements and swaps.

The browser capture plays the fresh campaign through field 25. Field 12 shows the bad vertical equation, touch target and swap, and continuation from the unobscured board. At 320×568 the dense field has 48 CSS px touch targets and fits in the viewport. The actual browser touch probe verified that the ghost fits above the target and that a cancelled drag clears both the ghost and highlight. Field 3, Daily and Endless regressions passed. Three browser suites and all 68 Vitest tests passed. With sound enabled in the browser, an accepted placement passed the expected 32ms non-silent buffer to Web Audio. Physical-phone sound, haptics and runtime remain pending.

- APK `Crossmath_0.5.2_Preview.apk`, versionCode 7
- Source commit `77f9aaf61460928bc96c9920a7c1f3e62d056e60`, source tree `c3fb289f6ae631b91c05dd2a7a7eb87c58becf25`
- APK SHA-256 `55ac742ee231404d5c3b32101db7de7acf35fc464fceced4040c74e185fcccd6`
- Preview certificate SHA-256 `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0`

Debug and optimized Gradle builds passed. The release inspection passed against the exact signed APK and web payload.

KIT IMPACT — REUSE. The existing motion owner drives the landing and line feedback. The existing one-shot player handles the contact sound.
