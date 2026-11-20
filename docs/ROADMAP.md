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

## Ревизия оригиналов 20 ноября 2026

Состояние реализации проверено на 0.5.7 в ветке PR #2. В [реестре](porting/ADOPTION_LEDGER.json) каждому исходному правилу соответствует запись, а в [разборе](porting/REFERENCE_REAUDIT_2026-11-20_RU.md) перечислены выявленные пробелы, очерёдность и критерии приёмки. Для самостоятельного сопоставления доступен [построчный указатель](porting/FEATURE_INDEX_RU.md).

| Следующий этап исследования | Результат для принятия решения |
|---|---|
| Проверка материала поля и помощи | Установить доступность одинаковых скрытых знаков в EasyFun и сопоставить пять соседних повторов рисунка поля в кампании после первых 15 уроков с их восприятием в игре. Проверить один авторский пример с независимым решателем. |
| Результат, календарь, Free | Проверить личную базу из 10 финишей, награду месяца и маршруты Relax/Challenge по отдельности. Привязать каждый элемент к существующему экрану. |
| Прогресс ограниченной активности | Развести достижение этапа, показ при следующем входе и постоянную запись о выдаче. Затем оценить гонку, дуэль и недельную лигу по их отдельным источникам. |
| Монетизация и выпуск | Сохранить цены, IAP, placements и общие табличные следы для отдельного решения. Оценивать совместимость с базовой экономикой и условия показа на устройстве. |

Это порядок снятия неопределённости. Согласованные этапы A–F, runtime pin и условия публикации сохраняют силу.

## Уточнения EasyFun по ARM64

[Проверка трёх правил](porting/EASYFUN_NATIVE_FOLLOWUP_RU.md) разделяет расчёт EasyFun и собственные варианты реализации. Для UX результата выбрать точную подпись и правило усреднения. Для календаря учесть недостижимость полного первого месяца на профиле, созданном после первого числа. Для поля проверить одну авторскую раскладку с одинаковыми скрытыми значениями, а для живого события зафиксировать уровень с положительным hiddenNumber. Учёт ведётся по прежним ID и семи новым записям в [реестре](porting/ADOPTION_LEDGER.json).

## Оболочка вокруг игрового поля · 20 ноября 2026

[Аудит всех экранов 0.5.7, аналоги, макеты и приёмка](porting/ui-audit-057/README.md). Для ближайшей задачи использовать раздел «Передача разработчику». Сначала главная, режимы, профиль и проверка касания на 320 px при увеличенном тексте. Затем календарь и мастерская на том же профиле. Третьим пакетом довести остальные диалоги и приёмку на устройстве. Игровые клетки, механика и текущая прибавка монет приняты владельцем. Старое исследовательское предложение добавить эффекты к выплате не входит в эти три пакета.
