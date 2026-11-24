# ТЗ ADS-01 — восстановление управления баннером после ошибки bridge

**Статус: готово к разработке. Дата: 24.11.2026. Одна небольшая доработка существующего AdsController.** Игровой код в ходе подготовки ТЗ не изменён.

## 1. Результат для игрока и подтверждённый дефект

Исправить потерю команды показа/скрытия баннера после временного отказа bridge. Следующий предусмотренный запрос восстановления должен повторять **актуальное желаемое состояние**, сохраняя один незавершённый вызов к провайдеру.

В текущем [flushBanner()][ads] значение bannerSent присваивается **до** выполнения provider.setBanner. Rejection проглатывается. Затем bannerSent уже равен banner, и повторные запросы того же состояния пропускаются. При неудачном скрытии это может оставить native-баннер над меню, модальным окном или fullscreen; при неудачном показе — не восстановить его на разрешённом игровом поле. Это вывод о возможном последствии подтверждённой ошибки контроллера; фактический native-баннер в текущем APK не проверен.

Дефект воспроизведён на **неизменённом теле AdsController** из bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67. Scripted provider: show успешно → hide отклонён → три одинаковых updateBanner(false) и три refresh(). Дополнительного hide нет. Симметричный rejected show тоже теряется. Успешное объединение одинаковых команд и dispose → позднее успешное завершение show → hide уже работают; их сохранить как регрессии. [Результат воспроизведения](REPRODUCTION_RESULT.json), [скрипт](reproduce_banner_failure.mjs).

**Польза:** временная ошибка необязательного рекламного сервиса перестаёт навсегда рассогласовывать управление баннером в текущей сессии. Для этой доработки достаточно существующего интерфейса и scripted provider; выбор live SDK отдельной зависимостью остаётся только у native/live приёмки.

## 2. Проверенная база и действующие решения

| Срез | Значение и источник |
| --- | --- |
| Активный игровой код | PR [#4](https://github.com/DanilaH/crossmath-game/pull/4), feat/mode-unlocks-0.5.10, HEAD **bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67** |
| Версия исходников | **0.5.24 / versionCode 29**; [package.json](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/package.json) и [android-project.json](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/android-project.json), Git blob последнего **5d2f88cc093626c3a6e4b4852ac13561c8832727**. Воспроизведение на текущем коде не является новым APK или Android-приёмкой |
| Runtime kit | **469928d03f4bae5053e23db26e82187bedbc252e** из [package.json](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/package.json); pin сохраняется |
| Актуальный consumer ledger | PR [#7](https://github.com/DanilaH/crossmath-game/pull/7), **e2af74021f16d1437e90638f10adac0b6333d427**, [ADOPTION_LEDGER.json][ledger], 296 ID |
| Исходный реестр | Kit PR [#139](https://github.com/DanilaH/mini-games-kit/pull/139), **06a01d5c1f7af3cdf8013c9ce0f6a691d086af78**, [SOURCE_FEATURES.json][inventory], 296 ID |
| Основная доказанная ошибка | src/platform/ads.ts, Git blob **53fed5cc17d2afbd37526dc6845c805ec32cd219** |
| Метод разработки | [DEC-2026-11-24-SOURCE-BASED-IMPLEMENTATION](https://github.com/DanilaH/crossmath-game/blob/e2af74021f16d1437e90638f10adac0b6333d427/docs/PROJECT_DECISIONS.md#dec-2026-11-24-source-based-implementation): собственная реализация на основании исходного native-кода и архитектуры; копии исходных фрагментов остаются в private kit |

Прочитаны действующие AGENTS, PROJECT_DECISIONS, STATUS, ROADMAP, SESSION_HANDOFF, BOOTSTRAP, фактические ads/adState/session, Android bridge, lifecycle wiring и tests/ads.test.ts. Использованы маршруты **Android Ads/Lifecycle** и **Reference → Product Porting**. [API на runtime pin](https://github.com/DanilaH/mini-games-kit/blob/469928d03f4bae5053e23db26e82187bedbc252e/docs/API.md) содержит существующие ActivityCoordinator и DurableReceiptQueue, а [ADS_AND_LIFECYCLE](https://github.com/DanilaH/mini-games-kit/blob/469928d03f4bae5053e23db26e82187bedbc252e/docs/android/ADS_AND_LIFECYCLE.md) требует одного незавершённого RPC и восстановления без мгновенного цикла повторов. Новый общий компонент кита для этой правки не нужен.

Старые 120–200% font-критерии в исторических STATUS/ROADMAP заменены решением владельца о **100% типографике**. Текущее ТЗ проверяется при 100%, включая 320×480 и 320×568. Исследовательский source pin и runtime pin — разные зависимости.

## 3. Что уже сделано в нашей игре

| Фактический код | Текущее поведение | Значение для задачи |
| --- | --- | --- |
| [gameUi.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/ui/gameUi.ts#L431) | desired banner только при ready, отсутствии блокировки/ошибки save, screen=play и attempt=playing | Сохранить существующую политику допустимости |
| [ads.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/platform/ads.ts#L179) | Дополнительные условия: не disposed, нет fullscreenWork, availability.banner=true | Исправить исполнение команды, сохранив эти условия |
| [gameUi.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/ui/gameUi.ts#L125) | Существующий refresh вызывается таймером каждые 2 секунды; activityChanged вызывает render | Уже есть событие восстановления; новый retry-таймер не требуется |
| [androidAds.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/platform/androidAds.ts#L36) | setBanner просто передаётся в optional CrossmathAds bridge | Ошибка bridge доходит до контроллера; native provider в репозитории отсутствует |
| [nativeLifecycle.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/app/nativeLifecycle.ts), [main.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/main.ts) | Native-background/document/modal/ad блокировки агрегируются, результат попадает в GameUi.activityChanged | Поздний ответ баннера не должен снимать чужую блокировку |
| [tests/ads.test.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/tests/ads.test.ts) | Scripted setBanner всегда успешно завершается; проверяется coalescing [true,false] | Ошибка команды и восстановление того же desired сейчас не покрыты |
| [adState.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/platform/adState.ts), [session.ts](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/app/session.ts#L69) | Уже есть durable request IDs, exact-attempt/run continuation, earned-only settlement, replay/ack | Это действующие гарантии, не новые задачи |

[Контракт E2](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/docs/ACCEPTANCE_E2_2026-11-19.md#native-provider-contract) уже поручает native owner скрывать баннер при background/modal/fullscreen и владеть reservation/insets. Этот контракт не требует установки нового SDK для исправления JS-контроллера.

## 4. Исходный код EasyFun и перенос архитектуры

**Оригинал:** EasyFun Offline Crossmath **1.1.9 / 1193**.

| Файл оригинала | SHA256 |
| --- | --- |
| XAPK | e12cce36ab165493e948f4c1303d41d91f653fece9ca23d3163d47b3fb2c9d8d |
| arm64-v8a/libil2cpp.so | 1b69ef78f2e25717f3a2e61485d6ad4228d73827f1166661ee37bc8d7f11c720 |
| IL2CPP v31 global-metadata.dat | 21ab087523cc6b7d92f97dad3a70e647ab56727001b6f95db4a302f2f044b4e6 |

[Исходные методы][source-asm], [typed bindings][source-bindings], [method bounds/SHA manifest][source-manifest], [архитектурный разбор][source-readme] находятся в **закрытом kit**. Это точный ARM64-дизассемблированный AOT-код с raw bytes, а не восстановленные C#-исходники. Исследовательский псевдокод подписан отдельно. В публичный issue/PR передаются ссылки и собственная реализация.

| sourceFeatureId / метод | Метод и RVA | Подтверждённое исходное действие |
| --- | --- | --- |
| easy-banner-lifecycle-hide | AdManager.ShowInterstitial #20561, **0x1434644**, callsite **0x143478c**; AdManager.ShowRewardVideo #20566, **0x14350e4**, callsite **0x1435218** | Прямые вызовы HideBanner **0x143456c** перед соответствующим provider flow |
| easy-banner-lifecycle-hide | LaunchManager.OnApplicationFocus #20688, callsite **0x1440480**; OnApplicationPause #20690, callsite **0x14406c4** | Статические вызовы HideBanner; branch eligibility и видимый исход требуют Android-проверки. [Отдельный source report](https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/easyfun-native-ad-stubs-20261123/README.md) |
| easy-ad-close-delayed-banner-request | AdManager.InterstitialClosedCallBack #20581, **0x1435714**; RewardedVideoCloseCallBack #20587, **0x1435844** | Планируют отдельные continuation через Util.Delay #22145, **0x14b9d54** |
| easy-ad-close-delayed-banner-request | AdManager.<InterstitialClosedCallBack>b__42_0 #20595, **0x143603c**; <RewardedVideoCloseCallBack>b__48_0 #20596, **0x1436044** | Очищают AdShow, bool field12214/+0x18, затем переходят к ShowBanner #20556, **0x1434498** |

**Прямо используемый архитектурный приём:** реклама имеет отдельного владельца presentation/lifecycle; начало fullscreen исключает баннер, а завершение запускает отдельное согласование баннера с допустимым состоянием. Reward authority не принадлежит этому presentation continuation.

**Наша адаптация:** существующий AdsController сохраняет этот раздел ответственности и надёжно доводит последнюю допустимую команду до bridge после временной ошибки. Модель desired / подтверждённая команда / pending нужна из-за воспроизведённого дефекта собственной асинхронной реализации. Она **не объявляется найденным в EasyFun алгоритмом retry**.

В исходных close handlers есть float bits **0x3e99999a** ≈ 0.3000000119. Это не измеренные 300 мс на телефоне; scheduler/background/фактический показ UNKNOWN. В этой задаче повторное согласование привязано к состоянию и существующим recovery-событиям. Число из исходника не вводится в продуктовый таймер.

## 5. Требуемое изменение

Разделить как минимум три понятия: **последнее желаемое состояние**, **незавершённая команда**, **успешно подтверждённая команда**. Имена полей и локальная реализация остаются выбором разработчика.

1. Принимая updateBanner, пересчитать effective desired по действующим условиям. До вызова провайдера нельзя считать его результат подтверждённым.
2. После resolve запомнить значение **именно завершённой команды**. Затем сверить его с актуальным desired. Если desired успел измениться, отправить только последнюю требуемую команду.
3. После reject сохранить необходимость согласования. Из reject нельзя заключать, что native состояние осталось прежним или уже стало требуемым: bridge мог применить действие и потерять ответ. Статус текущего состояния — неподтверждённый.
4. Повтор того же failed desired разрешить на следующем существующем **refresh()**; реальное изменение desired обрабатывать без ожидания периодического refresh. Banner recovery должен работать и при зависшем availability/pendingRewards запросе — он не зависит от их успешного ответа.
5. Одновременно допускается не более одного unresolved setBanner RPC. Повторные render/updateBanner с тем же desired не создают поток запросов. Reject не вызывает немедленный рекурсивный retry через finally; один recovery-trigger даёт максимум одну новую попытку текущего desired. Пока RPC не завершился, новые вызовы только обновляют последнее желаемое состояние.
6. Fullscreen-close выполняет существующее снятие своего blocker и пересчёт политики. Если остался background/modal/save-failure или контроллер уже disposed, close не даёт права на show. Ошибка баннера не должна задерживать закрытие рекламы, управление полем, сохранение или обработку reward receipt.
7. Dispose терминален для show: зафиксировать desired=false, освободить listeners и выполнить один заключительный hide по мере завершения находящегося в работе RPC. Если перед dispose hide уже отклонился, dispose — отдельная возможность отправить заключительный hide. Поздний результат прежнего show не вызывает show снова и не оживляет UI. После rejected заключительного hide не запускается бесконечный retry/новый таймер; отсутствие native-подтверждения фиксируется в проверке.
8. Уточнить документацию setBanner: **resolve означает успешную обработку команды провайдером с его текущими native guards; он не доказывает painted creative или impression**. Повтор того же intent идемпотентен для view/reservation и не означает новый SDK reload/request. Native owner по-прежнему самостоятельно запрещает показ на background/destroy/fullscreen и управляет фактическим view. JS не может гарантировать исчезновение native view, если bridge перестал отвечать.

Для начального состояния native view применять существующий контракт нового owner; не выдавать начальное false в JS за измеренную невидимость. Эта задача не добавляет загрузчик баннеров, размещения или новый рекламный продукт.

## 6. Воспроизводимые последовательности

T/F ниже — желаемая команда setBanner(true/false). «Success» — подтверждение команды scripted provider; это не impression.

| Сценарий | Последовательность | Текущий HEAD | После правки |
| --- | --- | --- | --- |
| A. Ошибка скрытия | T success → F reject → тот же F + refresh | Только T,F; повтор F потерян | На recovery отправлен ещё F; после success последний desired подтверждён |
| B. Ошибка восстановления | T reject → тот же T + refresh | Только один T | Один новый T на recovery; после success повторные одинаковые запросы объединяются |
| C. Изменение во время RPC | T pending → desired F → завершить T | При успешном T уже есть последующий F | Сохранить этот порядок при success; при reject T тоже довести текущий F, а не повторять старый T |
| D. Background во время close | fullscreen pending + background → fullscreen закрыт → поздний callback | Основные blockers уже независимы | Пока background действует, нет T. После реального foreground и разрешённого play — последнее допустимое T |
| E. Dispose | T pending → dispose → T success | Последующий F уже работает | Сохранить F и удаление listeners; никаких последующих T/changed UI |
| F. Постоянная ошибка / hung call | F reject многократно либо F остаётся pending → повторные render/refresh | Ошибка подавлена либо один pending | Нет microtask/timer storm; один unresolved RPC; core остаётся доступен; unresolved не считается success |

Для самостоятельного запуска приложенного baseline reproduction:

~~~sh
cd docs/porting/help-and-ads-20261124/ads
node --disable-warning=ExperimentalWarning reproduce_banner_failure.mjs
~~~

Либо запустить скрипт из каталога приложений к этому ТЗ. Node ≥24, npm-install не нужен. Скрипт проверяет Git blob исходного ads.ts, TypeScript-трансформирует его и исполняет неизменённое тело класса. Неиспользуемые в banner path импорты reward-гейтов/queue заменены заглушками, которые падают при неожиданном вызове. Результат подтверждает ошибку собственного контроллера; это не полный Vitest, браузер или Android.

## 7. Затронутый код и ограничения области

| Файл | Ожидаемая работа |
| --- | --- |
| src/platform/ads.ts | Локальное состояние и согласование баннера, retry от существующего refresh, terminal dispose. Основная правка |
| tests/ads.test.ts | Scripted setBanner с reject/deferred completion; meaningful assertions по sequence/count/последнему desired |
| src/platform/androidAds.ts | Сверить и при необходимости уточнить комментарий контракта. Установка SDK или расширение native API для boolean recovery не нужны |
| src/ui/gameUi.ts | Проверить существующие render/activityChanged/refresh как входы. Менять только если необходим конкретный wiring для выбранного recovery; текущую политику видимости сохранить |
| docs/ACCEPTANCE_E2_2026-11-19.md или новый датированный acceptance annex | Зафиксировать semantics promise, результаты и пределы доказательства. Исторические результаты оставить датированными |
| docs/porting/ADOPTION_LEDGER.json и ROADMAP | После реализации — точный implementation PR/HEAD и evidence для двух IDs; статус не объявлять полной source parity |

Сохраняются schema/save, hint/continue resources, request/profile/attempt/run IDs, earned-only settlement, replay/ack, first-frame independence, прежние ограничения показа и параметры частоты. beforeNext остаётся существующим result→Next. Пороги 5/180/120, active-time clock, отдельные source Firebase keys, first-call lifetime и cheat-путь не относятся к этому bugfix. Их исследовательские записи продолжают жить в реестре; задача не выбирает за владельца иной баланс.

## 8. Критерии приёмки по уровням доказательства

### Unit / исполнение собственного контроллера

Добавить связанные сценарии в имеющиеся tests/ads.test.ts:

- **U1:** сценарий A; после recovery calls=[T,F,F], второе F успешно; последующие одинаковые update не создают лишнюю команду.
- **U2:** сценарий B; failed T повторяется один раз на recovery; успешный повтор завершается обычным coalescing.
- **U3:** desired меняется во время pending; после его success/reject посылается актуальное значение, не устаревшее. Проверить T→F и F→T.
- **U4:** постоянные reject; без нового recovery-trigger нет новых попыток. Серия синхронных одинаковых update не создаёт цикл microtasks. Hung RPC остаётся единственным при повторных refresh.
- **U5:** recovery баннера не ждёт зависших availability()/pendingRewards(). Startup/gameplay остаются доступными.
- **U6:** close при действующем background/modal не вызывает T; снятие только ad blocker не снимает другой. Политика не восстанавливается поздним callback после dispose.
- **U7:** pending show → dispose → resolve → hide; failed hide → dispose → одна заключительная hide-попытка. После terminal reject — отсутствие нового show и retry storm, а не ложное утверждение «native скрыт».
- **U8:** прежние receipt/reward/interstitial tests остаются зелёными. Не переписывать заработанный reward через presentation-state.

Запустить целевой файл и предусмотренный [AGENTS](https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/AGENTS.md) npm run check. Считать новую проверку регрессией именно тогда, когда она ловит baseline defect, а не повторяет набор внутренних полей новой реализации.

### Browser / настоящий DOM со scripted provider

В тестовой точке подключения GameUi внедрить scripted AdsProvider, не добавляя production window-global или release debug-menu. Проверить при **100% шрифте**, 320×480, 320×568 и 390×844:

1. Поле → пауза/помощь → закрытие окна, с rejected hide/show и успешным следующим recovery.
2. Два независимых blockers → снять только один → banner request остаётся F; возврат на разрешённое поле даёт T.
3. Навигация/нажатия/сохранение и результат→Next продолжают работать при failed/hung banner RPC.
4. Зафиксировать последовательность provider calls и события интерфейса. Визуальная scripted-плашка — тестовый double; её кадр не является native creative/impression.

Новая browser-проверка относится к wiring и доступности действий. Она не измеряет native reservation, Android dp или live fill.

### Android / host и выбранный провайдер

Когда доступен существующий согласованный provider либо отдельный Android test double, проверить точный APK/source/certificate на USER emulator и отдельно на физическом телефоне. Capture: поле с реально видимым баннером → modal/background/fullscreen → close/foreground, включая late completion и отказ bridge. Снять native screenshot/video и фактические root/WebView/banner bounds; проверить отсутствие двойного inset и доступность касаний.

Если применён Android test double, записать это явно. Если provider отсутствует, записать **NOT RUN — CrossmathAds native provider не установлен**, не подменять этот уровень browser или Gradle PASS. При изменении native/build слоя выполнить обязательные sync/debug/releaseCheck/exact-APK проверки из AGENTS.

### Live SDK

Только на уже выбранном и настроенном провайдере: отдельно request, load/no-fill, actual view, painted creative, impression, close. Проверить его реальные callback и lifecycle guard. Источник SDK/placement, environment и результат должны быть названы; test fill не равен выручке. Live acceptance сейчас открыта и не требуется для того, чтобы починить и unit/browser-проверить controller.

## 9. UNKNOWN и следующий опыт

| Неизвестное | Как уточняется | Влияние на задачу |
| --- | --- | --- |
| Фактическое состояние native view после rejected RPC | Провайдерный trace + Android screen, включая вариант «действие применилось, ответ потерян» | Контроллер оставляет состояние неподтверждённым и повторяет актуальный intent |
| Выбранный live SDK, его lifecycle гарантии и placements | Существующее решение о provider/config + реализация native bridge; затем Android conformance | Внешняя зависимость только native/live этапа, не причина откладывать JS bugfix |
| EasyFun scheduler/время баннера после close | Оригинал 1.1.9 на Android: close → кадры → background/resume и timestamp | Не вводить source float как задержку нашего телефона |
| Достижимость focus/pause веток EasyFun и actual creative | Оригинал 1.1.9: foreground/background с параметрами callbacks и видимым banner | Не объявлять MATCH по собственной правке |
| Реальные source Firebase thresholds и first-call lifetime | Отдельный original Android/config опыт по уже зарегистрированным IDs | Не нужны этому scope и не заменяются вымышленными значениями |

## 10. Приёмка, реестр и передача

**Основные IDs:** easy-banner-lifecycle-hide и easy-ad-close-delayed-banner-request. Оба в текущем ledger — **RESEARCHED / PARTIAL**. easy-banner-play остаётся контекстом текущего размещения, без добавления новых сцен.

После PR разработчик сообщает точный HEAD, изменённые файлы, unit/browser evidence, Android/live status и связывает результаты с этими двумя ID. Own bugfix не доказывает source timing, original runtime или full SDK parity: не повышать comparison до MATCH и общий статус до ACCEPTED только по unit PASS. Текущие reward IDs остаются гарантиями регрессии, не отдельными пунктами «сделать заново». При обновлении ledger сохранить все 296 записей и exact sourceInventory; сверить актуальный HEAD перед merge и выполнить verify-reference-porting по действующему source pin.

Достаточный результат этой задачи: исправленный controller + тест, который воспроизводит прежнюю потерю команды и проходит после изменения; browser wiring evidence; явные статусы Android/live; обновлённая связка source → собственная адаптация → implementation → acceptance. Реальный native owner проверяется отдельно, когда соответствующая зависимость доступна.

**KIT IMPACT: REUSE.** Использованы точные native методы и архитектура EasyFun из private source annex, существующий runtime contract Android Ads/Lifecycle, ActivityCoordinator и DurableReceiptQueue. Изменение локально для Crossmath; runtime pin/API и исходный реестр не расширяются.

[ads]: https://github.com/DanilaH/crossmath-game/blob/bbae4ac7bd87197b53568c0560d3a4e8b3c1bb67/src/platform/ads.ts#L179
[ledger]: https://github.com/DanilaH/crossmath-game/blob/e2af74021f16d1437e90638f10adac0b6333d427/docs/porting/ADOPTION_LEDGER.json
[inventory]: https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/SOURCE_FEATURES.json
[source-asm]: https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/decompiled-source-evidence-20261124/easyfun/EASYFUN_AD_METHODS.arm64.asm.txt
[source-bindings]: https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/decompiled-source-evidence-20261124/easyfun/BINDINGS.json
[source-manifest]: https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/decompiled-source-evidence-20261124/easyfun/MANIFEST.json
[source-readme]: https://github.com/DanilaH/mini-games-kit/blob/06a01d5c1f7af3cdf8013c9ce0f6a691d086af78/research/games/crossmath/porting/decompiled-source-evidence-20261124/easyfun/README.md
