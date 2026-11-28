# EasyFun mode/career source delta · 26.11.2026



### 26.11.2026 · EasyFun mode/career native supplement
[Source report and reproducible controls](https://github.com/DanilaH/mini-games-kit/blob/703fe422616901ceb86045c6def358ce35b177db/research/games/crossmath/porting/easyfun-mode-career-20261126/README.md) · 11 new stable IDs; 2 refined, 103/103 isolated ARM64 controls, repeat byte-identical. 0.5.24/29 code inspected at 38489056d0dad1d36157682729a086683b44093b. No own implementation/acceptance/economy/bank/runtime changes. Existing #16: nonmutating preview, exact once commit, typed invalid result, immutable slots. #18: own Daily Next opens calendar (session.ts:173); keep current route unless owner approves a different UX. #20: future Event last-index terminal no wrap/no extra payout; persisted event identity; owner scope unchanged. #15: optional local career milestones, deterministic ties, whole hours derived from stored seconds, no implied live player percentile or copied thresholds. Current source activation on Android, VIP/reward indirect paths remain UNKNOWN. KIT IMPACT RESEARCH/REUSE.


| Source ID | Current comparison | Product path / acceptance |
|---|---|---|
| easy-issuance-classic-next-index | PARTIAL / RESEARCHED | src/app/model.ts · Retain immutable assignment; test exact once advance, preview/restart and terminal campaign. #16 |
| easy-issuance-change-track-resume | PARTIAL / RESEARCHED | src/app/session.ts · Preserve saved assignments and unlocks; test switch away/back with unsolved and won slots. #16 |
| easy-issuance-saved-index-tutorial-gate | PARTIAL / RESEARCHED | src/content/catalog.ts · Do not copy fixture or original tutorial count; test own fresh and migrated unlock boundary. #16 |
| easy-issuance-daily-next-classic | MISSING / DEFERRED | src/app/session.ts · Keep current calendar route unless owner approves change after Daily. #18 |
| easy-issuance-event-entry-resume | MISSING / DEFERRED | src/app/session.ts · On #20 use versioned event ID and stored assignment/index, validate active/expired and receipt. Test resume after reload. |
| easy-issuance-event-end-identity | MISSING / DEFERRED | src/meta/career.ts · On #20 prove no wrap/no extra payout at last field; explicit terminal result, reopen safe. Do not copy object identity as API. |
| easy-issuance-invalid-transition-null | PARTIAL / RESEARCHED | src/app/session.ts · Use typed invalid/unavailable result; check no cursor, history, wallet or attempt changes. #16 |
| easy-issuance-daily-date-resume | PARTIAL / RESEARCHED | src/app/session.ts · Keep immutable dated assignment; test old dates, restart, zone/expiry and selected day. #18 |
| easy-issuance-tutorial-next-handoff | PARTIAL / RESEARCHED | src/content/catalog.ts · Fresh/legacy onboarding transition tests without copying donor tutorial count. #16 |
| easy-career-top-tie-first | MISSING / RESEARCHED | src/meta/career.ts · If #15 approved, choose stable own milestone IDs and deterministic tie policy, use actual local metrics. No fake Top percentile. |
| easy-career-playtime-whole-hours | PARTIAL / RESEARCHED | src/meta/career.ts · If #15 approved, derive whole hours from retained seconds; 3599/3600/3601 tests, preserve partial history. |

No product implementation required by this report. Original fixture count=5 is not installed tutorial count; original XAPK previously showed two tutorial boards. Source thresholds are not actual percentile. Original Android/device and live events/ads remain open.
