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

## Редизайн задачи №5

Пакеты 1–5 реализованы в 0.5.22–0.5.23. Приёмка Chromium и подписанного APK завершена. Физическое устройство требуется для проверки системного масштаба, слышимого звука и вибрации. [Протокол](acceptance/issue-5/README.md).

## Исследование Guru 4.17.0 · 23 ноября 2026

Новая исходная запись `guru-badge-ceremony` добавлена в [реестр](porting/ADOPTION_LEDGER.json) в статусе **EVIDENCE_GAP / MISSING**. Бинарное сравнение Guru 3.5.2 → 4.17.0 подтвердило 17 Lottie-композиций для значков (показ, повышение, продвижение), 43 изображения и `badge_up.mp3`; **вызов анимаций в реальном оригинале не проверен**. [Первичный отчёт и repro](https://github.com/DanilaH/mini-games-kit/blob/c3519c7fa9a384493fde567a39915179c58bf71b/research/games/crossmath/porting/guru-badge-417/README.md). Следующий этап — видео 1× на Guru 4.17.0 со звуком и проверка условий выдачи/повторного входа; затем отдельное решение владельца о собственной адаптации. 12 существующих достижений и баланс не изменять из-за одного статического обнаружения.

Задача №5 по ранее утверждённому редизайну остаётся самостоятельной: [независимый аудит 0.5.23](https://github.com/DanilaH/crossmath-game/blob/2bbd6f9804efb2291d7b2e42de091adee9954db4/docs/porting/audit-0523/README.md) зафиксировал четыре косметико-функциональных замечания и отдельную приёмку на Android; новый ID не является блокером задачи №5.

## Исследование выдачи и монетизации · 23 ноября 2026

**Источник:** [Guru 3.5.2 и 4.17.0 — воспроизводимое сравнение APK, 10 публичных iOS предложений, native SDK-строки](https://github.com/DanilaH/mini-games-kit/blob/a02958791b6c5e2fec5e561fa9bee24252ab2a04/research/games/crossmath/porting/guru-commerce-issuance-20261123/README.md). В [реестре](porting/ADOPTION_LEDGER.json) учтены **195/195 sourceFeatureId**, добавлены 11 ID семейств SKU Guru и 4 rewarded placement ID с точной границей доказательств. Расширение реестра **не** меняет принятую экономику, runtime геймкита, APK или ограничения первой версии.

| Очередь | Выявленный материал | Следующий эксперимент и критерий |
| --- | --- | --- |
| CORE research / P1 | 7 922 общих рецепта `default/easy1` имеют изменённую категорию `diff` при неизменных `stuck` и вычислительных метриках; `cm4` и `cm5` содержат соответственно 10 411 и 10 384 уникальных масок на 10 421/10 400 строк | На оригинальном Android: два чистых профиля и старый профиль, фактический результат `puzzle_version`/`getPuzzleFilterConfig`, реальные ID задач до/после ошибок; не заявлять адаптивную сложность только по AOT или смене категории; формула `stuck` UNKNOWN |
| COMMERCIAL evidence / owner-gated | 11 разных семейств Guru IAP, 10 перечислено в App Store US; `hint.20` есть только в нативных строках | На Android открыть Settings → Store, проверить доступность каждой позиции, региональные цены, entitlement и отдельную одноразовую покупку Remove Ads. Реальная транзакция и её восстановление — только с разрешённой тестовой покупкой. Не считать Premium == Remove Ads без проверки |
| COMMERCIAL rewarded / owner-gated | `guru-rv-extra-chance`, `guru-rv-hint`, `guru-rv-ticket`, `guru-rv-store`: отдельные стабильные ID компилированных рекламных меток; наличие кнопок UNKNOWN | Найти пользовательские триггеры, no-fill, отмену, фоновое прерывание, фактический SDK impression и однократную выдачу. Не реализовывать в нашей 0.5.23 до решения владельца и реальных SDK-проверок |
| EVENTS/COMPETITION research / later | В обеих Guru одинаковые встроенные модели Star Race и Brains, но текущий серверный баланс/матчи UNKNOWN; EasyFun рекламирует Weekly Themed Events, пока не обнаружен реально доставленный Event с `hiddenNumber>0` | Оригинал 1×: дата события, загрузка/вход, ограничения/очки, выдача, повтор и истечение; сравнить локальные данные и live-конфиги. При закрытом событии зафиксировать невозможность доступа, не выдумывать контент |
| META feel/lifecycle | `guru-badge-ceremony` подтверждена Lottie/AOT, но UI-вызовы/звук/вибрация UNKNOWN; оригинальный уход в фон и сохранение не проверены | Android до→касание→после 1× со звуком, пауза/закрытие/restart, действительная квитанция. Собственные наградные ассеты после доказательства и решения владельца |

**Решения и границы:** данные IAP/ads/event остаются в полной дорожной карте как исследованные и неподтверждённые возможности. Первая версия не включает платные функции без отдельного продуктового, технического и платформенного решения; это не `OWNER_EXCLUDED`. Редизайн задачи №5 и четыре прежних замечания продолжают проверяться отдельно. KIT runtime pinned `469928d03f4bae5053e23db26e82187bedbc252e`; source inventory pin для этой ревизии `7fef14def6bd31107becb7b83f0a947c412cda06`.


## CORE research · Guru default/easy1 · 23 ноября 2026

[Нативный состав профилей, E24/E25/E27/E47](https://github.com/DanilaH/mini-games-kit/blob/7fef14def6bd31107becb7b83f0a947c412cda06/research/games/crossmath/porting/guru-profile-pool-20261123/README.md) — два новых ID: `guru-easy1-pool-substitution`, `guru-tag-4-2-lower-range`. Полные cm4/cm5 различаются не только названием категории: из default исключено 2499 `stuck>=5` рецептов, введено 2478 других, в том числе 2228 `tag=4_2`, где установлен более низкий предел числа генератора. Действующий серверный выбор `default/easy1` не доказан.

Минимальное число доступных записей даже после худшего набора 300 исключаемых масок и при выключенном дополнительном фильтре: `cm4` 1344/2462/2705/2700; `cm5` 1403/1865/2462/3456 (по `diff 1..4`). Это **границы локальных данных**, не запись игрового процесса. `stuck` exact algorithm и live enabled filter UNKNOWN.

**Этап для нашей игры:** данные переданы в исходный inventory + consumer ledger; новая `content-v2` экспериментальная ветка возможна только после замера реального темпа собственных полей и решения владельца. Не переписывать существующие кампанию, bank, экономики и сохранённые ID только ради механического совпадения с двумя профилями Guru.

## Навигация по видео оригинала · 23 ноября 2026

Владелец утвердил **перенос иерархии из записей оригинала**, [техническое ТЗ с девятью sourceFeatureId](porting/navigation-guru-20261123/DELIVERY_SPEC_RU.md), [задача #6](https://github.com/DanilaH/crossmath-game/issues/6). Источник в [mini-games-kit](https://github.com/DanilaH/mini-games-kit/blob/46e16cdb3645956b6b3f32b42481e3cb9cdabddb/research/games/crossmath/porting/guru-navigation-20261123/README.md), визуальный app/build в записи UNKNOWN. **Новая структура — 4 root-tabs: Главная / День / Режимы / Профиль**, без табов в поле/результате. Отдельный нижний лист New Game и вложенные фильтры Profile. Мастерская остаётся deep link с главной и из профиля. Третий таб сознательно адаптирован под существующие режимы вместо неготовой Battle M3.

| Пакет | Текущее состояние | Приёмка |
| --- | --- | --- |
| NAV-A · shell+главная | В разработку, **ещё не реализован** | Первый runnable маршрут и кадры 320×568 / 390×844, Continue/New Game отдельно |
| NAV-B · день+режимы | В разработку | Пин даты/старые попытки, 3/5/15 unlock, Endless preserve, no fake Battle |
| NAV-C · профиль+мастерская | В разработку | Фильтры режимов/сложности, 12 приборов, прогресс 1/4→2/4 и отсутствие ложной статистики |
| NAV-D · приёмка | В разработку | RU/EN, обе темы, 100–200%, reduced motion, Android Back/insets/TalkBack, реальное 1× видео со звуком |

**Не откатывать готовое из issue #5:** победа, звук/вибрация, выдача монет, детали, текущий банк и сохранение остаются действующими. Старое меню «Все режимы» и широкие internal Back заменяются новым указанием; оставшиеся замечания #5 переоцениваются в новом shell, чтобы не реализовывать одновременно две противоречащие IA. Runtime `469928d03f4bae5053e23db26e82187bedbc252e` не меняется. [Ledger 204 ID](porting/ADOPTION_LEDGER.json).

### Навигация 0.5.24

Пакеты задачи №6 реализованы. NAV-01–08 проверены в Chromium, подпись и ресурсы оптимизированного APK сверены. Принятие Android требует устройства. Данные и решение о запуске дуэли M3 и онлайн-рейтинга остаются отдельными задачами. [Протокол](acceptance/issue-6/README.md).
