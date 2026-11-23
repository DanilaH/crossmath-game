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

Владелец утвердил **перенос иерархии из записей оригинала**, [техническое ТЗ с девятью sourceFeatureId](porting/navigation-guru-20261123/DELIVERY_SPEC_RU.md), [задача #6](https://github.com/DanilaH/crossmath-game/issues/6). Источник в [mini-games-kit](https://github.com/DanilaH/mini-games-kit/blob/46e16cdb3645956b6b3f32b42481e3cb9cdabddb/research/games/crossmath/porting/guru-navigation-20261123/README.md), в одном ролике подтверждена GUI-версия 4.18.0-26111743, точные версии остальных восьми неизвестны. **Новая структура — 4 root-tabs: Главная / День / Режимы / Профиль**, без табов в поле/результате. Отдельный нижний лист New Game и вложенные фильтры Profile. Мастерская остаётся deep link с главной и из профиля. Третий таб сознательно адаптирован под существующие режимы вместо неготовой Battle M3.

| Пакет | Текущее состояние | Приёмка |
| --- | --- | --- |
| NAV-A · shell+главная | Реализован в 0.5.24 | Первый runnable маршрут и кадры 320×568 / 390×844, Continue/New Game отдельно |
| NAV-B · день+режимы | Реализован в 0.5.24 | Пин даты/старые попытки, 3/5/15 unlock, Endless preserve, no fake Battle |
| NAV-C · профиль+мастерская | Реализован в 0.5.24 | Фильтры режимов/сложности, 12 приборов, прогресс 1/4→2/4 и отсутствие ложной статистики |
| NAV-D · приёмка | Пройдены Chromium и проверка APK. Приёмка на устройстве открыта. | RU/EN, обе темы, 100–200%, reduced motion, Android Back/insets/TalkBack, реальное 1× видео со звуком |

**Не откатывать готовое из issue #5:** победа, звук/вибрация, выдача монет, детали, текущий банк и сохранение остаются действующими. Старое меню «Все режимы» и широкие internal Back заменяются новым указанием; оставшиеся замечания #5 переоцениваются в новом shell, чтобы не реализовывать одновременно две противоречащие IA. Runtime `469928d03f4bae5053e23db26e82187bedbc252e` не меняется. [Протокол 0.5.24](acceptance/issue-6/README.md) · [Реестр](porting/ADOPTION_LEDGER.json).

## Видео Guru 4.18.0 · расширенная приёмка помощи/меты · 23.11.2026

[Видеоаудит Guru 4.18](https://github.com/DanilaH/mini-games-kit/blob/6c8542981d292a8dd4621cd855cb18dab127b48b/research/games/crossmath/porting/guru-runtime-418-20261123/README.md): на видео 13-49-51 в 81.0 s прямо указано **`Version 4.18.0-26111743`**; остальные клипы того же набора лишь предположительно соответствуют версии. У ранее изученного APKM 4.17.0 другая исходная версия; не смешивать runtime со статикой. В реестре игры **222/222 ID**, 18 новых независимых правил/триггеров зарегистрированы как RESEARCHED / IMPLEMENTED_UNVERIFIED / DEFERRED, а не в качестве уже реализованных.

| Направление | Original runtime evidence | Состояние в игре 0.5.23 / следующий шаг |
| --- | --- | --- |
| Обучающий Explain | 13-49-24 t5–17: `28 + A = B`, пара A=1/B=29; OK возвращает **то же поле**, затем игрок вручную ставит 29. 13-49-19 t1.5–10: правило о 35>25 и ручная установка 10 | Наш `Help → Explain → Apply` **сразу применяет** доказуемый ход с расходом ресурса. Решить об отдельном бесплатном preview vs платном применении; до решения владельца экономику не менять |
| Настройки | В 4.18 t75–81: Show Explanation Button, Auto Submit, Large Font, Division Symbol, Sound, Vibration, Timer, Theme, Store | Сверить с существующими 5 настройками 0.5.23. Отдельно проверить на Android флаги и сохранение; не выдумывать, как переключатель Auto Submit меняет режимы |
| Очередь победных сообщений | 13-48-55 t4–20: Level UP → Daily Quests → Doctorate Cap, собственная кнопка Leaderboard | Наша атомарная квитанция/мастерская есть, оригинальной очереди нет. UX-проверка/проектное решение отдельно от #6, без новых выплат по анимации |
| Endless | 13-49-07 t4–11: Submit No/Yes и Skip message; t21–74: после Next Stage виден fullscreen playable ad, затем возврат на результат и повторное нажатие; 13-49-14: до Submit нет автоматической оценки ошибок | Наш `ads.beforeNext()` — скриптовый мост без live провайдера; после callback автоматически запускаем следующий этап. Не копировать рекламную частоту или второе нажатие без проверенного SDK/решения владельца |
| Дальнейшая проверка | 4.18 APK ещё не предоставлен, helper `CrossMathSolver.solve()` 4.17 статически известен, но native full solve не исполнен | Отдельный статический дифф 4.17↔4.18 после получения точного APK и Android live evidence; текущий генератор нашей игры не менять |

**Приоритет для разработчика:** выполнить утверждённый навигационный issue #6 и критичные дефекты issue #5; новый UX Explain/queue/ads **не** входит в это задание автоматически. Оценить предложенную дополнительную задачу после согласованного меню и сценария на телефоне.

## Guru 3.5.2 → 4.17.0 · аналитика Explanation и контекстные уроки

**23.11.2026, NATIVE_STATIC / ASSET_VERIFIED (не Android runtime):** [воспроизводимый сравнительный отчёт, 2 ELF, 2 Lottie](https://github.com/DanilaH/mini-games-kit/blob/814f036f6fc1f529e7704905d7b5e62098a7c3f3/research/games/crossmath/porting/guru-ux-telemetry-417/README.md). В 4.17.0 появились точные AOT-имена трех событий Explanation (`imp`, `clk`, `banner clk`) со счётчиком, двух событий Expert hint, индивидуальных guide-проверок (Sort/Revert/Strategy/FirstError, состояния Hint/Division/Theme), фильтра и internal `PuzzleFilterDebugPage`, систем AnalyticsRecorder/Transmitter/Calibration/ActivityLedger/remote bucket и рекламы readiness, а также двух Lottie для игрового обучения **60 fps × 90 кадров / 1,5 s**. Эти точные имена/пути **не найдены** в AOT/ресурсах 3.5.2; эквивалентные старые механизмы этим не опровергнуты. Live impressions/база событий/сервер и фактический показ Lottie **не проверены**.

| Система / sourceFeatureId | Crossmath 0.5.24 / 29 · текущее состояние | Решение и критерий |
| --- | --- | --- |
| `guru-explain-btn-impression`, `guru-explain-btn-click`, `guru-explain-banner-click`, `guru-explain-banner-click-count` | Собственный Help→Explain/Reveal, но **нет** зарегистрированных именно таких аналитических событий/учебного баннера | Прежде установить original activation и правила consent. Если владелец согласует учебное Explanation отдельно от платного применения, вводить только собственные `visible→open→dismiss` события с тестом пропуска/повторного входа |
| `guru-expert-hint-impression/click` | Собственного Expert coach и его instrumentation нет | В оригинале измерить первый показ/клик и повтор; не считать событие успешным лишь по имени в AOT |
| `guru-guide-sort/revert/strategy/first-error-trigger`, `guru-guide-hint/division/theme-state` | Есть 15 уроков, но нет доказанной аналогичной event-driven state machine после освоения механики | Снять оригинал до/при/после действия, повтор/процесс-килл, проверить персистентность флага, затем отдельное owner решение по ненавязчивому onboarding |
| `guru-puzzle-filter-debug-preview` | Собственный банк/выдача не заменены; у нас нет developer-only UI оригинала | Internal debug page может быть неричабельной в production. Не добавлять в release, пока не доказан вход и не принято отдельное решение. Активный remote filter/stuck остаётся UNKNOWN |
| `guru-analytics-calibration/event-rules/cycle-ledger/transmission/bucket-group` и `guru-ads-readiness-telemetry` | В 0.5.24 лишь собственный scripted/optional Ads bridge; нет подтверждённого live analytics provider | **DEFERRED/owner-gated**: политика consent, SDK, сервер, нужные метрики. Не передавать пользовательские идентификаторы/ключи и не заявлять доходы из APK-строк |
| `guru-guide-equation-fx-lottie`, `guru-guide-hand-click-lottie` | Своё поле и короткие feedback cue, но нет подтверждённой оригинальной пары 1.5с Lottie | При необходимости короткая авторская анимация; свой ассет/звук/haptic, 1× Android и 320×568/390×844. 1.5с — метаданные файла, а не рекомендуемая длина каждой реакции |

**Стадия:** исследование и очередь будущих owner-решений. Issue #6 на 0.5.24/29 имеет браузерную приёмку, 121 тест и собранный APK согласно [acceptance](acceptance/issue-6/README.md); **физический Android не принят**. Не начинать автоматическую переработку обучения/аналитики поверх готовой 4-tab IA. Исходный реестр и ledger синхронизированы **244/244**, source pin `814f036f6fc1f529e7704905d7b5e62098a7c3f3`, игровой runtime kit по-прежнему `469928d03f4bae5053e23db26e82187bedbc252e`.

## Guru · одинаковая числовая основа, разные маски и stuck

[Новый измеренный original-data аудит](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/guru-mask-matched-20261123/README.md) — **23.11.2026**, exact owner-supplied Guru APK 3.5.2/4.17.0, SHA-проверка cm4/cm5 и два независимых подсчёта Python/SQL. В 12 899 уникальных рецептах каталога 1 967 числовых основ используются с 2–5 разными масками `holes`. Из 2 671 сравнений при одинаковых `board/puzzle/size/tag` и одинаковых числовых/операторных статистиках: 233 пары имеют **одинаковое количество пустот, но разный `stuck`**; 18 пар имеют **больше пустот, но меньший `stuck`**. Только 19 пар имеют одну маску как подмножество другой. **Формула исходного `stuck` и server-driven адаптация всё ещё UNKNOWN.**

| `sourceFeatureId` | Поведение оригинала (BUNDLED_DB) | Наш Crossmath 0.5.24 / следующий этап |
| --- | --- | --- |
| `guru-seed-mask-variants` | Числовое поле может быть переиспользовано с другими скрытыми координатами, оставаясь отличной задачей; 1 967 основ с несколькими масками | Наши **275 иммутабельных собственных полей** остаются без изменений. Опционально рассмотреть оригинальный **собственный** второй mask-variant на собственном поле в будущей content-v3, только после подтверждения уникальности/первого вывода, экономической целесообразности и owner-решения |
| `guru-stuck-mask-topology` | `stuck` в исходной БД зависит от конфигурации скрытых клеток, а не только их числа | У нас корзины и проверка решаемости, но нет воспроизведения авторского `stuck`. При необходимости разрабатывать **собственную измеримую метрику сложности** (логические шаги, ошибки, время), не подменяя её количеством пустот |
| `guru-stuck` (сохранён) | Точное правило присвоения метки неизвестно, но mask-layout зависимость теперь подтверждена | Прямой **приоритет исследователю**: восстановить full solve() E29/H08–H12 и сверить пары с одинаковой числовой основой, не заявлять parity до native/independent solver и source criteria |

**Не делать прямо сейчас:** не переписывать банк, генератор, 0.5.24 сохранения, экономику, контекстные подсказки или приоритеты #6 по этому DATA-only исследованию. Новые находки зарегистрированы и картированы в source inventory / consumer ledger; этап отдельной проверки после owner-решения. Версия runtime mini-games-kit в игре не изменялась.

## Новая оценка stuck · независимая ML-диагностика и ARM64 solve dispatch

**23.11.2026.** [Прямой отчёт, исходные 4.17.0 cm4/cm5, Python repro и ARM64 статическая перепроверка](https://github.com/DanilaH/mini-games-kit/blob/b6e368664265a0300efae484168bf767fa6d04af/research/games/crossmath/porting/guru-stuck-structure-model-20261123/README.md). **Доказательство BUNDLED_DB + самостоятельный MODEL_TEST / NATIVE_STATIC**, это не работа original full solve, не подтверждение Android 4.18 или пользовательского retention.

В 5-fold grouped cross-validation на **12 899** уникальных рецептах Guru `stuck` из каталога предсказывается метаданными (количество скрытых клеток, размер/статистика операций) с MAE **0,4037**, R² **0,9500**. Дополнительные масочные геометрические дескрипторы ухудшают абсолютную MAE до **0,4185**, но улучшают взаимный порядок 2 671 пар масок одной числовой основы **90,60% → 95,66%**, а при равном числе скрытых клеток дают **148/233** правильных сравнений вместо ничьих. Bootstrap по **228** разным основам: **57,33–69,66%**. Posthoc смешанная оценка MAE 0,3966 требует **отдельной** проверки перед применением. **Исходная авторская формула `stuck` остаётся UNKNOWN.**

Повторная проверка инструкций `libapp.so` Guru 4.17.0 независимо подтвердила `CrossMathSolver.solve` BL-цепочку **direct 0xb62b20 → monotonic 0xb61368 → factor 0xb5f9ac → intersection 0xb56b80** и depth-guard `_limitedBacktrackSearch` (при глубине ≥3 ранний возврат). Статические opcodes и вызовы проверены; **полный solve() в среде игры/Unicorn не исполнялся**. Никаких новых независимых исходных правил не появилось, поэтому **source IDs остаются 246**. Уточнены `guru-stuck`, `guru-stuck-mask-topology`, `guru-direct-hint`, `guru-monotonic-hint`, `guru-factor-hint`, `guru-intersect-hint`.

**Рекомендация/этап:** не менять 275 контентных полей, кор-механику и себестоимость контента в Crossmath **0.5.24/29** из-за этого опыта. Следующий CORE эксперимент — actual native `solve()` на контролируемых парах масок (прежде всего 233 равнопустотных), отдельная оценка прямой/факторной/пересекающей стратегий и доля `null`; затем на **собственных** полях эксперимент с человеческим временем и ошибками, только по решению владельца. Runtime kit pin `469928d03f4bae5053e23db26e82187bedbc252e` не повышать. [Ledger 246/246](porting/ADOPTION_LEDGER.json), research pin `b6e368664265a0300efae484168bf767fa6d04af`.

## Сквозной аудит референсов 23 ноября 2026

**Актуальная база игры: 0.5.24 / versionCode 29**, gameplay commit `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, [NAV-01–08 acceptance](acceptance/issue-6/README.md). Полный [consumer gap audit 20 систем](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md) и [исходный мастер-отчёт mini-games-kit](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/README.md) теперь имеют приоритет перед историческими небольшими проходами и их числами 177/195/222/246. Новая исходная система из **265 sourceFeatureId** (включая дополнительные 16 коммерческих / lifecycle / UX механизмов) сопоставлена в [consumer ledger](porting/ADOPTION_LEDGER.json).

**Две независимые оси приёмки:**
1. **Source ID gate** — ни одного исходного правила, триггера, вида награды, SKU или рекламы нет без строки в consumer ledger и явной стадии/следующего действия.
2. **Surface gate** — перечислены **64/64 EasyFun Unity prefabs**, **18/18 таблиц**, **17/17 групп Dart UI Guru** (265 названий AOT путей и 25 точных трасс), отдельно видео GUI Guru 4.18 и фактические открытые сцены. Наличие нативного пути/Unity prefab не доказывает доступность экрана пользователю и не заменяет локальную Android проверку.

| Приоритет | Статус в оригинале / отличия от 0.5.24 | Следующий критерий |
| --- | --- | --- |
| **CORE — original solver, `stuck`** | Прямая генерация и две категории каталога разобраны, но полный `CrossMathSolver.solve` не исполнялся; `stuck` зависит от mask topology, авторская формула UNKNOWN; у нас свой банк 275 | Native execution всех стратегий Guru 4.17 на same-seed mask pairs с независимой проверкой; **не** переписывать наш банк без owner-решения и human play data |
| **ORIGINAL UI / FTUE / feel** | 9 видео Guru, только 13-49-51 подтверждает 4.18.0; root-tabs #6 у нас уже реализованы | Версия+снимок конкретного оригинала, несколько последовательностей before→touch→after, затем Android нашей 0.5.24 c физическим sound/vibration/back/TalkBack |
| **Базовый LiveOps** | Guru Daily, Postcard, Adventure, Brains и StarRace код/конфиги разобраны; EasyFun скрытые Owl требуют Event `hiddenNumber>0`; у нас только локальные Daily/мастерская | Реально полученный активный Event JSON, дата/конкретный экран, claim ledger + restarts; remote cohorts без API UNKNOWN |
| **Бой, бот, соревновательные механики** | В референсе независимые bot/ticket/streak/keep-streak/add-heart, на видео Battle locked; M3 в игре отложена | Реальная запись матча и live источника, затем отдельное owner решение по M3, не добавлять фальшивую online дуэль |
| **Коммерция/реклама** | Guru 11 семейств IAP + отдельный RemoveAds/developer response, MREC, ClaimCoins, RedeemCode, Rewarded IDs; EasyFun 7 interstitial/4 banner/8 rewardtemplate | Реальные Android SDK events, billing SKU/receipt/restore/refund, eligibility/caps/offline и consent; в первую сборку не включать автоматически |
| **Удержание/аналитика/lifecycle** | Notification guide, feedback, update dialog, аналитические ключи Explanation, реклама и server calibration встречаются в исходных данных; save state/code и video разные evidence | Промпт permission, фактический push/deep link, retention data, cancel/back/process-kill и GDPR. Не заявлять D1/D7 из APK |

**Что уже не надо делать повторно:** не переписывать полностью меню 0.5.24 — оно присутствует в PR #4, [точные видео/браузерные tests](acceptance/issue-6/README.md). Приёмка на физическом Android, Play Billing и event SDK — **не выполнена**. Runtime kit остаётся pinned `469928d03f4bae5053e23db26e82187bedbc252e` даже при более свежем source inventory.

**Этапы реализации — не отказ:** дорогостоящие механики из исходника сохраняются как `DEFERRED` или `EVIDENCE_GAP` с причинами, не как `OWNER_EXCLUDED`. Только владелец решает исключение или принятие. Общий реестр **не** задаёт автоматическое внедрение всех 260 механизмов в одном PR.

## EasyFun 1.1.9 feedback + exit metadata — корректировка

Дополнительный [точный XAPK/IL2CPP metadata-аудит](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/EASYFUN_FEEDBACK_EXIT_RECHECK.md) зарегистрировал `easy-feedback-photo-attachment` (галерея, permission, изображения, удаление, ограничение размера) и `easy-feedback-validated-submit` (проверка email/длины, запрос, сброс состояния). В оригинальном GUI они не запускались, допустимость и доставка UNKNOWN. В **Crossmath 0.5.24** отсутствуют пользовательские media-feedback и backend; **RESEARCHED/MISSING**, owner gated и privacy-sensitive. `easy-exit-reason-panel` по методам `ExitHistory/UploadEX` относится к диагностической истории/выгрузке и **не доказан как пользовательский exit survey**. Состав source now **265 ID**. Полную матрицу смотреть в [consumer gap audit](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md), не считать метод как live SDK или успешную отправку файла.

## Последнее дополнение full audit: 23 remote-config getters

[Полная проверка native remote-config 3.5.2↔4.17.0](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/REMOTE_CONFIGS.json): 23 отдельных метода Getter (`10` имён есть в старом AOT, `13` новых по точному написанию); [repro](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/verify_guru_remote_configs.py). В [consumer full gap](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md) добавлены отдельные source IDs `guru-banner-during-fullscreen-load`, `guru-free-reward-remote-config`, `guru-remote-vibration-audio-config` с AOT provenance, `MISSING/UNKNOWN/PARTIAL` и экспериментами. Это НЕ active server flags и НЕ разрешение автоматически включить новые рекламные placements/вознаграждения. Итог source ledger **265/265**.

## Guru E30/E32 и EasyFun рекламные defaults · 23.11.2026

**Источник:** [исходный kit-отчёт Guru](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/guru-two-arithmetic-contracts-20261123/README.md) и [EasyFun UnityFS ad tables](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/README.md). [Полный consumer diff и критерии](porting/ARITHMETIC_AND_AD_TEMPLATE_DELTA_2026-11-23.md). Архивы Guru **4.17.0 / 26101374** и EasyFun **1.1.9 / 1193**, точные SHA в source README. **Не означает Android ORIGINAL_RUNTIME** и не приписывает результат 4.18 GUI.

| Механизмы и стабильные ID | Подтверждено | Crossmath 0.5.24 / next action |
| --- | --- | --- |
| `guru-generator-division-step-whole` | E32 исходный генератор требует целого промежуточного частного | В нашем коротком `A op B=C` не используется; future content-v3 только по owner решению |
| `guru-play-division-final-whole` | E30 runtime Fraction допускает дробный промежуточный шаг и целый финальный | Принять единый новый рациональный evaluator/hint/validator для длинной грамматики только в новой версии правил, иначе нечего менять |
| `guru-generator-operation-family` | E31/E47 исходные длинные выражения не смешивают `+/-` и `×/÷` | Собственный генератор длинных выражений, если выбран: ввести тест ассортимента и отдельных семей; старые 275 полей сохранить |
| `guru-direct-long-left-fold` | E43 синтетический direct-helper делает left fold; в банке нет смешанных семейств | Синтетика не равна реальному GUI; сначала установить валидный evaluator и случай, иначе SOURCE_EVIDENCE_GAP |
| Существующие восемь `easy-offer-*` | Таблица содержит `isLimited` (не `enabled`); `free_wheel=4`, `free_20_diamond=10`, шесть `FALSE/-1`; reset window UNKNOWN | Общие wheel/ball/diamond entries вероятно включены библиотекой других проектов: не считать активными и не добавлять fake currency. Продолжать проверку trigger→SDK→reward |
| Существующие семь `easy-inter-*` | Одинаковые bundled Android `0.5` / iOS `0.2` `popupProb` | Не копировать реальную частоту рекламы из таблицы, пока нет живого consent/remote override/no-fill/cooldown |

**Текущий реестр: 269 исходных ID**, четыре новых, 15 уточнённых старых. Точная формула `stuck` и полный end-to-end native `solve()` всё ещё UNKNOWN. Следующий доступный научный опыт — полный оригинальный `CrossMathSolver.solve` со стендом AArch64 Dart AOT. **НЕ переписывать текущий банк и не активировать коммерческие SDK на основании этих открытий.** Игровой source 0.5.24/29 `0401140d5fc0c191e457289b6dc8e5752a9f85a8`; runtime kit `469928d03f4bae5053e23db26e82187bedbc252e` без обновления.


## EasyFun AdManager — клиентские допуски и триггеры выдачи · 23.11.2026

[BUNDLED_IL2CPP_METADATA, точный 1.1.9 XAPK](https://github.com/DanilaH/mini-games-kit/blob/decf77cd397d99f5a1fe5fb171188456bbfec7b4/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/ADMANAGER_METADATA.md): собственный `Assets/MainGame/Script/Manager/AdManager.cs`, клиентские guard методы interstitial, timestamp последнего закрытия, callback разных стадий rewarded, consent/Firebase и типы `RewardTemplate`/`InterstitialTemplate`. Два ID **`easy-ad-client-interstitial-gates`**, **`easy-ad-rewarded-callback-states`** зарегистрированы отдельно. Наш `src/platform/adState.ts` уже проверяет cooldown/защиту после rewarded, `ads.ts` разделяет fullscreen и rewardSettled через долговечную очередь. **Однако исходные значения guard/частота и реальная Android выдача не подтверждены**. Продуктовый этап — только после решения владельца о live SDK и consent. Выдача проверяется по receipt/restart, не по имени колбэка в чужом бинарнике.

Инвентарь стал **271 sourceFeatureId**, в игре **271/271 mapped**. Данные оригинала — static-only, код игры/275 authored boards/монета/XP/сохранения не менялись. [Подробный пакет](porting/ARITHMETIC_AND_AD_TEMPLATE_DELTA_2026-11-23.md). Текущая проверенная сборка **0.5.24/29**, физическая Android acceptance для работы разработчика ещё открыта.

## Guru Endless · две допустимые ошибки и анимация Score · 23.11.2026

[Новый видеопротокол исходного Guru (сборка в этих роликах UNKNOWN)](https://github.com/DanilaH/mini-games-kit/blob/bd80dc0542d91e7d47675dcd1d0971f295537077/research/games/crossmath/porting/guru-endless-video-contract-20261123/README.md): `13-49-14.mp4` в окне обучения говорит о двух допустимых ошибках за забег, на HUD два сердца; это **показанное правило**, но две разные фактические ошибки подряд не воспроизведены. `13-49-07.mp4` t8.7–11.5: после успешного подтверждения Submit счёт **анимированно увеличивается 0→140 с визуальными шагами по 10**, затем Stage2/конфетти/результат. **Формула 140 баллов не раскрыта; это не XP и не подтверждённая стоимость уравнения.**

В нашей [0.5.24 / 29](acceptance/issue-6/README.md), source `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, `src/core/engine.ts:createAttempt` даёт **3 жизни** и отдельное правило одинаковой отвергнутой подписи; `src/meta/career.ts` атомарно считает собственные баллы, `src/ui/gameUi.ts` показывает готовый счёт без анимированного tally. Это **PARTIAL/MISMATCH исходного лимита** и **MISSING source-specific countup**, не дефекты уже согласованной экономики. **Отдельное решение владельца** требуется прежде, чем менять жизни или скорость UX. [Ledger 272/272](porting/ADOPTION_LEDGER.json) содержит `guru-endless-error-budget` и новый `guru-endless-score-countup`.

Следующий эксперимент: Guru original Android 1× — две намеренно разные неверные раскладки/Submit, повтор последнего signature, правильный Submit на двух этапах, проверка перехода и награды при фоновой остановке. Если владелец одобрит нашу анимацию, это должен быть исключительно **presentation count-up из уже атомарно сохранённой квитанции**, мгновенный final для screenreader/reducedMotion, без дублирования начисления и без задержки следующего хода. Не менять 275 authored полей, сохранённые ID или kit runtime pin.
