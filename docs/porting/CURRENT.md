# Crossmath · единая актуальная карта переноса

26.11.2026 · консолидация материалов, не новая сборка и не новый scope.

- Игра **0.5.24 / 29**, фактический проверенный gameplay/artifact `a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21`, developer snapshot до docs merge `57820c8c6491c8b6240aeed5cb0dfde61c858927`, [PR #4](https://github.com/DanilaH/crossmath-game/pull/4). Перед задачей сверить live HEAD и diff, не предполагать main актуальным.
- Runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance `469928d03f4bae5053e23db26e82187bedbc252e`; source inventory `a38073b5bbd034b27d83da18c35e451a2318dcae` независим.
- [Приватный исследовательский индекс](https://github.com/DanilaH/mini-games-kit/blob/de9c5d2db7d3163a2c18dc1fa48d9e6ee712283f/research/games/crossmath/CURRENT.md), [scoped kit PR #154](https://github.com/DanilaH/mini-games-kit/pull/154). Не считать наличие PR доказательством merge.
- [ADOPTION_LEDGER.json](ADOPTION_LEDGER.json) — единственная актуальная карта статусов, 610 IDs; [P0–P6 assignments](PORTING_PACKAGES_2026-11-26.json); [план переноса](REFERENCE_PORTING_PLAN_2026-11-26.md); [остаточные G1–G9](RESEARCH_CLOSURE_GATES_2026-11-26.md). Исторический [449 checkpoint](RESEARCH_CONSOLIDATION_2026-11-25.md) не текущая сводка.

## Фактическое состояние

| Source comparison | Count | Workflow | Count |
|---|---:|---|---:|
| MATCH | 27 | ACCEPTED | 17 |
| PARTIAL | 109 | IMPLEMENTED_UNVERIFIED | 49 |
| MISSING | 437 | ROADMAPPED | 5 |
| UNKNOWN | 37 | RESEARCHED | 209 |
| | | EVIDENCE_GAP | 44 |
| | | DEFERRED | 286 |

610 exact IDs; 48 explicit gap union rows (EVIDENCE_GAP or UNKNOWN), not all unknown source evidence. No status promotion. [HELP-02 #11](../acceptance/issue-11/README.md), [cooldown pilot](../acceptance/interstitial-cooldown.md), [FEEL-01 #13](../acceptance/feel-01.md) already implemented; developer reports 169 tests, browser, exact APK. Physical Android/audio/haptics, provider and same-signer update remain open. Не удалять прежний APK/сохранение ради установки.

## Порядок продуктовых задач

#14 WIN-RV parameters owner-gated; #15 META; #16 ISSUE; #17 CONTENT; #18 DAILY; #19 RETURN; #20 EVENT; #21 RACE; #22 BRAINS; #23 BATTLE; #24 STORE-RV; #25 NOADS; #26 IAP; #27 ADS-02. [Точные ссылки, зависимости и критерии](REFERENCE_PORTING_PLAN_2026-11-26.md). Scope first release по [PROJECT_DECISIONS](../PROJECT_DECISIONS.md); proposals not approval, P6 analytics product planning later. No new SDK, money, bot, save/content change or runtime pin.

## Следующие расследования

1. G1: no-count native harness восстановлен, retry32 18/32 paired SOLVED, 14 TIME_BUDGET, expanded192 replay ongoing. [Hint gates](https://github.com/DanilaH/mini-games-kit/blob/a38073b5bbd034b27d83da18c35e451a2318dcae/research/games/crossmath/porting/guru-native-sampling-20261126/HINT_GATES.md), [own content metrics](https://github.com/DanilaH/mini-games-kit/blob/6b40b1839703c72b2ae1b80513c389d6bcf0c0cd/research/games/crossmath/porting/guru-native-sampling-20261126/OWN_METRICS.md). Whole 12899 native convergence UNKNOWN.
2. G1/G4/G5: EasyFun concrete mode/career/VIP/reward lookup; Guru Daily second predicate/rescue, A/B→config, commercial indirect grant chains, celebrate_coin/init_igc, long-expression primitive. Не повторять уже разобранные analytics/store/competition/solver strategy topics.
3. G3/G4/G5 original Android/device/provider; G8 own device and same certificate separate; G9 exact 4.18 archive delta. G2/G6/G7 only actual oracle/live evidence.
4. Coverage gate: run exact kit `tools/verify-reference-porting.py` with private pinned inventory and this ledger. Prior exact Python CLI passed 605/605 (game CI 45813626752). New 610 inventory/ledger connector-side equivalent passes; exact CLI recheck pending; no source exhaustiveness or device claim.

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
