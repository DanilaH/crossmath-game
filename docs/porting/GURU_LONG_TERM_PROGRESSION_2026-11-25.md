# Guru long-term progression and shared rewards — consumer review 2026-11-25

Source: [exact-build research](https://github.com/DanilaH/mini-games-kit/blob/cdd5f1b8f7e83cab63c3804ff0da570bf90d74e6/research/games/crossmath/porting/guru-long-term-progression-20261125/README.md) (Guru 4.17.0, 71 AOT words; historical 600 level rows; 1849 model pairs; 17 assets). Actual product reviewed: 0.5.24/29, 04576ec2239e840176a1a412c06e82aa7b9253cb, kit runtime b1bf2026eda7dd68a5ccbc883946191e03d235af. No game runtime or balance change. 

## Findings
- Original eligible XP is 10 × equation count, with explicit-count priority; multiple level jumps, carry and repeated final config past 200. Three curves use same 43 badge IDs. 6 visual families, native selector distinguishes non-increase, increase inside family and increase across family (passes old family). Exact serialized enum ordinals and user-visible ceremony timing/audio remain UNKNOWN; model is not execution.
- Own XP and base coins share unique puzzleId check in src/app/model.ts. 240 old + 275 new = 515 IDs. Difficulty counts 150/170/130/65; sum XP 8275, rank32 +75 remainder, maximum rank coin payout 1860. v2 campaign 240/3850 XP, rank17+150; workshop 48 parts/12 cards complete at 228 wins (240 collection coins). Upper bound, not time-to-progress or assurance every board is reachable. Other Daily/Endless activities remain.
- Original lifetime hat sink shared by Daily claim +10, Postcard configured count, Adventure +10, Star Race reward +1; separately weekly sink, sometimes gated. Own XP/currency/workshop and achievements are separate; no weekly/lifetime hat system. Original postcard claim also contributes to task counter. No inference all ordinary wins trigger all systems, or two wallet awards for two counters.
- Product proposal only: independent qualifying XP policy for recurring content (date/stage/attempt/replay receipt; avoid same-puzzle farming), preserve first-board base coin protection, budget recurring rank coins separately. Design own badge families over existing rank only after visual evidence and owner decision. Keep season/competition/energy/IAP deferred for initial release. Do not copy async save weakness, keep atomic receipts.

## Acceptance design, not yet executed
1. Compare first vs repeat wins, multiple modes and sizes, daily date rollover, exact threshold, multi-level carry, interrupted/restarted claim. Existing profile and coins unchanged until approved; repeated result must not double award.
2. Capture original show/upgrade/advance including 7→8 and next-move latency, sound, skip and exit; confirm enum ordinal and actual call. For own design show phone-size and GIF before implementation.
3. Validate lifetime/weekly sinks enabled and disabled for each event, weekly rollover and no duplicate payouts/cyclic quest grant. Requires explicit owner decision for later competitive mode.
4. Re-run canonical verify-reference-porting.py before declaring full port. This review checked complete ID set and required fields in connector JS, not canonical Python or live APK.

10 granular IDs added, 6 existing evidence entries refined; 367/367. No previous acceptance promotion. KIT IMPACT: RESEARCH / REUSE.
