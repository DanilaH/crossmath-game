# Индекс сравнения по всем ID

Срез Crossmath 0.5.7. [Сверка по трём оригиналам](REFERENCE_REAUDIT_2026-11-20_RU.md) · [Уточнения по исходным правилам EasyFun](EASYFUN_NATIVE_FOLLOWUP_RU.md) · [Код и критерии проверки по каждому ID](ADOPTION_LEDGER.json).


## Поле и выдача

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-number-cross` | Пересекающиеся уравнения с общими числами и фишками из лотка · E:E03–04, level/classic | MATCH | Общая числовая клетка и конечный набор отдельных фишек |
| `easy-six-relax` | Шесть шагов спокойного маршрута с чередованием длины и сложности · E:E05, LevelClassicController | MATCH | В content-v2 есть отдельный шестишаговый Relax |
| `easy-six-challenge` | Шесть шагов сложного маршрута с вершиной в конце · E:E05, LevelClassicController | MATCH | Free Challenge ведёт собственный курсор |
| `easy-bank-reindex` | Повторное использование банка после исчерпания с простыми числами · E:E05, GetLevelInfo | PARTIAL | Собственный банк и переиндексация, другой объём и период |
| `easy-owl-equality` | При положительном hiddenNumber одинаковым значениям присваивается один ID скрытого знака · E:LevelGameData.InitConfigData 0x142e0bc–0x142e134; CheckHiddenType 0x153a16c; easyfun-119/README.md | MISSING | Cell хранит число или место под фишку, связей по виду знака нет |
| `easy-owl-entry` | Вход в событие и переход на следующее поле могут показать одноразовый урок скрытых знаков · E:GameManager.OnGameStartEvent 0x143d0d8, OnOpenNextGame 0x143f038, ShowEventModeGuide и PushPanel; easyfun-119/README.md | MISSING | В продукте отсутствуют событие с таким полем и сохраняемый флаг его урока. |
| `guru-mask-history` | При выдаче исключаются недавние маски holes по истории до 300 записей · G4:E27 §6, _getStandardPuzzleId/queryPuzzle | MISSING | Отдельного фильтра holes нет. После первых 15 уроков все 225 масок пустых координат уникальны; полных рисунков числовых позиций всего 58. |
| `guru-profile` | Два профиля default/easy1, отдельный выбор нового пользователя и сохранение варианта · G4:E24–26; G3/G4 cm4.db, cm5.db | PARTIAL | Версионирование content-v1/v2 и сохранение старых кампаний, другой способ назначения |
| `guru-authored-open` | Подготовленные стартовые задачи до каталожной выдачи · G4:E26 §4.1 | MATCH | Собственные учебные поля и редакторская последовательность |
| `guru-long-expression` | В каталоге есть уравнения с несколькими операторами · G4:E23/E47 §§3.6–3.7 | MISSING | Тип уравнения задаёт три числа и один оператор |
| `guru-seeded-fill` | Геометрия, маска и seed определяют числовое заполнение · G4:E21–23/E31/E47 | PARTIAL | В продукт поставляется свой проверенный банк готовых полей |
| `guru-unique` | Единственность решений проверена в реконструированных каталогах · G4:E33/E47; отчёт §3.7, исключения и определение эквивалентности | MATCH | Свой банк проходит независимую проверку уникальности по значениям |
| `guru-stuck` | Метка stuck варьируется по профилю и сложности · G3/G4:cm_all.stuck; G4:E28, §7 | UNKNOWN | Оригинальный смысл неизвестен, свои структурные метрики есть |
| `guru-dynamic-filter` | Фильтр условий каталога имеет конфигурационный выключатель · G4:E27, PuzzleFilter, встроенный enable=false | UNKNOWN | Адаптивность по ошибкам в пользовательском маршруте не установлена |

## Управление, помощь и feel

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-tap` | Урок предлагает сначала выбрать клетку · E:game_guide_content_first_select_cross | MATCH | Поддержаны оба порядка выбора |
| `easy-drag` | Урок отдельно обучает перетягиванию числа · E:game_guide_content_second_drag_letter | MATCH | Перетягивание из лотка ставит фишку |
| `easy-switch` | Справка предлагает менять сложность во время игры · E:game_guide_content_click_game_level | PARTIAL | Выбор Free и замена партии доступны через навигацию |
| `guru-direct-hint` | По возможности используется прямой арифметический вывод · G4:E29/E43–44 | PARTIAL | Своя объяснимая прямая стратегия и проверка доказательства |
| `guru-monotonic-hint` | Подсказка ограничивает кандидатов монотонностью · G4:E29/E45 | MISSING | Самостоятельной заявленной стратегии monotonic solver нет |
| `guru-factor-hint` | Ограничение делителями учитывает доступные числа · G4:E29/E45/E48 | PARTIAL | Перебор лотка работает, полный широкий факторный путь не подтверждён |
| `guru-intersect-hint` | Объяснение пересекает наборы кандидатов связанных уравнений · G4:E29/E45–46 | PARTIAL | Собственная логика пересечения; глубина и охват различаются |
| `guru-search-depth` | Последний путь поиска логической стратегии ограничен глубиной 3 · G4:E29, _limitedBacktrackSearch | MISSING | В публичном контракте Explain такой стратегии нет |
| `guru-hint-candidate` | При нескольких объяснениях кандидаты ранжируются по сложности · G4:E37, SolutionCandidate.complexity | PARTIAL | Собственный выбор доказуемого шага, паритет ранжирования не проверен |
| `guru-hint-return` | В стратегической помощи возможен возврат нескольких неверных фишек · G4:E36 §8.2 | PARTIAL | Explain и Reveal разделены, есть обнаружение противоречия и команды лотка |
| `guru-hint-answer` | Запасное заполнение использует известный ответ при невозможности логической ветки · G4:E36–37 | PARTIAL | Ответ доступен отдельному Reveal; у Explain свой контракт |
| `guru-division-mark` | Три визуальные записи деления в ресурсах, включая двоеточие и косую черту · G4:ic_symbol_division_sign_{colon,slash,default}.webp | MISSING | В нашем интерфейсе единое отображение ÷ |
| `guru-result-next` | В записи окончания поля виден переход от результата к следующему действию · GV:06-guru-finish.jpg, 00:30/32/34; версия записи UNKNOWN | MATCH | На результате основной CTA виден; сценарий восьми побед прошёл |
| `guru-box-popup` | Звуковой ресурс появления наградного окна · G4:box_popup | MISSING | Общий звук победы, отдельного запуска для появления награды нет |
| `guru-box-open` | Отдельный звук открытия коробки · G4:box_open | MISSING | Открытию предмета не сопоставлен собственный звук коробки |
| `guru-item-collision` | Именованный звук столкновения предмета · G4:item_collision | MISSING | В финансовой квитанции нет отдельного звука прибытия жетона |
| `guru-star-fly` | Отдельный ресурс полёта звезды · G4:star_fly | MISSING | Оформление перелёта в кошелёк было предложением Crossmath |
| `guru-task-count` | Счёт выполнения задания имеет собственный звуковой cue · G4:task_progress_count_up | MISSING | Нет отдельного звука шага счётчика |
| `guru-task-complete` | Завершение задания имеет отдельный cue · G4:task_progress_completed | MISSING | Общее подтверждение победы, отдельная фраза задания отсутствует |
| `ref-haptics` | Точный рисунок вибрации на касание, ошибку и победу в оригиналах · EG:физическая запись оригиналов отсутствует | UNKNOWN | У нас разные паттерны wrong/win и настройка, pick без вибрации |

## Личная статистика и маршруты

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-last-ten` | Среднее времени ведётся по сложности. После 10 финишей новое время имеет вес 1/10 · E:AnalyticManager.OnGameComplete 0x1437ec0–0x1438124, GetCurrentAverageTime 0x152bc98; easyfun-119/README.md | MISSING | Career хранит агрегаты по режимам. Ни такого сглаживания по сложности, ни точного десятиэлементного окна в текущем клиенте нет. |
| `easy-beat-table` | Процент на результате зависит от локальной таблицы времени и класса · E:E07, completeranktemplate | MISSING | Нет вычисляемого по таблице процента других игроков |
| `easy-choice-percent` | В экране выбора есть подпись о доле выбирающих сложность · E:common_classic_level_choose | UNKNOWN | Процент выбора не отображается, происхождение исходного числа UNKNOWN |
| `easy-career-top` | В таблице карьеры записаны отдельные уровни top · E:gamecareertemplate | UNKNOWN | Есть личные достижения и счётчики; привязка исходного top к UI UNKNOWN |
| `easy-rank-relax` | Маршрут Relax задаёт последовательные цели по типу игры и сложности · E:relaxranktasktemplate, 121 строка | MISSING | У Free Relax есть курсор побед, к следующему званию он не ведёт |
| `easy-rank-challenge` | У Challenge своя последовательность целей, в таблице встречается Daily · E:challengeranktasktemplate, 121 строка | MISSING | У Free Challenge свой курсор, отдельного маршрута званий нет |
| `easy-rank-coins` | За уровень профиля в конфиге начисляются 120 монет · E:E08, rankexptemplate | PARTIAL | Свой ранг с другим балансом и темпом |
| `guru-xp-equations` | За подходящее завершение XP зависит от числа уравнений, 10 за единицу · G4:E34 | PARTIAL | Награда кампании зависит от сложности, у Endless отдельная формула очков |
| `guru-rank-curves` | Три встроенных профиля темпа по 200 уровней · G4:E35 §§9.2–3 | MISSING | Своя единая шкала ранга |

## Календарь и возвращение

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-daily-gate` | Условие DailyShowLevel со значением 5 · E:E08, GameConfig.DailyShowLevel | PARTIAL | Есть свой порог Daily и показ на хабе |
| `easy-daily-life` | Одно событие ошибки Daily отнимает одну из трёх жизней независимо от failCount · E:E06, OnFailFillInEvent | MATCH | Штраф за изменившую поле команду, общий лимит попытки |
| `easy-restart-coins` | После потери жизней Daily предусмотрен перезапуск за 200 монет · E:E08, UseItemCount | MISSING | В нашем Daily повтор бесплатный |
| `easy-month-trophy` | Daily закрывает месячный трофей по всем календарным дням выбранного года и месяца · E:DailyService.SetDailyDateComplete 0x1531144, TrophyService.CheckGetTrophy 0x148bb44; easyfun-119/README.md | MISSING | Даты и альбом сохраняются, месячной цели и её награды нет |
| `easy-event-badge` | Значок события связан с его периодом и окончанием · E:event_bage_remind/event_eventclosed; paneleventlevel/ImgBadge | MISSING | Достижения постоянные, событийный архив отсутствует |
| `easy-event-gift` | На лестнице события есть подарки, монеты и подсказки, отдельная кнопка получения · E:paneleventlevel/LayoutCoin, LayoutHint, LayoutGift; panelpopeventgift/BtnClaim | MISSING | Бонусы приборов и дневных целей существуют, лестницы Event нет |
| `easy-event-entry` | Есть параметры входа Event с разными текстами 10 и 30 · E:E08 EventInformalLevel=10; event_entrance_titledes=30 | UNKNOWN | Нет аналогичного порога или временной активности |
| `guru-daily-active` | Три цели выбираются по активным дням, 16 групп, последняя повторяется · G4:E38 §10 | PARTIAL | Свои наборы выполнимых целей с общим призом |
| `guru-daily-fallback` | Недоступная цель заменяется достижимой в доступном режиме · G4:E38 §10.2 | MATCH | В генерации наших целей проверяется достижимость, есть запасной набор |
| `guru-daily-set` | Получение полного набора даёт 1 hint, 20 coins и 10 hat · G4:E38 §10.3 | PARTIAL | Дневной комплект даёт собственную фиксированную награду, с квитанцией |
| `guru-postcard` | Прохождение всех уровней этапа завершает открытку · G4:E39–40 §11.1 | MISSING | Приборы из частей привязаны к собственному прогрессу, без сезонного этапа |
| `guru-pending-stage` | Завершение этапа сохраняет отдельное ожидающее окно, переигрываемое после входа · G4:E39–40, StageCompletedModelList | MISSING | Обычный результат сохраняется, нет очереди завершённых этапов активности |
| `guru-event-history` | История наград по активности сохраняется отдельно от её окончания · G4:E40, ActivityAwardDatabase | MISSING | Есть постоянный альбом и квитанции, нет истории истёкших активностей |
| `guru-makeup` | Условный предмет для восстановления пропущенной отметки Train Brain · G4:E39–40, makeUpCard; ic_make_up_sign_card_reward.webp | MISSING | Прошедшая дата доступна для решения, ресурса восстановления нет |
| `guru-adventure` | У Adventure отдельная последовательность и завершение всей активности · G4:E39–40 §11.2 | MISSING | Кампания постоянна, нет ограниченной главы со сроком |
| `guru-adventure-award` | Финальный пакет Adventure: 1000 монет, 10 hints, 10 hat и условно 3 карты · G4:E39–40 §11.2 | MISSING | Наше завершение прибора имеет другой триггер и оплату |

## Соревнования и длинная сессия

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `guru-endless` | Серия полей, проверка, очки и экран рекордов · G4:E14–15; собственная формула оригинала UNKNOWN | PARTIAL | Есть Endless, Submit и отдельные личные рекорды solo/assisted |
| `guru-achievements` | Долгие цели охватывают режимы и коллекции · G4:E14, пути сохранения достижений | PARTIAL | 12 постоянных достижений с квитанциями, собственный набор метрик |
| `guru-star-round` | Пять стартовых целей 10/15/20/25/30; дальше зависит от версии · G3/G4:R2 Star Race, E41 | MISSING | Раундов соревнования нет |
| `guru-star-weight` | Сложность даёт 1/2/4/6 звёзд за сыгранное поле · G3/G4:R2 Star Race | MISSING | Очки Endless имеют другое назначение |
| `guru-star-tie` | При равенстве приоритет игрока; для выигрыша нужно первое место и достижение цели · G4:R2, E41 isWin | MISSING | Нет сравнительного финиша |
| `guru-star-a` | Бот A получает случайные прибавки за истёкшие интервалы · G3/G4:R2 calculateCollectedAmount | MISSING | Нет локального соперника |
| `guru-star-b` | Бот B следует расписанию по времени устройства и ограничен целью · G3/G4:R2 robot_b_interval_data.json | MISSING | Нет плана шагов соперника |
| `guru-star-retry` | Повтор сохраняет номер раунда, переход повышает его, после срока начинается первый · G4:R2 challengeAgain/nextRound, E41 | MISSING | Повторы поля существуют независимо от гонки |
| `guru-star-award` | Приз за пять победных раундов в сумме 440 монет и 7 подсказок; отдельная квитанция · G3/G4:R2, G4:E41 distributeRewards | MISSING | Есть ядро квитанций, нет выдачи за раунд |
| `guru-battle-time` | Время соперника зависит от уровня, числа уравнений и длинных выражений · G3/G4:R2 getBattleInfo | MISSING | Нет сессии Battle |
| `guru-battle-react` | Бот реагирует на ход с задержкой и останавливается за 3 внутренние единицы до финиша · G3/G4:R2 advanceRobotProgressAfterUserMove | MISSING | Есть только локальная проверка собственного хода |
| `guru-battle-ticket` | Вход расходует билет, есть восстановление и точка покупки билета · G4:E12/E14; R2 consumeTickets | MISSING | Входы в режимы свободны |
| `guru-battle-streak` | Серия побед меняет множитель и прогресс Battle · G4:R2 updateBattleResult/getMultiplierByWins | MISSING | Рекорд одиночной серии в Endless не является серией побед в матче |
| `guru-brains-week` | Неделя имеет рейтинг и отдельную выдачу призов по итогам · G3/G4:E13, R2 Brains | MISSING | Недельной таблицы нет |
| `guru-brains-plan` | Категории ботов задают дневной диапазон; внутри дня четыре местных окна и девять шаблонов · G3/G4:R2 bot_data.json; G4 calculationCollectByTarget | MISSING | Нет симуляции недельного участника |
| `guru-brains-hat` | Условный недельный ресурс hat поступает из нескольких активностей · G4:E38–41; R2 Brains | MISSING | Счётчики XP и монет независимы, недельного ресурса нет |
| `ref-live-opponents` | Наличие живого соперника на конкретной раздаче или реального общего рейтинга · EG:R2 подтверждает локальные пути; живой состав UNKNOWN | UNKNOWN | Нет сети соревнований или аккаунтов |

## Монетизация и платформенные механизмы

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-base-coins` | Встроенная базовая награда за завершение 5 монет · E:E08 CompleteRewardCoinCount | PARTIAL | Первая победа в кампании дала 10; отдельные выплаты за прогресс |
| `easy-video-multiplier` | Опция rewarded увеличивает базовые монеты в десять раз · E:E08 RewardVideoCoinMulti | MISSING | Адаптер выдаёт помощь и продолжение; умножения монет нет |
| `easy-hint-price` | Покупка подсказки за 120 монет · E:E08 CoinBuyHintCount | PARTIAL | Покупка помощи списала 60, наблюдалось 240→180 |
| `guru-ad-protect` | Настраиваемый минимальный интервал interstitial и защита после rewarded · G3/G4:E16, free_s/imp_gap_s; G4 iad_cd_extra_after_reward_s | PARTIAL | Свой активный таймер и защита первых побед, фактический провайдер не принят |
| `guru-ad-retry` | В конфиге имеются интервалы повторной попытки загрузки 10–100 с · G3/G4:E16 | UNKNOWN | Есть опциональный bridge, поведение реального SDK требует подключения |
| `easy-push-reward` | У уведомлений есть предложение бонуса и отдельный текст получения · E:panelpopnotification/TextCoin; push_rewared_title/claim | UNKNOWN | Возврат в сессию есть, бонуса уведомлений нет; исходное условие UNKNOWN |
| `easy-feedback` | Форма обратной связи включает контакт, изображение и ответ · E:panelpopfeedback_prefab | MISSING | Такой внутренней формы с вложениями нет |
| `easy-observability` | Разделены таблицы продуктовых и рекламных событий · E:analytictemplate (19) и adanalytictemplate (68) | PARTIAL | Сохраняются локальные счётчики, подключённый внешний поток не подтверждён |
| `easy-debug-panel` | В пакете есть технические панели аналитики и отладки · E:panelpopanalytic/cheat prefabs | UNKNOWN | Есть внутренняя отладка, доступ пользователя в оригинале UNKNOWN |
| `ref-cloud-sync` | Облачный перенос между устройствами как отдельная развилка старой карты · EG:Product Map §2 F29–F35; фактическая доступность оригинала UNKNOWN | UNKNOWN | Локальные атомарные сохранения и миграции, без межустройственного переноса |
| `ref-background` | Восстановление точного состояния активного экрана, таймера и лотка после убийства процесса · EG:предыдущие тесты E42 и план устройства; отдельные данные о записях E40–41 | UNKNOWN | Свои режимы сохраняются по слотам, жизненный цикл обработан; паритет не засвидетельствован |

## Экранные решения и доступность

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-result-tabs` | Окно завершения содержит вкладки целей и статистики и переход дальше · E:panelpopgamecomplete/BtnTabGoals, BtnTabStatistics, BtnNext | PARTIAL | Есть основное действие и раскрытие состава награды, цели и статистика открываются отдельно |
| `easy-tray-sign` | Одинаковая запись числа скрывается общим знаком в клетке и в лотке · E:CellCrossGrid.UpdateLetterView 0x145ce80/0x145cf04 и CellLetterGrid.UpdateLetterView 0x145f5d4; easyfun-119/README.md | MISSING | Есть состояния выбора, валидности и ошибки, отдельной маски знака нет |
| `easy-theme` | В игре доступен узел выбора визуальной темы · E:panelgame/BtnTheme | UNKNOWN | У продукта утверждён свoй стиль, доступны настройки комфорта; условия исходного переключателя UNKNOWN |
| `easy-level-change` | На поле есть кнопка смены уровня · E:panelgame/BtnLevelChange; panelpoplevelchooseguide | MISSING | В поле нет аналогичной одношаговой точки входа Free |
| `easy-daily-next` | У Daily собственное окно окончания с действием Далее · E:panelpopdailycomplete/BtnNext | PARTIAL | Общий экран победы различает режим и маршрутизацию |
| `easy-restart-video` | На экране повторной попытки Daily есть отдельный вход за видео · E:panelpopdailyrestart/BtnRVRestart | PARTIAL | Rewarded Continue восстанавливает попытку; обычный restart бесплатный |
| `easy-restart-confirm` | Разрушающий перезапуск имеет окно подтверждения · E:panelpoprestartconfirm/BtnYes, BtnNo | PARTIAL | Есть подтверждение замены Free, покрытие всех перезапусков различается |
| `easy-rating` | В комплекте есть отдельная панель запроса оценки · E:panelpoprate/BtnSubmit | UNKNOWN | Внутриигровая просьба оценки в текущем потоке не обнаружена |
| `easy-consent` | Согласие, персонализация и ссылка на настройки приватности · E:panelpopgdpr; panelpoppersonalize; panelpopabout/BtnPrivacySetting | UNKNOWN | Точки интеграции рекламы есть, фактические сценарии стран UNKNOWN |
| `easy-upgrade` | Уведомление об обновлении имеет отдельную кнопку · E:panelpopupdate/BtnUpdate | UNKNOWN | Внутреннего окна обновления не нашли |
| `easy-language` | Список языков и сохранение выбранного варианта · E:languagesettingtemplate, 26 строк; panelpoplanguage/BtnSave | PARTIAL | RU/EN сохраняются в настройках, набор языков отличается |
| `easy-no-fill` | Текстовое и интерфейсное состояние недоступного рекламного предложения · E:языковая таблица и рекламные экраны; точная достижимость UNKNOWN | PARTIAL | В preview без провайдера есть офлайн-путь, live callback не принят |
| `easy-wallet-visual` | Монеты оформлены отдельными компонентами кошелька и предмета · E:coinbanner_prefab, coinitem_prefab, panelpopcoinreward/BtnGainReward | PARTIAL | Баланс и состав награды видны, свой материал и траектория жетона остаются предложением |
| `easy-pause` | Игра имеет отдельную панель паузы и возврат · E:panelgame/BtnPause; panelpoppause | MATCH | Пауза открывается в партии, действие проверено в браузерном прогоне |
| `easy-daily-archive` | Выбор даты в отдельном календаре с индикаторами и действием Играть · E:paneldailylevel/BtnDaily, BtnPlay; E03/E08 | PARTIAL | Daily и архив сохраняют назначения, правила доступны по собственной дате |
| `plan-editor` | Редактор и обмен пользовательскими задачами — кандидат из старой карты продукта · EG:Product Map §2 F29–35, свидетельство редактора в оригиналах отсутствует | UNKNOWN | Есть внутренний валидатор, пользовательского редактора нет |

## Правила обычного хода и обучение

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-value-win` | Победа проверяет заполненность и арифметику; одинаковые значения в уравнении взаимозаменяемы · E:E02–03/E06, CrossViewBase и полный банк | MATCH | Разные tokenId одного значения сохраняются, валидность считается по значениям уравнений |
| `easy-complete-error` | Неполное выражение откладывает проверку ошибки до появления всех операндов · E:E06, проверка доступного уравнения | MATCH | Пока выражение неполно, действует нейтральное состояние |
| `easy-classic-life` | Ограничение жизней Daily отсутствует в обычном контроллере · E:E06, CrossViewBase против GameDailyController | MATCH | В кампании и Free ошибка не завершает партию по жизням |
| `easy-tutorial-two` | В обучении два поля 5×5 с одним и двумя пропусками · E:E02–03, level/tutorial, 2 файла | PARTIAL | Собственный постепенный ввод и план из 15 уроков |
| `easy-effort-buckets` | Банки сложности отличаются геометрией, плотностью пропусков и доступностью цепочки одиночных выводов · E:E02–04, Easy Short 7×7 против Hell Short 13×13 | PARTIAL | R1 уже настроил собственный банк и начало Easy, используются собственные уровни |
| `guru-sort-tray` | Отдельная команда сортирует запас чисел · G4:E11, action sort; E38 useSort | MATCH | Кнопка сортировки есть, экземпляры фишек сохраняются |
| `guru-return-tray` | В штатном ходе можно вернуть поставленное число в запас · G4:E11, действие возврата | MATCH | Есть команда ReturnToTray с сохранением tokenId |
| `easy-sound-setting` | Звуковые эффекты управляются из настроек · E:common_sound, panelpopsetting | MATCH | Переключатель и фильтр воспроизведения реализованы |
| `easy-vibration-setting` | Вибрация имеет настройку отдельно от звука · E:common_vibrate, panelpopsetting | MATCH | Есть отдельная настройка и проверка перед navigator.vibrate |

## Рекламные переходы Guru

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `guru-ad-daily-restart` | В обработчике ошибки Daily есть отдельное рекламное назначение · G4:E16 GameCore.checkMistakeLimited/daily_error_restart | MISSING | Повтор Daily не запускает отдельный interstitial по такому назначению |
| `guru-ad-adventure-restart` | Ветка перезапуска Adventure размечена отдельным interstitial · G4:E16 GameCore.checkMistakeLimited/adventure_error_restart | MISSING | Нет Adventure и связанного рекламного перехода |

## Монетизация и платформенные механизмы

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-inter-proceed-when-success` | Interstitial — Далее после победы · E:interstitialtemplate/proceed_when_success, встроенная конфигурация Android 0.5, iOS 0.2 | PARTIAL | Есть выдача после победы с собственными фильтрами. |
| `easy-inter-restart-when-fail` | Interstitial — Повтор после поражения · E:interstitialtemplate/restart_when_fail, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-inter-restart-when-success` | Interstitial — Повтор после победы · E:interstitialtemplate/restart_when_success, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-inter-restart-when-pause` | Interstitial — Повтор из паузы · E:interstitialtemplate/restart_when_pause, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-inter-return-to-home-when-pause` | Interstitial — Домой из паузы · E:interstitialtemplate/return_to_home_when_pause, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-inter-return-to-home-when-success` | Interstitial — Домой после победы · E:interstitialtemplate/return_to_home_when_success, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-inter-return-to-home-when-fail` | Interstitial — Домой после поражения · E:interstitialtemplate/return_to_home_when_fail, встроенная конфигурация Android 0.5, iOS 0.2 | MISSING | Отдельного назначения рекламы на этот переход нет. |
| `easy-banner-play` | Баннер, отдельная сцена «игровое поле» · E:bannertemplate/stage_screen | PARTIAL | Запрос баннера на активном игровом поле через опциональный bridge. |
| `easy-banner-pause` | Баннер, отдельная сцена «пауза» · E:bannertemplate/pause_screen | MISSING | Отдельного рекламного назначения сцены нет. |
| `easy-banner-win` | Баннер, отдельная сцена «победа» · E:bannertemplate/success_screen | MISSING | Отдельного рекламного назначения сцены нет. |
| `easy-banner-lose` | Баннер, отдельная сцена «поражение» · E:bannertemplate/failure_scrreen | MISSING | Отдельного рекламного назначения сцены нет. |
| `easy-iap-one-dollar-bag` | Запись магазина — 1999 монет · E:iaptemplate/OneDollarBag; jigsaw_small_bag_of_coins | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-iap-ten-dollar-bag` | Запись магазина — 24 999 монет · E:iaptemplate/TenDollarBag; jigsaw_medium_bag_of_coins | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-iap-eighty-dollar-gem` | Запись магазина — 199 монет и 5 подсказок · E:iaptemplate/EightyDollarGem; jigsaw_big_bag_of_coins | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-iap-remove-ad-old` | Запись магазина — постоянное отключение рекламы, старый SKU · E:iaptemplate/RemoveAd_old; jigsaw_remove_ads_forever | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-iap-hundred-dollar-gem` | Запись магазина — 200 000 монет · E:iaptemplate/HundredDollarGem; jigsaw_huge_bag_of_coins | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-iap-remove-ad-new` | Запись магазина — постоянное отключение рекламы, новый SKU · E:iaptemplate/RemoveAd_new; jigsaw_remove_ads_forever_new | MISSING | В текущей сборке нет покупок магазина. Активность именно этого SKU на витрине оригинала UNKNOWN. |
| `easy-offer-double-wheel-reward` | Rewarded placement в общей таблице double_wheel_reward · E:rewardtemplate/double_wheel_reward | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-free-wheel` | Rewarded placement в общей таблице free_wheel · E:rewardtemplate/free_wheel | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-free-20-diamond` | Rewarded placement в общей таблице free_20_diamond · E:rewardtemplate/free_20_diamond | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-try-ball-skin` | Rewarded placement в общей таблице try_ball_skin · E:rewardtemplate/try_ball_skin | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-add-ball-when-preview` | Rewarded placement в общей таблице add_ball_when_preview · E:rewardtemplate/add_ball_when_preview | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-add-ball-when-restart` | Rewarded placement в общей таблице add_ball_when_restart · E:rewardtemplate/add_ball_when_restart | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-revive` | Rewarded placement в общей таблице revive · E:rewardtemplate/revive | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-offer-double-star-reward` | Rewarded placement в общей таблице double_star_reward · E:rewardtemplate/double_star_reward | UNKNOWN | Такой идентификатор не используется нашим адаптером. Наличие игрового входа в оригинале UNKNOWN. |
| `easy-achievement-complete` | Табличное достижение Complete: 1,5,25,100 · E:achievementtemplate/Complete: 1,5,25,100 | PARTIAL | Есть собственные пороги за число побед. |
| `easy-achievement-vip` | Табличное достижение VipPlayer: 1 · E:achievementtemplate/VipPlayer: 1 | UNKNOWN | Нет VIP-подписки; запись сама по себе не подтверждает покупку в оригинале. |

## Дневные задания Guru

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `guru-task-any-level` | Триггер дневной цели — завершить поле · G4:E38 task_config, тип 1 (anyLevel) | PARTIAL | Свой генератор считает поля/уравнения/режимы/сегодня; подтверждён соответствующий класс счётчика. |
| `guru-task-collect-hat` | Триггер дневной цели — собрать hat · G4:E38 task_config, тип 2 (collectHat) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-equation` | Триггер дневной цели — решить уравнения · G4:E38 task_config, тип 3 (equation) | PARTIAL | Свой генератор считает поля/уравнения/режимы/сегодня; подтверждён соответствующий класс счётчика. |
| `guru-task-challenge` | Триггер дневной цели — сыграть Daily · G4:E38 task_config, тип 4 (challenge) | PARTIAL | Свой генератор считает поля/уравнения/режимы/сегодня; подтверждён соответствующий класс счётчика. |
| `guru-task-use-sort` | Триггер дневной цели — применить сортировку · G4:E38 task_config, тип 5 (useSort) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-use-hint` | Триггер дневной цели — использовать помощь · G4:E38 task_config, тип 6 (useHint) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-difficulty-medium` | Триггер дневной цели — пройти Medium · G4:E38 task_config, тип 7 (difficultyMedium) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-difficulty-hard` | Триггер дневной цели — пройти Hard · G4:E38 task_config, тип 8 (difficultyHard) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-difficulty-expert` | Триггер дневной цели — пройти Expert · G4:E38 task_config, тип 9 (difficultyExpert) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-postcard-levels` | Триггер дневной цели — пройти уровень открытки · G4:E38 task_config, тип 10 (postcardLevels) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-adventure` | Триггер дневной цели — пройти Adventure · G4:E38 task_config, тип 11 (adventure) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-collect-postcard` | Триггер дневной цели — получить открытку · G4:E38 task_config, тип 12 (collectPostcard) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-win-battle` | Триггер дневной цели — победить в Battle · G4:E38 task_config, тип 13 (winBattle) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-join-star-race` | Триггер дневной цели — войти в Star Race · G4:E38 task_config, тип 14 (joinStarRace) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-win-star-race` | Триггер дневной цели — победить в Star Race · G4:E38 task_config, тип 15 (winStarRace) | MISSING | Такого отдельного счётчика ежедневной цели в нашей схеме нет. |
| `guru-task-endless` | Триггер дневной цели — сыграть Endless · G4:E38 task_config, тип 16 (endless) | PARTIAL | Свой генератор считает поля/уравнения/режимы/сегодня; подтверждён соответствующий класс счётчика. |

## Пакеты за этап открытки Guru

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `guru-postcard-pack-0` | Пакет 0: монеты 200, помощь 3, hat 5, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 0; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-1` | Пакет 1: монеты 400, помощь 5, hat 10, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 1; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-2` | Пакет 2: монеты 800, помощь 8, hat 15, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 2; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-100` | Пакет 100: монеты 20, помощь 1, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 100; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-101` | Пакет 101: монеты 20, помощь 1, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 101; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-102` | Пакет 102: монеты 50, помощь 1, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 102; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-103` | Пакет 103: монеты 50, помощь 1, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 103; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-104` | Пакет 104: монеты 50, помощь 1, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 104; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-105` | Пакет 105: монеты 100, помощь 2, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 105; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-106` | Пакет 106: монеты 100, помощь 2, hat 2, карты 0 · G4:E39 unlock_puzzle_new_rewards, ID 106; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-107` | Пакет 107: монеты 200, помощь 2, hat 2, карты 1 · G4:E39 unlock_puzzle_new_rewards, ID 107; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-108` | Пакет 108: монеты 300, помощь 3, hat 2, карты 1 · G4:E39 unlock_puzzle_new_rewards, ID 108; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |
| `guru-postcard-pack-109` | Пакет 109: монеты 500, помощь 3, hat 2, карты 1 · G4:E39 unlock_puzzle_new_rewards, ID 109; E40 квитанция | MISSING | В собственном альбоме иная выдача. ID исходного пакета не означает номер этапа. |

## Допроверка EasyFun 1.1.9

| sourceFeatureId | Правило или свидетельство оригинала | Сверка | Что есть в Crossmath |
|---|---|---|---|
| `easy-owl-frequency` | Числа для маскировки ранжируются по частоте среди заданных клеток и лотка · E:CalcNumberTime 0x142e3d0–0x142e498; easyfun-119/README.md | MISSING | Свой банк хранит готовые числа, автоматического выбора скрытых значений нет. |
| `easy-owl-tiebreak` | При равной частоте меньшему числу отдаётся первый доступный знак · E:CalcNumberTime 0x142e564–0x142e618; easyfun-119/README.md | MISSING | Группы скрытых значений и порядок назначения не реализованы. |
| `easy-owl-event-content` | Действующий пакет Event с положительным hiddenNumber, первый уровень и частота · E:LevelEventController.LoadLevelConfigData 0x152fbf4–0x152fc24; локальный банк Classic/Daily N=0; easyfun-119/README.md | UNKNOWN | Нет такого активного события. У оригинала подтверждён загрузчик, конкретный положительный Event-пакет UNKNOWN. |
| `easy-average-finish` | Событие завершения передаёт GamePlayTime, поиск показателя выбирает одну из пяти сложностей · E:GEvent_Game_Complete; 0x143e540–0x143e5a4; 0x14379e8, 0x152bc98; easyfun-119/README.md | PARTIAL | У нас есть активные секунды и завершения по режимам, отсутствует сопоставимая пятёрка личных показателей. |
| `easy-month-replay` | Повтор уже записанного дня отсекается до новой проверки месячного трофея · E:SetDailyDateComplete 0x1531258–0x1531288, 0x15314c4; easyfun-119/README.md | PARTIAL | Даты и однократные выплаты уже учитываются. Нет отдельной записи получения трофея. |
| `easy-month-archive-key` | Календарь и учёт награды используют дату выбранной задачи, включая её год и месяц · E:0x1547410–0x1547448, ForceUpdateDailyPlayerPrefs 0x143e9f0–0x143ea14, CheckGetTrophy 0x148bc38–0x148bc48; easyfun-119/README.md | PARTIAL | Архивные даты привязаны к полю, помесячных трофеев нет. |
| `easy-month-award-flag` | Полный месяц с уже записанным IsReward пропускает выдачу; новая запись вставляется, существующая обновляется · E:CheckGetTrophy 0x148bca4–0x148bd34, metadata SqliteService.InsertData/UpDateData; easyfun-119/README.md | MISSING | Есть другие квитанции выплат. Признак награды по месяцу отсутствует. |
