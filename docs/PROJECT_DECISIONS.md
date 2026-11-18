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
- Save schema 1 stores attempt/wallet/progress/completion/help receipts in **one atomic root value**. Reused JSON writer serializes writes; backup/strict codec/4 MiB limit/revision conflict/ambiguous readback/quarantine are local policy. Corruption never silently creates a fresh wallet.
- One session writer is supported. Browser changed-revision checks are not cross-tab transactional CAS. Multi-tab/cloud synchronization is outside this Android slice.
- Delivered config 0.8 defines wallet 120, credit before 60 coins, base XP/coins and rank/card milestones. Full album/daily/quests/achievements/profile UI comes in D/E. No ad/analytics runtime is installed; zero balance never blocks normal play or restart.
- First launch is canonical field 1. All 240 fields use route IDs, no runtime generator or adaptive director. Source definitions stay immutable.
- Native content root is the sole system-inset owner. Browser preview applies its own safe area. User/modal/background/SDK blockers must not resume one another.
