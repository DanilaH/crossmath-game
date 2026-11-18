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

`npm run check`: 31 tests / 6 files PASS, typecheck/build PASS. Preview-signing safety Python suite: 4 tests PASS. Original package checks: 240 boards, 84 route/mission fixtures, 32 meta-model checks PASS. The latter are reference data/model evidence, not completed D/E client features.

Browser protocol and own screenshots are under `docs/evidence/vertical-slice/`; rerun output is `.test-output/ui/`. No competitor APK runtime or physical human feel is claimed. Large Phaser bundle follows the pinned host; the minifier's chunk-size warning is informational and not a measured frame-time failure.

## Native artifact

| Field | Verified value |
| --- | --- |
| File | `Crossmath_0.1.0_A-C_preview.apk` |
| Version | 0.1.0 / versionCode 1 |
| Package | `com.danilah.crossmath.releasecheck` |
| Gameplay source | `482df3edfc08b1ba0aa79a750ea49aed9e9d689f` |
| Source tree | `2eeb9147de7285d59ceedce51db9134d3fe59ae2` |
| SHA-256 | `92d37d7b4e0b2c71c0555fc1f9eeedd224f7e83f043d8034cd2dc8710942bed8` |
| Size | 1,198,157 bytes |
| Build | Real JDK 21.0.13+9 / Gradle 8.14.3 / AGP 8.13.0; debug and R8 releaseCheck successful |
| Inspection | Android build-tools 36.0.0 apksigner/zipalign/aapt/dexdump; v2 signature, 16K alignment, package/version/portrait, non-debuggable, WebView debugging disabled, exact release web payload, GameStorage bridge/methods retained |
| Preview certificate | `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0` |
| Native runtime | NOT RUN: device installation, process restoration, TalkBack, physical haptics/feel and OS font pending |

Machine report: `evidence/vertical-slice/apk-verification.json`. Retained preview key remains private and separate; production signer is unset. No live SDK or store submission is implied.

CI: [run 44363219493](https://github.com/DanilaH/crossmath-game/actions/runs/44363219493) stopped at missing `KIT_READ_TOKEN`, before client tests. Configure read-only Contents access to the exact private kit. Local native build and listed local checks completed independently of that CI setup failure.
