> **Current FINAL-SAVE-01 #33 · 0.5.31/36:** [acceptance/save33/README.md](acceptance/save33/README.md). Exact observed-root capability belongs to each loaded/committed session base; reject stale writers after backup recovery reuses a revision. No numeric-only commit fallback. Schema/backup/quarantine/CAS/pages and all #30–32 behavior remain; full project CI plus independent ABA/corpus/fault tests and delivered 0.5.30 executable upgrade. Preserve UI/economy/runtime; one stable-signed APK, no SDK/publication. Physical device gates remain separate.

> **Current UX-QA #32 ·0.5.30/35:** [acceptance/ui32/README.md](acceptance/ui32/README.md). Scoped navigation/preview/dialog/tool/layout/feel corrections after delivered FUNC31. Preserve all prior CORE/META/RC,605 fields, economy and kit; fixed100%. Full project CI and exact stable-signed APK are the delivery gates; physical phone/old-key/live SDK gates remain separate. Earlier milestone instructions below are historical.

> **Current FUNC-QA #31 ·0.5.29/34:** [acceptance/functional-audit/README.md](acceptance/functional-audit/README.md). After delivered0.5.28/33: all605 Reveal, actual storage CAS and lossless bounded pages; no live Undo/ID/receipt loss. Prior CORE/META/RC and physical/old-key/SDK gates retained. Runtime/economy unchanged. Project CI is the acceptance source. Older single-writer/nontransactional notes below describe the superseded infrastructure.

> **RC-QA-01 #30 · current candidate0.5.28/33:** [regression and signing](acceptance/rc30/README.md). Project CI owns full checks and new upgrade/banner/protocol3 suites. Same signer as delivered0.5.27; older aa59 installations need their original key. Physical Android and SDK evidence remain NOT RUN. Historical package summaries below do not override this scope.

> 2026-11-28: RELEASE-01 0.5.27/32 integrated RC after MON-01. Read [acceptance/release29/README.md](acceptance/release29/README.md) first; D4-v2 +90 reviewed boards +League v3, no lab UI, payouts/kit unchanged. Android same-signer update/live SDK remain BLOCKED, no publication. Older entries below are historical.

# Crossmath status

**MONETIZATION #27 / isolated #14 · 28.11.2026:** current preparation0.5.26/31 over PR#4@157b133. [Audit/acceptance](acceptance/monetization27/README.md), [provider decision/device plan](acceptance/monetization27/PROVIDER_HANDOFF.md). Optional native protocol2/journal added, default Unconfigured, no SDK/IDs or main bonus. Same placements, economy and180/120/420/30/first5; prior#16/#17/#22 retained as labs. No #19/new force/store/IAP. Native device/live SDK/update are NOT RUN; provider/numbers require owner decision. Older “MONETIZATION not started” text below is historical.


**META #15/#18 · текущий пакет по прямому поручению владельца:** [полировка и приёмка](acceptance/meta15-18/README.md), [сравнение экономики](experiments/meta18/ECONOMY_RU.md). Crossmath 0.5.25 / 30, база `ad1bbbc5833b1cfd4b9489e8ff74b76031ad1069`. Существующая коллекция/профиль, компактные задания без смены ротации/выплат, месячная печать из receipt и архив календаря. Simple/off и A/B/C/D Лиги — только модель. Все прошлые пакеты сохраняются. Записи ниже «META не начат» — исторический слой поставки #22. #19 и MONETIZATION не начаты.

**LEAGUE-01 · Guru v3:** [планировщик и приёмка](acceptance/issue-22/GURU.md), [темп и варианты наград](experiments/league22-guru/BALANCE_RU.md). Exact 9 daily templates, окна/квоты, события 1–4; 32 400 моделей, старые v1/v2 сохранены. Никакие предложенные призы не активированы. META после приёмки владельца.

**Утверждено владельцем 27.11.2026 — core-first v1.1.** [Crossmath v1.1](spec/Crossmath_TZ_v1.1_RU.md) определяет актуальный состав и порядок. CORE-00 #28 → CORE #16/#17 → LEAGUE #22 → ограниченная META #15/#18/#19 → MONETIZATION #14/#27 → RELEASE. Endless временно отключить без потери сейвов; недельная офлайн-лига включена в выбранный scope и не зависит от Star Race/Battle. Остальное ниже — исторические срезы/исследовательские предложения, не распоряжение расширять scope. Точные изменения экономики, очков, темпа и релизной конфигурации согласовать отдельно.

**CORE-00 поставлен на плейтест** в [PR №4](https://github.com/DanilaH/crossmath-game/pull/4). Ветки входа в Endless закрыты, прежние забеги сохраняются. Reveal работает локально. Детали и открытые проверки в [протоколе CORE-00](acceptance/core-00/README.md).

**LEAGUE-01 подготовлен как эксперимент:** `npm run build:league-lab`, название «Лига» / League, вход с главной и из профиля, девять компьютерных соперников (раскрытие в правилах), очки обычных полей и одна косметическая медаль за неделю. [Приёмка и числовые ограничения](acceptance/issue-22/README.md). Параметры и постоянное включение открыты; №16 и №17 сохранены.

**Доработка №22 перед приёмкой:** [протокол](acceptance/issue-22/REVIEW.md), v2 без преимущества позднего входа, совместимость активных v1, изоляция повреждённых result.league во всех слотах. META не начат.

## Current consolidated checkpoint · 26 November 2026

Crossmath 0.5.24 / 29; reviewed developer snapshot `57820c8c6491c8b6240aeed5cb0dfde61c858927`, gameplay/artifact `a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21`, runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance `469928d03f4bae5053e23db26e82187bedbc252e`, source inventory `944f4bb370edf46fb10c6f3b4d5ab0d505d85f23` (605 IDs). [Current map](porting/CURRENT.md) · [ledger](porting/ADOPTION_LEDGER.json). Historical dated snapshots below are not current directives.

[HELP-02](acceptance/issue-11/README.md), [interstitial cooldown](acceptance/interstitial-cooldown.md), [FEEL-01](acceptance/feel-01.md) implemented in PR #4; developer reports 169 tests, Chromium, signed APK. Physical device/live SDK and signer compatibility open. No new economy or runtime change.

See [remaining investigations](porting/RESEARCH_CLOSURE_GATES_2026-11-26.md) and [proposals](porting/REFERENCE_PORTING_PLAN_2026-11-26.md). All older dated checkpoints are historical.

## Current baseline · 24 November 2026

**Актуальная база сверки:** Crossmath **0.5.24 / versionCode 29**, product implementation `2a7d231098d34de29d8607cc4131fec3dcead899`, product baseline HEAD `73fbc059149aba440297cf4cdc074b98433ad7e5`. Runtime kit `469928d03f4bae5053e23db26e82187bedbc252e` сохранён; новый research source pin `4287cc0b6480202bb69f0fdb5c426224df779fff` от него независим.

**HELP-01 / ADS-01: IMPLEMENTED.** Existing [unit/Chromium acceptance](acceptance/issues-8-9/README.md) is retained. The older [delivery package](porting/help-and-ads-20261124/README.md) documents the rationale; its former SPECIFIED state is historical. Help distinguishes incompatible input, no supported explanation and unfinished verification, while Endless preserves the same neutral preview until Submit. Banner command rejection recovers through the current intent/refresh path. Keep fixed **100% typography**, independent answer-free proof verification, isolated Reveal, atomic Apply and durable rewards.

### Recorded CI and artifact evidence

Fresh readback of the existing GitHub job logs confirmed **SUCCESS** on the [push run 45373312669](https://github.com/DanilaH/crossmath-game/actions/runs/45373312669), source `73fbc059149aba440297cf4cdc074b98433ad7e5`, and the [PR run 45373329996](https://github.com/DanilaH/crossmath-game/actions/runs/45373329996), merge source `ffc358d4050a18c874ebbcb49565455313f9704d`. Each run passed **145 game + 239 kit = 384 tests**, three browser scenarios, content verification, strict doctor, Gradle and exact-APK inspection. These are retained product-baseline results. The old missing-`KIT_READ_TOKEN` failure is historical and is not a current blocker.

After the first research reconciliation, [push run 45427771678](https://github.com/DanilaH/crossmath-game/actions/runs/45427771678) at `bc8d50d3f886a4461f2507547ab7ca11c9182c49` and [PR run 45427792826](https://github.com/DanilaH/crossmath-game/actions/runs/45427792826) at synthetic merge `d83cae7320eb2020e3c8cdb6c94a2f6f57120f90` also completed **SUCCESS**: 384 tests, content/browser, Gradle and exact releasecheck-APK verification. [Exact CI readback](porting/GURU_SOLVER_RESEARCH_CI_2026-11-24.json) records source/APK hashes and the hosted doctor’s one `RUNTIME_PIN_UNVERIFIED` warning for the temporary `file:` tarball; kit checkout is independently pinned to `469928d…`. These are automatic CI builds of those exact sources, not CI acceptance of later supplements. Native runtime/device testing was **NOT RUN**.

| Artifact provenance | SHA-256 |
| --- | --- |
| Prior product acceptance, source `2a7d231098d34de29d8607cc4131fec3dcead899` | `3329ce326c2a574d84997c338665d6f66be89b46fe1b8887efc10e9e9306defa` |
| Push CI artifact, source `73fbc059149aba440297cf4cdc074b98433ad7e5` | `9c54853dfe8a22014207b0539dae3d474a28404724f2322b7108c0567be709e4` |
| PR CI artifact, merge source `ffc358d4050a18c874ebbcb49565455313f9704d` | `9e03375ab0807e76b1face4128ca481518b6a56ea6e2c72cece0dd043863022d` |

Do not substitute either artifact for a new physical-device acceptance. Android touch/Back, audible sound/haptics, system-font changes with game text staying at 100%, provider callbacks and live SDK/store acceptance remain separate open gates.

### Guru solver research, evidence boundary

[Current consumer report](porting/GURU_SOLVER_RESEARCH_2026-11-24.md) · [private source package](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/README.md). Guru **4.17.0 / 26101374** Monotonic, Factor, Intersection and bounded backtracking have now executed under a generic isolated native adapter. **13 real recipes / 19 DB rows** converge in both **persistent** and **fresh/first-step** modes. The frozen core **12/18** is unchanged; a [26-hole recipe is now SOLVED in both protocols](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/diagnostics/heap-capacity-20261124/README.md), bringing the [deduplicated total](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/TOTAL_NATIVE_COVERAGE.json) to **13/19**. Its timings measure the isolated adapter, not Android performance. All **12 899** catalog recipes have unique numeric assignments in the independent own CSP model. **Full native corpus convergence: UNKNOWN. Exact author `stuck` formula: UNKNOWN.** Original UI/Android execution and source-system completeness are not inferred from these results.

This revision refines **13 existing sourceFeatureId**; mapping remains **296/296**, with no new product implementation or automatic source ACCEPTED status. Historical **265** and gameplay `0401140d` snapshots below are not the current inventory/implementation. The next native work is sampling across mask-size ranges and setting a full-catalog budget on the validated no-count adapter, with explicit SOLVED/FIXED_POINT/FALLBACK_REQUIRED/TIME_BUDGET/HARNESS_ERROR outcomes. The heavy profile is complete. Own Monotonic/Factor/bounded proof work is a separate proposed product scope.

## Historical status and delivery records

**Исторический слой.** Ниже сохранены датированные исследования и их прежние состояния. Числа 265/269/273/275/288/293 и source/gameplay `0401140d` относятся к соответствующим прежним срезам; текущая карта — 296/296. Старые формулировки «следующий опыт», «полный solve не исполнен» и прежние APK/CI не переопределяют актуальную сводку выше. Исследовательский PR #7 не должен откатывать принятую реализацию Help/Ads на статус готового ТЗ.

### Historical development preview · 23 November 2026

`feat/mode-unlocks-0.5.10` / PR #4 carries 0.5.24 (versionCode 29). Issue #6 adds four root tabs, a New Game sheet, a persistent Daily selection and profile filters. Workshop returns to its original root tab. [0.5.24 acceptance](acceptance/issue-6/README.md) · [0.5.23 acceptance](acceptance/issue-5/README.md) · [Reference adoption ledger](porting/ADOPTION_LEDGER.json).

The optimized APK uses `com.danilah.crossmath.releasecheck` with the local test certificate recorded in the acceptance report. Chromium verified the navigation and a save written by 0.5.23. Physical Android feedback, system text scaling and on-device update remain open. The local duel is a separate M3 scope.

Earlier baseline, 19 November 2026: `main`, `feat/vertical-slice-20261118` and PR #1. Version 0.4.0 / versionCode 4 / schema 4. E2 adds RU/EN and the optional Android ads bridge, verified with a scripted provider. Real SDK acceptance remains open.

0.5.3 preview adds a home screen with one continuation action, direct Daily and workshop entry, and a separate modes dialog. See [preview acceptance](ACCEPTANCE_PLAY_SCREEN_2026-11-19.md) for the exact APK and verification on `feat/play-screen-0.5`.

### Implemented

- A–C: immutable 240-board bank, independent solver, physical-token commands, semantic board and drag/tap/keyboard, explain/proof verification and isolated reveal, atomic saves, rank/base/card rewards, 15 lessons and full campaign continuation.
- D: home with saved-game priority, unlocked Free difficulty selector, unsolved-first pools, independent campaign/Free/dated slots and explicit replacement confirmation.
- Fixed-zone Daily calendar: today/previous 30 days since profile creation, pinned date assignments, started/completed/future/zero-life states, three lives, free restart and completion of old unfinished dates.
- Three reachable daily missions with joint <=3 distinct-ID witness, campaign prerequisites, minimal fallback, partial/paid sibling preservation, active issuance rotation and monotonic effective date. Endless is included after unlock with actual stage prerequisites.
- Atomic base/date/mission/set/rank/card receipts and result breakdown. Fifth victory issues missions without retroactive credit. Migration from schema 1 to 2 preserves placements, settings, wallet and earned collection; historical full cards are grandfathered.
- Rank detail and twelve-tool album with four real SVG layers per card, next-detail progress, completed album retained after win 228. Reward event priority and original saved result survive switching modes.

- E1: explicit-submit Endless after 15 wins, 225-field circular route, shared three lives, exact run/stage persistence, atomic stage score, confirmed new run, separate versioned solo/assisted records.
- E1: profile statistics by mode and twelve permanent achievements. Legacy detailed history is labelled partial rather than invented; confirmed lifetime unique wins/rank/cards/dates remain.

- E2: persistent RU/EN and optional timer in Campaign/Free Play. Localized gameplay, help, result, calendar, album, profile, settings and accessibility labels.
- E2: durable rewarded credit and exact-attempt/run continuation, impression-based interstitial cadence, optional native banner visibility and offline fallback.

### Verified locally

- 68 Vitest tests / 9 files; independent full-bank solving and 240-win reward integration, including 228/229; durable writes/recovery and help proofs; D includes 84 actual-bank mission/profile fixtures, +100, old dated completion, fixed zones/leap days/missed days/rollback, mode slots and migration.
- Real Chromium 141 UI: first 25 campaign fields plus fresh-profile D scenario through unlocks 3/5, +100 Daily, cold result restore, first complete abacus and part inspection at eight distinct wins. Complete album 228/229 is an explicitly seeded display fixture, not 228 UI-played wins.
- Dense board and album: 320×568, 360×640, 390×844, 800×1280; 48 CSS px controls, no page horizontal overflow. Applied own paper/ink/teal style, wrapped long instrument names. Evidence under `docs/evidence/` and `evidence/meta-d/`.
- Typecheck, normal/release web audit and Capacitor release sync; supplied Python content/routes/meta reference checks; four Python preview-signing safety tests; exact pinned guidance doctor.

- E1 browser: fresh campaign 1–15, neutral full board before Submit, wrong/duplicate/undo/lives, parked mode restore, explicit reveal, run3 badge, separate records and free restart at zero. Full route 225 + first wrapped stage is covered by actual engine/session commands in tests.

- E2: scripted ad cancellations, delayed/duplicate callbacks, failed writes and acknowledgement recovery, scoped continuation, cadence and stalled pre-show. Chromium switches RU→EN→RU and checks cold settings persistence.

### Acceptance and remaining work

0.4.0 debug and R8 releaseCheck built successfully. Exact APK passed official signature/alignment/package/version/portrait/debugging/web-payload/bridge inspection. The exact artifact hash and source are in `ACCEPTANCE_E2_2026-11-19.md`. Same retained private preview signer, package and increased versionCode support an in-place preview update; actual device installation/migration is pending.

Historical device checklist: native runtime, process kill, physical responsiveness/haptics, TalkBack and live platform callbacks were unaccepted. Its 200% OS-font layout criterion was superseded on 24 November by fixed 100% game typography; current device verification must preserve that decision. Browser checks and APK inspection do not establish physical-device results.

Historical CI failure, superseded by the successful 73fbc059 runs above: GitHub CI was blocked by missing `KIT_READ_TOKEN` (read-only Contents access to `DanilaH/mini-games-kit`); observed gameplay-source run 44476862913 stopped at the private-kit access requirement before tests/build. Local success is independent of CI.

Latest scope and acceptance: `ACCEPTANCE_E2_2026-11-19.md`. Remaining release work is the chosen live SDK and its placements, device/accessibility/offline checks, production signing and store acceptance. Production signer remains unset; no live SDK, reminders or store submission is claimed.

### 0.5.4 — R1, U1 and U2

[Measured level bank and issuance](spec/product/content_v2/README.md). Fresh Campaign, Relax, Challenge and unassigned Daily use the new original fields. Existing saved boards keep their IDs and geometry. U1 localizes Free replacement and restores focus to the originating button. U2 reports the affected equation with its axis, including when two equations have errors. [R2 APK evidence](spec/R2_APK_BALANCE_RU.md) records the competition numbers and trace, prior to implementing event modes.

[Exact APK and acceptance for 0.5.4](ACCEPTANCE_R1_2026-11-19.md).
