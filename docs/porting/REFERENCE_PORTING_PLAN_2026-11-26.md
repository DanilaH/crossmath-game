# Crossmath · поэтапный перенос исследованных механизмов

26.11.2026. [Source audit](https://github.com/DanilaH/mini-games-kit/blob/944f4bb370edf46fb10c6f3b4d5ab0d505d85f23/research/games/crossmath/porting/closure-audit-20261126/README.md) · [current ledger](ADOPTION_LEDGER.json) · [remaining evidence](RESEARCH_CLOSURE_GATES_2026-11-26.md). 605/605 IDs at source 944f4bb370edf46fb10c6f3b4d5ab0d505d85f23, current game 04576ec2239e840176a1a412c06e82aa7b9253cb, 0.5.24/29, runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. Proposed stages only: owner decides scope/order; no global authorization to change economy or enable network/commercial systems. Every ID assigned once to a suggested primary package in PORTING_PACKAGES_2026-11-26.json. Cross-cutting dependencies and prior per-ID nextAction remain authoritative. No owner exclusions inferred. ACCEPTED is accepted current own implementation, not original parity; MATCH/PARTIAL are separate.

## Current facts

- Own 240+275 bank, HELP-02 515/515 (previous independently checked compiled report + developer acceptance, physical Android pending), two core routes and separate Daily/Endless.
- Cooldown pilot developer 158 tests, scripted Chromium and exact signed APK; real SDK/device pending. 180/120/420/30 active seconds and first five wins remain. Owner-deferred rewarded→interstitial fallback remains deferred.
- Own 12 local achievements and five feedback cue types; source new 56 platform descriptions and 11 haptic parameters not an instruction to copy thresholds, platform IDs or exact assets.

## Recommended sequence

### P0 · Регрессия и физическая приёмка реализованного (51 IDs routed)
Developer #4; src/app/session.ts, src/platform/ads.ts, src/ui/board.ts, src/ui/gameUi.ts, src/ui/feedback.ts. HELP-02 515/515 and cooldown pilot already implemented; do not redo. Verify same certificate update, saved state, true phone touch, font/Back and real ad adapter when approved. Acceptance G8.

### P1 · Игровое взаимодействие, обучающие сценарии и feel (84 IDs routed)
src/core/engine.ts, src/help/logic.ts, src/ui/board.ts, src/ui/gameUi.ts, src/ui/feedback.ts. Start with approved visual direction, capture actual source and own before/action/after, use own semantic feedback cues; tests for wrong drop, undo, toggle, no repeated payout, phone timing. Preserve 515/515.

### P2 · Выдача, баланс и контент (45 IDs routed)
src/content/catalog.ts, src/content/rotation.ts, src/content/validator.ts, src/meta/dailyArchive.ts. First finish remaining solver/issuer proof and new policy spec; immutable/versioned bank, explicit difficulty, empty query safe fallback, no silently remapped saved assignments. Test all boards, first 15 and full route/cursor distribution.

### P3 · Мета, экономика, календарь и долгосрочные цели (113 IDs routed)
src/meta/progress.ts, src/meta/career.ts, src/meta/missions.ts, src/meta/workshopProgress.ts, src/meta/monthlyTrophy.ts, src/app/model.ts. Separate persistent local achievements and wallet; owner selects targets and new rewards; test leap dates/old dates, unique events, concurrent claims/restarts, no duplicated resource; no copied thresholds by default.

### P4 · Реклама, магазин и покупки (122 IDs routed)
src/platform/adState.ts, src/platform/ads.ts, src/platform/androidAds.ts, src/app/session.ts. Keep 180/120/420/30 and first five wins, earned atomic settlement. Current fallback owner-deferred. New placements/IAP/offers require separate approved policy, provider tests, restore/refund/noads late callback. Don't treat named template as active.

### P5 · Endless, соревнования, события, коллекционные режимы (93 IDs routed)
src/meta/career.ts, src/meta/missions.ts, src/app/model.ts. Separate local and actual network competition, versioned rules, bot/clock tests, offline/expiry/claim idempotency; owner chooses sequence; no pretending real PvP.

### P6 · Аналитика, платформенные службы и live config (97 IDs routed)
src/meta/career.ts, src/app/nativeLifecycle.ts, src/platform/ads.ts. Owner-approved typed event schema, consent/data policy and provider selection; exact ID queue acknowledgment, clock bounds, explicit config exposure and safe defaults; cloud/notifications/SDK integration and user metrics separate.

## Coverage and acceptance

Status: IMPLEMENTED_UNVERIFIED=34, ACCEPTED=17, ROADMAPPED=5, RESEARCHED=207, EVIDENCE_GAP=44, DEFERRED=298. Comparison: MATCH=27, PARTIAL=90, MISSING=451, UNKNOWN=37. These are counts of heterogeneous evidence rules, not percent of product completion. No status promoted. Implementation packages are a dependency-first recommendation; before coding select explicit IDs/owner decisions, inspect current diff, confirm source evidence and actual own code, then independent tests/acceptance. Keep all deferred/commercial IDs. Source research staging never changes runtime.

G1 whole-catalog native solver and remaining accessible static traces still open; physical, provider, live and oracle gates remain external. Do not claim research exhausted or port complete. KIT IMPACT RESEARCH / CANDIDATE, runtime NONE.
