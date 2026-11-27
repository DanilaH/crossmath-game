# Crossmath roadmap

**Утверждено владельцем 27.11.2026 — core-first v1.1.** [Crossmath v1.1](spec/Crossmath_TZ_v1.1_RU.md) определяет актуальный состав и порядок. CORE-00 #28 → CORE #16/#17 → LEAGUE #22 → ограниченная META #15/#18/#19 → MONETIZATION #14/#27 → RELEASE. Endless временно отключить без потери сейвов; недельная Лига включена в выбранный scope и не зависит от Star Race/Battle. Остальное ниже — исторические срезы/исследовательские предложения, не распоряжение расширять scope. Точные изменения экономики, очков, темпа и релизной конфигурации согласовать отдельно.

## Актуальная очередь

| Этап | Задачи | Критерий выхода |
|---|---|---|
| CORE-00 | [#28](https://github.com/DanilaH/crossmath-game/issues/28) | Аудит, безопасное отключение Endless, UI/сейвы, регрессия |
| CORE | [#16](https://github.com/DanilaH/crossmath-game/issues/16), [#17](https://github.com/DanilaH/crossmath-game/issues/17), локальный Reveal | Разнообразие выдачи/банка, сохранение 515 Explain, feel и управление |
| LEAGUE | [#22](https://github.com/DanilaH/crossmath-game/issues/22) | Одна недельная локальная таблица, 9 ботов, обычные победы, медаль; без #21 |
| META | #15/#18/#19 scoped | Полировка Daily/мастерской/фонового профиля; калибровка заданий |
| MONETIZATION | #14/#27 scoped | Согласованная экономика и реальная реклама, без магазина/IAP |
| RELEASE | Отдельная приёмка | Сборка, плейтест, телефон, подписанный совместимый APK |

#20/#21/#23–26 отложены. Длинные выражения — lab, не обязательный release gate. Широкий реверс завершён, конкретные UNKNOWN сохраняются.

[CORE-00 · реализация и протокол плейтеста](acceptance/core-00/README.md). Приёмка владельцем открыта.

[ISSUE-01 · пилот выдачи и замеры](acceptance/issue-16/README.md). Пилот доступен в сборке для плейтеста. Постоянная активация требует отдельного решения.

## Сводная база 27.11.2026

Crossmath 0.5.24 / 29; actual developer HEAD `57820c8c6491c8b6240aeed5cb0dfde61c858927`, gameplay/artifact source `a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21`, runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance pin `469928d03f4bae5053e23db26e82187bedbc252e`. Independent source inventory `c5d55b28a78df7af639ce181c8bce73aacc95ae9`: 714 IDs. [Current map](porting/CURRENT.md), [ledger](porting/ADOPTION_LEDGER.json), [all proposals #14–27](porting/REFERENCE_PORTING_PLAN_2026-11-26.md). Historical dated snapshots below are not current directives.

| Реализованный пакет | Фактический статус |
| --- | --- |
| HELP-02 · задача №11 | Explain проходит все 515 полей с пустого старта без Reveal. Новые доказательства сверяются независимо. Проверены Chromium и точный APK, приёмка на Android-устройстве открыта. |
| Пилот рекламного cooldown | Общий интервал interstitial, накопительная защита после earned и пауза после no-fill. Поведение проверено с тестовым адаптером. Проверка с реальным провайдером остаётся открытой. [Приёмка](acceptance/interstitial-cooldown.md) |
| FEEL-01 · задача №13 | Реализован в PR №4; 169 тестов и Chromium/APK по отчёту разработчика. Сверено по коду; физический Android открыт. Сертификат нового APK отличается от предыдущего — in-place update не подтверждён. [Приёмка](acceptance/feel-01.md) |


[Приёмка HELP-01 и ADS-01](acceptance/issues-8-9/README.md) · [Приёмка HELP-02](acceptance/issue-11/README.md) · [Реестр переноса](porting/ADOPTION_LEDGER.json).

Closure checkpoint: all three source archives rechecked, remaining gates and proposed dependency-first packages linked below. Static closure does not mean original live behavior or complete port. G1 solver/issuer still open; no automatic product changes.

## G1 follow-up 26.11.2026

[Source Hint gates](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/HINT_GATES.md) — five granular registered rules, original branch controls 40/40, 16 direct targets; do not import donor fallback into Explain. [Own proof workload](https://github.com/DanilaH/mini-games-kit/blob/6b40b1839703c72b2ae1b80513c389d6bcf0c0cd/research/games/crossmath/porting/guru-native-sampling-20261126/OWN_METRICS.md) — 515 boards/5201 independently verified assignments; controlled own masks 97/128 unique and fully Explain-solvable, 31 nonunique. CONTENT-03 #17: vector of initial singleton, residual, nonDirect, advanced, maxNonDirectRun, proof units and operation mix; no re-label or bank change before approved lab. Source retry32: 18 paired completed, 14 time-censored; [Expanded 192 replay](https://github.com/DanilaH/mini-games-kit/blob/116a2702b36af36db91ee299d45c2ab5ba2e3a5c/research/games/crossmath/porting/guru-native-sampling-20261126/NATIVE_REPLAY_192.md) complete: 96 paired SOLVED, 96 censored, combined 108 distinct /178 DB rows. All existing statuses unchanged; no physical device/SDK acceptance.

## Историческое исследование Guru · 24.11.2026

**Актуальная база сверки (25.11.2026):** Crossmath **0.5.24 / versionCode 29**, product implementation `d37cd305f597d38074929af1fbe3080aeac13549`, actual developer HEAD `04576ec2239e840176a1a412c06e82aa7b9253cb`. Runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`; актуальный независимый research pin `bbaf857965f1440c48dca61c6f7375010165f4d8`, 460 ID. Ниже датированные разделы сохраняют исторические снимки.

[Consumer report](porting/GURU_SOLVER_RESEARCH_2026-11-24.md) · [первичный закрытый пакет и воспроизведение](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/README.md). Уточняются **13 существующих ID**, общий реестр **296/296**; это не новые функции и не автоматическое повышение приёмки источника.

| Направление | Подтверждённый результат | Следующий шаг |
| --- | --- | --- |
| Исходные стратегии | Monotonic, Factor, Intersection и ограниченный backtracking исполнены в Guru **4.17.0 / 26101374**; порядок Direct → Monotonic → Factor → Intersection и ранний выход проверены | Использовать source-assisted архитектуру для отдельного собственного пакета правил/proof, если этот объём выбран для реализации |
| Реальные связанные маски | **13 исходных рецептов / 19 DB rows** завершены в двух режимах: **persistent** и **fresh/first-step**. Frozen core **12/18** сохранён; [26-пустотная маска](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/diagnostics/heap-capacity-20261124/README.md) добавляет **1/1**; [общий охват](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/TOTAL_NATIVE_COVERAGE.json) не суммирует повторные прогоны | Не смешивать сохранённые кандидаты с новым solver и применением только первого шага; проверять каждый протокол отдельно |
| Весь каталог | **12 899** рецептов проверены собственным CSP: у каждого единственное числовое назначение | **Полная native-сходимость: UNKNOWN**; следующий gate — выборка по диапазонам размеров масок и бюджет полного каталога на подтверждённом no-count runtime. Тяжёлый профиль завершён; время стенда не определяет скорость на Android |
| Авторская сложность | **Точная формула `stuck`: UNKNOWN**; две исполненные complexity-формулы ранжируют объяснения | Найти производитель каталожной метки или авторитетный authoring oracle; не подменять формулу счётчиками/корреляцией |
| HELP-01 / ADS-01 | **IMPLEMENTED**, unit/Chromium [приёмка сохранена](acceptance/issues-8-9/README.md); реализация `2a7d231098d34de29d8607cc4131fec3dcead899` | Android touch/Back/feedback и выбранный banner provider остаются самостоятельной приёмкой, повторное выполнение ТЗ не требуется |

Возможные следующие собственные пакеты: именованные Monotonic/Factor rules и ранжирование proof; bounded proof search с отдельным verifier; аудит своего банка по проверяемым метрикам. Они не внесены в продукт этим исследованием. Сохраняются **fixed 100% typography**, нейтральный Endless preview, независимый `verifyExplanation`, изолированный Reveal, атомарный Apply, банк, баланс и сохранения. Canonical-ответ оригинала не добавляется в публичный Puzzle/Explain.

Source: [owner specification 1.0](spec/Crossmath_TZ_v1.0_RU.md), sections 12–13. Scope is not replaced by an approximate plan.

| Stage | Implementation | Acceptance gate |
| --- | --- | --- |
| A — foundation/core | Exact Android kit bootstrap, 240 boards/routes, immutable import, independent uniqueness search, token commands | Typecheck, independent bank verification, command/inventory regressions |
| B — session | Semantic board/tray, both tap orders and drag, replacement/swap/return/undo/sort, lifecycle, atomic save, pause and result | Gesture smoke, fields 7/12, interrupted-write tests, installable APK |
| C — vertical slice | Fresh logical help + independent proof checking, isolated reveal, durable single charge, 15 lessons and continuation | HC checks in scope, cold restore/single reward, P01–P07 slice protocol and phone review |
| D — meta/calendar | Free selector, fixed-zone Daily/archive and lives, reachable daily goals, rank/album screens, migration | Openings 3/5, first card at 8, +100 receipt, midnight, 228/229, M01–M12 |
| E — full version | Endless UI/runs/records, profile/statistics/achievements, RU/EN, platform services | Four modes; scripted then real ads; cancellation/late callbacks; separate records |
| F — release | Physical devices, TalkBack, fixed game typography after an OS font change, offline/process death, real SDK, signed store artifact and metadata | Exact artifact, P01–P10/HC01–HC12/M01–M12, owner publication decision |

A–D are implemented in retained previews, with phone acceptance still pending. E1 adds the offline Endless/profile/achievement portion in 0.3.0. E2 adds RU/EN, the optional Android ads bridge and scripted callback coverage in 0.4.0. Real provider, device and store acceptance remain open.

## Помощь и команды баннера · 24 ноября 2026

| Пакет | Состояние |
| --- | --- |
| HELP-01 · задача №8 | В PR №4 подготовка Explain различает несовместимость, отсутствие доступного шага и незавершённую проверку. Endless сохраняет одинаковое нейтральное сообщение до Submit. Прошли unit и Chromium. На Android предстоит проверить касания, Back и обратную связь. |
| ADS-01 · задача №9 | В PR №4 отклонённая команда show/hide восстанавливается по штатному refresh. Подтверждены порядок команд, один незавершённый вызов и доступ к игре с тестовым адаптером. Android-сценарий баннера ожидает выбранного провайдера и устройство. |

[Приёмка двух пакетов](acceptance/issues-8-9/README.md) · [Реестр переноса](porting/ADOPTION_LEDGER.json).

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

## История исследований 23–24 ноября 2026

**Исторический слой.** Ниже сохранены датированные исследования и их прежние состояния. Числа 265/269/273/275/288/293 и source/gameplay `0401140d` относятся к соответствующим прежним срезам; текущая карта — 296/296. Старые формулировки «следующий опыт», «полный solve не исполнен» и прежние APK/CI не переопределяют актуальную сводку выше. Исследовательский PR #7 не должен откатывать принятую реализацию Help/Ads на статус готового ТЗ.

### Исследование Guru 4.17.0 · 23 ноября 2026

Новая исходная запись `guru-badge-ceremony` добавлена в [реестр](porting/ADOPTION_LEDGER.json) в статусе **EVIDENCE_GAP / MISSING**. Бинарное сравнение Guru 3.5.2 → 4.17.0 подтвердило 17 Lottie-композиций для значков (показ, повышение, продвижение), 43 изображения и `badge_up.mp3`; **вызов анимаций в реальном оригинале не проверен**. [Первичный отчёт и repro](https://github.com/DanilaH/mini-games-kit/blob/c3519c7fa9a384493fde567a39915179c58bf71b/research/games/crossmath/porting/guru-badge-417/README.md). Следующий этап — видео 1× на Guru 4.17.0 со звуком и проверка условий выдачи/повторного входа; затем отдельное решение владельца о собственной адаптации. 12 существующих достижений и баланс не изменять из-за одного статического обнаружения.

Задача №5 по ранее утверждённому редизайну остаётся самостоятельной: [независимый аудит 0.5.23](https://github.com/DanilaH/crossmath-game/blob/2bbd6f9804efb2291d7b2e42de091adee9954db4/docs/porting/audit-0523/README.md) зафиксировал четыре косметико-функциональных замечания и отдельную приёмку на Android; новый ID не является блокером задачи №5.

### Исследование выдачи и монетизации · 23 ноября 2026

**Источник:** [Guru 3.5.2 и 4.17.0 — воспроизводимое сравнение APK, 10 публичных iOS предложений, native SDK-строки](https://github.com/DanilaH/mini-games-kit/blob/a02958791b6c5e2fec5e561fa9bee24252ab2a04/research/games/crossmath/porting/guru-commerce-issuance-20261123/README.md). В [реестре](porting/ADOPTION_LEDGER.json) учтены **195/195 sourceFeatureId**, добавлены 11 ID семейств SKU Guru и 4 rewarded placement ID с точной границей доказательств. Расширение реестра **не** меняет принятую экономику, runtime геймкита, APK или ограничения первой версии.

| Очередь | Выявленный материал | Следующий эксперимент и критерий |
| --- | --- | --- |
| CORE research / P1 | 7 922 общих рецепта `default/easy1` имеют изменённую категорию `diff` при неизменных `stuck` и вычислительных метриках; `cm4` и `cm5` содержат соответственно 10 411 и 10 384 уникальных масок на 10 421/10 400 строк | На оригинальном Android: два чистых профиля и старый профиль, фактический результат `puzzle_version`/`getPuzzleFilterConfig`, реальные ID задач до/после ошибок; не заявлять адаптивную сложность только по AOT или смене категории; формула `stuck` UNKNOWN |
| COMMERCIAL evidence / owner-gated | 11 разных семейств Guru IAP, 10 перечислено в App Store US; `hint.20` есть только в нативных строках | На Android открыть Settings → Store, проверить доступность каждой позиции, региональные цены, entitlement и отдельную одноразовую покупку Remove Ads. Реальная транзакция и её восстановление — только с разрешённой тестовой покупкой. Не считать Premium == Remove Ads без проверки |
| COMMERCIAL rewarded / owner-gated | `guru-rv-extra-chance`, `guru-rv-hint`, `guru-rv-ticket`, `guru-rv-store`: отдельные стабильные ID компилированных рекламных меток; наличие кнопок UNKNOWN | Найти пользовательские триггеры, no-fill, отмену, фоновое прерывание, фактический SDK impression и однократную выдачу. Не реализовывать в нашей 0.5.23 до решения владельца и реальных SDK-проверок |
| EVENTS/COMPETITION research / later | В обеих Guru одинаковые встроенные модели Star Race и Brains, но текущий серверный баланс/матчи UNKNOWN; EasyFun рекламирует Weekly Themed Events, пока не обнаружен реально доставленный Event с `hiddenNumber>0` | Оригинал 1×: дата события, загрузка/вход, ограничения/очки, выдача, повтор и истечение; сравнить локальные данные и live-конфиги. При закрытом событии зафиксировать невозможность доступа, не выдумывать контент |
| META feel/lifecycle | `guru-badge-ceremony` подтверждена Lottie/AOT, но UI-вызовы/звук/вибрация UNKNOWN; оригинальный уход в фон и сохранение не проверены | Android до→касание→после 1× со звуком, пауза/закрытие/restart, действительная квитанция. Собственные наградные ассеты после доказательства и решения владельца |

**Решения и границы:** данные IAP/ads/event остаются в полной дорожной карте как исследованные и неподтверждённые возможности. Первая версия не включает платные функции без отдельного продуктового, технического и платформенного решения; это не `OWNER_EXCLUDED`. Редизайн задачи №5 и четыре прежних замечания продолжают проверяться отдельно. KIT runtime pinned `469928d03f4bae5053e23db26e82187bedbc252e`; source inventory pin для этой ревизии `7fef14def6bd31107becb7b83f0a947c412cda06`.


### CORE research · Guru default/easy1 · 23 ноября 2026

[Нативный состав профилей, E24/E25/E27/E47](https://github.com/DanilaH/mini-games-kit/blob/7fef14def6bd31107becb7b83f0a947c412cda06/research/games/crossmath/porting/guru-profile-pool-20261123/README.md) — два новых ID: `guru-easy1-pool-substitution`, `guru-tag-4-2-lower-range`. Полные cm4/cm5 различаются не только названием категории: из default исключено 2499 `stuck>=5` рецептов, введено 2478 других, в том числе 2228 `tag=4_2`, где установлен более низкий предел числа генератора. Действующий серверный выбор `default/easy1` не доказан.

Минимальное число доступных записей даже после худшего набора 300 исключаемых масок и при выключенном дополнительном фильтре: `cm4` 1344/2462/2705/2700; `cm5` 1403/1865/2462/3456 (по `diff 1..4`). Это **границы локальных данных**, не запись игрового процесса. `stuck` exact algorithm и live enabled filter UNKNOWN.

**Этап для нашей игры:** данные переданы в исходный inventory + consumer ledger; новая `content-v2` экспериментальная ветка возможна только после замера реального темпа собственных полей и решения владельца. Не переписывать существующие кампанию, bank, экономики и сохранённые ID только ради механического совпадения с двумя профилями Guru.

### Навигация по видео оригинала · 23 ноября 2026

Владелец утвердил **перенос иерархии из записей оригинала**, [техническое ТЗ с девятью sourceFeatureId](porting/navigation-guru-20261123/DELIVERY_SPEC_RU.md), [задача #6](https://github.com/DanilaH/crossmath-game/issues/6). Источник в [mini-games-kit](https://github.com/DanilaH/mini-games-kit/blob/46e16cdb3645956b6b3f32b42481e3cb9cdabddb/research/games/crossmath/porting/guru-navigation-20261123/README.md), в одном ролике подтверждена GUI-версия 4.18.0-26111743, точные версии остальных восьми неизвестны. **Новая структура — 4 root-tabs: Главная / День / Режимы / Профиль**, без табов в поле/результате. Отдельный нижний лист New Game и вложенные фильтры Profile. Мастерская остаётся deep link с главной и из профиля. Третий таб сознательно адаптирован под существующие режимы вместо неготовой Battle M3.

| Пакет | Текущее состояние | Приёмка |
| --- | --- | --- |
| NAV-A · shell+главная | Реализован в 0.5.24 | Первый runnable маршрут и кадры 320×568 / 390×844, Continue/New Game отдельно |
| NAV-B · день+режимы | Реализован в 0.5.24 | Пин даты/старые попытки, 3/5/15 unlock, Endless preserve, no fake Battle |
| NAV-C · профиль+мастерская | Реализован в 0.5.24 | Фильтры режимов/сложности, 12 приборов, прогресс 1/4→2/4 и отсутствие ложной статистики |
| NAV-D · приёмка | Пройдены Chromium и проверка APK. Приёмка на устройстве открыта. | RU/EN, обе темы, reduced motion, Android Back/insets/TalkBack, реальное 1× видео со звуком. Исторический критерий 100–200% заменён 24.11 на fixed 100% typography |

**Не откатывать готовое из issue #5:** победа, звук/вибрация, выдача монет, детали, текущий банк и сохранение остаются действующими. Старое меню «Все режимы» и широкие internal Back заменяются новым указанием; оставшиеся замечания #5 переоцениваются в новом shell, чтобы не реализовывать одновременно две противоречащие IA. Runtime `469928d03f4bae5053e23db26e82187bedbc252e` не меняется. [Протокол 0.5.24](acceptance/issue-6/README.md) · [Реестр](porting/ADOPTION_LEDGER.json).

### Видео Guru 4.18.0 · расширенная приёмка помощи/меты · 23.11.2026

[Видеоаудит Guru 4.18](https://github.com/DanilaH/mini-games-kit/blob/6c8542981d292a8dd4621cd855cb18dab127b48b/research/games/crossmath/porting/guru-runtime-418-20261123/README.md): на видео 13-49-51 в 81.0 s прямо указано **`Version 4.18.0-26111743`**; остальные клипы того же набора лишь предположительно соответствуют версии. У ранее изученного APKM 4.17.0 другая исходная версия; не смешивать runtime со статикой. В реестре игры **222/222 ID**, 18 новых независимых правил/триггеров зарегистрированы как RESEARCHED / IMPLEMENTED_UNVERIFIED / DEFERRED, а не в качестве уже реализованных.

| Направление | Original runtime evidence | Состояние в игре 0.5.23 / следующий шаг |
| --- | --- | --- |
| Обучающий Explain | 13-49-24 t5–17: `28 + A = B`, пара A=1/B=29; OK возвращает **то же поле**, затем игрок вручную ставит 29. 13-49-19 t1.5–10: правило о 35>25 и ручная установка 10 | Наш `Help → Explain → Apply` **сразу применяет** доказуемый ход с расходом ресурса. Решить об отдельном бесплатном preview vs платном применении; до решения владельца экономику не менять |
| Настройки | В 4.18 t75–81: Show Explanation Button, Auto Submit, Large Font, Division Symbol, Sound, Vibration, Timer, Theme, Store | Сверить с существующими 5 настройками 0.5.23. Отдельно проверить на Android флаги и сохранение; не выдумывать, как переключатель Auto Submit меняет режимы |
| Очередь победных сообщений | 13-48-55 t4–20: Level UP → Daily Quests → Doctorate Cap, собственная кнопка Leaderboard | Наша атомарная квитанция/мастерская есть, оригинальной очереди нет. UX-проверка/проектное решение отдельно от #6, без новых выплат по анимации |
| Endless | 13-49-07 t4–11: Submit No/Yes и Skip message; t21–74: после Next Stage виден fullscreen playable ad, затем возврат на результат и повторное нажатие; 13-49-14: до Submit нет автоматической оценки ошибок | Наш `ads.beforeNext()` — скриптовый мост без live провайдера; после callback автоматически запускаем следующий этап. Не копировать рекламную частоту или второе нажатие без проверенного SDK/решения владельца |
| Дальнейшая проверка | 4.18 APK ещё не предоставлен, helper `CrossMathSolver.solve()` 4.17 статически известен, но native full solve не исполнен | Отдельный статический дифф 4.17↔4.18 после получения точного APK и Android live evidence; текущий генератор нашей игры не менять |

**Приоритет для разработчика:** выполнить утверждённый навигационный issue #6 и критичные дефекты issue #5; новый UX Explain/queue/ads **не** входит в это задание автоматически. Оценить предложенную дополнительную задачу после согласованного меню и сценария на телефоне.

### Guru 3.5.2 → 4.17.0 · аналитика Explanation и контекстные уроки

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

### Guru · одинаковая числовая основа, разные маски и stuck

[Новый измеренный original-data аудит](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/guru-mask-matched-20261123/README.md) — **23.11.2026**, exact owner-supplied Guru APK 3.5.2/4.17.0, SHA-проверка cm4/cm5 и два независимых подсчёта Python/SQL. В 12 899 уникальных рецептах каталога 1 967 числовых основ используются с 2–5 разными масками `holes`. Из 2 671 сравнений при одинаковых `board/puzzle/size/tag` и одинаковых числовых/операторных статистиках: 233 пары имеют **одинаковое количество пустот, но разный `stuck`**; 18 пар имеют **больше пустот, но меньший `stuck`**. Только 19 пар имеют одну маску как подмножество другой. **Формула исходного `stuck` и server-driven адаптация всё ещё UNKNOWN.**

| `sourceFeatureId` | Поведение оригинала (BUNDLED_DB) | Наш Crossmath 0.5.24 / следующий этап |
| --- | --- | --- |
| `guru-seed-mask-variants` | Числовое поле может быть переиспользовано с другими скрытыми координатами, оставаясь отличной задачей; 1 967 основ с несколькими масками | Наши **275 иммутабельных собственных полей** остаются без изменений. Опционально рассмотреть оригинальный **собственный** второй mask-variant на собственном поле в будущей content-v3, только после подтверждения уникальности/первого вывода, экономической целесообразности и owner-решения |
| `guru-stuck-mask-topology` | `stuck` в исходной БД зависит от конфигурации скрытых клеток, а не только их числа | У нас корзины и проверка решаемости, но нет воспроизведения авторского `stuck`. При необходимости разрабатывать **собственную измеримую метрику сложности** (логические шаги, ошибки, время), не подменяя её количеством пустот |
| `guru-stuck` (сохранён) | Точное правило присвоения метки неизвестно, но mask-layout зависимость теперь подтверждена | Прямой **приоритет исследователю**: восстановить full solve() E29/H08–H12 и сверить пары с одинаковой числовой основой, не заявлять parity до native/independent solver и source criteria |

**Не делать прямо сейчас:** не переписывать банк, генератор, 0.5.24 сохранения, экономику, контекстные подсказки или приоритеты #6 по этому DATA-only исследованию. Новые находки зарегистрированы и картированы в source inventory / consumer ledger; этап отдельной проверки после owner-решения. Версия runtime mini-games-kit в игре не изменялась.

### Новая оценка stuck · независимая ML-диагностика и ARM64 solve dispatch

**23.11.2026.** [Прямой отчёт, исходные 4.17.0 cm4/cm5, Python repro и ARM64 статическая перепроверка](https://github.com/DanilaH/mini-games-kit/blob/b6e368664265a0300efae484168bf767fa6d04af/research/games/crossmath/porting/guru-stuck-structure-model-20261123/README.md). **Доказательство BUNDLED_DB + самостоятельный MODEL_TEST / NATIVE_STATIC**, это не работа original full solve, не подтверждение Android 4.18 или пользовательского retention.

В 5-fold grouped cross-validation на **12 899** уникальных рецептах Guru `stuck` из каталога предсказывается метаданными (количество скрытых клеток, размер/статистика операций) с MAE **0,4037**, R² **0,9500**. Дополнительные масочные геометрические дескрипторы ухудшают абсолютную MAE до **0,4185**, но улучшают взаимный порядок 2 671 пар масок одной числовой основы **90,60% → 95,66%**, а при равном числе скрытых клеток дают **148/233** правильных сравнений вместо ничьих. Bootstrap по **228** разным основам: **57,33–69,66%**. Posthoc смешанная оценка MAE 0,3966 требует **отдельной** проверки перед применением. **Исходная авторская формула `stuck` остаётся UNKNOWN.**

Повторная проверка инструкций `libapp.so` Guru 4.17.0 независимо подтвердила `CrossMathSolver.solve` BL-цепочку **direct 0xb62b20 → monotonic 0xb61368 → factor 0xb5f9ac → intersection 0xb56b80** и depth-guard `_limitedBacktrackSearch` (при глубине ≥3 ранний возврат). Статические opcodes и вызовы проверены; **полный solve() в среде игры/Unicorn не исполнялся**. Никаких новых независимых исходных правил не появилось, поэтому **source IDs остаются 246**. Уточнены `guru-stuck`, `guru-stuck-mask-topology`, `guru-direct-hint`, `guru-monotonic-hint`, `guru-factor-hint`, `guru-intersect-hint`.

**Рекомендация/этап:** не менять 275 контентных полей, кор-механику и себестоимость контента в Crossmath **0.5.24/29** из-за этого опыта. Следующий CORE эксперимент — actual native `solve()` на контролируемых парах масок (прежде всего 233 равнопустотных), отдельная оценка прямой/факторной/пересекающей стратегий и доля `null`; затем на **собственных** полях эксперимент с человеческим временем и ошибками, только по решению владельца. Runtime kit pin `469928d03f4bae5053e23db26e82187bedbc252e` не повышать. [Ledger 246/246](porting/ADOPTION_LEDGER.json), research pin `b6e368664265a0300efae484168bf767fa6d04af`.

### Сквозной аудит референсов 23 ноября 2026

**Историческая база игры на дату аудита: 0.5.24 / versionCode 29**, gameplay commit `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, [NAV-01–08 acceptance](acceptance/issue-6/README.md). Полный [consumer gap audit 20 систем](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md) и [исходный мастер-отчёт mini-games-kit](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/README.md) теперь имеют приоритет перед историческими небольшими проходами и их числами 177/195/222/246. Исходная система на момент того аудита из **265 sourceFeatureId** (включая дополнительные 16 коммерческих / lifecycle / UX механизмов) сопоставлена в [consumer ledger](porting/ADOPTION_LEDGER.json).

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

### EasyFun 1.1.9 feedback + exit metadata — корректировка

Дополнительный [точный XAPK/IL2CPP metadata-аудит](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/EASYFUN_FEEDBACK_EXIT_RECHECK.md) зарегистрировал `easy-feedback-photo-attachment` (галерея, permission, изображения, удаление, ограничение размера) и `easy-feedback-validated-submit` (проверка email/длины, запрос, сброс состояния). В оригинальном GUI они не запускались, допустимость и доставка UNKNOWN. В **Crossmath 0.5.24** отсутствуют пользовательские media-feedback и backend; **RESEARCHED/MISSING**, owner gated и privacy-sensitive. `easy-exit-reason-panel` по методам `ExitHistory/UploadEX` относится к диагностической истории/выгрузке и **не доказан как пользовательский exit survey**. Состав source now **265 ID**. Полную матрицу смотреть в [consumer gap audit](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md), не считать метод как live SDK или успешную отправку файла.

### Последнее дополнение full audit: 23 remote-config getters

[Полная проверка native remote-config 3.5.2↔4.17.0](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/REMOTE_CONFIGS.json): 23 отдельных метода Getter (`10` имён есть в старом AOT, `13` новых по точному написанию); [repro](https://github.com/DanilaH/mini-games-kit/blob/research/crossmath-reference-audit-20261120/research/games/crossmath/porting/full-system-audit-20261123/verify_guru_remote_configs.py). В [consumer full gap](porting/FULL_REFERENCE_GAP_AUDIT_2026-11-23.md) добавлены отдельные source IDs `guru-banner-during-fullscreen-load`, `guru-free-reward-remote-config`, `guru-remote-vibration-audio-config` с AOT provenance, `MISSING/UNKNOWN/PARTIAL` и экспериментами. Это НЕ active server flags и НЕ разрешение автоматически включить новые рекламные placements/вознаграждения. Итог source ledger **265/265**.

### Guru E30/E32 и EasyFun рекламные defaults · 23.11.2026

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


### EasyFun AdManager — клиентские допуски и триггеры выдачи · 23.11.2026

[BUNDLED_IL2CPP_METADATA, точный 1.1.9 XAPK](https://github.com/DanilaH/mini-games-kit/blob/decf77cd397d99f5a1fe5fb171188456bbfec7b4/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/ADMANAGER_METADATA.md): собственный `Assets/MainGame/Script/Manager/AdManager.cs`, клиентские guard методы interstitial, timestamp последнего закрытия, callback разных стадий rewarded, consent/Firebase и типы `RewardTemplate`/`InterstitialTemplate`. Два ID **`easy-ad-client-interstitial-gates`**, **`easy-ad-rewarded-callback-states`** зарегистрированы отдельно. Наш `src/platform/adState.ts` уже проверяет cooldown/защиту после rewarded, `ads.ts` разделяет fullscreen и rewardSettled через долговечную очередь. **Однако исходные значения guard/частота и реальная Android выдача не подтверждены**. Продуктовый этап — только после решения владельца о live SDK и consent. Выдача проверяется по receipt/restart, не по имени колбэка в чужом бинарнике.

Инвентарь стал **271 sourceFeatureId**, в игре **271/271 mapped**. Данные оригинала — static-only, код игры/275 authored boards/монета/XP/сохранения не менялись. [Подробный пакет](porting/ARITHMETIC_AND_AD_TEMPLATE_DELTA_2026-11-23.md). Текущая проверенная сборка **0.5.24/29**, физическая Android acceptance для работы разработчика ещё открыта.

### Guru Endless · две допустимые ошибки и анимация Score · 23.11.2026

[Новый видеопротокол исходного Guru (сборка в этих роликах UNKNOWN)](https://github.com/DanilaH/mini-games-kit/blob/bd80dc0542d91e7d47675dcd1d0971f295537077/research/games/crossmath/porting/guru-endless-video-contract-20261123/README.md): `13-49-14.mp4` в окне обучения говорит о двух допустимых ошибках за забег, на HUD два сердца; это **показанное правило**, но две разные фактические ошибки подряд не воспроизведены. `13-49-07.mp4` t8.7–11.5: после успешного подтверждения Submit счёт **анимированно увеличивается 0→140 с визуальными шагами по 10**, затем Stage2/конфетти/результат. **Формула 140 баллов не раскрыта; это не XP и не подтверждённая стоимость уравнения.**

В нашей [0.5.24 / 29](acceptance/issue-6/README.md), source `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, `src/core/engine.ts:createAttempt` даёт **3 жизни** и отдельное правило одинаковой отвергнутой подписи; `src/meta/career.ts` атомарно считает собственные баллы, `src/ui/gameUi.ts` показывает готовый счёт без анимированного tally. Это **PARTIAL/MISMATCH исходного лимита** и **MISSING source-specific countup**, не дефекты уже согласованной экономики. **Отдельное решение владельца** требуется прежде, чем менять жизни или скорость UX. [Ledger 272/272](porting/ADOPTION_LEDGER.json) содержит `guru-endless-error-budget` и новый `guru-endless-score-countup`.

Следующий эксперимент: Guru original Android 1× — две намеренно разные неверные раскладки/Submit, повтор последнего signature, правильный Submit на двух этапах, проверка перехода и награды при фоновой остановке. Если владелец одобрит нашу анимацию, это должен быть исключительно **presentation count-up из уже атомарно сохранённой квитанции**, мгновенный final для screenreader/reducedMotion, без дублирования начисления и без задержки следующего хода. Не менять 275 authored полей, сохранённые ID или kit runtime pin.

### Guru 4.17.0 · native solver conditional fallback · source 273/273 (23.11.2026)

[Источник mini-games-kit PR #139](https://github.com/DanilaH/mini-games-kit/pull/139): direct→monotonic→factor→intersection, каждая стадия имеет два `b.gt` early-exit. Внутри intersection в оригинальном `libapp.so` есть guard `0xb56e20` и conditional fallback через `0xb56f14` → `0xb57010` → `_limitedBacktrackSearch` (`0xb5ad7c`), где recursion `0xb5b484` увеличивает depth, а depth>=3 немедленно возвращает. Это **NATIVE_STATIC** по Guru 4.17.0, а не выполненный `solve()` или оригинальный UI; семантика счётчика и формула `stuck` UNKNOWN.

ID `guru-strategy-conditional-backtrack`: `RESEARCHED/MISSING` в игровом ledger, собственный `src/help/logic.ts` сохраняет proof-based подход без оригинального ограниченного search-as-explanation. **Оставить как owner-gated future Help**. Следующий тест — native full `solve()` на реальной маске, trace fallback/recursion и независимая проверка. Не изменять 275 authored полей, баланс, `verifyExplanation`, сохранения или ads. Исходный реестр **273/273**, pin `9632dae736e0893c7e06d16b9c2a12cef30088d3`; проверенный game runtime **0.5.24/29** с прежним kit pin `469928d03f4bae5053e23db26e82187bedbc252e`. Предыдущие цифры в этом файле исторические.


### EasyFun 1.1.9 · доказанное наличие двух рекламных API, без live placement · source 275/275

[Первичная привязка методов к AdManager по IL2CPP v31, kit PR #139](https://github.com/DanilaH/mini-games-kit/pull/139): `AdManager` (TypeDefinition #2949, 51 метод) объявляет **отдельный MREC** `RequestMrec/ShowMrec/HideMrec` + LoadedSuccess/Failed и **Native ad** `RequestNative/ShowNative/HideNative` + LoadedSuccess/Failed. Методная принадлежность проверена по полю `declaringType` в owner-supplied EasyFun **1.1.9 / 1193** XAPK, exact SHA и отрицательный контроль; это не вызовы этих методов в реальной игре, не SDK impression и не доказанное UI размещение.

Новые ID **`easy-ad-mrec-channel`**, **`easy-ad-native-channel`** → `RESEARCHED/MISSING` у Crossmath 0.5.24/29 (`src/platform/ads.ts` и `androidAds.ts` поддерживают rewarded/interstitial/banner, без MREC/Native). Принадлежность существующих interstitial/rewarded callbacks классу AdManager также уточнена. **COMMERCIAL research only:** потенциальный общий publisher code, server/consent/no-fill/экран UNKNOWN. Только при независимом Android показе и решении владельца обсуждать собственный SDK/UI, не включать чужие placements по именам.

**На момент исследования MREC/Native: source↔consumer реестр 275/275**, тогдашний kit source commit `2adeddc1e06494c24d3799b5e18a3a80a70afde9`. Историческое 273 в предыдущем разделе сохраняется как промежуточный результат. Runtime/gameplay `0.5.24/29`, 275 authored полей и kit runtime pin `469928d03f4bae5053e23db26e82187bedbc252e` неизменны.

### 23.11 · проверка SHA-исходников девяти видео Guru, реестр 275/275

[Первичный audit](https://github.com/DanilaH/mini-games-kit/blob/a4ca64c19d44d6b0a2ca85eea66ec737122549a2/research/games/crossmath/porting/video-evidence-integrity-20261123/README.md): у **36** sourceFeatureId с видеоссылками проверены filename→SHA по манифесту девяти владельческих MP4. Три UI-ID (New Game, Leaderboard, immersive game) ранее ошибочно ссылались на SHA *другой записи* `13-49-45`; привязки исправлены, все 36 содержат точные per-clip SHA. Автоматическая [fail-closed проверка](https://github.com/DanilaH/mini-games-kit/blob/a4ca64c19d44d6b0a2ca85eea66ec737122549a2/research/games/crossmath/porting/video-evidence-integrity-20261123/verify_crossmath_video_refs.py) проверяет соответствие с сохранённым манифестом, **не** заново вычисляет хеши с MP4, не доказывает билд восьми роликов и не считается Android запуском.

**Актуальный на этом проходе source→consumer pin:** `a4ca64c19d44d6b0a2ca85eea66ec737122549a2`, **275/275** ID, без новых механик, owner approval и code/runtime изменений. Игровой baseline **0.5.24/29** / `0401140d`; runtime kit `469928d03f4bae5053e23db26e82187bedbc252e`. Открытые гейты — original 4.18 APK/native solve/stuck, original Android ads/receipts/events, физическая проверка нашей игры.

### 23.11 · новый original native AOT аудит EasyFun 1.1.9: no-op MREC/Native, реальные show-callers · source 288/288

[Полный SHA-подтверждённый NATIVE_STATIC отчёт](https://github.com/DanilaH/mini-games-kit/blob/5a72a2a827cb089ff2ec8e8aecbfc334141001a8/research/games/crossmath/porting/easyfun-native-ad-stubs-20261123/README.md), [repro verifiers](https://github.com/DanilaH/mini-games-kit/tree/5a72a2a827cb089ff2ec8e8aecbfc334141001a8/research/games/crossmath/porting/easyfun-native-ad-stubs-20261123), original **EasyFun 1.1.9 / 1193**, XAPK `e12cce36ab165493e948f4c1303d41d91f653fece9ca23d3163d47b3fb2c9d8d`, native libil2cpp.so `1b69ef78f2e25717f3a2e61485d6ad4228d73827f1166661ee37bc8d7f11c720`. Первичный source↔consumer pin: **`5a72a2a827cb089ff2ec8e8aecbfc334141001a8`**; **288/288** отдельных sourceFeatureId (275 ранее + 13 отдельный original UI/ad triggers). Восемь исходных Show-callers в отдельных UI handlers дают девять BL, ещё три оригинальных UI-обработчика содержат **только eligibility check**, подсказка — rewarded precheck, lifecycle — hide banner. **Это не наблюдение показов.**

**Важное исправление прежнего вывода:** пять методов MREC (Request/Show/Hide/оба loaded callbacks) и пять Native API — **чистые AArch64 RET-only заглушки**. Прежний раздел «доказанное наличие двух рекламных API» подтверждал *названия*, но **не работающую реализацию**. Из 51 AdManager method 18 — RET-only, в т. ч. `RewardedVideoGetRewardCallBack`; `RewardedVideoCloseCallBack` с кодом, но реальное начисление UNKNOWN. Для `easy-ad-mrec-channel`, `easy-ad-native-channel` теперь **RESEARCHED/UNKNOWN**, а не уверенное «MISSING живой функции». Они остаются в источниковом реестре, окончательно не исключены владельцем.

**Отличие от нашей 0.5.24 / 29:** текущий `src/platform/ads.ts` вызывает interstitial через `AdsController.beforeNext()` после результата и `canShowInterstitial()`, а не на восьми конкретных исходных UI переходах. Имеет свой rewarded hint и banner guard; port — **PARTIAL или MISSING по ID**, не общий MATCH. В live рекламу изменения НЕ внесены; никакие 13 рекламных точки или 0.5 table probability не поднимать автоматически. Требуются оригинальные Android 1.1.9 trace `Check→Show→SDK impression/no-fill` с consent/повтором/фоновой остановкой, затем явное согласие владельца. Отдельно нужен native Guru `solve()`/stuck и приемка нашей игры на физическом Android.

**Геймплейные поля 275 штук** — отдельное число, не путать с **288 source ID**. Подписанный APK runtime **Crossmath 0.5.24/versionCode29**, gameplay commit `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, kit runtime `469928d03f4bae5053e23db26e82187bedbc252e` **без изменений**.

### 23.11 · EasyFun 1.1.9 native interstitial admission: порог завершений + порог времени (288 ID)

Доказан новый более точный контракт **внутри уже существующего** sourceFeatureId **easy-ad-client-interstitial-gates**, без добавления/удаления ID. [Exact original native report, раздел F](https://github.com/DanilaH/mini-games-kit/blob/d1402b29d7a8657c581c670972b3c698709e8a27/research/games/crossmath/porting/easyfun-native-ad-stubs-20261123/README.md). В EasyFun Offline Crossmath **1.1.9/1193** оригинальный ARM64 AdManager.CheckShowInterstitialAvailable вызывает LevelManager.GetTotalGameCompleteCount, суммирующий счётчики **пяти** классических сложностей Easy/Normal/Hard/Expert/Hell, затем FirebaseService.GetIntRemoteConfig. По инструкции **B.LT** отказ при **completedCount < remoteInt_1**. Второй GetIntRemoteConfig сравнивается с StatusUtil.get_TotalPlaySecond; по **B.LE** отказ при **totalPlaySecond ≤ remoteInt_2**. После этих условий есть CouldShowInterstitial и optional InterstitialLoaded. **Исключение: исходный byte flag AdManager+0x19 допускает ранний true**, его идентичность UNKNOWN. Точные remote keys/defaults/live values, фактический SDK impression/no-fill UNKNOWN. Два изменённых условных перехода отвергнуты контролем по original SHA-подтверждённому бинарнику.

**Наш Crossmath 0.5.24/29**: src/platform/adState.ts:canShowInterstitial уже имеет **собственный** прогресс-лимит profile.solvedIds.length, лимит activeSeconds после предыдущей рекламы и защиту после rewarded; AdsController.beforeNext() вызывает show только после победы. Это **PARTIAL**, не исходные пять counters/две удалённые проверки. Копировать чужой remote gate и рекламные точки без отдельного решения владельца нельзя. Следующий опыт: original EasyFun 1.1.9 Android с точными значениями обеих конфигураций, учётом стартового профиля, веткой early bypass и реальными SDK-событиями, включая offline/no-fill/consent/перезапуск.

Текущий **source↔consumer 288/288**, pin kit source **d1402b29d7a8657c581c670972b3c698709e8a27**, игровой код 0.5.24/29 SHA **0401140d5fc0c191e457289b6dc8e5752a9f85a8** и runtime kit **469928d03f4bae5053e23db26e82187bedbc252e** не изменены.

### 23.11 · exact EasyFun interstitial Firebase keys, UTC-close callbacks (288/288)

**Дополнение с приоритетом над неопределёнными именами Firebase из предыдущего раздела.** [Exact original IL2CPP StringLiteral и ARM64 доказательства, README раздел G](https://github.com/DanilaH/mini-games-kit/blob/7b902a2a451cf7ceaa40b6b0baa2cf6cdb0390ae/research/games/crossmath/porting/easyfun-native-ad-stubs-20261123/README.md): в исходном **EasyFun 1.1.9/1193** порог суммарных завершений **пяти Classic** подключён к **interstitial_ad_scene** (count ≥ Firebase int), порог общего времени — **ad_first_interstitial_time** (play seconds > Firebase int). В CouldShowInterstitial есть отдельные типы: **2** → remote **ad_enter_interval**, **3** → **ad_done_interval**; отрицательный interval запрещает, нулевой снимает дополнительный per-event фильтр, положительный требует UTC-now минус время последнего закрытия interstitial ≥ interval. Original InterstitialClosedCallBack записывает UTC epoch во внутреннее поле +0x10, а RewardedVideoCloseCallBack — в +0x14; последнее используется для отдельной post-rewarded защиты по ещё не расшифрованному remote ключу. Отдельный ранний bypass +0x19 пока UNKNOWN. Exact four string literals и callback-branches прошли оригинальный офлайн-тест и негативные мутации, не Android runtime/серверный анализ.

**Нельзя смешивать** static GetIntRemoteConfig и фактические значения из live Firebase, успешный SDK impression, собственную рекламную политику и показ пользователю. Наша **Crossmath 0.5.24 /29** уже имеет **свои** progress/time/postrewarded защитные guards в src/platform/adState.ts и AdsController.beforeNext(), но не копирует чужие remote keys/типы событий. Сохраняем **PARTIAL** у easy-ad-client-interstitial-gates, не меняем частоту, runtime kit и работающую экономику без владельца. Для проверки нужно записать оригинальный Android 1.1.9 путь с remote config / consent/no-fill / фактическим показом и сравнительный own Android.

На этом источниковом проходе: **288/288 source→consumer IDs**, source kit SHA **7b902a2a451cf7ceaa40b6b0baa2cf6cdb0390ae**, исходный игровой код **0401140d5fc0c191e457289b6dc8e5752a9f85a8**, kit runtime **469928d03f4bae5053e23db26e82187bedbc252e**.

### 24.11.2026 · оригинальные EasyFun ad gates и rewarded settlement (293/293)

Новый source pin: `c427b43c298479b97738edef080470ed83f2f47f`; Crossmath **0.5.24 / 29**, gameplay `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, active branch HEAD `5153efdac26ca7ab99ed55d2bfc76287b63e1d32`, runtime kit `469928d03f4bae5053e23db26e82187bedbc252e`.

Источник **EasyFun Offline Crossmath 1.1.9 /1193** сверён по исходным XAPK/ARM64/metadata SHA. [Ad gates](https://github.com/DanilaH/mini-games-kit/blob/c427b43c298479b97738edef080470ed83f2f47f/research/games/crossmath/porting/easyfun-native-ad-gates-20261124/README.md): точный пятый ключ `ad_game_RV_interval`, typed `CheatSkipAd` (Check=true, Show пропускается), отдельный первый не-cheat Show на экземпляре. 42 original-AOT сценария с заданными внешними входами и 8 отрицательных проверок. Предыдущие UNKNOWN именно для имени shared key/владельца bypass закрыты; числовые defaults/live values и видимость cheat UI остаются UNKNOWN.

[Rewarded route](https://github.com/DanilaH/mini-games-kit/blob/c427b43c298479b97738edef080470ed83f2f47f/research/games/crossmath/porting/easyfun-rewarded-settlement-20261124/README.md): исходные OxAdHandler register/received/hidden и AdManager forwarder исполнены в 10 контрольных состояниях. Pending route передаёт earned при Hidden, фильтрует false, очищает callback/flag после нормальных возвратов и сбрасывает old earned при новом запросе. Это последовательный RAM-контракт при явно указанных stubs, не доказательство всей SDK-цепочки, начисленной валюты или crash-safe receipt. Дополнительно STATIC: обе close continuation через Util.Delay(0.3f) очищают AdShow и запрашивают ShowBanner; фактические 300 мс/видимость не измерены.

Пять новых ID: `easy-ad-cheat-skip-toggle` (UNKNOWN), `easy-interstitial-first-call-skip` (MISSING), `easy-rewarded-success-on-close` (PARTIAL), `easy-rewarded-pending-reset` (PARTIAL), `easy-ad-close-delayed-banner-request` (PARTIAL). Все имеют workflow **RESEARCHED**; существующие gate/callback-state записи уточнены. Новых ACCEPTED нет.

Наша политика подтверждена по коду: unique wins > 5; 180 активных секунд после показанного interstitial; 120 активных секунд после earned; отдельного first-total-time порога нет. `watchRewards`/durable receipts независимы от dismissal. Исходные UTC close cadence, first-call skip и cheat не внедрялись. Сохранить собственную durable idempotency и подтверждённый стиль/банки/баланс.

Следующая приёмка: реальные исходные server values и AdManager lifetime; original SDK earned/hidden/subscribers/сохранение; собственный Android provider с повтором/отменой/restart и баннером после fullscreen. Синтетические числа 120/30/60/6/50 в стенде — **не извлечённые defaults оригинала**. Полный Guru solve, авторский stuck и physical Android остаются отдельными незакрытыми гейтами.

**KIT IMPACT: RESEARCH / IMPROVE evidence; runtime NONE.**

### 24.11.2026 · Guru solver: текущий итог исследования 296/296

Текущий source inventory pin: `1851f3c766fcc0cdfe54a5cf76db5b01cbba8aba`. Crossmath остаётся **0.5.24 / 29**, gameplay `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, runtime kit `469928d03f4bae5053e23db26e82187bedbc252e`. Проверен actual Help-код на active HEAD `5153efdac26ca7ab99ed55d2bfc76287b63e1d32`.

[Исходный native solve](https://github.com/DanilaH/mini-games-kit/blob/1851f3c766fcc0cdfe54a5cf76db5b01cbba8aba/research/games/crossmath/porting/guru-native-solve-20261124/README.md): оригинальные constructor, top-level `solve()`, Direct, commit и result исполняются на синтетических контрольных задачах с явно перечисленными generic-runtime shims. Контроль `? + 3 = 5` возвращает шаг со значением `2`; замена только сохранённого ответа после инициализации на `9` вызывает исходное исключение до фиксации шага. Это не запуск Android-приложения и не доказательство решения каталога или формулы `stuck`.

[Статический контракт](https://github.com/DanilaH/mini-games-kit/blob/1851f3c766fcc0cdfe54a5cf76db5b01cbba8aba/research/games/crossmath/porting/guru-native-solver-contract-20261124/README.md): 41 группа / 192 адресных проверки и два смысловых отрицательных контроля. Top-level `solve()` — один проход этапов с ранним выходом по положительному `solved`/`constrained`; `isSolved` и накопленный `needsAssumption` различаются. В factor-ветке `constrained` может учитывать решённую клетку, поэтому не означает универсальное число удалённых кандидатов.

Три новых ID: `guru-solver-step-canonical-guard` (MISSING), `guru-solver-single-pass-result` (PARTIAL), `guru-solver-constraint-counters` (MISSING), все **RESEARCHED**. Ранее созданные пять EasyFun ID сохранены. Всего **296 sourceFeatureId**, новых ACCEPTED нет. Direct evidence усилено, условный backtracking и `stuck` не объявлены выполненными/восстановленными.

У нас `explain()` строит один HintPlan из видимых данных и лотка; `verifyExplanation()` независимо проверяет арифметику и доказательство, public Puzzle запрещает скрытые answer/solution/steps. Копирование source canonical-answer guard не требуется для этой исследовательской фиксации и не должно подменять собственную проверку объяснения. Отличия, затронутые файлы, зависимости и критерии приёмки записаны в ledger.

Следующий опыт: реальные связанные исходные маски; последовательные вызовы оригинального solver с записью кандидатов, шагов и счётчиков; отдельные monotonic/factor/intersection/backtracking случаи и сравнение с каталожным `stuck`. Для EasyFun открыты live Firebase, SDK/Android, callback reentry/process kill и фактическое время появления баннера. Полнота 296/296 означает отсутствие потерянных зарегистрированных ID, а не полный разбор всех экранов и систем.

**KIT IMPACT: IMPROVE — доказательства и воспроизводимость исследования; runtime NONE.**

### 24.11.2026 · код и архитектура оригиналов как основа собственной реализации

По [прямому решению владельца](PROJECT_DECISIONS.md#dec-2026-11-24-source-based-implementation) разработчик использует декомпилированный/native код и архитектурные приёмы оригинала для собственной реализации. Релевантный код скопирован в [закрытые отчёты кита](https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/decompiled-source-evidence-20261124/README.md): Guru — 9 точных срезов с 36 полными методами; EasyFun — 21 адресный диапазон с исходными байтами и typed bindings. Архитектурные схемы и авторский псевдокод отделены от первичного кода.

Current source pin `06a01d5c1f7af3cdf8013c9ce0f6a691d086af78`; **296/296 sourceFeatureId**, без новых игровых правил или ACCEPTED. Для 11 существующих ID ledger содержит прямые code/architecture evidence links. Сняты blanket-запрет декомпиляции и clean-room изоляция; product code пишется для нашей игры на основании источника. Текущие 0.5.24/29, gameplay `0401140d`, баланс, save schema и runtime `469928d03f4bae5053e23db26e82187bedbc252e` сохранены. Следующие исходные и Android опыты остаются в прежней очереди; наличие текста метода не повышает static evidence до исполнения.

**KIT IMPACT: IMPROVE — источник, архитектура и адаптация связаны с конкретными ID; runtime NONE.**

### 25.11.2026 · Guru issuance / source 747889ad (300/300)

[Исследование оригинальной выдачи](https://github.com/DanilaH/mini-games-kit/blob/747889ad1c31650c392225881049d41822f799f4/research/games/crossmath/porting/guru-issuance-audit-20261125/README.md) · [сопоставление](porting/guru-issuance-audit-20261125/README.md). Четыре новых ID: guru-issuance-random-first, guru-issuance-filter-empty-retry, guru-issuance-history-mask-rescue, guru-issuance-operation-ratio-denominator. На 0.5.24 / 29 нет исходного SQL-механизма; действующий собственный банк, ротация, сейвы, HELP/ADS не меняются. Последний ratio ID EVIDENCE_GAP: полный PP binding и live config UNKNOWN. 144 SQL controls подтверждают отсутствие зависимости проверенных predicates от stuck, но не авторскую формулу. Два cross-diff collisions подтверждают риск неоднозначного rescue. Внедрение — только по отдельному решению владельца. 300/300 — покрытие зарегистрированных ID; прерванный 306-ID checkpoint не найден и подлежит сверке. Следующие опыты: восстановить native runner/архив, точный SQL range binding, population и error/empty ветки rescue, Android acceptance. KIT IMPACT: RESEARCH; runtime NONE.

### 25.11.2026 · Explain: compiled consumer coverage (300/300)

[Проверка точного releaseCheck 0.5.24 / 29 и кандидат](https://github.com/DanilaH/mini-games-kit/blob/aef1f66dad253fa315c0ef30d3c624081817bd8a/research/games/crossmath/porting/guru-help-product-audit-20261125/README.md) · [consumer handoff](porting/EXPLAIN_COVERAGE_2026-11-25.md). 485/515 Explain-only from empty; 30 content-v2 fields/40 no_supported_step; alternate correct prefix 515/515. MODEL: global tray cardinality + domain propagation 28/30, one-level contradiction 30/30. Candidate is not implemented, current verifier rejects research plans; preserve answer-free proof, atomic save/help, IDs and budget. New proof representation + independent verifier + full-bank/browser/device acceptance only after owner choice. Source IDs retained, statuses not promoted. No new original native coverage. KIT IMPACT CANDIDATE; runtime NONE.

### 25.11.2026 · HELP-02 и Guru issuance dataflow (308/308)

[HELP-02 задача #11](https://github.com/DanilaH/crossmath-game/issues/11) — согласованный следующий пакет: Explain propagation + one-level assumption, independent proof verifier, 515/515 acceptance; не изменять bank/save/ads/font/runtime. Исследование выдачи: [source report](https://github.com/DanilaH/mini-games-kit/blob/3517662878dd1982294ec206cfc165b4daa9ccf5/research/games/crossmath/porting/guru-issuance-dataflow-20261125/README.md) · [consumer mapping](porting/GURU_ISSUANCE_DATAFLOW_2026-11-25.md). 7 range keys tracked with exact bindings UNKNOWN, empty-history rescue rule. Full history provider not tail; raw Smi limit100; 2499/2478 cross-profile masks missing. Debug model demonstrates filtered pool exhaustion without base exhaustion. No product implementation / native solver coverage promotion. Source pin 3517662878dd1982294ec206cfc165b4daa9ccf5, 308 registered/mapped. Reconcile unavailable interrupted 306-ID checkpoint by behavior. KIT IMPACT: RESEARCH; runtime NONE.

### 25.11.2026 · Guru exact SQL filter binding (312/312)

[Original evidence](https://github.com/DanilaH/mini-games-kit/blob/1f834eb4ab42bdafa93c54c116dcc67179c6d9c3/research/games/crossmath/porting/guru-filter-bindings-20261125/README.md) · [Consumer reconciliation](porting/GURU_FILTER_BINDINGS_2026-11-25.md). 7 exact keys bound; 4 validation IDs. 133 static ARM64 + 1064 SQL model checks, 20821 rows. Live remote enable/values, adaptive causality and original full solver convergence remain UNKNOWN. Source pin 1f834eb4ab42bdafa93c54c116dcc67179c6d9c3. No product changes, no new assignment beyond HELP-02 #11. KIT IMPACT: RESEARCH.


### 2026-11-25 — Profile/balance and HELP-02 review

- [Source study](https://github.com/DanilaH/mini-games-kit/blob/353328644b5eb172ba938578dcd62ce5230802df/research/games/crossmath/porting/guru-profile-balance-20261125/README.md) / [consumer report](porting/PROFILE_BALANCE_HELP02_REVIEW_2026-11-25.md). 320 registered/mapped IDs; 8 granular E25 profile rules. Developer HELP-02 findings retained; no gameplay changes.
- Original live A/B cohort assignment, performance-reactive difficulty and repeated remote emission remain UNKNOWN; verify on original device with matched actions and captured issuance IDs. No director or bank change approved.
- Candidate balance experiment: matched size/holes, vary arithmetic mix and opening reasoning; human testing required. v2 deliberately preserves initial single-gap move. No category relabeling or save changes.
- HELP-02 logical gate independently verified 515/515 in both compiled protocols. Android acceptance/signing compatibility still open; do not reopen solver implementation solely to copy original strategy names.


### 25.11.2026 · Guru commercial callbacks (333/333)

[Исходное исследование](https://github.com/DanilaH/mini-games-kit/blob/f4cca83706abc576c21d2b6eeb488562042126b9/research/games/crossmath/porting/guru-commerce-callbacks-20261125/README.md) · [сопоставление](porting/GURU_COMMERCE_CALLBACKS_2026-11-25.md). 13 новых granular ID: get_hint interstitial fallback/cancel/status grant, deadline clamp/extra/hidden routing, tutorial remote grants/defaults/game binding. 99 native words, 32 pool loads, 10 BL targets; live SDK, indirect grant linkage and active values UNKNOWN. Own adState/earned receipt and fixed economy unchanged; developer board-fit update noted separately. Implementation only after owner choice, no auto reward from Hidden. Next store prices/currency and unlock rewards. Source pin f4cca83706abc576c21d2b6eeb488562042126b9. KIT IMPACT REUSE; runtime NONE.


### 25.11.2026 · Resource economy and cooldown pilot (351/351)

[Source audit](https://github.com/DanilaH/mini-games-kit/blob/ff625788b01ef597c88126b2a120f915fcca6d24/research/games/crossmath/porting/guru-economy-20261125/README.md) · [consumer mapping](porting/GURU_ECONOMY_2026-11-25.md) · [developer pilot acceptance](https://github.com/DanilaH/crossmath-game/blob/04576ec2239e840176a1a412c06e82aa7b9253cb/docs/acceptance/interstitial-cooldown.md). 18 granular source IDs; 21 evidence refinements. Current developer HEAD 04576ec2239e840176a1a412c06e82aa7b9253cb, kit runtime b1bf2026eda7dd68a5ccbc883946191e03d235af, guide unchanged; original device/paid receipt/config unknown. Pilot implemented-unverified with actual code inspected, developer unit/Chromium/APK evidence, physical/live SDK open; keep owner DEFERRED hint fallback. Keep own60 cost and bank, no new commercial implementation approved. Future opt-in win multiplier candidate depends on confirmed original eligibility and owner choice; Battle/store later separate decision. No game code edits. Source pin ff625788b01ef597c88126b2a120f915fcca6d24.


### 25.11.2026 · Victory claim and progression pacing (357/357)

[Original source report](https://github.com/DanilaH/mini-games-kit/blob/487c344eba804dbcde635de9fa0d505fc6d192de/research/games/crossmath/porting/guru-reward-progression-20261125/README.md) · [consumer mapping](porting/GURU_REWARD_PROGRESSION_2026-11-25.md). 6 granular IDs, 4 refined. Original ordinary/rewarded requests differ, first-use markers and UI ad icon, non-cyclic mature daily tail. Wallet total/live eligibility UNKNOWN. Our first-win base already persisted: proposed victory reward must be explicit delta and result-bound durable receipt; owner decision before implementation. Daily short witness unchanged, longer objective optional research. Runtime b1bf2026eda7dd68a5ccbc883946191e03d235af unchanged, no acceptance promotion. Source pin 487c344eba804dbcde635de9fa0d505fc6d192de.

### 2026-11-25 — progression research (not owner commitment)
[Consumer comparison](porting/GURU_LONG_TERM_PROGRESSION_2026-11-25.md): 367/367 source IDs recorded. P1 candidates: eligible recurring XP independent of first-board coin grant (budget rank payout; current cap rank 32), own badge families/ceremonies after actual original capture. Later C0–C4: shared lifetime and weekly hat grant paths. No runtime, balance, content or initial release scope change.

### 2026-11-25 — competition native research (later scope)
[Consumer comparison](porting/GURU_STAR_BRAINS_NATIVE_2026-11-25.md): 380/380 source IDs; 13 additional rules. Star Race saved local opponent schedules, entry gates, atomic claim candidate; Brains main/temp storage and active self-only score update. Exact weekly reset and live config remain UNKNOWN. Competition/PvP/bots/seasons remain deferred by owner. No gameplay changes.

### 2026-11-25 — Battle admission, protected streak and Train Brain (research)
[Consumer comparison](porting/GURU_BATTLE_TRAIN_RECOVERY_2026-11-25.md): 396/396 source IDs, 16 additional rules. Battle type-dependent ticket debit, gate and ad ordering, conditional opponent interruptions, protected streak and EXP carry. Train Brain recovery past-day eligibility, independent day state and streak predicate. Exact price/offer consideration, live configuration and original-device recovery remain UNKNOWN. Competition/PvP/bots/seasons stay deferred; recovery proposed, not approved. Preserve current economy and atomic receipts.

### 2026-11-25 — event lifecycle and notifications (research)
[Consumer comparison](porting/GURU_EVENT_NOTIFICATION_LIFECYCLE_2026-11-25.md): 417/417, 21 granular rules. Permission checker guards, owned worker cancellation/reconciliation, scoped event links, reward/ack separation; potential original broad-update risk modeled, not device-proven. Preserve atomic own root, later owner-gated event scope, candidate earned prize survives expiry, reuse existing LOCAL_REMINDERS recipe; no balance/runtime changes.

### 2026-11-25 — store and No Ads lifecycle (research)
[Consumer comparison](porting/GURU_STORE_NOADS_2026-11-25.md): 433/433; 16 granular rules. Original No Ads gates (interstitial/MREC/banner and late disposal), separate store resource requests 10 coins/1 hint, purchase/restore result gates and Claim Coins result routes. Actual SKU-entitlement, current prices, settlement and return offers UNKNOWN. No new scope, economics or runtime. Future owner-gated commercial system reuses durable receipt and atomic settlement, independent presentation and voluntary ad policy.

### 2026-11-25 — A/B refresh and analytics rule structure (research)
[Consumer comparison](porting/GURU_ANALYTICS_AB_DATAFLOW_2026-11-25.md): 449/449; 16 granular rules. Progress-triggered refresh, bucket step fallback, distinct kick and force-fetch gates, pending/success state, analytics calibration cache/schema. Live adaptation to failures, actual settings changed and rule evaluator UNKNOWN. Production analytics and new policy remain owner-gated; no runtime or economy change.


## 25.11.2026 — AnalyticsCalibration evaluator (research follow-up)
Source inventory `bbaf857965f1440c48dca61c6f7375010165f4d8`: 460/460 mapped (11 new granular IDs); [source evidence](https://github.com/DanilaH/mini-games-kit/blob/bbaf857965f1440c48dca61c6f7375010165f4d8/research/games/crossmath/porting/guru-analytics-evaluator-20261125/README.md), 109 ARM64 word assertions and 24 decoded object-pool load sites. The evaluator builds named regex capture groups and anchors, checks missing/conditional/type/allowed-value/comparison/cross-parameter/property constraints, collects diagnostics per field. Exact live rules, sender consequences and gameplay adaptation remain UNKNOWN. DEFERRED/MISSING: no production analytics implementation selected; proposal is minimal typed schema + synthetic local checks after owner approval. Next: diagnostic result consumer, persistence, upload/ack, ad readiness. No runtime changes. Equivalent full-field connector validation 0 errors; exact Python CLI attempt on previous pair failed in CI and no readable steps/logs were returned.


## 25.11.2026 — Analytics transport, Worker and readiness (research)
[Consumer comparison](porting/GURU_ANALYTICS_TRANSPORT_READINESS_2026-11-25.md) · [source](https://github.com/DanilaH/mini-games-kit/blob/f0001f9067dc3bb945053a72163afe3285b181d9/research/games/crossmath/porting/guru-analytics-transport-readiness-20261125/README.md). 500/500 mapped, 40 granular source IDs. Room/lease/session/expiry/priority/serial paths, bridge defaults, unique Android Worker, ActivityAnalytics backlog and per-format readiness. Two timestamp-tie risks reproduced in synthetic SQLite only. All new entries DEFERRED/MISSING; owner-gated production analytics, no runtime, economy or acceptance changes. Original server delivery, actual config, diagnostic consumer and live adaptation UNKNOWN. Continue local config/game bindings and accessible core evidence. Source pin f0001f9067dc3bb945053a72163afe3285b181d9.


## 26.11.2026 — remote config consumers (research)
[Consumer comparison](porting/GURU_REMOTE_CONSUMERS_2026-11-26.md) · [source](https://github.com/DanilaH/mini-games-kit/blob/14939d46dc197b7c8ac04d230ce80c3663c06fd3/research/games/crossmath/porting/guru-remote-consumers-20261126/README.md). 519/519 mapped; +19 granular rules, +3 evidence refinements. Daily direct category shift/threshold and rescue; two diagnostic flags and bounded records; hint eligibility and fullscreen loading banner policy. 264 SQL controls, 176 synthetic shifts. Actual remote values, player-specific adaptation, exact rescue, strategy UI, original Android banner and commercial activation UNKNOWN. No game/runtime/economy change. Source pin 14939d46dc197b7c8ac04d230ce80c3663c06fd3. Next accessible work: local issuance/progression and original gameplay evidence; do not wait for server.


## 26.11.2026 — closure checkpoint and dependency-first porting plan
[Source](https://github.com/DanilaH/mini-games-kit/blob/944f4bb370edf46fb10c6f3b4d5ab0d505d85f23/research/games/crossmath/porting/closure-audit-20261126/README.md) · [Remaining proof gates](porting/RESEARCH_CLOSURE_GATES_2026-11-26.md) · [Proposed packages](porting/REFERENCE_PORTING_PLAN_2026-11-26.md). 605/605; 86 new granular static definitions/calls, 7 refinements; all three archives SHA verified. 56 achievement definitions, 11 vibration fields, feedback/issuance callsite audit. G1 native whole-catalog run and remaining local traces not completed; G2–G9 specific source/device/live/product gates. 48 explicit EVIDENCE_GAP/UNKNOWN rows, plus additional static/live limits. No new runtime/policy, no promotion. Next actionable stage is selected P0/P1 and bounded G1 in parallel, not indefinite ID accumulation. Source pin 944f4bb370edf46fb10c6f3b4d5ab0d505d85f23.


## 26.11.2026 · Первые пакеты переноса

- [FEEL-01 / #13](https://github.com/DanilaH/crossmath-game/issues/13) — 15 source IDs переведены в ROADMAPPED; текущие посадка, решение и победный звук уже имеют функциональные аналоги: три MISSING исправлены на PARTIAL после чтения кода 0.5.24, не новая реализация. Count-up Endless входит в этот UI-пакет без изменения правил P5.
- [WIN-RV-01 / #14](https://github.com/DanilaH/crossmath-game/issues/14) — проект добровольного бонуса победы, параметры и live policy к отдельному согласованию; статусы не повышены. HELP-02 и cooldown не повторять.

Текущие counts: IMPLEMENTED_UNVERIFIED=34, ACCEPTED=17, ROADMAPPED=20, RESEARCHED=204, EVIDENCE_GAP=44, DEFERRED=286; MATCH=27, PARTIAL=93, MISSING=448, UNKNOWN=37. 605/605 ID, runtime и продуктовый код неизменны. Проверка статическая; физическая приёмка открыта. KIT IMPACT REUSE / CANDIDATE.


## 26.11.2026 · META-01 — проект долгосрочной прогрессии

[Задача #15](https://github.com/DanilaH/crossmath-game/issues/15) · [модель](porting/progression-pilot-20261126/MEASUREMENTS.json). Фактическая 0.5.24/29: кампания 240 полей, rank17+150; объединение настроенных маршрутов 515 ID, теоретический максимум rank32+75; мастерская завершена при 228. Кандидат: 15 XP только за впервые закрытую дату Daily с ранее решённым ID (не за произвольный replay), сохранение ранговой кривой и текущих выплат, 6 визуальных семейств, 45 новых локальных достижений (57 всего), 6 новых приборов/24 части (72 всего) на 233–348. Модель проверена на pinned content, не в runtime. Порог, баланс, catch-up и арт требуют утверждения; P5/коммерческие/платформенные deferred IDs сохраняются. 36 исходных ID связаны с предложением, без изменения сравнений/статусов. HELP-02 и cooldown не затронуты. KIT IMPACT REUSE/CANDIDATE.


## 26.11.2026 · Выдача и разнообразие, два пилота

[ISSUE-01 #16](https://github.com/DanilaH/crossmath-game/issues/16) — six-step route остаётся; внутри bucket global unsolved-first, минимальный issued count, мягкий приоритет D4-формы вне последних трёх, стабильный pin при новом track/index. Модель 10 800 позиций: свежий Relax min repeat gap3→117, Challenge2→102; после 60 campaign первых 120 позиций Relax 75→120 уникальных ID. Candidate3 во всех 18 проверенных completion-only сценариях не имеет gap≤50, но это не гарантия живых смешанных сессий. Окно 6 отдельно исследовано, не выбрано. Смена политики/сейва требует согласования.

[CONTENT-03 #17](https://github.com/DanilaH/crossmath-game/issues/17) — offline generator lab: 275 собственных задач, 56 D4 форм, 274 D4+mask; Easy Short 27/40 одна форма. Полная модель geometry graph 7×7 с 8 уравнениями: 132 anchored sets, 3 D4 класса; 9×9 sample 10 000: 7853 geometry successes, ≥417 D4 классов, не числовые головоломки. Кандидат 40 Easy Short с 9×9 и прежними eq/hole/cap; только после независимого solver/Explain и device проверки рассматривать новый банк, потом Daily extension/operation/mask experiments. No existing ID changes. [Model](porting/issuance-pilot-20261126/MEASUREMENTS.json) · [Geometry](porting/issuance-pilot-20261126/GEOMETRY_CAPACITY.json).

24 source IDs связаны с предложениями, статусы и сравнения не повышены. G1, original stuck, live config и actual player difficulty остаются UNKNOWN. KIT IMPACT RESEARCH/CANDIDATE; runtime NONE.


## 26.11.2026 · FEEL-01 фактическая реализация и следующие пилоты

[FEEL-01 приёмка](acceptance/feel-01.md), gameplay a1fbf4d3546e5cf638168bf28d6f5a5ac0aa1a21 / actual HEAD 57820c8c6491c8b6240aeed5cb0dfde61c858927. 15 source IDs обновлены IMPLEMENTED_UNVERIFIED/PARTIAL по diff и отчёту разработчика (169 тестов, Chromium, signed APK). Независимый повтор тестов/телефон не выполнен; новый тестовый сертификат отличается от предыдущего APK. Не удалять старую игру/сейв ради установки. Сохранены две более ранние корректировки guru-ad-protect и guru-issuance-operation-ratio-denominator, не принимать их регресс из копии developer ledger. Текущие counts: IMPLEMENTED_UNVERIFIED=49, ACCEPTED=17, ROADMAPPED=5, RESEARCHED=204, EVIDENCE_GAP=44, DEFERRED=286; MATCH=27, PARTIAL=105, MISSING=436, UNKNOWN=37. 605/605.

- [DAILY-02 #18](https://github.com/DanilaH/crossmath-game/issues/18): первые 7 групп оставить, добавить 9, после 16 повторять 8..16; current 7 groups/6 unique; all 50 Daily boards close first group in one. 1440 fresh-set witness models across 90 v2 snapshots, ≤3 after fallback. No budget change: 60 for full set, 30 for date. Actual session/old and mixed saves pending.
- [RETURN-01 #19](https://github.com/DanilaH/crossmath-game/issues/19): separate current-day streak and best, no retroactive archive credit, explicit opt-in approximate-time Android reminder, reuse existing kit recipe. No permission, SDK or payout activation without owner decision.
- [EVENT-01 #20](https://github.com/DanilaH/crossmath-game/issues/20): optional 7 profile-day postcard, 3/6/9/12 distinct wins milestones, cosmetic only; 2560 synthetic expiry/receipt controls. 15-win variant rejected as unreachable at two/day. Preserve earned parts after expiry. Outside initial scope pending owner approval.

[Daily model](porting/daily-return-pilot-20261126/MEASUREMENTS.json) · [event model](porting/daily-return-pilot-20261126/EVENT_POLICY.json). 30 IDs linked without promotion or source coverage change. Runtime NONE. KIT IMPACT REUSE/CANDIDATE.


## 26.11.2026 · Соревнования — поэтапные предложения после initial release

- [RACE-01 #21](https://github.com/DanilaH/crossmath-game/issues/21): donor weights 1/2/4/6, target10 даёт 7–8 Relax vs2–3 Challenge; candidate targets4/12 =3 consecutive distinct fields across six phases. Source B interval sums320/660 s, not measured human duration. Explicitly labelled offline computer plans, absolute active clock+sequence (not wall time), one race receipt. Cosmetic first, separate optional +20 coins/day-start key only upon approval. Donor five-win pack 440 coins+7 hints ≈14.33 own hint equivalents, not default. Existing ad placement/cooldown unchanged; no new race-specific ad.
- [BRAINS-01 #22](https://github.com/DanilaH/crossmath-game/issues/22): later weekly candidate 3/full-set date +2/first-race-win date, max35; explicit computer profiles with saved schedule, no hat wallet or fake online rankings. Source ordinary max-exclusive ranges and actual source prize/period gaps preserved.
- [BATTLE-01 #23](https://github.com/DanilaH/crossmath-game/issues/23): refines existing M3 (not new competing specification). Formula applied to own bank: bot6 Easy Short28–32s, Hard36–40s, Expert64.5–75.5s, Hell103–114s; no human timing claim. Free fixed-plan lab → separately approved reactive behavior → ticket/streak/progression/commerce. Source time/interrupt/internal unit/live SDK gates remain.

[Model](porting/competition-pilot-20261126/MEASUREMENTS.json) · [absolute clock controls](porting/competition-pilot-20261126/CLOCK_POLICY.json). 50 unique source IDs linked, all 605 retained, statuses/comparisons unchanged. No new product runtime, balance, art or owner scope approval. Physical G8/signature and source G1 etc remain open. KIT IMPACT REUSE/CANDIDATE.


### 26.11.2026 · EasyFun mode/career native supplement
[Source report and reproducible controls](https://github.com/DanilaH/mini-games-kit/blob/703fe422616901ceb86045c6def358ce35b177db/research/games/crossmath/porting/easyfun-mode-career-20261126/README.md) · 11 new stable IDs; 2 refined, 103/103 isolated ARM64 controls, repeat byte-identical. 0.5.24/29 code inspected at 38489056d0dad1d36157682729a086683b44093b. No own implementation/acceptance/economy/bank/runtime changes. Existing #16: nonmutating preview, exact once commit, typed invalid result, immutable slots. #18: own Daily Next opens calendar (session.ts:173); keep current route unless owner approves a different UX. #20: future Event last-index terminal no wrap/no extra payout; persisted event identity; owner scope unchanged. #15: optional local career milestones, deterministic ties, whole hours derived from stored seconds, no implied live player percentile or copied thresholds. Current source activation on Android, VIP/reward indirect paths remain UNKNOWN. KIT IMPACT RESEARCH/REUSE.


### 26.11.2026 · Guru Daily issuance native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/153cd28eef00fe73982820bbe96ae38889c7e980/research/games/crossmath/porting/guru-daily-issuance-native-20261126/README.md) · [local mapping](porting/GURU_DAILY_ISSUANCE_NATIVE_2026-11-26.md). 220 original isolated controls (140 issuance, 76 legacy range, 4 completion writer). Nonempty history is the previously unknown shift gate; last finished label or legacy d; minEqual independent, primary excludes 300; null→whole-history mask-only rescue without retry, can return different category/too few equations, requested label still stored. Empty history+enabled14 in cm5 (1705 Easy all <14) reaches nextInt(0) throw stub, not proof of Android crash. Crossmath calendar-v2 fixed date→ID unchanged. Separate optional ISSUE-01/#16, CONTENT-03/#17 and DAILY-02/#18 dependency: explicit bounded policy, safe fallback/no stale ID, actual vs requested category separate, immutable saved date assignments. Owner decision before implementation. 625 registered/mapped; 4 new IDs, 8 refinements; no acceptance promotion. Actual source device/config UNKNOWN. KIT IMPACT RESEARCH/REUSE; runtime NONE.


### 27.11.2026 · Guru economy native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md) · [local mapping](porting/GURU_ECONOMY_NATIVE_2026-11-27.md). 102 isolated original controls, two byte-identical runs. Tutorial independent hint requests and local snapshot setter; celebrate_coin/debug initializes offer10 but not wallet, reward mask may contain other rewards; Deployment.init_igc=0 and both init branches delta0, actual startup wallet UNKNOWN. Ordinary true requests10 (correct old false/true wording); successful multi requests30 standalone, first marker telemetry only. Exact GDT bindings Hint/Ticket/Store/GameOver, cause-only wrapper, Hint/Ticket success grant commands; no actual SDK/persistence. Keep own initial120/0, help60, unique base and atomic receipts. #14 if approved, total vs delta and no double base; #24 distinct onboarding grant receipts; #27 no cause-only settlement/fallback (owner-deferred). 630 registered/mapped, 5 new IDs and 17 refinements. No implementation/acceptance promotion; original live/device still UNKNOWN. KIT IMPACT RESEARCH/REUSE; runtime NONE.


### 27.11.2026 · Guru Store / A/B native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/0b1a68d63a680bee804bf448f8f2f6fcf27ea67a/research/games/crossmath/porting/guru-store-ab-native-20261127/README.md) · [local mapping](porting/GURU_STORE_AB_NATIVE_2026-11-27.md). 63 isolated original checks, two byte-identical runs. Store coin success requests10 before animation; hint success sets pending and exact registered animation completion requests1 then clears flag. Missing image blocks builder; close/dispose inspected bodies do not explicitly flush; direct repeated completion requests again, normal inactive update exits. Not a proven real duplicate/loss bug. A/B _startFetch→forceFetch→shared RC observable→Daily success-gated observer resolved; SDK timeout15s/min0 then restores7200s, publication on both normal SDK bool values. Server cohort and actual effects UNKNOWN. #24: durable earned receipt + atomic wallet before independent visuals; #16/17/18 immutable assignments; P6 only separate approved config/consent, validated new assignment policy. Preserve 120/0, help60, cooldown and runtime. 638 IDs, 8 new/7 refined; no implementation or acceptance promotion. KIT IMPACT RESEARCH/REUSE; runtime NONE.

### 27.11.2026 · Guru profile native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/75220fdc10bfcc7dbb9ae2ab8c45199b7783c342/research/games/crossmath/porting/guru-profile-native-20261127/README.md) · [local mapping](porting/GURU_PROFILE_NATIVE_2026-11-27.md). 183 isolated native case records, 125 triple sequences / 375 observer callbacks, two byte-identical runs; 22/125 current-vs-fixture-cold-init mismatches and 14 same-bank replacement requests. Known easy1 changes active config before release, requests new getDb and storage without await; default/unknown save default without swapping. Empty/null ignored. Saved nonnull has priority; five minutes is initial subscription eligibility, not a callback deadline. String mapper has no status gate in its own body; actual upstream delivery UNKNOWN. Actual disk, SQLite, SDK, Android and live experiment unknown. #16/#17: no remap of active/parked/date assignments; same-profile no-op; prepare/validate then atomic commit, failure retains consistent bank. P6 separately owner-gated. 644 IDs: 6 new / 10 refined, no implementation/acceptance promotion; runtime unchanged. KIT IMPACT RESEARCH/REUSE.

## EasyFun Event native follow-up · 27.11.2026

[Source report, native replay and reproducible checks](https://github.com/DanilaH/mini-games-kit/blob/836a7a02ccead81d491e3ec4137d7e266a5434d9/research/games/crossmath/porting/easyfun-event-native-20261127/README.md) · [local adoption mapping](porting/EASYFUN_EVENT_NATIVE_2026-11-27.md). 313 isolated native cases, two byte-identical runs and negative predicate control. Event lookup returns first matching ID; coin/hint totals include all config rows, not unclaimed rewards. Finish Running/Pause gate then next preview; at last index terminal write request precedes lookup and can precede missing-reward guard. RT0 requests coins, RT2 updates existing badge row, RT1 has no grant in inspected finish handler. Other hint path remains UNKNOWN. ItemUtil Hint performs sum then cap99; update event carries requested delta; coin branch has no upper cap in body. Gift animation argument20 not proven amount; Event→Classic stats mutation static only. #20/#24/#15: validated unique stage IDs, one preview/grant contract, atomic receipt and progress, actual applied delta, mode-specific stats; preserve owner economy and release scope. Original Android/live config/payout/DB persistence UNKNOWN. 18 new / 5 refined IDs; 671 mapped, no implementation/acceptance promotion. Runtime unchanged. KIT IMPACT RESEARCH/REUSE.

## EasyFun expression native follow-up · 27.11.2026

[Source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/6980f3a67b930f7c7084d897f36c857b76951efa/research/games/crossmath/porting/easyfun-expression-native-20261127/README.md) · [local mapping](porting/EASYFUN_EXPRESSION_NATIVE_2026-11-27.md). 42,015 isolated original case records, two identical runs; negative associativity mutation. Native RPN, both sides, strict positive subtraction, exact nonzero division, operation caps1000, negative intermediate rejection and singleton bypass; own 1..99 single-op result relation has zero mismatches across 39,204 native operand pairs (own formula compared by inspection, not executed TS). Board completion uses filled interactable cells and cached status !=2, no arithmetic recomputation; no demonstrated stale-cache bug. Keep own stricter validator, solver and Explain. #17 optional separately versioned long-expression lab only with owner approval; existing 515 fields, assignments/saves, economy and runtime untouched. Original long-level occurrence, UI status freshness, Android/live source evidence UNKNOWN. 14 new / 3 refined IDs; 685 mapped. No implementation or acceptance promotion. KIT IMPACT RESEARCH/REUSE.

## EasyFun reward/spend native follow-up · 27.11.2026

[Exact source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/6fd19408bfd58a0a39512749b19d5caa6e6355b8/research/games/crossmath/porting/easyfun-reward-native-20261127/README.md) · [consumer mapping](porting/EASYFUN_REWARD_NATIVE_2026-11-27.md). 240 isolated original cases, byte-identical repeats; negative branch control. Credit first then coins then RV; true hint callback adds and consumes one, common dispatch requested; board mutation/actual subscriber UNKNOWN. Random-gold true reads sector at callback and requests base×multiplier; false requests base; FreeRewardCallback invokes true; pointer and sequence mocked, actual sector odds/eligibility UNKNOWN. UseItemCount balance check, no positive-amount validation in its own body, successful hint debit increments counter by one; Daily paid restart handler ignores debit return in isolated artificial fixtures, no actual free-restart bug claimed. Close continuation requests base then animation; parent guard and 0/0.5 delay static only. Exact setter direct-call census does not prove alternate Event hint grant. #14/#18/#24/#27: retain own receipt-first settlement, validated payment and free Daily restart, no copied donor price/cap/multiplier/delay, no new SDK or economy without owner approval. 16 new/8 refined; 701 IDs mapped; no implementation or acceptance promotion, runtime unchanged. KIT IMPACT RESEARCH/REUSE.

## EasyFun Hint native / residual review · 27.11.2026

[Source report and reproducer](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-hint-native-20261127/README.md) · [consumer mapping](porting/EASYFUN_HINT_NATIVE_2026-11-27.md) · [residual review](porting/RESIDUAL_REVIEW_2026-11-27.md). 494 isolated native cases, byte-identical repeats; exact generic GEvent_Use_Hint Send/Register/UnRegister and Game_Resume binding; controller vslot10, author-answer target, minimum tray SortIndex, empty-tray wrong minimum, local replacement/transfer. Source cell stores executed, Unity equality/observers/animation mocked; real Android bus, mode observers, actual wallet and save remain UNKNOWN. Own Reveal chooses selected wrong target and returns all wrong occupied cells; optional minimal-repair candidate after owner approval, retain selected target/preview/atomic cost, preserve unrelated tokens and all 515 Explain regressions. No donor order, price, auto-apply or weaker validation. 13 new / 6 refined IDs, 714 mapped; 52 explicit gaps routed independently with three bounded local targets. No scope/implementation/acceptance or runtime promotion. KIT IMPACT RESEARCH/REUSE.


## 27.11.2026 · CONTENT-03 — изолированная лаборатория банка

[Задача №17](https://github.com/DanilaH/crossmath-game/issues/17) · [приёмка](acceptance/issue-17/README.md) · [измерения](experiments/content03/measurements.json). Easy Short прошёл технические критерии перед дальнейшими опытами: 40 кандидатов 9×9 дают 24 D4-класса вместо 4 текущих, максимум 8 полей на форму. Отдельно 40 контролей до 7×7. Затем в лаборатории добавлены 50 Daily (47 D4-классов против 11) и 16 парных вариантов с 20–30% ×/÷. Все 146 полей имеют одно числовое решение и проходят фактический Explain с независимой перепроверкой каждого шага. Из 128 диагностических масок 113 допущены, 15 неединственных исключены. Браузер проверяет 876 сочетаний поля, размера и темы, включая 320×480. Это не заменяет приёмку на телефоне.

Сборка `build:content-lab` открывает отдельный банк и отдельный ключ сохранения, без выплат. 515 действующих полей, цены, начисления и пилот выдачи №16 сохранены. Обычная сборка исключает лабораторные данные и код. Модель календаря на 100 дней и отдельный опыт длинных выражений не подключены к игре. Грамматика и версия контента прежние. Выбор постоянной политики и нового банка, миграция и человеческая оценка сложности требуют отдельной приёмки. Статусы переноса исходных правил не повышены. KIT IMPACT RESEARCH/CANDIDATE; runtime NONE.


## 27.11.2026 · LEAGUE-01 — экспериментальная недельная офлайн-лига

[Задача №22](https://github.com/DanilaH/crossmath-game/issues/22) · [приёмка](acceptance/issue-22/README.md) · [числовая модель](experiments/league22/MEASUREMENTS.json). `build:league-lab` добавляет необязательную лигу из профиля: игрок и 9 явно подписанных ботов, фиксированные собственные расписания на основании Brains, очки обычных полей по сложности, один ID/неделя, сохранённая недельная медаль без монет/подсказок/XP. Один GameSession writer, защита receipt/week/profile, сохранённые UTC-планы и компактная история. Изоляция повреждённой лиги сохраняет кошелёк и обычные партии. Пакеты №16/#17 остаются в экспериментальной сборке.

4 200 модельных сценариев и 600 составов показывают сильную зависимость места от темпа, сложности и позднего вступления. Все числовые параметры и постоянное включение требуют калибровки; человеческий pacing и физическая приёмка Android открыты. Source comparison PARTIAL / IMPLEMENTED_UNVERIFIED для четырёх Brains IDs; source live prizes/config UNKNOWN. Lifetime, main/temp donor extensions и прочие соревнования остаются отложенными. KIT IMPACT REUSE/CANDIDATE; runtime NONE.

## 27.11.2026 · LEAGUE-01, доработка представления

Последнее решение: «Лига» / League, компьютерные соперники раскрываются в правилах. Прямой вход с главной, свои портреты/естественные ники, разные составы по неделям, лидеры/своя строка, committed feedback очков/места и медали. v2 сохраняет календарный прогресс при позднем вступлении; v1 активные планы без изменения. Изолировать `result.league` во всех слотах и архиве без отката кор-профиля. [Новая приёмка](acceptance/issue-22/REVIEW.md) заменяет прежние обязательные Bot/offline подписи и прежнюю политику обрезки расписаний. Числа и постоянное включение открыты. META не начат.
