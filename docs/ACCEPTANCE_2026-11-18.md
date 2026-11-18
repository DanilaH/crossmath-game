# Vertical slice acceptance — 18 November 2026

Source: owner specification 1.0, 240-board `content-v1`, `cm-integer-1`, balance `crossmath-prototype-0.8`, save schema 1, kit `469928d03f4bae5053e23db26e82187bedbc252e`.

| Scenario | Actual evidence | Status |
| --- | --- | --- |
| P01 physical duplicates / one command / undo | Engine tests across full bank + actual field-7 browser swap/undo/reload | PASS in tested layers |
| P02 independent import/uniqueness | TS independent search for all 240 + malformed/ambiguous/unsolvable/budget fixtures; Python original validator | PASS |
| P03 field-12 correction | Actual valid row / invalid column, one tap swap and one drag swap; pure Endless submission tests | PASS for slice; Endless UI deferred |
| P04 one reward / durable result | Atomic session tests before-write failure, after-write ack failure, ambiguous read lock and reload; all 240 reward milestones; UI cold result/replay | PASS in model/browser; native process kill pending |
| P05 help / HC scope | Independent support verification, false premise, duplicates, multi-cell allocation, stale/zero-cost/refusal/repeated payment, full 1,422 assignments | PASS implemented logic; EN explanation presentation and native interruptions pending |
| P06 save/time/lifecycle | Strict root codec/backup/quarantine/conflict tests; inherited native listener lifecycle tests; browser cold restore/pause; monotonic UI clock | PARTIAL: phone background/process kill/timezone behavior not accepted |
| P07 geometry/accessibility | Actual dense UI at four sizes; disjoint 48 CSS px targets; dark/reduced settings; scripted DOM 200% font frame | PARTIAL: physical dp, TalkBack and OS font pending |
| D–F / M01–M12 / P08–P10 | Initial reward counters only; no full modes/meta/live SDK/publication | DEFERRED |

`npm run check`: 31 tests / 6 files PASS, typecheck/build PASS. Original package checks: 240 boards, 84 route/mission fixtures, 32 meta-model checks PASS. The latter are reference data/model evidence, not completed D/E client features.

Browser protocol and own screenshots are under `docs/evidence/vertical-slice/`; rerun output is `.test-output/ui/`. No competitor APK runtime or physical human feel is claimed. Large Phaser bundle follows the pinned host; the minifier's chunk-size warning is informational and not a measured frame-time failure.

## Native artifact

Build/verification record is added after the exact test APK is produced. No production signer, SDK integration or store approval is implied by compiling a test package.
