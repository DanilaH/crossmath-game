# EasyFun Event · независимая проверка 27.11.2026

Original 1.1.9 / 1193, exact SHA-256 in [source report](https://github.com/DanilaH/mini-games-kit/blob/836a7a02ccead81d491e3ec4137d7e266a5434d9/research/games/crossmath/porting/easyfun-event-native-20261127/README.md); own reviewed HEAD `2e981611a17febf2f9fe61159602a8054eb20ce4`, 0.5.24/29. Runtime kit unchanged. 313 isolated original cases + negative control; source code requests only, not live grants.

## Adoption decisions (proposals; not approval)

| sourceFeatureId | Current Crossmath / next action |
|---|---|
| `easy-event-reward-lookup-first` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-coin-total` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-hint-total` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-total-no-config` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-total-int32-wrap` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-status-gate` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-index-sentinel` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-missing-reward-guard` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-coin-grant` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-hint-not-granted` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-badge-update-existing` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-finish-all-predicate` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-item-coin-add-unclamped` | #24 / P4: approved own economy, atomic receipt, applied delta, boundary and replay tests |
| `easy-item-hint-add-cap99` | #24 / P4: approved own economy, atomic receipt, applied delta, boundary and replay tests |
| `easy-item-update-request-delta` | #24 / P4: approved own economy, atomic receipt, applied delta, boundary and replay tests |
| `easy-event-result-flags` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-gift-claim-animation-request` | #20 / P5: event not implemented; validated stable stage IDs, consistent preview/grant, atomic receipt/progress; exact original Android evidence before acceptance |
| `easy-event-prefs-classic-counter` | #15 / P3: mode-specific statistics, verify actual original mutation on device |

Refined: easy-event-badge, easy-event-gift, easy-issuance-event-end-identity, easy-event-entry, easy-wallet-visual. Detailed source behavior and individual status are in ADOPTION_LEDGER.json. Historic 26.11 assignment file is a snapshot; later IDs have stage in the ledger and addenda. Preserve current scope, economy, save and runtime; don't copy donor cap, amounts or counter anomalies. G3/G4/G5: capture exact source live config, event start/finish and actual wallet/badge before/after, repeated claim/kill/restart. G8: own device acceptance only after implementation. Long expression remains a separate local task.
