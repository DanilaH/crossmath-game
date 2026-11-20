# Какие экраны видны в источниках

20 ноября 2026. У двух оригиналов разная технология, поэтому единица учёта разная. В EasyFun можно перечислить все именованные отдельные Unity-бандлы с суффиксом `_prefab` внутри основного APK. В Guru Flutter собирает экран из дерева виджетов и ресурсов. Каталог картинок в Guru подтверждает графический словарь сборки, его нельзя переводить в количество экранов. Сетевые события, варианты A/B и системные окна требуют отдельной записи.

## Визуальные свидетельства

| Свидетельство | Видно | Граница |
|---|---|---|
| [Guru, игровая запись, 00:30–00:34](https://www.youtube.com/watch?v=xxoueeCnA6A&t=30s) | Решённое поле → окно с результатом и основным продолжением → новое поле | Шаг выборки 2 с. Номер сборки, физическая задержка и звук неизвестны |
| [Guru, официальные изображения](https://play.google.com/store/apps/details?id=math.puzzle.games.crossmath.number.puzzles.free) | На поле Endless счёт и этап находятся сверху, в Battle две стороны видны над одной сеткой. На витрине также показаны светлое/тёмное поле | Издательская композиция, версия на кадре неизвестна |
| [EasyFun, Daily и Event](https://play-lh.googleusercontent.com/O1yDRz1qANAGS4dd6N1A9JECFBFaCS_qsHRcPgMCza39IZE8A11Yv8FzXYDwANb-vwZqSeb02vJkGo0LGhfT9g=w400) · [дата и сердца](https://play-lh.googleusercontent.com/idpNKw7i4EvlMWdlUcneQ41Wg-DFMJMS-23UoqMQ_KqTD_bbQMnuyUh8bS5CGSFoEIbmfD3TfDej0S50ehRJTg=w400) | Две разные точки входа, одна узнаётся по отрывной дате, другая по иллюстрации события. В Daily состояние попытки закреплено у даты | Рекламные изображения. Точные состав и иерархия элементов отдельно проверены по 1.1.9 |
| [Реестр трёх сборок](https://github.com/DanilaH/mini-games-kit/blob/5ad2985fe6b1da8d137530a2cd13d632b9f8f263/research/games/crossmath/porting/SOURCE_FEATURES.json) | Стабильные ID, версии, игровые правила и границы доказательств | Статический ресурс подтверждает наличие, записанный переход подтверждает показ |

## EasyFun Offline Crossmath 1.1.9 / 1193

Из исходного XAPK повторно сверены SHA-256 **64 из 64** отдельных prefab-бандлов с прежним извлечением. Из них 39 начинаются с `panel`, ещё 25 — дочерние компоненты, игровые представления и прочие элементы. Некоторые бандлы содержат несколько корневых объектов. Служебные и базовые панели оставлены в списке для проверки полноты. Размещение на телефоне и реальную последовательность показа по названиям не восстанавливаем.

| Панель | Роль по составу / названию | Примеры исходных дочерних узлов | SHA-256 бандла, начало |
|---|---|---|---|
| `panelbase` | Шаблон панели |  | `503e45f60167` |
| `paneldailylevel` | Календарь и доступные даты | `BtnPlay`, `LayoutDaily`, `TextSun` | `3af2b040ad8d` |
| `paneleventlevel` | Лестница события | `LayoutLevel`, `LayoutCoin`, `LayoutReward` | `a060f6d13e40` |
| `panelgame` | Главная и HUD классики, календаря, события, урока | `BtnHint`, `TextAdCount`, `LayoutTutorial` | `2100f638c8d1` |
| `panelosa` | Контейнер списка | `TextBase`, `BtnBack` | `4be8c668e5b2` |
| `panelpopabout` | О приложении | `BtnPrivacy`, `BtnPrivacySetting`, `BtnHard` | `973cb957dafc` |
| `panelpopanalytic` | Служебная аналитика | `BtnClear`, `Text`, `ScrollNecessary` | `90e82c091147` |
| `panelpopbase` | Базовый диалог |  | `8efd347494a5` |
| `panelpopcheat` | Отладка | `BtnAdTest`, `TextCommon`, `BtnCheatStatisticsConfirm` | `33234efdbdeb` |
| `panelpopcheatrank` | Отладка ранга | `BtnCompleteAllChallengeRank`, `Text (Legacy)`, `BtnCompleteAllRelaxRank` | `b72581e95f6b` |
| `panelpopcoinreward` | Получение валюты | `BtnGainReward`, `TextRewardCount` | `2e6a640f6c1f` |
| `panelpopcommon` | Общее сообщение | `LayoutBtnGroup`, `BtnCommon` | `fe6a1876b64d` |
| `panelpopdailycomplete` | Итог дня | `BtnNext`, `TextAverageData`, `TextDifficultyDes` | `e3a01eb16a78` |
| `panelpopdailymodeguide` | Обучение Daily | `BtnCommonClose` | `8d8ea90178ac` |
| `panelpopdailyrestart` | Новая попытка Daily | `BtnCoinRestart`, `BtnRVRestart`, `BtnRestart` | `98b4a2274f47` |
| `panelpopeventcheat` | Отладка события | `ScrollEventList`, `Scrollbar Vertical`, `TextAssetContent` | `ff4393c00789` |
| `panelpopeventcomplete` | Завершение события | `LayoutComplete`, `BtnNext`, `LayoutCoin` | `afacb409e7f2` |
| `panelpopevententrance` | Вход в событие | `BtnStart`, `TextRemainTime`, `TextRewardHintCount` | `d742058d0405` |
| `panelpopeventgift` | Подарок этапа | `LayoutReward`, `BtnClaim`, `TextCloseHint` | `9f4178e9714c` |
| `panelpopexitreason` | Причина ухода | `BtnClear`, `Text`, `ScrollEx` | `d2ec0fa1bdc4` |
| `panelpopfeedback` | Обратная связь | `BtnSubmit`, `TextFeedbackImgCount`, `TextCharacterCount` | `812d98ff0037` |
| `panelpopgamecomplete` | Итог обычной партии | `LayoutComplete`, `BtnClassic`, `TextGoalThreeProgress` | `d5d824790d8f` |
| `panelpopgdpr` | Согласие | `BtnCommon`, `BtnMore`, `TextBase` | `6d6622a3cf7b` |
| `panelpoplanguage` | Язык | `BtnSave`, `ScrollViewLanguage`, `BtnCheatRV` | `194f9f4efe69` |
| `panelpoplevelchooseguide` | Обучение выбору уровня | `BtnLevelChange`, `TextLevelIndex` | `b898c35e9617` |
| `panelpoploading` | Ожидание | `TextLoadingMessage` | `61ee5ad00f3e` |
| `panelpopnotification` | Запрос уведомлений | `BtnCommon`, `TextCoin` | `2d1b87188f0c` |
| `panelpoppause` | Пауза | `TextPauseTitle`, `TextResumeHint` | `e9cbb5b08d41` |
| `panelpoppersonalize` | Персонализация | `BtnAccept`, `BtnPrivacy`, `BtnTerm` | `fdf0aa13669d` |
| `panelpoprankbadgedisplay` | Витрина рангов | `ScrollViewRankDisplay` | `15da82f4c15f` |
| `panelpoprate` | Оценка | `BtnSubmit`, `LayoutStar`, `Scrollbar Vertical` | `7e7aedcf6a63` |
| `panelpopremoteconfig` | Служебный конфиг | `ScrollNecessary`, `Scrollbar Vertical` | `9c9845a3ac72` |
| `panelpoprestartconfirm` | Подтверждение перезапуска | `BtnNo`, `BtnYes` | `4d6bc8b52870` |
| `panelpopsetting` | Настройки | `BtnCheatHolder`, `BtnCheat`, `BtnCheatLevelCheck` | `13934792b526` |
| `panelpopspecialmodeguide` | Обучение спецрежиму | `BtnCommonClose` | `cacb2c7d214c` |
| `panelpopstatistics` | Карьерный профиль, статистика и трофеи | `TextLayout`, `TextBadgeTitle`, `TextTotalLoginCount` | `8aa350f8193a` |
| `panelpopthanks` | Благодарность | `BtnOk`, `TextContent` | `8a771304a807` |
| `panelpopupdate` | Обновление | `BtnUpdate`, `TextContent` | `1ab2d61e806f` |
| `panelpreload` | Предзагрузка | `TextVersion` | `0f55b446be29` |

Прочие 25 отдельных бандлов: `btnbase`, `btnclose`, `btncommon`, `cellanalytic`, `cellcrossgrid`, `celldictionary`, `celleventgift`, `cellexitinfoitem`, `cellfeedback`, `cellfeedbackimg`, `cellgroupbadge`, `cellimagebadge`, `cellimagetrophy`, `celllanguage`, `celllettergrid`, `cellowlbadgerank`, `cellrankstar`, `coinbanner`, `coinitem`, `crossnormalcontroller`, `gameviewbase`, `imgtoast`, `lettercontroller`, `textbase`, `textcommon`.

## Guru Crossmath 3.5.2 / 24070452 и 4.17.0 / 26101374

Проверка по именам записей в реальном Flutter-пакете и манифесту файлов каждой версии. Числа ниже — файлы в семействе `/assets/images/<имя>/` с учётом подкаталогов. В скобках дан пример из более новой версии. Ноль означает отсутствие по этому пути. Экран мог быть реализован другим способом.

| Семейство ресурса | 3.5.2 | 4.17.0 | Пример 4.17.0 |
|---|---:|---:|---|
| battle | 65 | 65 | badge_0.webp |
| country | 236 | 236 | AD.jpg |
| cup | 12 | 12 | 2022_01.webp |
| endless | 0 | 4 | ic_endless_score_bg.webp |
| game | 57 | 64 | ad.webp |
| game_over | 13 | 16 | ic_add_heart.webp |
| goldcup | 12 | 12 | 2022_01.webp |
| guide | 2 | 1 | hand.png |
| hint | 6 | 6 | ic_hint_default.webp |
| home | 10 | 12 | home_bg_pattern.webp |
| how | 4 | 4 | 01.webp |
| leaderboard | 24 | 29 | ic_activity_circular.webp |
| level | 0 | 88 | 1.png |
| mask | 0 | 15 | mask1.png |
| mask_border | 0 | 15 | mask_border_1.webp |
| profile | 0 | 4 | ic_edit.webp |
| race | 48 | 49 | bg_arrow_middle_pop.webp |
| rating | 5 | 5 | ic_close.webp |
| reward | 0 | 3 | ic_reward_coins.webp |
| statistic | 12 | 12 | cups.webp |
| store | 17 | 20 | ic_ads_shadows.webp |
| task | 0 | 4 | ic_arrow.webp |
| train | 17 | 16 | ic_brain_background.webp |
| корень | 88 | 99 | ic_asset_btn_bg.png |

В 4.17.0 встречаются отдельные `ic_crown_daily.webp`, `ic_crown_endless.webp`, `ic_crown_standard.webp` в game_over, `ic_done.webp` в task и `top_foreground.webp` в profile. У 3.5.2 уже есть семейства состояния подсказки, статистики и Battle. Практический перенос — различать дату, прогресс, забег и профиль в точке выбора. Позицию виджета и активность рекламной выдачи эти файлы не устанавливают.

## Где требуется запись на устройстве

Для каждой версии отдельно нужны переходы с первого запуска в главную и настройки, немое проигрывание результата и повтор, месячный календарь, профиль и завершение мероприятия при повторном входе. Для EasyFun дополнительно снять окно покупки продолжения с нулём жизней, для Guru — вход, соперников и результат Battle, Star Race и недельной лиги в период активности. Зафиксировать идентификатор версии, размер экрана, язык, состояние профиля и таймкод. Для осмотра системных окон нужен реальный провайдер и соответствующая тестовая среда. Длительность анимации, сила вибрации и вид закрытых экранов остаются UNKNOWN. Коммерческие механики сохраняют свои ID в исходном реестре.
