# Crossmath project decisions

Guidance snapshot SHA: 469928d03f4bae5053e23db26e82187bedbc252e
Runtime source: @danilah/mini-games-kit at 469928d03f4bae5053e23db26e82187bedbc252e

- Owner authorized implementation on 18 November 2026. Authority: `docs/spec/Crossmath_TZ_v1.0_RU.md`. Energy, PvP/bots, seasons, purchases, cloud profiles and online rankings remain excluded.
- Generated from verified kit source at **469928d03f4bae5053e23db26e82187bedbc252e**. Runtime and guidance pins are separately recorded at that SHA. Required source files matched provider Git blob hashes before generation.
- Tested bootstrap stack preserved: Node 24+, TS 7.0.2, Phaser 4.2.1, Capacitor 8.6.0/App 8.1.2, Vite 8.2.2, Vitest 4.1.11, JDK 21, AGP 8.13.0, Gradle 8.14.3, compile/target 36, min 24.
- Provisional base package `com.danilah.crossmath`; `.playtest` / `.releasecheck` isolate test data. Production identity/publication are not selected. Production certificate stays null and production build fails closed.
- Visual source is own sample v0.10: paper `#F6F3E9`, ink `#182E2C`, teal `#11635B`, mint `#D3E8DA`, warm selected outline; errors use expression text and ≠ as well as colour. Georgia titles and system tabular numerals work offline.
- **Semantic DOM board over Phaser paper-grid underlay** deliberately preserves real buttons/focus/labels/hit geometry. Host first-render/lifecycle/density/cleanup contracts remain. The quiet canvas is painted when dirty, with no continuous idle loop.
- Numeric targets are at least 48 CSS px in scripted browser checks. Android dp/TalkBack remain device acceptance. Dense/large-text content may scroll with the tap path available. DOM font scaling does not prove OS font accessibility.
- Stable physical token IDs, expected board revision and accepted command IDs govern commands. Given cells never change. Swap checks both axes/both ends once. Locally correct rows stay editable. Undo ends at victory and never refunds help/lives.
- Explanations cannot import author answers. Bounded compatibility search rejects inconsistent hypotheses; an independent verifier recomputes supports and joint inventory. Reveal is an isolated service and separate explicit choice.
- Save schema 2 stores attempt/wallet/progress/completion/help and meta receipts in **one atomic root value**. The original `.save.v1` key stays stable for upgrades. Schema-1 migration preserves physical tokens/settings and grandfathered cards, grants only newly completed catch-up cards, then persists before exposing the new state. Reused JSON writer serializes writes; backup/strict codec/4 MiB limit/revision conflict/ambiguous readback/quarantine are local policy.
- One session writer is supported. Browser changed-revision checks are not cross-tab transactional CAS. Multi-tab/cloud synchronization is outside this Android slice.
- Delivered config 0.8 defines wallet 120, credit before 60 coins, base XP/coins and rank/card milestones. D implements Free/Daily/quests/rank/album; achievements/statistics/Endless/RU–EN/adapters remain E. No ad/analytics runtime is installed; zero balance never blocks normal play or restart.
- First launch is canonical field 1. All 240 fields use route IDs, no runtime generator or adaptive director. Source definitions stay immutable.
- Native content root is the sole system-inset owner. Browser preview applies its own safe area. User/modal/background/SDK blockers must not resume one another.

## D — 0.2.0

- Campaign, Free and each dated Daily have separate durable slots. Root attempt/result is the sole active authority; inactive slots exclude it. Replacing an unfinished slot requires the player's confirmation. Won mission replays create a new attempt rather than trapping the player on an old result.
- Calendar uses the profile's creation IANA zone, Gregorian kit ordinal, mathematical modulo and a monotonically recorded effective day. Dates are pinned to canonical ID/calendar version on first opening. Archive is today + previous 30 days, bounded by profile creation; unfinished old dates can still be completed, but cannot be restarted outside that window.
- Missions use actual campaign prerequisites and mastered Free pools. A joint witness contains at most three distinct canonical IDs. Replacements minimize changed unpaid slots with third/second/first tie order, preserve sibling progress and require one new action in a changed slot. Unshipped Endless cannot be a witness or a displayed unlock.
- First base payout is once per puzzle; Daily bonus once per date; mission contribution once per effective day/puzzle across modes; slot/set receipts use separate keys. Fifth base victory issues missions prospectively. All payouts, collection layers and original result presentation are captured in the same atomic save.
- Daily active-day rotation advances on actual issuance, not missed dates. Clock rollback never reissues a set. Kit `getTierProgress` supplies the next collection milestone; own SVG art shows only earned parts. No new art direction or kit pin change.
