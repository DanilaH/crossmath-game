# Explain: проверка точной сборки 0.5.24 / 29 · 25.11.2026

[Исследование, код стенда и измерения](https://github.com/DanilaH/mini-games-kit/blob/aef1f66dad253fa315c0ef30d3c624081817bd8a/research/games/crossmath/porting/guru-help-product-audit-20261125/README.md). Источник — releaseCheck APK из CI run 45432822913, SHA-256 a93978c34811e8b8d1ef88b4ba2a58dd0fb269ebebdf938bdf2c58dd792aa08f, PR #4 HEAD 73fbc059149aba440297cf4cdc074b98433ad7e5. Runtime kit unchanged. Точный скомпилированный JS выполняется изолированно в Node VM; не Android и не полная игра.

Из пустого поля: 485/515 завершены только Explain (240/240 legacy, 245/275 v2). 30 v2 полей дают 40 no_supported_step, ни одного budget_exhausted и отказа verifier; все завершаются после диагностического Reveal. При одном детерминированном правильном префиксе и reversed tray — 515/515. Из 515 отрицательных контролей 513 incompatible_position, у двух не существует неправильного доступного номинала. Это не исчерпывающая проверка всех состояний.

На 30 проблемных полях собственная модель повторного распространения доменов + глобальный ресурс фишек даёт 28/30 без Reveal; добавление гипотезы глубиной один — 30/30. Без глобального ресурса — 25/30 даже с гипотезой. Проверены 40 положительных и 456 отрицательных CSP-контрфактов, соответствие авторскому ответу используется только для независимой проверки. Важные примеры: cm-own-02-182, после 2 заполненных, cell1=14; cm-own-02-217, после 12 заполненных, cell0=26. Нынешний verifyExplanation закономерно отвергает research_model plans. Исследовательская материализация не является реализацией или продуктовой приёмкой.

## Кандидат на следующий отдельный этап, если одобрит владелец

- sourceFeatureId: guru-direct-hint, guru-intersect-hint, guru-factor-hint, guru-monotonic-hint, guru-search-depth, guru-strategy-conditional-backtrack, guru-hint-candidate. Сопоставление с исходным Guru 4.17.0 в private kit; модель не объявлять точной копией именованных стратегий.
- src/help/logic.ts: сохранить ранние Direct, Intersection, Tray и текущую выдачу typed outcome. После no_supported_step распространить доказуемые ограничения видимых уравнений и доступных физических фишек. При отсутствии шага — ограниченная одноуровневая проверка предположения. Выделить новый тип доказательства с независимой проверкой каждого сужения домена, мультисета ресурсов и противоречия. Не использовать author_solutions в Explain. Лимит вычислений в runtime задавать/измерять отдельно, не подставлять двухмиллионный бюджет исследовательского CSP.
- Приёмка: 515/515 чистых путей, все 30 baseline misses (оба выше отдельно), 515 alternate prefix, отрицательные контроли дублирующихся фишек, выдуманного support, ложного contradiction, stale snapshot и exhaustion. Сохранить точные физические token IDs, атомарное списание, нейтральный Endless до Submit, сохранения и версии банка; существующие 240+275 поля не менять. Отдельно full unit/browser/exact APK и Android UX/performance. Никаких автоматических Reveal или изменения цены.
- Не открывать заново HELP-01/ADS-01; статусы и comparison существующих source IDs не повышены. Новых source IDs нет (300/300).

Native solver Guru: новых native-прогонов в данном проходе нет; Blutter/Unicorn окружение недоступно в sandbox, исходный авторский stuck и полная сходимость каталога UNKNOWN. Raw архив в личной Library: Crossmath_0524_Help_Audit_20261125.zip, SHA-256 2355fa5d368c1c8d8af819fe4e2bcab40e7e4ef6573ecf8b4e8b067c714c960c; шесть отчётов побайтно совпали при повторном прогоне.

KIT IMPACT: CANDIDATE, runtime NONE.
