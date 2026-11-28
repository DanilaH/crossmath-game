# Guru remote config consumers — сопоставление с Crossmath

26.11.2026. [Source evidence](https://github.com/DanilaH/mini-games-kit/blob/14939d46dc197b7c8ac04d230ce80c3663c06fd3/research/games/crossmath/porting/guru-remote-consumers-20261126/README.md), Guru 4.17.0/26101374; 519/519 IDs, +19 granular rules, +3 umbrella evidence refinements. Actual game HEAD 04576ec2239e840176a1a412c06e82aa7b9253cb, version 0.5.24/29, runtime kit b1bf2026eda7dd68a5ccbc883946191e03d235af. Static source, original bundled SQLite and synthetic models only; active config, original device, player response and real provider UNKNOWN.

## Implications

- Daily has separate config false/0/14, two gates and highest-category exemption; direct shift without clamp on lower ordinal; optional minEqual and empty-result rescue. Both original DB pools audited. Preserve current immutable bank/assignment; future experiments require validation, safe offline default and empty-query regression. No inferred causal relation to player errors.
- Distinct board/candidate diagnostic flags; cold-init key mismatch vs separate subscription, two inconsistency reports and 50-record trail. Static discrepancy only. Our local board validation must never depend on telemetry.
- Remote strategy hint flag and local override; no proof it switches solver or particular UI. Existing HELP-02 unchanged.
- Banner config observes updates and both ad types and calculates allowBanner. Secondary observable and physical visibility UNKNOWN. Keep 180/120/420/30, first five wins and atomic receipts; owner deferred rewarded->interstitial remains unchanged.

## Mapping and next action

- guru-daily-diff-config-fallback — Daily: отдельная конфигурация сложности и безопасное встроенное значение false/0/14. Own future Daily policy must retain local safe default and validate full config before applying; current bank unchanged.
- guru-daily-diff-config-observer — Daily: обновление объекта конфигурации через observable. Test new config applied only at new Daily assignment; never rewrite saved puzzle.
- guru-daily-diff-shift-gates — Daily: сдвиг категории только при enable и дополнительном условии провайдера. If approved, expose explicit bounded category shift with documented eligibility, not hidden error-based director.
- guru-daily-diff-top-exemption — Daily: высшая категория исключена из сдвига. Test 4 remains 4 for positive/negative configured shifts; confirm owner intent before adapting.
- guru-daily-diff-shift-index-range — Daily: сдвиг индекса проверяется на выход за четыре категории, без clamp в этой ветке. Validate shift against possible base categories; safe fallback instead of out-of-bounds. Test negative and excessive numeric shifts.
- guru-daily-diff-min-equation — Daily: equation_count передаётся как minEqual при включённой конфигурации. Before any new Daily selector, evaluate candidate availability for every allowed profile/category; choose safe fallback; retain immutable assignment.
- guru-daily-diff-empty-query-rescue — Daily: пустой первичный запрос ведёт в отдельный путь восстановления выдачи. Verify all empty-result conditions and exact fallback before product port; ensure no blocked Daily entry.
- guru-diagnostics-config-check-blocks-initial — Диагностика: начальный флаг check_blocks_exception_config. Keep local consistency validation independent of telemetry config; test disabled logging doesn't suppress arithmetic checks.
- guru-diagnostics-candidate-initial-key-mismatch — Диагностика: начальное чтение CandidateReportTracker использует ключ check_blocks_exception_config. Use separate typed keys and check cold initialization/update agreement; never copy suspected mismatch.
- guru-diagnostics-flags-observe — Диагностика: независимые подписки и обновления двух флагов. Test independent flags, absent values, stale callbacks, and teardown.
- guru-diagnostics-board-inconsistent-report — Диагностика: отдельные сообщения о несогласованности заполнения и доступных фишек. Add developer diagnostics for impossible board/token state; never use analytics as game validator.
- guru-diagnostics-candidate-record-gate — Диагностика: ведение локальных записей CandidateReportTracker ограничено двумя проверками. If necessary, use bounded debug-only event trail with opt-in; no player data payload by default.
- guru-diagnostics-candidate-record-cap — Диагностика: журнал кандидатов ограничен 50 записями. Use bounded ring buffer, test 49/50/51, preserve no mutation of live board.
- guru-strategy-hint-config-fallback — Стратегические подсказки: отдельный remote enable с default false. Keep Explain/HELP-02 behavior intact; optional later UX experiment requires owner approval.
- guru-strategy-hint-config-local-eligibility — Стратегические подсказки: локальный флаг может разрешать путь независимо от remote enable. Trace local preference key and UI entry first; never disable existing Explain or auto-select strategy from this evidence.
- guru-banner-loading-config-default — Баннер при загрузке fullscreen: отдельная настройка с fallback false. Do not change current banner/cooldown pilot. Compare only after real adapter acceptance.
- guru-banner-loading-config-observe — Баннер при загрузке fullscreen: однократная инициализация наблюдателя и перерасчёт при обновлении. Use one lifecycle-owned subscription, cancel on dispose; ensure config refresh does not show duplicate banner.
- guru-banner-loading-interstitial-rewarded-sync — Баннер: синхронизация отдельных состояний interstitial и rewarded. Test overlapping load/cancel/error callbacks and adapter state transitions separately from impression/reward.
- guru-banner-loading-allow-policy — Баннер: remote флаг используется в вычислении allowBanner, совместно с отдельным состоянием и счётчиками. Before adaptation resolve state semantics and device transitions; separate banner permission from actual rendered banner, no ad cadence changes.

## Verification

122 ARM64 word anchors, 23 literal sites, 9 direct BL checks (overlapping); local 264 SQL row-set controls and 176 synthetic shift cases, 21 range-error paths. Replay combined script published but its exact published version not independently rerun. Complete connector-side equivalent schema/ID/status/evidence gate and comparison enum: 0 errors. Canonical Python full-file CLI still blocked (local network unavailable, prior CI failure no readable logs). No Android acceptance or production change. KIT IMPACT: RESEARCH / CANDIDATE; runtime NONE.
