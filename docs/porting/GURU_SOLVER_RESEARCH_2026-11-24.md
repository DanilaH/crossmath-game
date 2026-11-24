# Guru 4.17: результаты solver и следующие задачи для Crossmath

**24 ноября 2026.** Проверена актуальная игра **0.5.24 / 29**, HEAD `73fbc059149aba440297cf4cdc074b98433ad7e5`, продуктовая реализация Help/Ads `82904d491f32aebdcb6a0d6a2b0dbf13b95113dd` / `2a7d231098d34de29d8607cc4131fec3dcead899`. Runtime kit — `469928d03f4bae5053e23db26e82187bedbc252e`. Источник — **Guru Crossmath 4.17.0 / 26101374**; выводы этого прохода не переносятся автоматически на видео или бинарник 4.18.

## Итог исследования

[Полный закрытый отчёт с исходными AOT-выдержками и измерениями](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/README.md) завершает исполнение остальных стратегий после прежнего Direct-only исследования. Вызовы выполняют исходные ARM64-инструкции с явно описанным адаптером общих Dart runtime-операций. Это изолированное исполнение, не Android/UI-приёмка.

| Исследовательский пункт | Полученное доказательство | Остаточная граница |
|---|---|---|
| Monotonic, Factor, Intersection, bounded search | Положительные и отрицательные случаи исходных методов; 11/9/9 сценариев в трёх наборах, включая повторные вызовы | Это не полное доказательство всех возможных входов и не приёмка нашей реализации |
| Связанные реальные маски | 12 исходных рецептов / 18 DB-строк завершены двумя разными протоколами; два рецепта естественно доходят до успешного backtracking | Собственная оркестрация native solver по статическому контракту Hint; оригинальный UI/fallback не исполнялись |
| Полный каталог | 20 821 строка / 12 899 уникальных рецептов повторно проверены независимым CSP; все имеют единственное назначение чисел | Полный native-прогон staged solver **UNKNOWN**, большие маски исчерпали исследовательский бюджет |
| Точная формула stuck | Исполненный загрузчик не читает поле; изменение/удаление метки не меняет объект. Точные explanation scores восстановлены отдельно | Авторский производитель stuck **UNKNOWN**; нужен его код/oracle, а не APK 4.18 или ещё одна подгонка |

Количество сценариев относится к тестовым наборам и не означает непересекающиеся задачи. У native-выборки 8–13 пустот и stuck 0–2; это целевая проверка путей, не статистическое доказательство всей совокупности. Исчерпание времени стенда не означает тупик или ошибку оригинального solver.

## Подтверждённые правила, которые меняют понимание проекта

**Результат стратегии и фактический прогресс различаются.** В Factor оригинал может установить две клетки, но вернуть `solved=0, constrained=2` и оставить все агрегаты стратегий нулевыми. В другом случае шаг имеет имя Multiplier, а агрегат растёт у Factor. Повторный вызов без изменения поля увеличивает AssumptionRequired. Поэтому эти числа не подходят в качестве точной сложности или критерия сходимости. [Измерения Factor](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/root/FACTOR_FINAL.json).

**Название Intersection не совпадает с нашим правилом.** Guru выводит ответ даже из одного выражения и использует тот же enum для результата backtracking. В `src/help/logic.ts` наша `intersection` требует минимум два supporting equations, а вывод по одному выражению может относиться к `tray`. Совпадение ответа не означает одинаковое объяснение. Четырёхэлементная Monotonic-ветка оригинала 4.17 не делает progress; нет оснований переносить название helper как готовое правило. [Стратегии и код](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/strategy-source/README.md).

**Ограниченный поиск действительно достижим на каталоге, но неполон в общем случае.** При recursion depth 0–2 возможно сохранить цепочку из трёх предположений. Два настоящих каталожных поля решаются за 5 вызовов при сохранении solver или 13 при новом solver/первом шаге. Отдельный синтетический связанный контроль имеет четыре вынужденных значения, но исходный `solve()` после 44 search-входов не выдаёт шаг. Это граница алгоритма на диагностическом входе, не провал поставляемой задачи. [Реальные поля](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/factor/catalog_search/accepted/README.md) · [Контроли поиска](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/root/BACKTRACK_FINAL.json).

**Исходный Hint пересоздаёт solver и берёт первый шаг.** При null/empty результатах он имеет direct-fill fallback; это не цикл с сохранением суженных кандидатов. Два протокола дают одинаковое финальное поле, но иногда разные proof chains. Для основной десятки native-масок persistent даёт 24 вызова/101 шаг; fresh-first-step — 101 вызов/101 применённый шаг и 389 внутренних шагов. Эти числа не смешиваются. Канонический fill-Hint оригинала не является нашим answer-free Explain. [Caller и метаданные](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/README.md).

**Восстановленные scores не являются stuck.** Для N supporting expression indexes, отличных от−1, R related unknowns и D узлов цепочки: candidate score =10N+3R+flag, backtrack score=100D+10N. В исследованном конструкторе flag означает наличие−1 в support set. Не установлена связь этих формул с каталоговой меткой или человеческой трудностью. Поле stuck не входит в шесть полей исходного catalog-object; его точный производитель остаётся неизвестен. [Шесть factory и четыре getter-контроля](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/NATIVE_METADATA.json).

Дополнительная [независимая проверка предоставленной сборки](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/independent-review-20261124/README.md) охватила все 35 APK, схемы обеих DB и полные методы инициализации/подсчёта каталога. Формулы в схеме нет; клиент копирует готовые DB. Неоднозначная DEX-строка о stuck относится к рекламному SDK. Это граница исследованных путей, а не доказательство отсутствия любого неназванного или удалённого вычисления. Повтор шести factory и четырёх getter-контролей дал побайтно прежний результат.

## Текущее состояние нашей игры

**HELP-01 и ADS-01 уже IMPLEMENTED.** Их исходная постановка лежит в [историческом пакете](help-and-ads-20261124/README.md), а текущая приёмка — в [issues-8-9](../acceptance/issues-8-9/README.md). Обновление исследовательской ветки сохраняет код, приёмку, fixed 100% и текущие package statuses; оно не возвращает их в SPECIFIED. Отдельная физическая Android/live SDK-проверка остаётся отдельной задачей.

В нашей игре есть собственные direct/intersection/tray proof, предварительная проверка совместимости и независимый `verifyExplanation`. После HELP-01 результат preparation типизирован; один выбранный proof сохраняется до Apply, а Endless до применения даёт нейтральную обратную связь. Собственные author answers не добавляются в публичную модель задачи, finite token IDs, атомарное списание/применение и сохранения сохраняются.

## Конкретные следующие собственные адаптации

[Полный source → product пакет](https://github.com/DanilaH/mini-games-kit/blob/e48d0108e7bb6c26a758235ea6441a57dbadd4c3/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/PRODUCT_IMPACT.md) содержит точные fixtures, исходные методы/RVA, отличия актуального кода, зависимости и приёмку. Ниже — его продуктовая выжимка. Эти предложения не отмечаются реализованными данным исследованием.

| Пакет | sourceFeatureId | Что менять и как принимать |
|---|---|---|
| Собственные именованные правила и ranking | guru-monotonic-hint, guru-factor-hint, guru-intersect-hint, guru-hint-candidate | `src/help/logic.ts` и независимый verifier: формализовать proof, различать типы правил, учесть один/два одинаковых физических токена. Приёмка — воспроизводимые positive/negative fixtures, проверка без canonical ответа, понятный coherent proof в текущем окне |
| Ограниченный поиск объяснения | guru-strategy-conditional-backtrack, guru-search-depth, guru-solver-single-pass-result | Собственная proof chain, явный бюджет узлов/времени и независимая проверка каждого шага. Search exhaustion не означает противоречие. Не менять уже принятый neutral Endless preview, оплату/Apply или сохраняемый контент |
| Диагностика своего банка | guru-stuck, guru-stuck-mask-topology, guru-solver-constraint-counters | `src/content/validator.ts`, собственный solver и генератор отчёта: unique solution, фактические assignments/reductions, coverage поддержанных proof, затраты поиска. Эти метрики имеют собственные имена; не подменяют неизвестный stuck и не меняют банк 275 полей без отдельной версии |

Текущий исследовательский инкремент уточняет **13 существующих IDs**. [ADOPTION_LEDGER.json](ADOPTION_LEDGER.json) сохраняет все 296 строк, статусы, comparisons и прежние acceptance records. Source pin обновляется на сопровождающий commit кита; runtime pin остаётся прежним. На уровне потребителя публикуются собственный анализ и ссылки; исходные AOT-выдержки и catalog fixtures хранятся в закрытом ките.

[Проверка финальной сборки документации](GURU_SOLVER_RESEARCH_VERIFICATION_2026-11-24.json) фиксирует exact source pin, полноту 296/296, сохранение статусов и приёмки всех записей, а также strict guidance doctor на неизменном runtime/guidance pin. Это проверка исследовательского переноса; нового игрового билда или Android-приёмки она не заявляет.

## Оставшиеся исследовательские действия

Для полного native-каталога нужен длительный прогон обоих протоколов с явными SOLVED/FIXED_POINT/FALLBACK_REQUIRED/TIME_BUDGET. До него требуется завершённый профиль большой маски; бизнес-методы нельзя заменять собственной моделью и сохранять метку NATIVE_ISOLATED. Для точного stuck требуется отсутствующий producer/oracle. Это два разных ограничения; ни одно не блокирует уже подготовленные собственные proof-адаптации.

**KIT IMPACT: IMPROVE** — оставшиеся стратегии получили исходный код, исполнимые доказательства и конкретный план собственной адаптации. Изменение runtime/API/игрового контента: **NONE**.
