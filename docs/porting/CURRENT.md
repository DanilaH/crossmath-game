> 28.11.2026 — [Final independent RC review](../acceptance/final-rc-audit/README.md): source inventory729 unchanged, #33 open, playtest allowed; no production activation.

> **2026-11-28 RC-QA-01 #30:**0.5.28/33 acceptance in [../acceptance/rc30/README.md](../acceptance/rc30/README.md); historical executable migration, banner/new-bank matrix, protocol3 UI and stable signing.729 source IDs/projection unchanged; physical Android/old signer and SDK separate.

> **28.11.2026 Independent RC review:** 0.5.27/32, gameplay HEAD `4fb5ff6d`, MON-01 correction and coherent candidate confirmed by source and project CI. Next: [#30 RC-QA](https://github.com/DanilaH/crossmath-game/issues/30), covering prior-pilot migration, reduced banner viewport with new boards, protocol v3 browser E2E. Physical Android upgrade/signature and live SDK remain BLOCKED. No new mechanics or production activation. [Independent review](../acceptance/release29/RESEARCHER_REVIEW.md). Inventory 729 IDs; runtime unchanged; older checkpoints historical.

> **28.11.2026 product checkpoint:** MONETIZATION preparation #27 / isolated #14,0.5.26/31 over PR#4@157b133. [Current package](../acceptance/monetization27/README.md). Native bridge/journal protocol2, default Unconfigured; SDK/IDs/live device not selected/accepted, main win bonus disabled. Existing economy/placements/labs retained. Source inventory95f01f5/729 and runtimeb1bf2026 remain unchanged; historical snapshots below do not override this.

# Crossmath · единая актуальная карта переноса

**Актуальный scope 27.11.2026:** [v1.1](../spec/Crossmath_TZ_v1.1_RU.md). 714 ID остаются реестром свидетельств, не обязательным release backlog. Owner approved one offline league with 9 bots; no automatic adoption of donor prices, SDK, or all competition features. Next #28.

26.11.2026 · консолидация материалов, не новая сборка и не новый scope.

- Игра **0.5.24 / 29**, фактический проверенный gameplay/artifact `a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21`, developer snapshot до docs merge `57820c8c6491c8b6240aeed5cb0dfde61c858927`, [PR #4](https://github.com/DanilaH/crossmath-game/pull/4). Перед задачей сверить live HEAD и diff, не предполагать main актуальным.
- Runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance `469928d03f4bae5053e23db26e82187bedbc252e`; source inventory `c5d55b28a78df7af639ce181c8bce73aacc95ae9` независим.
- [Приватный исследовательский индекс](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/CURRENT.md), [scoped kit PR #154](https://github.com/DanilaH/mini-games-kit/pull/154). Не считать наличие PR доказательством merge.
- [ADOPTION_LEDGER.json](ADOPTION_LEDGER.json) — единственная актуальная карта статусов, 714 IDs; [historical 26.11 P0–P6 assignments](PORTING_PACKAGES_2026-11-26.json); [план переноса](REFERENCE_PORTING_PLAN_2026-11-26.md); [остаточные G1–G9](RESEARCH_CLOSURE_GATES_2026-11-26.md). Исторический [449 checkpoint](RESEARCH_CONSOLIDATION_2026-11-25.md) не текущая сводка.

## Фактическое состояние

| Source comparison | Count | Workflow | Count |
|---|---:|---|---:|
| MATCH | 28 | ACCEPTED | 17 |
| PARTIAL | 147 | IMPLEMENTED_UNVERIFIED | 49 |
| MISSING | 502 | ROADMAPPED | 11 |
| UNKNOWN | 37 | RESEARCHED | 304 |
| | | EVIDENCE_GAP | 48 |
| | | DEFERRED | 285 |

714 exact IDs; 52 explicit gap union rows (EVIDENCE_GAP or UNKNOWN), not all unknown source evidence. No implementation/acceptance promotion; Guru economy local consumer/dispatch, career Top and Guru Daily predicate/rescue source evidence resolved; actual activation UNKNOWN. [HELP-02 #11](../acceptance/issue-11/README.md), [cooldown pilot](../acceptance/interstitial-cooldown.md), [FEEL-01 #13](../acceptance/feel-01.md) already implemented; developer reports 169 tests, browser, exact APK. Physical Android/audio/haptics, provider and same-signer update remain open. Не удалять прежний APK/сохранение ради установки.

## Порядок продуктовых задач

CORE-00 [#28](https://github.com/DanilaH/crossmath-game/issues/28) → CORE #16/#17 → LEAGUE #22 (direct ordinary wins, 9 bots, no #21 dependency) → scoped META #15/#18/#19 → MONETIZATION #14/#27 → RELEASE. #20/#21/#23–26 deferred, Endless temporarily disabled in planned release, preserve state. [v1.1](../spec/Crossmath_TZ_v1.1_RU.md) overrides previous sequence; no automatic number/SDK changes.

## Следующие расследования

1. G1: no-count native harness восстановлен, retry32 18/32 paired SOLVED, 14 TIME_BUDGET; [expanded192](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/NATIVE_REPLAY_192.md) complete, 96 paired SOLVED, 96 censored, combined 108 distinct /178 DB rows. [Hint gates](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/HINT_GATES.md), [own content metrics](https://github.com/DanilaH/mini-games-kit/blob/6b40b1839703c72b2ae1b80513c389d6bcf0c0cd/research/games/crossmath/porting/guru-native-sampling-20261126/OWN_METRICS.md). Whole 12899 native convergence UNKNOWN.
2. G1/G4/G5: [EasyFun mode/career](https://github.com/DanilaH/mini-games-kit/blob/703fe422616901ceb86045c6def358ce35b177db/research/games/crossmath/porting/easyfun-mode-career-20261126/README.md) resolved four overrides, 103 native isolated checks; remaining VIP/reward indirect lookup; [Guru Daily predicate/rescue](https://github.com/DanilaH/mini-games-kit/blob/153cd28eef00fe73982820bbe96ae38889c7e980/research/games/crossmath/porting/guru-daily-issuance-native-20261126/README.md) resolved (220 native isolated checks); [Guru economy](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md) celebrate_coin/init_igc and Hint/Ticket dispatch locally resolved (102 controls); [Store / A/B native](https://github.com/DanilaH/mini-games-kit/blob/0b1a68d63a680bee804bf448f8f2f6fcf27ea67a/research/games/crossmath/porting/guru-store-ab-native-20261127/README.md) 63 checks, exact completion and forceFetch→Daily consumer resolved; [Guru profile native](https://github.com/DanilaH/mini-games-kit/blob/75220fdc10bfcc7dbb9ae2ab8c45199b7783c342/research/games/crossmath/porting/guru-profile-native-20261127/README.md) 183 case records, repeat transitions and cold-init counterfactual resolved locally; [VIP native follow-up](https://github.com/DanilaH/mini-games-kit/blob/51a3796c0c5139006f01e2c61078cb3be4a8cdd7/research/games/crossmath/porting/easyfun-vip-native-20261127/README.md) 144 cases; [Event native follow-up](https://github.com/DanilaH/mini-games-kit/blob/836a7a02ccead81d491e3ec4137d7e266a5434d9/research/games/crossmath/porting/easyfun-event-native-20261127/README.md) 313 cases; [Expression native follow-up](https://github.com/DanilaH/mini-games-kit/blob/6980f3a67b930f7c7084d897f36c857b76951efa/research/games/crossmath/porting/easyfun-expression-native-20261127/README.md) 42,015 cases; [Reward native follow-up](https://github.com/DanilaH/mini-games-kit/blob/6fd19408bfd58a0a39512749b19d5caa6e6355b8/research/games/crossmath/porting/easyfun-reward-native-20261127/README.md) 240 cases; [Hint native follow-up](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-hint-native-20261127/README.md) 494 cases, typed binding resolved; [52-gap residual review](RESIDUAL_REVIEW_2026-11-27.md) — only targeted remaining local work, then actual Android/config/provider/oracle. Не повторять уже разобранные analytics/store/competition/solver strategy topics.
3. G3/G4/G5 original Android/device/provider; G8 own device and same certificate separate; G9 exact 4.18 archive delta. G2/G6/G7 only actual oracle/live evidence.
4. Coverage gate: run exact kit `tools/verify-reference-porting.py` with private pinned inventory and this ledger. Prior exact Python CLI passed 605/605 (game CI 45813626752). Exact 610/610 Python CLI PASS in game CI 45818944115 at preceding evidence pins; final evidence-only refresh connector PASS; no source exhaustiveness or device claim. Exact 621/621 canonical coverage PASS on game CI [45827594563](https://github.com/DanilaH/crossmath-game/actions/runs/45827594563); pins checked; Exact 625/625 canonical coverage PASS on game CI [45850130370](https://github.com/DanilaH/crossmath-game/actions/runs/45850130370); pinned inventory, ledger and verifier blobs checked. No implementation/acceptance promotion.

Exact 630/630 canonical coverage PASS on game CI [45882098149](https://github.com/DanilaH/crossmath-game/actions/runs/45882098149); pinned inventory, ledger and verifier blobs checked. No implementation/acceptance promotion.

Exact 638/638 canonical coverage PASS on game CI [45885667709](https://github.com/DanilaH/crossmath-game/actions/runs/45885667709); pinned inventory, ledger and verifier blobs checked. No implementation/acceptance promotion.

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

Exact 644/644 canonical coverage PASS on game CI [45887376173](https://github.com/DanilaH/crossmath-game/actions/runs/45887376173); pinned inventory, ledger and verifier blobs checked. No implementation/acceptance promotion.

## EasyFun Event native follow-up · 27.11.2026

[Source report, native replay and reproducible checks](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-event-native-20261127/README.md) · [local adoption mapping](EASYFUN_EVENT_NATIVE_2026-11-27.md). 313 isolated native cases, two byte-identical runs and negative predicate control. Event lookup returns first matching ID; coin/hint totals include all config rows, not unclaimed rewards. Finish Running/Pause gate then next preview; at last index terminal write request precedes lookup and can precede missing-reward guard. RT0 requests coins, RT2 updates existing badge row, RT1 has no grant in inspected finish handler. Other hint path remains UNKNOWN. ItemUtil Hint performs sum then cap99; update event carries requested delta; coin branch has no upper cap in body. Gift animation argument20 not proven amount; Event→Classic stats mutation static only. #20/#24/#15: validated unique stage IDs, one preview/grant contract, atomic receipt and progress, actual applied delta, mode-specific stats; preserve owner economy and release scope. Original Android/live config/payout/DB persistence UNKNOWN. 18 new / 5 refined IDs; 671 mapped, no implementation/acceptance promotion. Runtime unchanged. KIT IMPACT RESEARCH/REUSE.

Exact 671/671 canonical coverage PASS on game CI [45957559803](https://github.com/DanilaH/crossmath-game/actions/runs/45957559803); inventory blob `2e4dc954009aedce9ce73cba83c0eb06ef2bf393`, ledger blob `8ee26ce749ced193fd9f8f91c53d04256b38cc89` and canonical verifier blob `8789f8a2c0bee9034597cf9af95368a42bb1f87f` checked. Coverage only; no implementation/acceptance promotion.

## EasyFun expression native follow-up · 27.11.2026

[Source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-expression-native-20261127/README.md) · [local mapping](EASYFUN_EXPRESSION_NATIVE_2026-11-27.md). 42,015 isolated original case records, two identical runs; negative associativity mutation. Native RPN, both sides, strict positive subtraction, exact nonzero division, operation caps1000, negative intermediate rejection and singleton bypass; own 1..99 single-op result relation has zero mismatches across 39,204 native operand pairs (own formula compared by inspection, not executed TS). Board completion uses filled interactable cells and cached status !=2, no arithmetic recomputation; no demonstrated stale-cache bug. Keep own stricter validator, solver and Explain. #17 optional separately versioned long-expression lab only with owner approval; existing 515 fields, assignments/saves, economy and runtime untouched. Original long-level occurrence, UI status freshness, Android/live source evidence UNKNOWN. 14 new / 3 refined IDs; 685 mapped. No implementation or acceptance promotion. KIT IMPACT RESEARCH/REUSE.

Exact 685/685 canonical coverage PASS on game CI [45958859616](https://github.com/DanilaH/crossmath-game/actions/runs/45958859616); inventory blob `c4796895f0c5468c7bb7434c99d63b73c472c33d`, ledger blob `014222aab9cfc207f50defa7171d43e9bdec4b99` and canonical verifier checked. Coverage only; no implementation/acceptance promotion.

## EasyFun reward/spend native follow-up · 27.11.2026

[Exact source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-reward-native-20261127/README.md) · [consumer mapping](EASYFUN_REWARD_NATIVE_2026-11-27.md). 240 isolated original cases, byte-identical repeats; negative branch control. Credit first then coins then RV; true hint callback adds and consumes one, common dispatch requested; board mutation/actual subscriber UNKNOWN. Random-gold true reads sector at callback and requests base×multiplier; false requests base; FreeRewardCallback invokes true; pointer and sequence mocked, actual sector odds/eligibility UNKNOWN. UseItemCount balance check, no positive-amount validation in its own body, successful hint debit increments counter by one; Daily paid restart handler ignores debit return in isolated artificial fixtures, no actual free-restart bug claimed. Close continuation requests base then animation; parent guard and 0/0.5 delay static only. Exact setter direct-call census does not prove alternate Event hint grant. #14/#18/#24/#27: retain own receipt-first settlement, validated payment and free Daily restart, no copied donor price/cap/multiplier/delay, no new SDK or economy without owner approval. 16 new/8 refined; 701 IDs mapped; no implementation or acceptance promotion, runtime unchanged. KIT IMPACT RESEARCH/REUSE.

Exact 701/701 canonical coverage PASS on game CI [45960441389](https://github.com/DanilaH/crossmath-game/actions/runs/45960441389); inventory blob `7b05461602757d9bb211e8141587f14c76437a1e`, ledger blob `226d6754f891f226f4a46255c61335c8fcac4dc5` and canonical verifier checked. Coverage only; no implementation/acceptance promotion.

## EasyFun Hint native / residual review · 27.11.2026

[Source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-hint-native-20261127/README.md) · [consumer mapping](EASYFUN_HINT_NATIVE_2026-11-27.md) · [residual review](RESIDUAL_REVIEW_2026-11-27.md). 494 isolated native cases, byte-identical repeats; exact generic GEvent_Use_Hint Send/Register/UnRegister and Game_Resume binding; controller vslot10, author-answer target, minimum tray SortIndex, empty-tray wrong minimum, local replacement/transfer. Source cell stores executed, Unity equality/observers/animation mocked; real Android bus, mode observers, actual wallet and save remain UNKNOWN. Own Reveal chooses selected wrong target and returns all wrong occupied cells; optional minimal-repair candidate after owner approval, retain selected target/preview/atomic cost, preserve unrelated tokens and all 515 Explain regressions. No donor order, price, auto-apply or weaker validation. 13 new / 6 refined IDs, 714 mapped; 52 explicit gaps routed independently with three bounded local targets. No scope/implementation/acceptance or runtime promotion. KIT IMPACT RESEARCH/REUSE.

Exact 714/714 canonical coverage PASS on game CI [45962192424](https://github.com/DanilaH/crossmath-game/actions/runs/45962192424); inventory blob `3668d1803e1724b9c0da8959d8bea34a4135cfe0`, ledger blob `ed732d0cda5b406fb21de140460f04948957dd40` and canonical verifier checked. Coverage only; no implementation/acceptance promotion.
