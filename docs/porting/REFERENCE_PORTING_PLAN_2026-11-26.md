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


## 26.11.2026 · Первые пакеты переноса

- [FEEL-01 / #13](https://github.com/DanilaH/crossmath-game/issues/13) — 15 source IDs переведены в ROADMAPPED; текущие посадка, решение и победный звук уже имеют функциональные аналоги: три MISSING исправлены на PARTIAL после чтения кода 0.5.24, не новая реализация. Count-up Endless входит в этот UI-пакет без изменения правил P5.
- [WIN-RV-01 / #14](https://github.com/DanilaH/crossmath-game/issues/14) — проект добровольного бонуса победы, параметры и live policy к отдельному согласованию; статусы не повышены. HELP-02 и cooldown не повторять.

Текущие counts: IMPLEMENTED_UNVERIFIED=34, ACCEPTED=17, ROADMAPPED=20, RESEARCHED=204, EVIDENCE_GAP=44, DEFERRED=286; MATCH=27, PARTIAL=93, MISSING=448, UNKNOWN=37. 605/605 ID, runtime и продуктовый код неизменны. Проверка статическая; физическая приёмка открыта. KIT IMPACT REUSE / CANDIDATE.


## 26.11.2026 · META-01 — проект долгосрочной прогрессии

[Задача #15](https://github.com/DanilaH/crossmath-game/issues/15) · [модель](progression-pilot-20261126/MEASUREMENTS.json). Фактическая 0.5.24/29: кампания 240 полей, rank17+150; объединение настроенных маршрутов 515 ID, теоретический максимум rank32+75; мастерская завершена при 228. Кандидат: 15 XP только за впервые закрытую дату Daily с ранее решённым ID (не за произвольный replay), сохранение ранговой кривой и текущих выплат, 6 визуальных семейств, 45 новых локальных достижений (57 всего), 6 новых приборов/24 части (72 всего) на 233–348. Модель проверена на pinned content, не в runtime. Порог, баланс, catch-up и арт требуют утверждения; P5/коммерческие/платформенные deferred IDs сохраняются. 36 исходных ID связаны с предложением, без изменения сравнений/статусов. HELP-02 и cooldown не затронуты. KIT IMPACT REUSE/CANDIDATE.


## 26.11.2026 · Выдача и разнообразие, два пилота

[ISSUE-01 #16](https://github.com/DanilaH/crossmath-game/issues/16) — six-step route остаётся; внутри bucket global unsolved-first, минимальный issued count, мягкий приоритет D4-формы вне последних трёх, стабильный pin при новом track/index. Модель 10 800 позиций: свежий Relax min repeat gap3→117, Challenge2→102; после 60 campaign первых 120 позиций Relax 75→120 уникальных ID. Candidate3 во всех 18 проверенных completion-only сценариях не имеет gap≤50, но это не гарантия живых смешанных сессий. Окно 6 отдельно исследовано, не выбрано. Смена политики/сейва требует согласования.

[CONTENT-03 #17](https://github.com/DanilaH/crossmath-game/issues/17) — offline generator lab: 275 собственных задач, 56 D4 форм, 274 D4+mask; Easy Short 27/40 одна форма. Полная модель geometry graph 7×7 с 8 уравнениями: 132 anchored sets, 3 D4 класса; 9×9 sample 10 000: 7853 geometry successes, ≥417 D4 классов, не числовые головоломки. Кандидат 40 Easy Short с 9×9 и прежними eq/hole/cap; только после независимого solver/Explain и device проверки рассматривать новый банк, потом Daily extension/operation/mask experiments. No existing ID changes. [Model](issuance-pilot-20261126/MEASUREMENTS.json) · [Geometry](issuance-pilot-20261126/GEOMETRY_CAPACITY.json).

24 source IDs связаны с предложениями, статусы и сравнения не повышены. G1, original stuck, live config и actual player difficulty остаются UNKNOWN. KIT IMPACT RESEARCH/CANDIDATE; runtime NONE.
