# EasyFun reward/spend native · 27.11.2026

[Source evidence, exact version, SHA and reproducible native controls](https://github.com/DanilaH/mini-games-kit/blob/6fd19408bfd58a0a39512749b19d5caa6e6355b8/research/games/crossmath/porting/easyfun-reward-native-20261127/README.md); own 0.5.24/29 reviewed HEAD `2419774d3684747f4a1ee5bf250e20677216419f`, runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. 240 original isolated records, not Android acceptance.

| IDs | Own comparison / proposed test |
|---|---|
| easy-item-spend-balance-gate, easy-item-spend-nonpositive-amount, easy-item-spend-hint-counter, easy-item-spend-event-delta | session.ts: verified Apply and positive configured cost; no arbitrary donor debit; test insufficient/negative/zero/duplicate and persistence failure; receipt describes applied cost. |
| easy-hint-button-credit-first, easy-hint-button-paid-dispatch, easy-hint-reward-add-then-consume, easy-hint-reward-false-dispatch | session.ts / adState.ts: credit first, own cost60; earned grants stored credit, not instant consumption; preserve proof and atomic receipt; live SDK and original target/application UNKNOWN. |
| easy-random-gold-success-multiplier, easy-random-gold-false-base, easy-random-gold-free-callback, easy-random-gold-sequence-reset, easy-coin-close-base-continuation, easy-coin-close-delay-guard | #14: no random wheel or close grant in own version; owner approval, exact result-scoped receipt, total vs delta, no duplicate base on cancel/replay/late callback/kill. Visual presentation not authority. Do not copy source values, odds or delay. |
| easy-daily-paid-restart-debit-result-ignored | #18 keep approved free restart; any future paid variant must not proceed after payment failure. Synthetic donor fixture is not proof of a visible UI bug. |
| easy-coin-service-direct-wallet-update | model.ts: one save authority; no separate unapproved SDK/user-properties coupling. |

8 existing IDs refined; see per-ID ledger. Earlier direct BL-only scan missed tail B to ShowRewardVideo at 154def4; callback binding confirmed. Actual provider delivery, disk, offer reachability, pointer odds, and alternate Event hint grant remain UNKNOWN. No implementation, scope, balance, save or runtime changes. Next local: original Hint target-selection/dispatch receiver; then independent G1–G9 review. KIT IMPACT RESEARCH/REUSE.
