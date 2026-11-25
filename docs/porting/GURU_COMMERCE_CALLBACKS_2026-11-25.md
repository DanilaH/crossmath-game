# Guru commercial callbacks — consumer comparison 25.11.2026

Source: [private research and reproduction](https://github.com/DanilaH/mini-games-kit/blob/f4cca83706abc576c21d2b6eeb488562042126b9/research/games/crossmath/porting/guru-commerce-callbacks-20261125/README.md), Guru 4.17.0/26101374 ARM64. 99 original instruction words, 32 pool-load and 10 direct branch target checks; no original Android or live SDK execution.

Consumer PR #4 exact HEAD 6f8a259dca7e87e1033c3f1cb4256a935885bf97, 0.5.24/29. Compared actual src/platform/adState.ts, src/platform/ads.ts, src/app/session.ts and docs/spec/product/meta_v08/config.json. Since HELP-02 reviewed HEAD 32980ba, developer changed board layout and viewport tests. Developer reports 36 combinations and board-fit APK; not independently rerun or physical acceptance. Keep previous proof evidence and its artifact pin intact.

## Confirmed differences

- get_hint alternative uses interstitial after a qualifying failure, skips load cancellation. Separate store controller grants amount only on success bool. Indirect dispatch and persistent end-to-end fallback settlement remain UNKNOWN. Our AdsController.reward does not call showInterstitial. Our durable earned receipt must not be weakened.
- Original base fallback 60s, clamp 5–600; extra>0 extends remaining deadline, extra<=0 resets to base. Hidden callback suffix-routing is static, not proof of reward. Own policy >5 solved IDs, 180/120 seconds active-time gates, won result only. No source policy substitution approved.
- Tutorial has independent new_user_free_property.hint and free_reward_config.new_user_hint positive grant calls. Default celebrate_coin=true, new_user_hint=0. Amounts, repeat guard and actual settlement UNKNOWN; gameId/isFree flag lifetime unknown. Own fixed initial coins 120, hint price 60, no corresponding remote grant.

## Proposed later, only after owner choice

- Resolve fallback dispatch, provider terms and actual UI; cancellation and no-fill remain separate. No interstitial auto-reward merely because it closed. If implemented, user explicit request, clear offer, consent, idempotent durable event and tests for duplicate/cancel/background/restart.
- Compare original deadline and our active timer on same event sequence; first-session and post-reward protections are product decisions, no arbitrary 60s adoption.
- If onboarding gifts adopted: separate stable grant IDs, exact positive amounts, no duplicate on reinstall/restore/tutorial replay; test both values, zero/missing and save atomicity. No silent economy or schema change.
- Next research store/currency and unlock_puzzle_new_rewards, actual original SDK event eligibility/settlement, independent Android observations.

## Ledger

f4cca83706abc576c21d2b6eeb488562042126b9, 333/333 inventoried IDs mapped (13 added, three existing IDs refined; previous statuses preserved). Connector-side equivalent of schema/ID/required-field gate: 0 errors; canonical Python CLI not run on complete local checkout. All new records have nextAction; evidence gaps remain. No code, economy, bank, saves, SDK or kit runtime update. KIT IMPACT: REUSE research method.
