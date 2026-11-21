# Crossmath roadmap

Source: [owner specification 1.0](spec/Crossmath_TZ_v1.0_RU.md), sections 12–13. Scope is not replaced by an approximate plan.

| Stage | Implementation | Acceptance gate |
| --- | --- | --- |
| A — foundation/core | Exact Android kit bootstrap, 240 boards/routes, immutable import, independent uniqueness search, token commands | Typecheck, independent bank verification, command/inventory regressions |
| B — session | Semantic board/tray, both tap orders and drag, replacement/swap/return/undo/sort, lifecycle, atomic save, pause and result | Gesture smoke, fields 7/12, interrupted-write tests, installable APK |
| C — vertical slice | Fresh logical help + independent proof checking, isolated reveal, durable single charge, 15 lessons and continuation | HC checks in scope, cold restore/single reward, P01–P07 slice protocol and phone review |
| D — meta/calendar | Free selector, fixed-zone Daily/archive and lives, reachable daily goals, rank/album screens, migration | Openings 3/5, first card at 8, +100 receipt, midnight, 228/229, M01–M12 |
| E — full version | Endless UI/runs/records, profile/statistics/achievements, RU/EN, platform services | Four modes; scripted then real ads; cancellation/late callbacks; separate records |
| F — release | Physical devices, TalkBack, 200% OS font, offline/process death, real SDK, signed store artifact and metadata | Exact artifact, P01–P10/HC01–HC12/M01–M12, owner publication decision |

A–D are implemented in retained previews, with phone acceptance still pending. E1 adds the offline Endless/profile/achievement portion in 0.3.0. E2 adds RU/EN, the optional Android ads bridge and scripted callback coverage in 0.4.0. Real provider, device and store acceptance remain open.

## 0.5.10 · открытие режимов

[Проверка 3-й, 5-й и 15-й побед](acceptance/mode-unlocks-0510/README.md). Следующая точка приёмки — самостоятельный выбор режима и поиск заданий дня на телефоне. [Сценарий на 3–5 участников](acceptance/mode-unlocks-0510/PHONE_TEST_RU.md).
