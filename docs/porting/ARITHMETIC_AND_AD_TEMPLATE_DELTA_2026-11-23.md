# Crossmath · дополнение к полному аудиту: арифметика Guru и рекламные шаблоны EasyFun

**23.11.2026.** Это **RESEARCH/DELTA**, а не новая задача на внедрение IAP, Ads SDK или замену банка. Текущая исполняемая версия consumer **0.5.24 / versionCode 29**, gameplay source `0401140d5fc0c191e457289b6dc8e5752a9f85a8`, тестовый APK SHA-256 `1343854747189db57575417babd2094e89e595e276e279e384120ac15ffa2de3`. Runtime kit pin `469928d03f4bae5053e23db26e82187bedbc252e`. Исходный реестр — `269 sourceFeatureId`, потребительский ledger должен отражать полный count/pin из PR #83. Меню issue #6 уже реализовано, не переделывать.

**Исходник E30/E32/E43/E47:** [Guru 4.17.0 native arithmetic](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/guru-two-arithmetic-contracts-20261123/README.md) и [Fraction mathematical witness](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/guru-two-arithmetic-contracts-20261123/verify_guru_arithmetic_boundary.py). **APK**: Guru 4.17.0 / 26101374, SHA `76561bac7f231a420f559d62211077144994543c4e6e3cfe9393916ad0a39597`. [EasyFun UnityFS](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/README.md), [83-модульный scanner](https://github.com/DanilaH/mini-games-kit/blob/7ec1aaeae2f6d561d062c86421be439f73ca4722/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/verify_easyfun_ad_tables.py): XAPK EasyFun 1.1.9 / 1193, SHA `e12cce36ab165493e948f4c1303d41d91f653fece9ca23d3163d47b3fb2c9d8d`.

## A. Четыре правила арифметики Guru, не покрываемые нашим коротким форматом

| ID | Исходное доказательство | Наш 0.5.24 / затронутый код | Чёткий следующий шаг |
| --- | --- | --- | --- |
| `guru-generator-division-step-whole` | Оригинальный generator `math_utils.calculate` 0xc11118 требует целого деления на промежуточном шаге; E32, Native isolated | Нет длинной грамматики, есть независимый authored `docs/spec/product/content_v2/build.py`, 275 полей | Только если владелец выбирает content-v3: отдельная генерация 2-операторных полей с целочисленной промежуточной арифметикой |
| `guru-play-division-final-whole` | В runtime `MathPuzzleCalculate.calculateExpression` 0xab1bbc и `Fraction.isWhole` 0xab2a24, дробные промежуточные значения допустимы с целым финальным | `src/core/types.ts` принимает только `Equation.cells:[a,b,c]`, `arithmetic('/')` проверяет `a=b*c` | Для длинных выражений единый рациональный evaluator + отдельные proof/validation tests; не менять текущие правила short |
| `guru-generator-operation-family` | Генератор длинного выражения после первого знака ограничивает семейство `+/-` или `×/÷`; E31/E47, в банке нет смешанных | `src/content/validator.ts` запрещает expressions с четырьмя числовыми клетками и 2 операторами | Контентный фильтр + независимая проверка 7-клеточных формул, приоритет операций, визуальное представление |
| `guru-direct-long-left-fold` | E43 `_calculateFourElementDirect` 0xb636a4 для **синтетического** `2+3×4` возвращает 20 вместо обычного 14; таких смешанных длинных примеров нет в shipped Guru | `src/help/logic.ts` доказательный помощник на трёх числах, несовпадения в текущем банке нет | Если разрешена mixed grammar — сначала согласовать приоритет, валидировать helper с evaluator; user-visible original mixed case UNKNOWN |

**Контроль:** `3 ÷ 2 × 2 = 3`: в генераторе отказ на первом `3÷2=1,5`; игровой Fraction-калькулятор на синтетике принимает целое `3`. Из 8000 положительных троек `a,b,c` по 1..20 математическая модель нашла 1045 с нецелым первым частным и целым финальным результатом ≤120. Это **не** 1045 уровней, не видимые игроку ошибки, не `CrossMathSolver.solve()` end-to-end. Вывод: разные исходные контракты нужно тестировать независимо.

**Acceptance отдельного будущего content-v3 PR (только после решения владельца):** нормализованные 5/7-клеточные выражения, корректная ассоциативность, отсутствие дробного скрытого остатка после генерации, independent CSP на каждую маску, подсказки proof-based, физические фишки, старые сохранения, доступность 320×568/390×844, RU/EN, RTL/large font, точная версия source+APK. Сейчас **не создавать этот PR**.

## B. EasyFun: 15 статических рекламных placements — не 15 подтверждённых показов

В исходном `resources.assets/template/rewardtemplate` поле `isLimited` относится к лимиту, **не** к `enabled`. Два точно ограниченных источниковых ID: `easy-offer-free-wheel` (`TRUE, limitNum=4`) и `easy-offer-free-20-diamond` (`TRUE, limitNum=10`). Шесть других `easy-offer-*` записей имеют `FALSE/-1`, то есть **не ограничены этим TextAsset**, а не выключены.

Семь `easy-inter-*` в `interstitialtemplate` содержат **Android 0.5 / iOS 0.2** как `popupProb`. Это **не частота живых показов**, не измеренный cap и не доказанная рекламная монетизация. В 83 распакованных UnityFS-модулях названия размещений встречаются в общей таблице, а в IL2CPP native/metadata отсутствуют как точные строки, кроме неоднозначного слова `revive`. Динамическая загрузка таблиц без текстового литерала всё ещё возможна. Смысл поля description указывает на **рулетку, шарики, косметику шаров, алмазы**. Это сильный признак **общей библиотеки издателя с не относящимся к Crossmath контентом**, не доказательство dead code.

**Наша игра 0.5.24:** `src/platform/ads.ts` и `androidAds.ts` предоставляют опциональный `AdsProvider` и долговечные квитанции, но **реальный Android SDK не принят**. Ничего из восьми ball/wheel/diamond шаблонов нельзя внедрять как активный оффер без реального входа на оригинале. Не заменять рекламные причины игры общими именами Unity.

**Acceptance для статического исследовательского claim:** настоящий исходный 1.1.9 XAPK SHA, UnityFS TextAsset `rewardtemplate`/`interstitialtemplate`, 8+7 точных строк и колонки `isLimited`/`limitNum`/`popupProbAndroid`/`popupProbIos`. Эта часть выполнена. **Acceptance живого placement** — ORIGINAL_RUNTIME видео до→тап→после с SDK request / shown / dismiss / rewardId, no-fill, offline, repeat/reset, pending grant and receipt. **Не выполнена**.

## C. Граница и приоритет

- **Высокая научная ценность:** полное исполнение `CrossMathSolver.solve()` 4.17 и сопоставление `stuck` на 233 same-hole-count pair; старые E43/E48 покрыли лишь отдельные примитивы. Нативный ARM64 стенд Unicorn/E47 из предыдущей сессии здесь отсутствует. Нельзя рисовать результат полного solve без выполнения.
- **Высокая коммерческая ценность:** отличить пользовательские рекламные триггеры EasyFun и Guru от общих Unity ad templates. Требуются исходные Android/SDK конфиги. Отложенные IAP/ads остаются в реестре до owner gate.
- **Для разработчика сейчас:** дойти до физической Android-приёмки issue #6 и старых дефектов #5; не перебирать весь банк из-за арифметического исследования и не копировать чужие Lottie/звуки/UI.

**KIT IMPACT · RESEARCH/CANDIDATE:** источник стал точнее, код игры/общий runtime не менялись.


## D. Приложенческий AdManager EasyFun: допуски и разделённая выдача (BUNDLED_IL2CPP_METADATA)

[Первичный IL2CPP-аудит](https://github.com/DanilaH/mini-games-kit/blob/decf77cd397d99f5a1fe5fb171188456bbfec7b4/research/games/crossmath/porting/easyfun-ad-template-reachability-20261123/ADMANAGER_METADATA.md) дополнил предыдущий UnityFS TextAsset. В исходном `global-metadata.dat` EasyFun **1.1.9 / 1193**, SHA `21ab087523cc6b7d92f97dad3a70e647ab56727001b6f95db4a302f2f044b4e6`, встречаются C# source paths `Assets/MainGame/Script/Manager/AdManager.cs`, `.../Template/RewardTemplate.cs`, `.../Template/InterstitialTemplate.cs`. Это **типы игрового прикладного слоя**, не просто строки SDK; активное использование и пути вызовов всё равно неизвестны.

| Новый ID | Доказано из metadata | Наша 0.5.24 / acceptance |
| --- | --- | --- |
| `easy-ad-client-interstitial-gates` | Методы `CouldShowInterstitial`, `CheckShowInterstitialAvailable`, `ReportShowAdLimitedByClient`, `AdShowLimitation/ADControlLimitation`, `_lastInterstitialCloseTime`, `_firstSkipInterstitial` | `src/platform/adState.ts` уже содержит собственное ограничение interstitial и защиту после rewarded, `ads.ts` проверяет доступность; **PARTIAL / IMPLEMENTED_UNVERIFIED**: есть scripted tests, но нет original active formula/real Android SDK |
| `easy-ad-rewarded-callback-states` | Отдельные `RewardedVideoLoadedSuccess/Failed`, `PlaySuccess/Failed`, `GetReward`, `Close` и `_lastRVCloseTime` | `src/platform/ads.ts` DurableReceiptQueue, `watchRewards`, `pendingRewards`, `acknowledge`, `showRewarded`; **PARTIAL / IMPLEMENTED_UNVERIFIED**, проверить реальный SDK и процесс-килл/дубликаты |

**Граница:** метод в metadata не гарантирует вызов в реальном пользователе и не связывает 8 таблиц wheel/ball/diamonds с данной Crossmath. Следующий оригинальный Android опыт: одно no-fill, один отменённый rewarded, один успешный, затем crash/restart и однократность resource settlement. Для нашей игры не включать платёжные события без явно утверждённой SDK/consent политики.

**Kit/source count теперь 271/271.** Исходный runtime 4.18.0 binary для Flutter Guru так и не получен; текущий игровой runtime не менялся.

