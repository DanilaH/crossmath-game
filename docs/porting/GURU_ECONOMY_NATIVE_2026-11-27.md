# Guru economy — consumer mapping

### 27.11.2026 · Guru economy native supplement

[Source report and replay](https://github.com/DanilaH/mini-games-kit/blob/1c87c0d2b81f22cd927835b4ec1f382752432806/research/games/crossmath/porting/guru-economy-native-20261127/README.md) ·  102 isolated original controls, two byte-identical runs. Tutorial independent hint requests and local snapshot setter; celebrate_coin/debug initializes offer10 but not wallet, reward mask may contain other rewards; Deployment.init_igc=0 and both init branches delta0, actual startup wallet UNKNOWN. Ordinary true requests10 (correct old false/true wording); successful multi requests30 standalone, first marker telemetry only. Exact GDT bindings Hint/Ticket/Store/GameOver, cause-only wrapper, Hint/Ticket success grant commands; no actual SDK/persistence. Keep own initial120/0, help60, unique base and atomic receipts. #14 if approved, total vs delta and no double base; #24 distinct onboarding grant receipts; #27 no cause-only settlement/fallback (owner-deferred). 630 registered/mapped, 5 new IDs and 17 refinements. No implementation/acceptance promotion; original live/device still UNKNOWN. KIT IMPACT RESEARCH/REUSE; runtime NONE.
Source version and hashes in report. Reviewed PR4 HEAD 9274f7534f7e0ecab0cd757b0c268fbc3795a8aa. Own src/app/model.ts settles base on first unique win, initial120/0; src/app/session.ts credits-first help60 and atomic save. Preserve FEEL-01, cooldown and existing receipts.

| ID | Own comparison / action |
|---|---|
| guru-free-reward-tutorial-snapshot | MISSING: If owner chooses onboarding grants, persist immutable policy snapshot and distinct one-shot receipts atomically with completion; no tutorial regrant on restore. |
| guru-celebrate-coin-debug-override | MISSING: Do not port debug override into release. Only an owner-approved explicit offer policy; reset UI from durable completion receipt. |
| guru-win-reward-mask-other-rewards | PARTIAL: Keep own result presentation independent of settlement and handle other reward animations even if optional coin offer absent. Preserve FEEL-01. |
| guru-igc-init-zero-delta | MISSING: Preserve initial120/0 and atomic versioned save; test fresh/offline/migration separately from any future onboarding grant. |
| guru-rv-wrapper-cause-only | MISSING: Do not port cause-only acceptance. Keep rewarded earned receipt tied to request identity and format; fallback remains owner-deferred. |
| guru-free-reward-remote-config | UNKNOWN: Consumer and snapshot local branch resolved. Original live remote config, actual persisted state and grants remain UNKNOWN. Separate owner approval. |
| guru-tutorial-free-property-hint | MISSING: Native independent request confirmed; if adopted, separate receipt and atomic save; replay/restart and upstream eligibility need device. |
| guru-tutorial-free-reward-hint | MISSING: Native request and snapshot order confirmed. Separate one-shot receipt, no double grant on reload; owner approval. |
| guru-free-reward-default-config | MISSING: Local null/empty true/0 confirmed, distinct from remote default false/1. Validate versioned policy if selected; real config unknown. |
| guru-free-reward-celebrate-coin-flag | UNKNOWN: Local consumer and amount resolved; actual flag and real UI/settlement still need device; no silent economy change. |
| guru-economy-init-igc-config | UNKNOWN: Built-in zero and common delta0 resolved; actual startup wallet including all grants UNKNOWN. Preserve own initial120/0. |
| guru-rv-hint | MISSING: Exact GDT and isolated grant gate resolved. Original SDK/device, policy and persistent receipt remain open; no fallback implementation. |
| guru-rv-ticket | MISSING: Exact GDT and isolated +3 request resolved. Original SDK/device and persistence remain open; owner decision on ticket mode. |
| guru-rv-hint-interstitial-fallback | MISSING: GDT resolved; real provider activation and grant receipt unknown. Owner-deferred; no implicit fallback. |
| guru-rv-hint-success-gated-grant | PARTIAL: GDT resolved; original amount-gated requests isolated; keep earned-only durable reward, no accept on Hidden or cause alone. |
| guru-rv-ticket-interstitial-fallback | MISSING: GDT resolved; original SDK/eligibility and persisted settlement unknown; separate owner decision. |
| guru-battle-ticket-reward-three | MISSING: True requests3; no real wallet proof. If approved, test capacity and durable ticket receipt. |
| guru-win-coins-ten | PARTIAL: Native true requests10; false skips. Own base payout at completion; no second payment on Continue. #14 owner choice. |
| guru-win-coins-multi-thirty | MISSING: Native successful branch requests30 standalone. #14 specify total vs extra explicitly; own base already paid, only approved delta, atomic idempotent receipt. |
| guru-win-multi-mode-exclusion | MISSING: Exact animation states now identified for deee14. Validate own result lifecycle, busy/duplicate/restart; separate other source route. |
| guru-win-multi-first-claim-marker | MISSING: First flag controls telemetry, not grant guard. Own receipt dedup cannot use analytics flag. |
| guru-claim-coins-dialog | MISSING: Native offer/mask/claim branches resolved; live UI/remote/other entry paths still unknown. #14/#24 owner decision. |

Acceptance if separately approved: base vs incremental bonus specified, no repeat on Continue, decline, no-fill, cancel, duplicate/late callback, process restart, atomic marker+wallet, no negative grant, snapshot on completion, preserve old wallet/receipts and actual provider format. Test reward UI without optional coins and with other reward types. Do not change current balance, save schema or runtime now.