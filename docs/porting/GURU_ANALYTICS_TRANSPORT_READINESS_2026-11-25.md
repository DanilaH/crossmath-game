# Guru analytics transport and ad readiness — consumer mapping

25.11.2026. Source inventory f0001f9067dc3bb945053a72163afe3285b181d9, [private reference research](https://github.com/DanilaH/mini-games-kit/blob/f0001f9067dc3bb945053a72163afe3285b181d9/research/games/crossmath/porting/guru-analytics-transport-readiness-20261125/README.md). Developer code 04576ec2239e840176a1a412c06e82aa7b9253cb, Crossmath 0.5.24/29, kit runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. 500 unique source IDs, 500 mapped; 40 new granular findings, all DEFERRED/MISSING, 5 umbrella evidence refinements. No code, economy, owner scope, or acceptance promotion. The code pointer is a real existing local state/receipt comparison, not an implementation of the source feature.

## Research conclusions

- Separate event store, pending/status/priorities, transactional lease, stale-session reset, expiry and exact-ID deletion. Serial timestamp transport and alternative cleanup. Two timestamp-tie cases reproduced in an independent SQLite model; not observed Guru device defects.
- Native bridge passes 32/60, parser defaults delay 10 seconds and expiry 7 days, separate Android unmetered periodic Worker 40/15 with 10-minute linear backoff, unique KEEP. No guarantee of live configuration, scheduling, or delivery.
- ActivityAnalytics guarded backlog threshold 10 and drain recovery. Readiness accumulation per format, raw 60000 threshold, clearing/state audit and separate loaded events. Units and live callback outcomes UNKNOWN.
- Candidate future minimal typed event schema, bounded durable outbox, exact-ID ack/prune, consent/retention, per-format metrics distinct from impressions/earned receipts. No generic rule engine or remote director approved. Original evaluator diagnostic consumer and causal config-to-game policy remain UNKNOWN. Existing commercial pilot and help unchanged.

## New IDs and next actions

- guru-analytics-event-room-storage — Событие аналитики хранится отдельной Room-строкой с первичным ключом id и priority DEFAULT 10. Separate bounded local outbox; don't reuse reward receipts as telemetry.
- guru-analytics-event-replace-id — Повторный id события вставляется с заменой. Prefer idempotent event identity; test duplicate/retry immutability.
- guru-analytics-pending-status-filter — Обычная выборка только status=0. Model pending/leased/delivered separately from gameplay.
- guru-analytics-priority-time-order — Обычная очередь сортируется по priority ASC, затем at ASC. Add stable ID tie break in own queue; test priority fairness.
- guru-analytics-bounded-batch — Обычная выборка имеет параметризованный LIMIT. Bound batch size; no network in input-critical path.
- guru-analytics-batch-atomic-lease — Выборка пачки и перевод ID в status=1 с текущей сессией в транзакции. Use transactional batch lease and restart tests.
- guru-analytics-stale-session-requeue — Статусы событий из другой сессии сбрасываются в 0. Recover stale lease; test same-session preservation and crash.
- guru-analytics-event-strict-expiry — Просроченные события удаляются по at < cutoff. Use explicit retention and separate consent policy.
- guru-analytics-queue-overflow-cleanup — SQL очистки превышенного лимита удаляет записи по множеству старых временных меток. Use deterministic exact ID-based pruning; test timestamp ties; don't copy broad at IN.
- guru-analytics-event-exact-id-delete — DAO удаляет событие по id. Delete only acknowledged IDs; handle partial success.
- guru-analytics-serial-cursor-query — Последовательная выборка по at >= cursor, at ASC, LIMIT без status/priority. If serial queue needed, stable composite cursor or exact IDs; don't copy unchecked time cursor.
- guru-analytics-serial-batch-reserve-send — Последовательный sender резервирует выбранные ID до вызова транспорта. Test lease/payload/transport ordering; no automatic gameplay grants.
- guru-analytics-serial-checkpoint — Обработчик результата последовательной отправки сохраняет положительный timestamp элемента списка. Persist acknowledged checkpoint only; test partial response.
- guru-analytics-serial-cutoff-delete — Последовательный callback вызывает очистку по timestamp+1. Use acknowledged IDs, test same-timestamp batch boundary.
- guru-analytics-upload-failure-release — Ветка Throwable сбрасывает статус ID пачки в 0 и возвращает false. Test failed upload, duplicate response and lease release.
- guru-analytics-serial-http-immediate-retry — Ветвь serial retry немедленно повторяет HTTP 405/406; другие ошибки не повторяются в этой ветви. Do not copy status policy; bounded retry with backoff and classified failures.
- guru-analytics-event-name-nonblank — Валидация имени события отклоняет blank. Typed event names and nonblank validation.
- guru-analytics-event-name-length — Валидация имени события ограничивает длину 128. Test 128/129 name boundaries; choose own schema.
- guru-analytics-event-name-first-letter — Имя события начинается с ASCII A-Z/a-z. Validate first character in typed event schema.
- guru-analytics-event-name-alphabet — Имя события отклоняется при символах вне a-zA-Z0-9_. Validate alphabet, Unicode/control characters.
- guru-analytics-event-reserved-name — Отдельная ветка для имени test из reserved set. Separate diagnostic/internal names from product telemetry.
- guru-analytics-event-executor-handoff — При подходящем process gate EventItem передаётся в Executor. Non-blocking enqueue; test executor rejection without gameplay impact.
- guru-analytics-worker-unmetered — Периодический Android Worker требует UNMETERED. Choose own network constraint with owner; test metered/offline.
- guru-analytics-worker-period-flex — Периодическая задача 40 минут, flex 15 минут. Use platform scheduling, not guaranteed exact cadence.
- guru-analytics-worker-linear-backoff — WorkManager LINEAR backoff 10 минут. Use bounded backoff; test retry policy separately from foreground.
- guru-analytics-worker-keep — Уникальная периодическая задача AnalyticsUploader с KEEP. Avoid duplicate worker on reinit; test unique scheduling.
- guru-analytics-worker-force-upload-gate — Force upload в основную очередь допускается только при main-process и initialized engine. Test duplicate worker, main/secondary process, cold DB path.
- guru-analytics-config-default-capabilities — При отсутствии cap parser создаёт firebase/facebook/guru список. Choose minimal consent-approved provider, not all source defaults.
- guru-analytics-config-default-init-delay — init_delay_s fallback 10 секунд передаётся как delayedInSeconds. Separate start delay from readiness; choose own initialization policy.
- guru-analytics-config-default-expiry-days — expired_d fallback 7 дней передаётся как eventExpiredInDays. Owner-approved retention, privacy and expiry tests.
- guru-analytics-bridge-batch-limit — Flutter bridge initialize передаёт batchLimit=32. Bound batch; values are source evidence not Crossmath target.
- guru-analytics-bridge-upload-period — Flutter bridge initialize передаёт uploadPeriodInSeconds=60. Choose own foreground dispatch cadence; no live-delivery claim.
- guru-analytics-config-serial-binding — enable_serial_upload параметр связан с serialUpload моста. Default to simplest reliable own transport after owner selection.
- guru-analytics-activity-backlog-warning — ActivityAnalytics при pending>=10 отмечает backlog с guard. Measure queue backlog and avoid repeated spam; distinct from durable network outbox.
- guru-analytics-activity-backlog-recovery — ActivityAnalytics снимает backlog marker при pending=0 и пишет recovered. Test one warning/recovery and queue drain; don't tie to rewards.
- guru-ads-readiness-duration-accumulate — Отдельный по типу рекламы аккумулятор duration складывает предыдущее значение и найденный интервал. Track load/readiness per format using verified monotonic clock; no grant inference.
- guru-ads-readiness-duration-threshold — Одна ветка readiness публикует значение только при накопленном duration >=60000. Choose clock units explicitly; test threshold boundaries.
- guru-ads-readiness-duration-clear — Другие ветки readiness удаляют состояние или IdleToLoadedDuration после публикации. Reset state at explicit lifecycle boundary; test repeated callback.
- guru-ads-readiness-isloaded-audit — Отдельное поле isLoaded имеет строковые true/false; формируется ads_ready_cumulative_duration_ с guru/ads_audit. Separate diagnostic metrics from impression and reward receipt.
- guru-ads-loaded-format-events — Отдельные iads_loaded и rads_loaded routes вызывают telemetry publisher. Instrument actual adapter callback by format; test duplicate, canceled, no-fill; not ad display.

## Validation

Full-field connector-side check (same ID/schema/status/required evidence conditions as canonical gate, with sourceFeatureId equality) on actual complete JSON: 0 errors. Canonical Python CLI not run here against the full files: local sandbox cannot access raw GitHub; previous CI run 45667749103 failed and logs unavailable. No exhaustive transfer or native/device acceptance claim. Source has pinned replay script, 103 DEX first-code-unit and 77 ARM64 guards, local SQLite controls and two counterexamples.

KIT IMPACT: RESEARCH / CANDIDATE. Runtime NONE.
