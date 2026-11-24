# Guru 4.17: результаты solver и следующие задачи для Crossmath

**24 ноября 2026.** Проверена продуктовая база **0.5.24 / 29**, HEAD `73fbc059149aba440297cf4cdc074b98433ad7e5`, продуктовая реализация Help/Ads `82904d491f32aebdcb6a0d6a2b0dbf13b95113dd` / `2a7d231098d34de29d8607cc4131fec3dcead899`. Runtime kit — `469928d03f4bae5053e23db26e82187bedbc252e`. Источник — **Guru Crossmath 4.17.0 / 26101374**; выводы этого прохода не переносятся автоматически на видео или бинарник 4.18.

## Итог исследования

[Полный закрытый отчёт с исходными AOT-выдержками и измерениями](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/README.md) завершает исполнение остальных стратегий после прежнего Direct-only исследования. Вызовы выполняют исходные ARM64-инструкции с явно описанным адаптером общих Dart runtime-операций. Это изолированное исполнение, не Android/UI-приёмка.

| Исследовательский пункт | Полученное доказательство | Остаточная граница |
|---|---|---|
| Monotonic, Factor, Intersection, bounded search | Положительные и отрицательные случаи исходных методов; 11/9/9 сценариев в трёх наборах, включая повторные вызовы | Это не полное доказательство всех возможных входов и не приёмка нашей реализации |
| Связанные реальные маски | **13 исходных рецептов / 19 DB-строк** завершены двумя разными протоколами: frozen core **12/18** плюс завершённый supplement **1/1**; два рецепта основной базы естественно доходят до успешного backtracking | Собственная оркестрация native solver по статическому контракту Hint; оригинальный UI/fallback не исполнялись |
| Полный каталог | 20 821 строка / 12 899 уникальных рецептов повторно проверены независимым CSP; все имеют единственное назначение чисел | Полный native-прогон staged solver **UNKNOWN**; отдельная 26-пустотная маска теперь завершена, но это не покрывает остальные рецепты |
| Точная формула stuck | Исполненный загрузчик не читает поле; изменение/удаление метки не меняет объект. Точные explanation scores восстановлены отдельно | Авторский производитель stuck **UNKNOWN**; нужен его код/oracle, а не APK 4.18 или ещё одна подгонка |

Количество сценариев относится к тестовым наборам и не означает непересекающиеся задачи. Замороженная native-база **12/18** охватывает 8–13 пустот и stuck 0–2; завершённое дополнение добавляет один рецепт с **26 пустотами / stuck 5**. [Общий native-охват](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/TOTAL_NATIVE_COVERAGE.json) составляет **13 уникальных рецептов / 19 DB-строк**; повторные прогоны не увеличивают эти числа. Это целевая проверка путей, не статистическое доказательство всей совокупности. Исчерпание времени стенда не означает тупик или ошибку оригинального solver.

### Завершённая большая маска: отдельное дополнение к frozen core

[Точный протокол и результаты](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/diagnostics/heap-capacity-20261124/README.md) относятся к `cm4 row1`, recipe SHA-256 `3351632d49169b46a84219895e484bccd1b67630d55ce95eae6c4effeb064078`: **1 рецепт / 1 DB-строка / 26 пустот**. Исходный solver завершил её в обоих режимах.

| Протокол | Результат | Вызовы solve | Применённые шаги | Внутренние шаги | Время стенда |
|---|---|---:|---|---:|---:|
| Persistent | SOLVED | 11 | 26: 21 Direct + 5 Intersection | 26 | 118.225146 с |
| Fresh/first-step | SOLVED | 26 | 26: 21 Direct + 5 Intersection | 62 | 123.563968 с |

В обоих случаях **0 backtracking и 0 canonical mismatch**; хеши исходных данных и кода оригинала сохранены. Отсчёт времени начинается после bootstrap Uc и первой prepare; fresh включает следующие 25 prepare. Эти времена измеряют изолированное исполнение ARM64 в исследовательском стенде, а не производительность Android-приложения или Hint на телефоне.

Прежние ограничения этого опыта были связаны с 16 MiB arena стенда и накладными расходами поинструкционного счётчика. Прежние HARNESS_ERROR/TIME_BUDGET сохранены как результаты соответствующих конфигураций. Расширение arena и no-count режим относятся только к общим операциям исполнения; исходные бизнес-методы не заменены собственной моделью. **7 exact-parity проверок** и точное совпадение с префиксом 600-секундного прогона подтверждают сохранение наблюдаемой семантики в проверенных случаях. Frozen core **12/18** остаётся неизменным пакетом; итог **13/19** — его объединение с новым завершённым рецептом.

## Подтверждённые правила, которые меняют понимание проекта

**Результат стратегии и фактический прогресс различаются.** В Factor оригинал может установить две клетки, но вернуть `solved=0, constrained=2` и оставить все агрегаты стратегий нулевыми. В другом случае шаг имеет имя Multiplier, а агрегат растёт у Factor. Повторный вызов без изменения поля увеличивает AssumptionRequired. Поэтому эти числа не подходят в качестве точной сложности или критерия сходимости. [Измерения Factor](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/root/FACTOR_FINAL.json).

**Название Intersection не совпадает с нашим правилом.** Guru выводит ответ даже из одного выражения и использует тот же enum для результата backtracking. В `src/help/logic.ts` наша `intersection` требует минимум два supporting equations, а вывод по одному выражению может относиться к `tray`. Совпадение ответа не означает одинаковое объяснение. Четырёхэлементная Monotonic-ветка оригинала 4.17 не делает progress; нет оснований переносить название helper как готовое правило. [Стратегии и код](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/strategy-source/README.md).

**Ограниченный поиск действительно достижим на каталоге, но неполон в общем случае.** При recursion depth 0–2 возможно сохранить цепочку из трёх предположений. Два настоящих каталожных поля решаются за 5 вызовов при сохранении solver или 13 при новом solver/первом шаге. Отдельный синтетический связанный контроль имеет четыре вынужденных значения, но исходный `solve()` после 44 search-входов не выдаёт шаг. Это граница алгоритма на диагностическом входе, не провал поставляемой задачи. [Реальные поля](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/factor/catalog_search/accepted/README.md) · [Контроли поиска](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/root/BACKTRACK_FINAL.json).

**Исходный Hint пересоздаёт solver и берёт первый шаг.** При null/empty результатах он имеет direct-fill fallback; это не цикл с сохранением суженных кандидатов. Два протокола дают одинаковое финальное поле, но иногда разные proof chains. Для основной десятки native-масок persistent даёт 24 вызова/101 шаг; fresh-first-step — 101 вызов/101 применённый шаг и 389 внутренних шагов. Эти числа не смешиваются. Канонический fill-Hint оригинала не является нашим answer-free Explain. [Caller и метаданные](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/README.md).

**Восстановленные scores не являются stuck.** Для N supporting expression indexes, отличных от−1, R related unknowns и D узлов цепочки: candidate score =10N+3R+flag, backtrack score=100D+10N. В исследованном конструкторе flag означает наличие−1 в support set. Не установлена связь этих формул с каталоговой меткой или человеческой трудностью. Поле stuck не входит в шесть полей исходного catalog-object; его точный производитель остаётся неизвестен. [Шесть factory и четыре getter-контроля](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/NATIVE_METADATA.json).

Дополнительная [независимая проверка предоставленной сборки](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/independent-review-20261124/README.md) охватила все 35 APK внутри предоставленной сборки, схемы обеих DB и полные методы инициализации/подсчёта каталога. Формулы в схеме нет; клиент копирует готовые DB. Неоднозначная DEX-строка о stuck относится к рекламному SDK. Это граница исследованных путей, а не доказательство отсутствия любого неназванного или удалённого вычисления. Повтор шести factory и четырёх getter-контролей дал побайтно прежний результат.

[Три подтверждённых native-контрпримера](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/native-counterexamples-20261124/README.md) опровергают простую гипотезу «stuck равно числу применённых non-Direct шагов»: у исходных `cm5.db` rowid 8228/8240/8249 метка равна 0, но в каждом из двух протоколов есть один Multiplier/Monotonic/Intersection соответственно. Это вывод о данном solver и этих протоколах, без восстановления неизвестного authoring producer.

## Текущее состояние нашей игры

**HELP-01 и ADS-01 уже IMPLEMENTED.** Их исходная постановка лежит в [историческом пакете](help-and-ads-20261124/README.md), а текущая приёмка — в [issues-8-9](../acceptance/issues-8-9/README.md). Обновление исследовательской ветки сохраняет код, приёмку, fixed 100% и текущие package statuses; оно не возвращает их в SPECIFIED. Отдельная физическая Android/live SDK-проверка остаётся отдельной задачей.

В нашей игре есть собственные direct/intersection/tray proof, предварительная проверка совместимости и независимый `verifyExplanation`. После HELP-01 результат preparation типизирован; один выбранный proof сохраняется до Apply, а Endless до применения даёт нейтральную обратную связь. Собственные author answers не добавляются в публичную модель задачи, finite token IDs, атомарное списание/применение и сохранения сохраняются.

## Конкретные следующие собственные адаптации

[Полный source → product пакет](https://github.com/DanilaH/mini-games-kit/blob/4287cc0b6480202bb69f0fdb5c426224df779fff/research/games/crossmath/porting/guru-solver-strategies-20261124/stuck/PRODUCT_IMPACT.md) содержит точные fixtures, исходные методы/RVA, отличия актуального кода, зависимости и приёмку. Ниже — его продуктовая выжимка. Эти предложения не отмечаются реализованными данным исследованием.

| Пакет | sourceFeatureId | Что менять и как принимать |
|---|---|---|
| Собственные именованные правила и ranking | guru-monotonic-hint, guru-factor-hint, guru-intersect-hint, guru-hint-candidate | `src/help/logic.ts` и независимый verifier: формализовать proof, различать типы правил, учесть один/два одинаковых физических токена. Приёмка — воспроизводимые positive/negative fixtures, проверка без canonical ответа, понятный coherent proof в текущем окне |
| Ограниченный поиск объяснения | guru-strategy-conditional-backtrack, guru-search-depth, guru-solver-single-pass-result | Собственная proof chain, явный бюджет узлов/времени и независимая проверка каждого шага. Search exhaustion не означает противоречие. Не менять уже принятый neutral Endless preview, оплату/Apply или сохраняемый контент |
| Диагностика своего банка | guru-stuck, guru-stuck-mask-topology, guru-solver-constraint-counters | `src/content/validator.ts`, собственный solver и генератор отчёта: unique solution, фактические assignments/reductions, coverage поддержанных proof, затраты поиска. Эти метрики имеют собственные имена; не подменяют неизвестный stuck и не меняют банк 275 полей без отдельной версии |

Текущий исследовательский инкремент уточняет **13 существующих IDs**. [ADOPTION_LEDGER.json](ADOPTION_LEDGER.json) сохраняет все 296 строк, статусы, comparisons и прежние acceptance records. Source pin обновляется на сопровождающий commit кита; runtime pin остаётся прежним. На уровне потребителя публикуются собственный анализ и ссылки; исходные AOT-выдержки и catalog fixtures хранятся в закрытом ките.

[Проверка финальной сборки документации](GURU_SOLVER_RESEARCH_VERIFICATION_2026-11-24.json) фиксирует exact source pin, полноту 296/296, сохранение статусов и приёмки всех записей, а также strict guidance doctor на неизменном runtime/guidance pin.

После первого опубликованного reconciliation-коммита `bc8d50d3…` оба автоматических GitHub CI прошли успешно: **384 теста**, content/browser, Gradle и проверка releasecheck APK. [Точная запись CI](GURU_SOLVER_RESEARCH_CI_2026-11-24.json) разделяет branch SHA и synthetic merge SHA, содержит хеши APK и сохраняет одно предупреждение hosted doctor о временном `file:` tarball при отдельно подтверждённом kit checkout. Это результаты именно указанного коммита, не любого последующего дополнения. Исследование не меняет игровой код; физический Android и live SDK в этих проверках не запускались.

## Оставшиеся исследовательские действия

Следующий gate — **выборка по диапазонам размеров масок и определение бюджета полного каталога** на уже подтверждённом no-count runtime. Тяжёлый профиль завершён в обоих протоколах и не требует повторного выполнения как предварительного условия. Затем нужен прогон обоих протоколов с явными SOLVED/FIXED_POINT/FALLBACK_REQUIRED/TIME_BUDGET/HARNESS_ERROR. Бизнес-методы нельзя заменять собственной моделью и сохранять метку NATIVE_ISOLATED. Для точного stuck требуется отсутствующий producer/oracle. Это два разных ограничения; ни одно не блокирует уже подготовленные собственные proof-адаптации.

**KIT IMPACT: IMPROVE** — оставшиеся стратегии получили исходный код, исполнимые доказательства и конкретный план собственной адаптации. Изменение runtime/API/игрового контента: **NONE**.
