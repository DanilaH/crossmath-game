# Crossmath status

## Current development preview · 21 November 2026

`feat/mode-unlocks-0.5.10` / PR #4 carries 0.5.16 (versionCode 21). The post-0.5.13 packages cover campaign result routing, Daily archive and help, unsolved Relax/Challenge assignments, and the three-Easy-board Relax goal. [Package acceptance](acceptance/PACKAGES_ABC_0516.md) · [Reference adoption ledger](porting/ADOPTION_LEDGER.json).

The preview APKs share the `com.danilah.crossmath.themecheck` identity and 0.5.13 preview certificate. Physical-device update, Android system text scaling and native resume remain open. The dated trophy and local duel are separate release packages.

Earlier baseline, 19 November 2026: `main`, `feat/vertical-slice-20261118` and PR #1. Version 0.4.0 / versionCode 4 / schema 4. E2 adds RU/EN and the optional Android ads bridge, verified with a scripted provider. Real SDK acceptance remains open.

0.5.3 preview adds a home screen with one continuation action, direct Daily and workshop entry, and a separate modes dialog. See [preview acceptance](ACCEPTANCE_PLAY_SCREEN_2026-11-19.md) for the exact APK and verification on `feat/play-screen-0.5`.

## Implemented

- A–C: immutable 240-board bank, independent solver, physical-token commands, semantic board and drag/tap/keyboard, explain/proof verification and isolated reveal, atomic saves, rank/base/card rewards, 15 lessons and full campaign continuation.
- D: home with saved-game priority, unlocked Free difficulty selector, unsolved-first pools, independent campaign/Free/dated slots and explicit replacement confirmation.
- Fixed-zone Daily calendar: today/previous 30 days since profile creation, pinned date assignments, started/completed/future/zero-life states, three lives, free restart and completion of old unfinished dates.
- Three reachable daily missions with joint <=3 distinct-ID witness, campaign prerequisites, minimal fallback, partial/paid sibling preservation, active issuance rotation and monotonic effective date. Endless is included after unlock with actual stage prerequisites.
- Atomic base/date/mission/set/rank/card receipts and result breakdown. Fifth victory issues missions without retroactive credit. Migration from schema 1 to 2 preserves placements, settings, wallet and earned collection; historical full cards are grandfathered.
- Rank detail and twelve-tool album with four real SVG layers per card, next-detail progress, completed album retained after win 228. Reward event priority and original saved result survive switching modes.

- E1: explicit-submit Endless after 15 wins, 225-field circular route, shared three lives, exact run/stage persistence, atomic stage score, confirmed new run, separate versioned solo/assisted records.
- E1: profile statistics by mode and twelve permanent achievements. Legacy detailed history is labelled partial rather than invented; confirmed lifetime unique wins/rank/cards/dates remain.

- E2: persistent RU/EN and optional timer in Campaign/Free Play. Localized gameplay, help, result, calendar, album, profile, settings and accessibility labels.
- E2: durable rewarded credit and exact-attempt/run continuation, impression-based interstitial cadence, optional native banner visibility and offline fallback.

## Verified locally

- 68 Vitest tests / 9 files; independent full-bank solving and 240-win reward integration, including 228/229; durable writes/recovery and help proofs; D includes 84 actual-bank mission/profile fixtures, +100, old dated completion, fixed zones/leap days/missed days/rollback, mode slots and migration.
- Real Chromium 141 UI: first 25 campaign fields plus fresh-profile D scenario through unlocks 3/5, +100 Daily, cold result restore, first complete abacus and part inspection at eight distinct wins. Complete album 228/229 is an explicitly seeded display fixture, not 228 UI-played wins.
- Dense board and album: 320×568, 360×640, 390×844, 800×1280; 48 CSS px controls, no page horizontal overflow. Applied own paper/ink/teal style, wrapped long instrument names. Evidence under `docs/evidence/` and `evidence/meta-d/`.
- Typecheck, normal/release web audit and Capacitor release sync; supplied Python content/routes/meta reference checks; four Python preview-signing safety tests; exact pinned guidance doctor.

- E1 browser: fresh campaign 1–15, neutral full board before Submit, wrong/duplicate/undo/lives, parked mode restore, explicit reveal, run3 badge, separate records and free restart at zero. Full route 225 + first wrapped stage is covered by actual engine/session commands in tests.

- E2: scripted ad cancellations, delayed/duplicate callbacks, failed writes and acknowledgement recovery, scoped continuation, cadence and stalled pre-show. Chromium switches RU→EN→RU and checks cold settings persistence.

## Acceptance and remaining work

0.4.0 debug and R8 releaseCheck built successfully. Exact APK passed official signature/alignment/package/version/portrait/debugging/web-payload/bridge inspection. The exact artifact hash and source are in `ACCEPTANCE_E2_2026-11-19.md`. Same retained private preview signer, package and increased versionCode support an in-place preview update; actual device installation/migration is pending.

Native runtime, process kill, physical responsiveness/haptics, TalkBack, 200% OS font and live platform callbacks remain unaccepted. Browser checks and APK inspection do not establish those results.

GitHub CI remains blocked by missing `KIT_READ_TOKEN` (read-only Contents access to `DanilaH/mini-games-kit`); observed gameplay-source run 44476862913 stopped at the private-kit access requirement before tests/build. Local success is independent of CI.

Latest scope and acceptance: `ACCEPTANCE_E2_2026-11-19.md`. Remaining release work is the chosen live SDK and its placements, device/accessibility/offline checks, production signing and store acceptance. Production signer remains unset; no live SDK, reminders or store submission is claimed.

## 0.5.4 — R1, U1 and U2

[Measured level bank and issuance](spec/product/content_v2/README.md). Fresh Campaign, Relax, Challenge and unassigned Daily use the new original fields. Existing saved boards keep their IDs and geometry. U1 localizes Free replacement and restores focus to the originating button. U2 reports the affected equation with its axis, including when two equations have errors. [R2 APK evidence](spec/R2_APK_BALANCE_RU.md) records the competition numbers and trace, prior to implementing event modes.

[Exact APK and acceptance for 0.5.4](ACCEPTANCE_R1_2026-11-19.md).
