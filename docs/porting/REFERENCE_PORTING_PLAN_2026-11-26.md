# Crossmath · поэтапный перенос исследованных механизмов

26.11.2026. [Source audit](https://github.com/DanilaH/mini-games-kit/blob/944f4bb370edf46fb10c6f3b4d5ab0d505d85f23/research/games/crossmath/porting/closure-audit-20261126/README.md) · [current ledger](ADOPTION_LEDGER.json) · [remaining evidence](RESEARCH_CLOSURE_GATES_2026-11-26.md). 605/605 IDs at source 944f4bb370edf46fb10c6f3b4d5ab0d505d85f23, current game 57820c8c6491c8b6240aeed5cb0dfde61c858927, 0.5.24/29, runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. Proposed stages only: owner decides scope/order; no global authorization to change economy or enable network/commercial systems. Every ID assigned once to a suggested primary package in PORTING_PACKAGES_2026-11-26.json. Cross-cutting dependencies and prior per-ID nextAction remain authoritative. No owner exclusions inferred. ACCEPTED is accepted current own implementation, not original parity; MATCH/PARTIAL are separate.

## Current facts

- Own 240+275 bank, HELP-02 515/515 (previous independently checked compiled report + developer acceptance, physical Android pending), two core routes and separate Daily/Endless.
- Cooldown pilot developer 158 tests, scripted Chromium and exact signed APK; real SDK/device pending. 180/120/420/30 active seconds and first five wins remain. Owner-deferred rewarded→interstitial fallback remains deferred.
- Own 12 local achievements and nine feedback cue types after FEEL-01; source new 56 platform descriptions and 11 haptic parameters not an instruction to copy thresholds, platform IDs or exact assets.

## Recommended sequence

### P0 · Регрессия и физическая приёмка реализованного (51 IDs routed)
Developer #4; src/app/session.ts, src/platform/ads.ts, src/ui/board.ts, src/ui/gameUi.ts, src/ui/feedback.ts. HELP-02 515/515, cooldown pilot and FEEL-01 already implemented; do not redo. FEEL-01 developer 169 tests/Chromium/APK; changed test signer must be reconciled before in-place upgrade. Verify same certificate update, saved state, true phone touch, font/Back and real ad adapter when approved. Acceptance G8.

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


## 26.11.2026 · FEEL-01 фактическая реализация и следующие пилоты

[FEEL-01 приёмка](../acceptance/feel-01.md), gameplay a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21 / actual HEAD 57820c8c6491c8b6240aeed5cb0dfde61c858927. 15 source IDs обновлены IMPLEMENTED_UNVERIFIED/PARTIAL по diff и отчёту разработчика (169 тестов, Chromium, signed APK). Независимый повтор тестов/телефон не выполнен; новый тестовый сертификат отличается от предыдущего APK. Не удалять старую игру/сейв ради установки. Сохранены две более ранние корректировки guru-ad-protect и guru-issuance-operation-ratio-denominator, не принимать их регресс из копии developer ledger. Текущие counts: IMPLEMENTED_UNVERIFIED=49, ACCEPTED=17, ROADMAPPED=5, RESEARCHED=204, EVIDENCE_GAP=44, DEFERRED=286; MATCH=27, PARTIAL=105, MISSING=436, UNKNOWN=37. 605/605.

- [DAILY-02 #18](https://github.com/DanilaH/crossmath-game/issues/18): первые 7 групп оставить, добавить 9, после 16 повторять 8..16; current 7 groups/6 unique; all 50 Daily boards close first group in one. 1440 fresh-set witness models across 90 v2 snapshots, ≤3 after fallback. No budget change: 60 for full set, 30 for date. Actual session/old and mixed saves pending.
- [RETURN-01 #19](https://github.com/DanilaH/crossmath-game/issues/19): separate current-day streak and best, no retroactive archive credit, explicit opt-in approximate-time Android reminder, reuse existing kit recipe. No permission, SDK or payout activation without owner decision.
- [EVENT-01 #20](https://github.com/DanilaH/crossmath-game/issues/20): optional 7 profile-day postcard, 3/6/9/12 distinct wins milestones, cosmetic only; 2560 synthetic expiry/receipt controls. 15-win variant rejected as unreachable at two/day. Preserve earned parts after expiry. Outside initial scope pending owner approval.

[Daily model](daily-return-pilot-20261126/MEASUREMENTS.json) · [event model](daily-return-pilot-20261126/EVENT_POLICY.json). 30 IDs linked without promotion or source coverage change. Runtime NONE. KIT IMPACT REUSE/CANDIDATE.


## 26.11.2026 · Соревнования — поэтапные предложения после initial release

- [RACE-01 #21](https://github.com/DanilaH/crossmath-game/issues/21): donor weights 1/2/4/6, target10 даёт 7–8 Relax vs2–3 Challenge; candidate targets4/12 =3 consecutive distinct fields across six phases. Source B interval sums320/660 s, not measured human duration. Explicitly labelled offline computer plans, absolute active clock+sequence (not wall time), one race receipt. Cosmetic first, separate optional +20 coins/day-start key only upon approval. Donor five-win pack 440 coins+7 hints ≈14.33 own hint equivalents, not default. Existing ad placement/cooldown unchanged; no new race-specific ad.
- [BRAINS-01 #22](https://github.com/DanilaH/crossmath-game/issues/22): later weekly candidate 3/full-set date +2/first-race-win date, max35; explicit computer profiles with saved schedule, no hat wallet or fake online rankings. Source ordinary max-exclusive ranges and actual source prize/period gaps preserved.
- [BATTLE-01 #23](https://github.com/DanilaH/crossmath-game/issues/23): refines existing M3 (not new competing specification). Formula applied to own bank: bot6 Easy Short28–32s, Hard36–40s, Expert64.5–75.5s, Hell103–114s; no human timing claim. Free fixed-plan lab → separately approved reactive behavior → ticket/streak/progression/commerce. Source time/interrupt/internal unit/live SDK gates remain.

[Model](competition-pilot-20261126/MEASUREMENTS.json) · [absolute clock controls](competition-pilot-20261126/CLOCK_POLICY.json). 50 unique source IDs linked, all 605 retained, statuses/comparisons unchanged. No new product runtime, balance, art or owner scope approval. Physical G8/signature and source G1 etc remain open. KIT IMPACT REUSE/CANDIDATE.

## 26.11.2026 · Коммерческий пакет P4 — staged proposals

- [STORE-RV-01 #24](https://github.com/DanilaH/crossmath-game/issues/24): одна общая семантика существующего hint credit, без отдельной щедрой выдачи из нового UI. Optional coin lab 10 once/day candidate only; own help=60, donor store10 and 1 hint are not equivalent. Pending/late/duplicate reserve & receipt with day-bound semantic key.
- [NOADS-01 #25](https://github.com/DanilaH/crossmath-game/issues/25): candidate one non-consumable suppresses forced ads, voluntary RV separate (own policy); native late banner load guard, restore/refund and trusted receipt. Guru Premium mapping UNKNOWN.
- [IAP-01 #26](https://github.com/DanilaH/crossmath-game/issues/26): later resource store, separate consumable/entitlement semantics and platform gates; no price, purchase, SKU, new balance or release SDK approval. Battle tickets tied to #23.
- [ADS-02 #27](https://github.com/DanilaH/crossmath-game/issues/27): current policy first live acceptance, later natural breakpoints only by owner decision. 180/120/420/30 and first5 unchanged, fallback deferred. Shared templates/caps and actual source activation remain UNKNOWN.

[Report](commerce-pilot-20261126/README.md) · [P4 assignment](commerce-pilot-20261126/P4_ASSIGNMENTS.json) · [model](commerce-pilot-20261126/MEASUREMENTS.json). All 122 primary P4 IDs mapped to 6 packages (including existing #14 and #23), 23 cross-package dependency links; all 605 retained without status/comparison changes. 36 model scenarios/574 assertions, no actual product/provider test. Owner-gated commercial scope and outstanding original/physical/store evidence preserved. No code, prices, save or runtime changes. KIT IMPACT REUSE/CANDIDATE.


### 26.11.2026 · EasyFun mode/career native supplement
[Source report and reproducible controls](https://github.com/DanilaH/mini-games-kit/blob/703fe422616901ceb86045c6def358ce35b177db/research/games/crossmath/porting/easyfun-mode-career-20261126/README.md) · 11 new stable IDs; 2 refined, 103/103 isolated ARM64 controls, repeat byte-identical. 0.5.24/29 code inspected at 38489056d0dad1d36157682729a086683b44093b. No own implementation/acceptance/economy/bank/runtime changes. Existing #16: nonmutating preview, exact once commit, typed invalid result, immutable slots. #18: own Daily Next opens calendar (session.ts:173); keep current route unless owner approves a different UX. #20: future Event last-index terminal no wrap/no extra payout; persisted event identity; owner scope unchanged. #15: optional local career milestones, deterministic ties, whole hours derived from stored seconds, no implied live player percentile or copied thresholds. Current source activation on Android, VIP/reward indirect paths remain UNKNOWN. KIT IMPACT RESEARCH/REUSE.


### 26.11.2026 · Guru Daily issuance native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/153cd28eef00fe73982820bbe96ae38889c7e980/research/games/crossmath/porting/guru-daily-issuance-native-20261126/README.md) · [local mapping](GURU_DAILY_ISSUANCE_NATIVE_2026-11-26.md). 220 original isolated controls (140 issuance, 76 legacy range, 4 completion writer). Nonempty history is the previously unknown shift gate; last finished label or legacy d; minEqual independent, primary excludes 300; null→whole-history mask-only rescue without retry, can return different category/too few equations, requested label still stored. Empty history+enabled14 in cm5 (1705 Easy all <14) reaches nextInt(0) throw stub, not proof of Android crash. Crossmath calendar-v2 fixed date→ID unchanged. Separate optional ISSUE-01/#16, CONTENT-03/#17 and DAILY-02/#18 dependency: explicit bounded policy, safe fallback/no stale ID, actual vs requested category separate, immutable saved date assignments. Owner decision before implementation. 625 registered/mapped; 4 new IDs, 8 refinements; no acceptance promotion. Actual source device/config UNKNOWN. KIT IMPACT RESEARCH/REUSE; runtime NONE.


### 27.11.2026 · Guru economy native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md) · [local mapping](GURU_ECONOMY_NATIVE_2026-11-27.md). 102 isolated original controls, two byte-identical runs. Tutorial independent hint requests and local snapshot setter; celebrate_coin/debug initializes offer10 but not wallet, reward mask may contain other rewards; Deployment.init_igc=0 and both init branches delta0, actual startup wallet UNKNOWN. Ordinary true requests10 (correct old false/true wording); successful multi requests30 standalone, first marker telemetry only. Exact GDT bindings Hint/Ticket/Store/GameOver, cause-only wrapper, Hint/Ticket success grant commands; no actual SDK/persistence. Keep own initial120/0, help60, unique base and atomic receipts. #14 if approved, total vs delta and no double base; #24 distinct onboarding grant receipts; #27 no cause-only settlement/fallback (owner-deferred). 630 registered/mapped, 5 new IDs and 17 refinements. No implementation/acceptance promotion; original live/device still UNKNOWN. KIT IMPACT RESEARCH/REUSE; runtime NONE.


### 27.11.2026 · Guru Store / A/B native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/0b1a68d63a680bee804bf448f8f2f6fcf27ea67a/research/games/crossmath/porting/guru-store-ab-native-20261127/README.md) · [local mapping](GURU_STORE_AB_NATIVE_2026-11-27.md). 63 isolated original checks, two byte-identical runs. Store coin success requests10 before animation; hint success sets pending and exact registered animation completion requests1 then clears flag. Missing image blocks builder; close/dispose inspected bodies do not explicitly flush; direct repeated completion requests again, normal inactive update exits. Not a proven real duplicate/loss bug. A/B _startFetch→forceFetch→shared RC observable→Daily success-gated observer resolved; SDK timeout15s/min0 then restores7200s, publication on both normal SDK bool values. Server cohort and actual effects UNKNOWN. #24: durable earned receipt + atomic wallet before independent visuals; #16/17/18 immutable assignments; P6 only separate approved config/consent, validated new assignment policy. Preserve 120/0, help60, cooldown and runtime. 638 IDs, 8 new/7 refined; no implementation or acceptance promotion. KIT IMPACT RESEARCH/REUSE; runtime NONE.
