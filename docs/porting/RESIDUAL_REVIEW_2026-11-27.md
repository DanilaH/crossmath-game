# Crossmath · остаточная ревизия доказательств 27.11.2026
Consumer 0.5.24/29 at reviewed PR #4 HEAD `ea14714c6464eefb48da7cbbe150de61d48239bd`; runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. Inventory `c5d55b28a78df7af639ce181c8bce73aacc95ae9`, Git blob 3668d1803e1724b9c0da8959d8bea34a4135cfe0; ledger blob ed732d0cda5b406fb21de140460f04948957dd40. Exact 714 unique ID sets match in this review; canonical CI separately. No status promotion or code changes.
## Independent registry review scope
Re-read the current source inventory, ledger, per-gap nextAction, consumer AGENTS, decisions, roadmap, actual Help/Reveal/session and PR state, and preserved [source-surface audit](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/full-system-audit-20261123/README.md) / [closure audit](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/closure-audit-20261126/README.md) / [SCAN_SUMMARY](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/SCAN_SUMMARY.json). This is a registry/evidence reconciliation, NOT a fresh exhaustive binary or Android sweep of Guru; EasyFun original XAPK/ELF/metadata rehashed for the new Hint replay.
Source build memberships (overlap): EasyFun 1.1.9/1193 200, Guru3.5.2/24070452 39, Guru4.17.0/26101374 478, GUI4.18 16. Exact inventories and source archive provenance in SOURCE_FEATURES.json. Earlier screen census EasyFun64 prefabs/34 panels or dialogs/18 tables/12502 levels; Guru UI path strings 213→265, not active screens, 17 UI families. These historical source surface counts do not establish current live routes. Guru4.18 only one exact-version video, not an APK. Source categories cover rules, issuance, FTUE, help, UI/feel, sound/haptics, meta/calendar/retention, competitive/events, economy/ads/IAP, analytics/config, lifecycle. Do not equate coverage of enumerated IDs or source filenames to exhaustive active systems. 
## Primary route for each of 52 explicit gaps
Union predicate: status==EVIDENCE_GAP OR comparison==UNKNOWN; 48 workflow gap, 37 comparison UNKNOWN, overlap 33, union 52. Each listed once; a row may also need other gates. These 52 are not the universe of unknown evidence, as many RESEARCHED/PARTIAL/MISSING/DEFERRED rows have device/live uncertainty. Counts are not percent of product completion.
### G1 — bounded local follow-up (3)
- `guru-free-hint-game-binding` — EVIDENCE_GAP/UNKNOWN
- `guru-event-end-update-scope-risk` — RESEARCHED/UNKNOWN
- `easy-exit-reason-panel` — EVIDENCE_GAP/UNKNOWN

### G2 — source authoring oracle (1)
- `guru-stuck` — EVIDENCE_GAP/UNKNOWN

### G3 — source Android UI, feel and lifecycle (14)
- `ref-haptics` — EVIDENCE_GAP/UNKNOWN
- `easy-debug-panel` — EVIDENCE_GAP/UNKNOWN
- `ref-background` — EVIDENCE_GAP/UNKNOWN
- `easy-theme` — EVIDENCE_GAP/PARTIAL
- `easy-rating` — EVIDENCE_GAP/UNKNOWN
- `easy-consent` — EVIDENCE_GAP/UNKNOWN
- `easy-upgrade` — EVIDENCE_GAP/UNKNOWN
- `plan-editor` — EVIDENCE_GAP/UNKNOWN
- `guru-badge-ceremony` — EVIDENCE_GAP/MISSING
- `guru-puzzle-filter-debug-preview` — EVIDENCE_GAP/MISSING
- `easy-update-dialog` — EVIDENCE_GAP/MISSING
- `guru-feedback-route` — EVIDENCE_GAP/MISSING
- `easy-ad-cheat-skip-toggle` — RESEARCHED/UNKNOWN
- `easy-event-prefs-classic-counter` — EVIDENCE_GAP/PARTIAL

### G4 — source live config, content, exposure (6)
- `guru-dynamic-filter` — EVIDENCE_GAP/UNKNOWN
- `easy-choice-percent` — EVIDENCE_GAP/UNKNOWN
- `easy-event-entry` — EVIDENCE_GAP/UNKNOWN
- `easy-owl-event-content` — EVIDENCE_GAP/UNKNOWN
- `guru-free-reward-remote-config` — EVIDENCE_GAP/UNKNOWN
- `guru-free-reward-celebrate-coin-flag` — EVIDENCE_GAP/UNKNOWN

### G5 — source SDK, entitlement and settlement (24)
- `guru-ad-retry` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-double-wheel-reward` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-free-wheel` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-free-20-diamond` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-try-ball-skin` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-add-ball-when-preview` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-add-ball-when-restart` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-revive` — EVIDENCE_GAP/UNKNOWN
- `easy-offer-double-star-reward` — EVIDENCE_GAP/UNKNOWN
- `easy-achievement-vip` — EVIDENCE_GAP/UNKNOWN
- `guru-iap-hint-20` — EVIDENCE_GAP/MISSING
- `guru-rv-extra-chance` — EVIDENCE_GAP/MISSING
- `guru-rv-hint` — EVIDENCE_GAP/MISSING
- `guru-rv-ticket` — EVIDENCE_GAP/MISSING
- `guru-rv-store` — EVIDENCE_GAP/MISSING
- `guru-banner-during-fullscreen-load` — EVIDENCE_GAP/MISSING
- `easy-ad-mrec-channel` — RESEARCHED/UNKNOWN
- `easy-ad-native-channel` — RESEARCHED/UNKNOWN
- `guru-hint-guided-payment-bypass` — EVIDENCE_GAP/UNKNOWN
- `guru-economy-init-igc-config` — EVIDENCE_GAP/UNKNOWN
- `easy-push-claim-panel-guard` — EVIDENCE_GAP/MISSING
- `easy-push-claim-credit-before-animation` — EVIDENCE_GAP/MISSING
- `easy-event-finish-hint-not-granted` — EVIDENCE_GAP/UNKNOWN
- `easy-event-gift-claim-animation-request` — EVIDENCE_GAP/MISSING

### G6 — source external accounts/services (3)
- `ref-live-opponents` — EVIDENCE_GAP/UNKNOWN
- `ref-cloud-sync` — EVIDENCE_GAP/UNKNOWN
- `easy-push-reward` — EVIDENCE_GAP/UNKNOWN

### G9 — exact newer source archive (1)
- `guru-direct-long-left-fold` — EVIDENCE_GAP/UNKNOWN
## Local queue: finite decision-oriented investigation
1. Guru free-hint binding: trace exact gameId/isFree consumer, persistence key, lifetime and one-time use. Prior parser and equality branch static; do not re-run unrelated commerce callback samples. Target `guru-free-hint-game-binding`; stop if only live flag/payout unresolved.
2. Guru event-end SQL scope: decode descriptor ref219566 or intercept original SQL call in isolated source, fixture two event IDs and one closed event; prove WHERE scope or leave UNKNOWN. No write to real accounts or service. Target `guru-event-end-update-scope-risk`.
3. EasyFun exit panel: resolve typed activation delegate and actual data consumer using new generic metadata decoder; distinguish internal diagnostic from user exit survey. If no local edge, keep reachability UNKNOWN. `easy-exit-reason-panel`. Lower priority than actual product needs.
4. Targeted static traces for choice percentage/event 10/30/rating/consent may narrow G3/G4; live eligibility not inferred. Do not reopen resolved Hint target, reward callbacks, VIP timer, profile switch, Daily rescue or solver strategy packages simply to increase counts. Guru 4.17 direct-left-fold has prior native witness; the unresolved cross-version question is G9, not another synthetic 4.17 proof. Full native corpus still not executed (combined 108 distinct recipes paired, 192 expanded with 96 paired solved / 96 time-censored); run only if a new decision needs it. Source authoring stuck requires oracle G2, not fitting DB labels again.
## Independent gates beyond explicit rows
G3/G5: actual Hint event delivery and board/economy after direct-credit/coin/RV; capture original Android with empty/full/partially filled board, repeated same values and wrong position, no-target edge only if reachable, cancel/restart, per-mode Daily/tutorial callback. G4: exact live event packet, alternate hint grant, long expression actually issued; observed result/offer availability. G7: actual analytics/causal retention/revenue requires lawful measured data, not local synthetic fixtures. G8: own physical release acceptance of HELP-02, cooldown, FEEL-01, in-place same certificate, real licensed provider; not a source gap or a claim of release ready. G9: exact 4.18 archive, no broad rescan without version delta. 
## Product recommendation
Do not wait for all external gates to work on approved offline product packages. Maintain existing 515 fields, Explain/Reveal split, help60/credit and receipts. New findings: [Hint replay](https://github.com/DanilaH/mini-games-kit/blob/c5d55b28a78df7af639ce181c8bce73aacc95ae9/research/games/crossmath/porting/easyfun-hint-native-20261127/README.md) supports optional minimal-repair Reveal UX only, no owner approval; keep existing selected target and proof semantics. #14–27 are proposed stages with separate scope approvals; source registry is not blanket permission for code/economy or network changes. KIT IMPACT RESEARCH/REUSE; runtime NONE.
