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

## Пакеты после аудита 0.5.13

| Пакет | Состояние |
| --- | --- |
| A · исправления кампании, календаря и помощи | 0.5.14, проверено на веб-ресурсах подписанного APK |
| B · новые задания Relax и Challenge | 0.5.15, проверены оба порядка входа, архивные назначения и цель дня |
| C · три лёгких поля в Relax | 0.5.16, отдельно проверены однократность, сохранение и история результата |
| D · месячный трофей | Выпущен как M1 в 0.5.18 |
| E · локальная дуэль | Описан как M3 для отдельного выпуска |

[ТЗ A–E](https://github.com/DanilaH/crossmath-game/blob/4c357aba52179e8b4feb9801a17fd59aa082631d/docs/porting/play-audit-0513/DELIVERY_SPEC_RU.md) · [Протокол A–C](acceptance/PACKAGES_ABC_0516.md) · [Реестр](porting/ADOPTION_LEDGER.json).

## Пакеты меты после аудита 0.5.16

| Пакет | Состояние |
| --- | --- |
| M0 · переходы Endless и кампании | 0.5.17, проверены квитанции и повторные входы |
| M1 · трофеи Daily | 0.5.18, проверены календарные границы, архив печатей и миграция |
| M2 · цели Relax и Challenge | 0.5.19, проверена первая ступень по строкам id 2–4 |
| Исправления по аудиту 0.5.19 | 0.5.20, архив Daily до 1100 дат, достижимые месяцы и старый финал кампании |
| Исправления экранов по аудиту 0.5.20 | 0.5.21, UI-01–08. Chromium и APK проверены, физический отклик Android ожидает проверки. [Протокол](acceptance/qa-0521/README.md) |
| M3 · локальная дуэль | Отдельный выпуск, после выбора соревнования владельцем |

[ТЗ M0–M3](https://github.com/DanilaH/crossmath-game/blob/279d545986eac9b6e90d01bcff9d989c2985c6a7/docs/porting/meta-0516/README.md) · [Протокол M0–M2](acceptance/PACKAGES_M0_M2_0519.md) · [Замеры 0.5.20](acceptance/qa-0520/README.md).
