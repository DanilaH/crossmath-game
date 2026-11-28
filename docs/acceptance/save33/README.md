# FINAL-SAVE-01 #33 · Crossmath 0.5.31 / 36

Narrow persistence fix over delivered 0.5.30/35, PR #4 HEAD `34adfa1d1a051bd8eab653061f62871e7881faaa`. Runtime remains `b1bf2026eda7dd68a5ccbc883946191e03d235af`. Routes: storage/receipt coordination and the existing consumer CAS boundary. The pinned kit API and RevisionSnapshotQueue contract were inspected; that queue explicitly does not arbitrate independent writers/recovery and is not a replacement for this host transaction. No kit change.

## Independent reproduction

[Issue #33](https://github.com/DanilaH/crossmath-game/issues/33), [research test at 7ccb0b1](https://github.com/DanilaH/crossmath-game/blob/7ccb0b165dc6a16d9ac51046c2d5bf669837f3c7/tests/final-rc-audit.test.ts), [independent project CI](https://github.com/DanilaH/crossmath-game/actions/runs/46162139035).

The original test was executed against the unchanged 0.5.30 source before applying the fix. A reaches revision 2; a second writer recovers backup revision 1 after injected primary corruption and confirms language=en at revision 2. A then overwrites the setting with its stale language=ru and both writes are acknowledged. `before-recovery-aba.json` is the observed output, not a hypothetical trace. Promoting the final-language check to an assertion fails on the old code. This is actual GameSession/SaveRepository plus injected storage corruption, not a physical Android incident or a frequency estimate.

## Correction

`SaveRepository.load()` and successful `commit()` return a validated Save object bound to the **exact durable root it observed/published**, revision, profile and storage adapter identity. This non-serializable capability is held in a WeakMap, outside the save schema. `GameSession.persist()` supplies its own current base object. A later load, another session or backup recovery cannot rebind that older session's capability.

The internal commit API is deliberately `commit(base, next)`, with no numeric-only fallback and no implicit fresh load. A clone/unobserved object or another storage's base is rejected. The caller retains the base while preparing a new complete snapshot. Revision/profile/increment validation remains; the durable primary must also equal the caller's observed root **before** staging any pages/backup/cleanup. The host CAS fences that same root across all remaining publication work. After a conflict, explicitly reload and reapply the intent to the authoritative state; stale full snapshots are never merged over confirmed changes.

No generation field, envelope, schema bump or numeric-revision inflation is added. Schema 4, old flat schemas, current paged manifests, compression, page size/4MiB limits, quarantine, last-good backup, collection, rollback, lost-ACK reconciliation and financial receipts retain their established contracts. Exact-byte root equality is sufficient: if a root is restored byte-identically, its logical base is identical too. It cannot hide the differently acknowledged English-setting root from the reproduction.

The capability is local to a running caller; every cold launch obtains a new one from load. Weak keys do not retain dead Save objects. Returned successful snapshots receive their new exact-root capability even after a reconciled lost ACK. A failed pre-root write retains the old caller base; retry remains possible if that primary has not changed. An uncertain different root still requires recovery exactly as before.

## Asserting tests and full regression

- `tests/final-rc-audit.test.ts` retains the independent corpus/prefix/selected Reveal/wrong-placement/Explain and every page-publication fault boundary. Only the internal commit API is adapted; the ABA characterization becomes a strict SaveConflict + preserved language/revision assertion and a reload/retry assertion. Local full-corpus result: 605 unique, 605 selected Reveal, 605 independently verified Explain, 593 wrong-prefix repairs, zero unexpected results.
- `tests/save-recovery.test.ts`: flat/paged roots, damaged primary bytes/page, separate/shared repository sessions, recycled revision 2, no stale-write side effects, reload/retry/cold restore; clones and foreign storage cannot forge a base. Before-root failure and lost ACK keep the exact base. Real help and rewarded commands retain one debit and one grant through failure, ACK loss, replay and restart.
- `tools/save33-browser.mjs`: four real Web Locks/localStorage cases, flat/paged × separate tabs/shared repository. The live old session conflicts after recovery/reused revision; confirmed state and chips/wallet remain, explicit retry and cold restoration preserve both settings. This is source-module/browser evidence, not Android native installation.
- Existing direct repository tests/probes pass the actual observed base instead of a number. Their financial, concurrency, failure, Undo/ID, history and geometry assertions are retained. Native transaction code and all native tests are unchanged.
- The project's full `.github/workflows/ci.yml` adds both independent/narrow unit suites and the four browser cases, retaining all #30–32/content/League/META/ads/FEEL suites. Reports are retained in `.test-output/final-audit` and `.test-output/save33` within the normal CI artifact.
- Historical executable upgrades add the exact public web payload of the delivered 0.5.30/35 APK and unchanged old source `34adfa1`. All earlier baselines remain. The fixture has no player state/key/SDK. See `tests/fixtures/PLAYTEST_WEB.md`. Actual native APK installation/update remains separate.

Final per-commit CI results, APK SHA/certificate/payload comparison and artifacts are recorded in PR #4 and the delivery report. A green characterization alone is not acceptance; the new assertions must pass.

## Scope and delivery

All UI/assets/styles/fonts/gestures, 605 boards/answers/solver, difficulty/issuance, balance/economy, rewards and advertising rules remain unchanged from 0.5.30. The session diff is only the commit argument. Payouts/League prizes/win-bonus activation remain unchanged. No new mechanisms, art work, SDK, publication or runtime update.

Deliver exactly one optimized `com.danilah.crossmath.releasecheck` APK, 0.5.31/versionCode 36, using the preserved playtest certificate `5f4432685e6ae74b9777454c1606828dbc1a5aee385662c296ef719ebc44ad22`. Re-sign the exact green project-CI payload; independently compare all non-signature entries and verify the final APK. Never generate a replacement key implicitly. Earlier installations with different certificates retain their separate old-key gate; do not uninstall or delete data. Physical Android install/update/insets/audio/haptics are NOT RUN without a device, and live SDK remains unconfigured.

Source mapping: consumer save infrastructure under `ref-background`; original/device parity remains UNKNOWN. Existing 729 reference IDs/statuses remain, with an infrastructure acceptance annotation only.

KIT IMPACT: **CANDIDATE** — exact observed-base ownership and backup/recycled-revision tests for a future CAS/recovery contract. One consumer; no shared-runtime defect or extraction asserted. No runtime change.
