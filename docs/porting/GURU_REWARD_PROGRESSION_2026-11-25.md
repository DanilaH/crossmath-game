# Guru victory claims and progression — consumer mapping, 25.11.2026

Source: [private kit report](https://github.com/DanilaH/mini-games-kit/blob/487c344eba804dbcde635de9fa0d505fc6d192de/research/games/crossmath/porting/guru-reward-progression-20261125/README.md), source inventory pin 487c344eba804dbcde635de9fa0d505fc6d192de. Source count 357/357; six separate IDs, four refinements; E38 parity/overshoot historical findings granularized, not claimed as discoveries. Actual developer HEAD 04576ec2239e840176a1a412c06e82aa7b9253cb, 0.5.24/29, runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. Research PR #10 parent 839bbc44b994861dd605f1852f67fd4ffa383378. Developer cooldown evidence from previous report unchanged; no device acceptance or new implementation.

## Source / product

- Ordinary 10 and successful rewarded 30 are separate original direct requests; base grant has skip bool, full wallet delta and global mode eligibility UNKNOWN. Current own settleCompletion (src/app/model.ts 68–104) already persists base 10/15/20/25 for first canonical solve only; rewards are not gated on Continue. RewardKind (src/platform/adState.ts) is hint | continue, no victory reward. No source parity promotion.
- Original first-use telemetry and a separate first-reward event gate, UI ad icon and enum exclusions are recorded in the six new ledger rows; no inferred exact names/cohort or live SDK behavior.
- Original embedded daily schedule: 16 groups, tail parity beyond 16, 280 equations on mature days; size-model estimates 16–31 boards at per-diff/profile means in 20,821 source DB rows. Current own config 7 groups, modulo issuedDays, at most 3-board completion witness, each slot10 + all30, clamps progress at target. Original count overshoot is an internal distinction, not visual UI or desired behavior.

## Candidate for owner choice (not a developer assignment)

If choosing victory rewarded next, use explicit total target and supplemental delta relative to already-persisted base coins. Example only: if 3× total chosen on a first-win base10, extra20, not extra30. Do not multiply rank/card/daily/task/set coins or repeats by accident. Result-bound request and receipt must be durable; no regrant on retry, timeout, late duplicate, process restart. Non-ad route always available. Own provider with icon; no forced interstitial substitution. Tests normal path, earned/failed/cancelled/no-fill, double-click/duplicate, stale result, retry, restart, repeated board, all difficulties, cooldown stacking. Actual amount/eligible modes/enable and UI sequence require owner decision and original live evidence. Keep 60 help price and developer 180/120/420/5-wins policy.

For progression: keep daily completion witness and short goals unchanged for now. Compare real active day16–18, elapsed time and source equation counts; optional separate longer objective candidate, not direct transplant of 280. Owner previous Battle/IAP deferred remains. No runtime/content/save change.

Evidence 45 ARM64 words, 33 BL, 18 pool-load pairs, 100 modeled days, 20,821 original rows; no original Android/live SDK. Source/ledger ID-set and required-field coverage independently checked in JS equivalent to kit verifier; Python full-repo validator not executed in this turn. No ACCEPTED promotion. KIT IMPACT: RESEARCH / REUSE; runtime NONE.
