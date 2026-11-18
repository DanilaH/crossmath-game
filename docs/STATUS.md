# Crossmath status — 18 November 2026

Working branch: `feat/vertical-slice-20261118`. Initial main: `da24cca076cd78bc896ae5f7527fc20d5537ba93` (repository was empty before onboarding).

## Implemented

- Exact kit Android host, portrait, native AtomicFile storage/Back/lifecycle/inset and optimized-release checks.
- Entire immutable 240-board campaign and supplied routes/config imported. Client-side schema/geometry checks and an independent solver count solutions up to two, without author answers.
- Deterministic place/replace/move/swap/return/undo/stable-sort. Separate physical tokens, expected revision and duplicate-command guard. Ordinary mode never locks a correct row. Pure Daily/Endless command rules are regression-tested extension points, not shipped selectable modes.
- Semantic gameplay UI based on own v0.10 sample. Both tap orders, keyboard, drag, cancel/miss return, both linked equations, expression errors, pause/restart, sound/vibration toggles, light/dark and reduced motion.
- Schema-1 atomic whole-save transaction for attempt, wallet, progress, completion and help receipts; last-good backup, corruption quarantine, strict load, ambiguous-write readback and conflict errors. Cold start preserves user pause. Active-time checkpoints use monotonic time and exclude blockers.
- Bounded explain service without author answers; independent proof support/inventory checks; separate explicit reveal. Verified full logical completion of 240 boards / 1,422 assignments. One debit per operation, including multi-cell plans; zero-cost refusal receipts are persistent too.
- All first 15 lessons and sequential continuation through the full bank. Completion applies base XP/coins, rank carry and collection counters once; UI for the full meta is deferred.

## Verified

- 31 Vitest tests in 6 files; independent bank, seeded mixed commands, whole-campaign 240-win reward integration, proof corruption and interrupted-write cases.
- Actual Chromium 141 scripted UI: first 25 fields, field 7 duplicate swap/undo/cold restore, field 10 paid explanation and undo, field 12 contradiction plus tap/drag correction and replay reward zero.
- Dense 11×11: 320×568, 360×640, 390×844, 800×1280. Numeric targets 48 CSS px; no target overlap or page horizontal overflow. Own reference's intrinsic-width shrink was corrected and regressed on simple boards.
- Typecheck, normal/release web build, release-marker audit, Capacitor release sync. Supplied Python content/routes/meta checks: 240 / 84 / 32 PASS. Guidance doctor checks exact runtime/guidance pin.

## Remaining acceptance / next stage

Native APK build and exact-artifact report are recorded in the acceptance document once complete. Browser results do not prove Android native storage/process kill, physical responsiveness/haptics/silent mode, TalkBack, true 200% OS font or live advertising.

Stages D–F remain: Free/Daily selectors, dated archive and reachable quests, album/rank/profile/achievement screens, Endless runs/records, full RU/EN, real platform adapters, physical phone and store release acceptance. No live SDK, reminders, production signer or store submission is claimed. D starts from this retained schema and delivered content/config, not another research scope.
