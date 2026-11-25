# Guru Star Race and Brains — consumer mapping 2026-11-25

Source: [exact-build static research](https://github.com/DanilaH/mini-games-kit/blob/b8c511fe944cf5e06f5d6726d6ea03303022d275/research/games/crossmath/porting/guru-star-brains-native-20261125/README.md). Actual product reviewed: Crossmath 0.5.24 / 29, 04576ec2239e840176a1a412c06e82aa7b9253cb, runtime kit b1bf2026eda7dd68a5ccbc883946191e03d235af. No gameplay implementation change.

## Evidence and differences
- Star Race A chooses endpoint min/max (equal bounds fixed), computes elapsed intervals minus collected list length, clamps final delta to target. B reads round/diff intervals, normalizes timestamps and serializes four arrays. 83 ARM64 anchors, 11 literal checks, two exact bundled assets; 192 A split-replay and 4096 B normalization model cases. These models are not original execution and do not prove process death durability or actual RNG.
- Original ended/rank1/target equality and tie-self priority. Separate level/day gates, actual threshold and cap UNKNOWN. Receipt checks claim date and round. DDL lacks unique pair constraint; isolated SQLite permits duplicates; actual duplicate grant not established. Keep wallet + receipt atomic in our implementation.
- Brains nine categories with daily target bands, main/temp tables, self/ongoing update selection, fallback and time-window branch. Three schema-model checks; actual weekly rollover/transfer/timezone, late claims and live settings UNKNOWN.
- Own current source src/app/model.ts settleCompletion; src/meta/career.ts Endless (solo/assisted), src/meta/progress.ts daily receipts. Neither race nor Brains implemented. Original IDs retained as DEFERRED under owner decision for first release.

## Proposed later acceptance (not approved implementation)
After owner selects competitive scope, implement clearly identified simulated opponents with deterministic saved schedule, versioned config and event-id-bound results; reuse own completion event, no imported names/assets or fake real online users. Choose independent clock policy; test expiry, repeated refresh, pause, kill/relaunch, changing time, near ties, old result and repeated claim. Grant exactly once in same atomic transaction as receipt. For Brains first resolve week boundary and migration/late claim; use explicit self/robot and settled state. Pilot Star Race first is researcher recommendation, not owner commitment. No production code, runtime pin, economy or save changes.

380/380 source IDs, 13 added, 8 evidence refinements; ID-set and required-field checks run in connector, not canonical Python validator. No ACCEPTED promotion, original Android/live provider not run. KIT IMPACT: RESEARCH / REUSE.
