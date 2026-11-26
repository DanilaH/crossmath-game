# Crossmath · единая актуальная карта переноса

26.11.2026 · консолидация материалов, не новая сборка и не новый scope.

- Игра **0.5.24 / 29**, фактический проверенный gameplay/artifact `a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21`, developer snapshot до docs merge `57820c8c6491c8b6240aeed5cb0dfde61c858927`, [PR #4](https://github.com/DanilaH/crossmath-game/pull/4). Перед задачей сверить live HEAD и diff, не предполагать main актуальным.
- Runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance `469928d03f4bae5053e23db26e82187bedbc252e`; source inventory `1c87c0d2b81f22cd927835b4ec1f382752432806` независим.
- [Приватный исследовательский индекс](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/CURRENT.md), [scoped kit PR #154](https://github.com/DanilaH/mini-games-kit/pull/154). Не считать наличие PR доказательством merge.
- [ADOPTION_LEDGER.json](ADOPTION_LEDGER.json) — единственная актуальная карта статусов, 630 IDs; [P0–P6 assignments](PORTING_PACKAGES_2026-11-26.json); [план переноса](REFERENCE_PORTING_PLAN_2026-11-26.md); [остаточные G1–G9](RESEARCH_CLOSURE_GATES_2026-11-26.md). Исторический [449 checkpoint](RESEARCH_CONSOLIDATION_2026-11-25.md) не текущая сводка.

## Фактическое состояние

| Source comparison | Count | Workflow | Count |
|---|---:|---|---:|
| MATCH | 27 | ACCEPTED | 17 |
| PARTIAL | 118 | IMPLEMENTED_UNVERIFIED | 49 |
| MISSING | 449 | ROADMAPPED | 5 |
| UNKNOWN | 36 | RESEARCHED | 227 |
| | | EVIDENCE_GAP | 43 |
| | | DEFERRED | 289 |

630 exact IDs; 47 explicit gap union rows (EVIDENCE_GAP or UNKNOWN), not all unknown source evidence. No implementation/acceptance promotion; Guru economy local consumer/dispatch, career Top and Guru Daily predicate/rescue source evidence resolved; actual activation UNKNOWN. [HELP-02 #11](../acceptance/issue-11/README.md), [cooldown pilot](../acceptance/interstitial-cooldown.md), [FEEL-01 #13](../acceptance/feel-01.md) already implemented; developer reports 169 tests, browser, exact APK. Physical Android/audio/haptics, provider and same-signer update remain open. Не удалять прежний APK/сохранение ради установки.

## Порядок продуктовых задач

#14 WIN-RV parameters owner-gated; #15 META; #16 ISSUE; #17 CONTENT; #18 DAILY; #19 RETURN; #20 EVENT; #21 RACE; #22 BRAINS; #23 BATTLE; #24 STORE-RV; #25 NOADS; #26 IAP; #27 ADS-02. [Точные ссылки, зависимости и критерии](REFERENCE_PORTING_PLAN_2026-11-26.md). Scope first release по [PROJECT_DECISIONS](../PROJECT_DECISIONS.md); proposals not approval, P6 analytics product planning later. No new SDK, money, bot, save/content change or runtime pin.

## Следующие расследования

1. G1: no-count native harness восстановлен, retry32 18/32 paired SOLVED, 14 TIME_BUDGET; [expanded192](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/NATIVE_REPLAY_192.md) complete, 96 paired SOLVED, 96 censored, combined 108 distinct /178 DB rows. [Hint gates](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/HINT_GATES.md), [own content metrics](https://github.com/DanilaH/mini-games-kit/blob/6b40b1839703c72b2ae1b80513c389d6bcf0c0cd/research/games/crossmath/porting/guru-native-sampling-20261126/OWN_METRICS.md). Whole 12899 native convergence UNKNOWN.
2. G1/G4/G5: [EasyFun mode/career](https://github.com/DanilaH/mini-games-kit/blob/703fe422616901ceb86045c6def358ce35b177db/research/games/crossmath/porting/easyfun-mode-career-20261126/README.md) resolved four overrides, 103 native isolated checks; remaining VIP/reward indirect lookup; [Guru Daily predicate/rescue](https://github.com/DanilaH/mini-games-kit/blob/153cd28eef00fe73982820bbe96ae38889c7e980/research/games/crossmath/porting/guru-daily-issuance-native-20261126/README.md) resolved (220 native isolated checks); [Guru economy](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md) celebrate_coin/init_igc and Hint/Ticket dispatch locally resolved (102 controls); remaining store callback chain, A/B→config and long-expression primitive. Не повторять уже разобранные analytics/store/competition/solver strategy topics.
3. G3/G4/G5 original Android/device/provider; G8 own device and same certificate separate; G9 exact 4.18 archive delta. G2/G6/G7 only actual oracle/live evidence.
4. Coverage gate: run exact kit `tools/verify-reference-porting.py` with private pinned inventory and this ledger. Prior exact Python CLI passed 605/605 (game CI 45813626752). Exact 610/610 Python CLI PASS in game CI 45818944115 at preceding evidence pins; final evidence-only refresh connector PASS; no source exhaustiveness or device claim. Exact 621/621 canonical coverage PASS on game CI [45827594563](https://github.com/DanilaH/crossmath-game/actions/runs/45827594563); pins checked; Exact 625/625 canonical coverage PASS on game CI [45850130370](https://github.com/DanilaH/crossmath-game/actions/runs/45850130370); pinned inventory, ledger and verifier blobs checked. No implementation/acceptance promotion.

## Исторический архив

[Manifest](HISTORICAL_ARCHIVE_MANIFEST_2026-11-26.json) — 162 original own files from [PR #3 exact commit](https://github.com/DanilaH/crossmath-game/tree/2bbd6f9804efb2291d7b2e42de091adee9954db4/docs/porting) restored at their existing historical paths (no old ledger restored). Earlier source #7/#10 documents already present; original PRs retained in history, not merge paths.

- top-level files: 7 historical files.
- audit-0523: 8 historical files · [README](audit-0523/README.md).
- icon-study-0521: 48 historical files · [README](icon-study-0521/README.md).
- menu-direction-0521: 41 historical files · [README](menu-direction-0521/README.md).
- meta-0516: 10 historical files · [README](meta-0516/README.md).
- play-audit-0513: 9 historical files · [README](play-audit-0513/README.md).
- qa-0519: 7 historical files · [README](qa-0519/README.md).
- screen-audit-0520: 13 historical files · [README](screen-audit-0520/README.md).
- ui-audit-057: 19 historical files · [README](ui-audit-057/README.md).

Historical QA/spec/images do not override [owner decisions](../PROJECT_DECISIONS.md), current navigation, 100% typography, actual code or current acceptance. For example, old menu-direction broad internal back buttons were superseded by four-root navigation #6. Preserve original art/UX evidence; use current acceptance for delivery. No arbitrary wholesale merge of PR #3/#7/#10.

KIT IMPACT IMPROVE / REUSE. Runtime NONE.
