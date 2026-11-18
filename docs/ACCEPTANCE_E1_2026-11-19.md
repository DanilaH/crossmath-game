# E1 acceptance — 19 November 2026

Offline Endless/profile/achievements, version 0.3.0 / versionCode 3 / save schema 3. Content/config/kit pins unchanged. This is the offline portion of E; RU/EN and platform service adapters/callbacks remain E2. No claim that the full E/F gate is accepted.

| Scenario | Evidence | Result |
| --- | --- | --- |
| Unlock 14→15 | Fresh browser campaign through first15, disabled/enabled mode button; unit lock and separate slot | PASS in tested layers |
| Neutral before Submit | Full correct and wrong real UI layouts: no green/red/checkmarks; full correct remains Playing until explicit Submit; help does not autosubmit | PASS |
| Error/life semantics | Incomplete and unchanged wrong submits free; Undo restores arrangement without refund; distinct changed wrong submissions reach zero; next stage carries remaining lives | PASS |
| Run/stage score and dedupe | Pure commands through 225 stages plus stage226 wrap, score formula by actual difficulty, compact sequential stage receipt prefix; repeat canonical base=0 but new stage score>0 | PASS |
| Atomic interrupted completion | Before-write failure and after-write lost acknowledgement for Submit; score, canonical reward, statistics, achievement/result stay coherent; cold browser result unchanged | PASS in model/browser; phone kill pending |
| Resume/modes | UI parks stage2 with a physical token, opens campaign, restores exact attempt/placement/lives; unit rejects run/parked-slot divergence | PASS |
| Assistance/records | Explicit reveal taints whole run, later stages inherit it; end/new-run finalization saves solo/assisted to separate versioned records; repeated help operation counts once | PASS |
| Achievement run3 | Three different stages in one run earn once; separate runs never sum; original receipt survives later runs/reloads | PASS (M11 offline part) |
| Legacy schema 1/2 | Existing migration retained; schema2→3 preserves wallet/placements/meta, derives provable badges, starts explicitly partial detailed statistics without fictitious attempts/errors/time | PASS |
| Profile/geometry | Per-mode starts/completions/active seconds/errors/undos/help/restarts; lifetime unique counts separately; twelve badges; four viewports >=48 CSS px, no horizontal overflow | PASS browser; OS/TalkBack pending |
| Critical Submit | Fixed bottom primary action is visible before auto-scroll at 320×568, 360×640, 390×844, 800×1280; reserve avoids losing access to lower tools/tray; native insets remain single-owner | PASS browser |

58 Vitest tests / 8 files, typecheck, normal/release web audits, supplied Python content/routes/meta checks and release sync. `npm run test:browser` runs A–C first25, D, then E1 with real input from a clean profile. Screenshot/report output is under `.test-output/endless-ui/`, retained evidence under `evidence/endless-e1/`. No imported progress profile is used in E1 browser unlock/play scenario. The full 225+1 route is an engine/session integration, not 226 browser-played fields.

Records are finalized only on explicit end/replacement, retaining a failed run until that choice; this avoids incorrectly preserving solo records if a run later uses a continuation/help. E1 has no provider, continuation video or fake reward control.

## Artifact

Source/SHA/certificate/inspection record follows after the native build. Same retained preview signer/package, versionCode3 and schema3 are required for compatibility with prior previews. A real in-place phone update has not been executed.

Native runtime, process kill, haptics/feel, silent mode, TalkBack and 200% OS font remain NOT RUN. CI needs `KIT_READ_TOKEN` for the private pinned kit. Real ads/analytics/reminders/store submission are not part of this artifact.

KIT IMPACT: **REUSE**, existing atomic repository/activity/DOM controls, unchanged pin. Run/scoring/achievement/statistics policy is local; no upstream extraction warranted.
