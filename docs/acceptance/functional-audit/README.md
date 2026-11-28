# Independent functional audit — RC 0.5.27/32 (2026-11-28)

Baseline: PR #4, ed029d6d4662346fbb6526fb789f373bd4d6c035; gameplay baseline 4fb5ff6d60eb718b67ffb3ff22d75cab95dfe5cb. Runtime b1bf2026eda7dd68a5ccbc883946191e03d235af; reference inventory 95f01f566adb07f29100b9fac86f73c8149a2a22, 729 stable IDs. Scope follows v1.1 and #29/#30. Developer branch unchanged. #31 records remediation after #30.

## Findings
| ID | Priority | Evidence | Actual impact |
|---|---|---|---|
| FUNC-01 | P1 | 605-board Reveal probe; compiled RC Chromium | All 90 added public IDs lack Reveal answers; old 515 pass. |
| FUNC-02 | P2 | Actual SaveRepository with two Memory adapters sharing a barrier | Both writers receive fulfilled at revision 1; one change lost. Android occurrence UNKNOWN. |
| FUNC-03 | P2 | Actual SaveRepository, synthetic valid history | 17542 records, 4194473 bytes rejected by 4 MiB limit. Not typical session prevalence. |

### FUNC-01
src/help/reveal.ts imports v09/v2 only. Reproduce cm-own-03-001/020 with sufficient balance: Reveal disabled, Explain enabled. Map exact 90 IDs using docs/acceptance/release29/content-map.json and docs/experiments/content03/author_solutions.json. Preserve independent Explain proof and local replacement/transfer. Acceptance: all 605, empty/wrong/selected/duplicate tokens, correct receipt, unchanged other cells, reload, Relax/Daily UI. Source: guru-hint-answer, easy-hint-author-answer-target, easy-hint-local-replace-return, easy-hint-no-tray-transfer-not-swap; [EasyFun native evidence](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-hint-native-20261127/README.md).

### FUNC-02
src/app/saveRepository.ts and native GameStoragePlugin: per-instance queue + separate read/check/write; individual IO serialization does not guarantee transaction. Barrier forced both to read same revision, sound false/vibration true after both fulfilled. Require atomic CAS + backup or exclusive writer proof, with stale writer conflict and recovery tests. No physical multi-Activity failure claimed.

### FUNC-03
cm-own-02-220, 29 tray tiles; synthetic history from repeated legitimate layouts, not 17542 played gestures. Repository and native cap 4 MiB. Require a safe storage budget and compaction while protecting live boards, Undo semantics, receipts and reward deduplication. No arbitrary history truncation without owner decision. Both storage issues relate to ref-background, not newly discovered source rules.

## Executed independent checks
- [CI 1](https://github.com/DanilaH/crossmath-game/actions/runs/46130398217): Reveal old 240/240+275/275, new 0/90; concurrency; size; actual GameSession/SaveRepository 55 wins, 78 reloads, 20 Daily dates, 3 League weeks, balance 2795, credit exactly once with write faults.
- [CI 2](https://github.com/DanilaH/crossmath-game/actions/runs/46130528669): compiled Chromium RC, script native protocol 3. Reveal disabled on two new IDs despite Explain enabled. Periodic/during-touch menu DOM replacement occurred but real touch activated dialog; no lost-click claim.
- [CI 3](https://github.com/DanilaH/crossmath-game/actions/runs/46130676320): 6 characterization tests pass, re-confirm 3 findings; 605 boards, 12133 applied / 11835 refused actions, 2401 codec roundtrips; full October Daily trophy, 31 archived, 32 dates solved, expired unfinished board resumed, corrupt-primary backup recovered, receipt preserved.
- [Test code](https://github.com/DanilaH/crossmath-game/blob/dcf8598b87b591a65060560b40783545677dfe0f/tests/functional-audit.test.ts), [browser probe](https://github.com/DanilaH/crossmath-game/blob/484d43e5e172a270f6c46f49b8f20be9dc1fd361/tools/functional-audit-browser.mjs).

## Scope and limits
Source reviewed: core/validator, hint logic, session/model, storage/saveRepository, native lifecycle, Java storage, missions/progress/calendar/archive/trophy/career/league, game/board/meta/league/recovery UI, ad adapters and prior suites. No P0 observed in exercised single-session scenarios; not exhaustive. Existing full RC CI on ed029d6 is green, but characterization success means the observed defects were reproduced. Physical Android, real SDK, signer-compatible update, actual sound/vibration and live metrics NOT RUN. #30 remains active. Menu rebuilding is a performance candidate only. No new mechanics, payout changes, release or runtime pin update. Research branch carries documentation/ledger corrections; developer must reconcile them onto current head without overwriting parallel work. No full-port assertion.

## Handoff
[#31](https://github.com/DanilaH/crossmath-game/issues/31). After #30, revalidate latest head, repair all three, turn characterization into asserting regressions, run full game CI and issue signed final-playtest APK. KIT IMPACT: no runtime change; possible general CAS and storage-budget practice after fix acceptance.
