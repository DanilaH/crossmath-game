# Kit adoption matrix

Runtime is pinned to `b1bf2026eda7dd68a5ccbc883946191e03d235af` for the interstitial pilot. Guidance remains pinned to `469928d03f4bae5053e23db26e82187bedbc252e`.

| Contract | Choice | Consumer boundary |
| --- | --- | --- |
| Android Phaser/Capacitor bootstrap | REUSE | Portrait, own provisional package, native AtomicFile KV/Back/lifecycle/insets and release checks |
| JsonStorageRepository / StorageAdapter | REUSE | Crossmath codec, one root snapshot, backup, revision/readback/quarantine are local policy |
| GameplayActivityCoordinator | REUSE | Additive external blockers; user/modal reasons separate. Only user pause persists |
| OwnedDomMotion | REUSE | Cancel-safe return presentation; board owns hit geometry and command acceptance |
| OneShotPlayer | REUSE | Original synthesized buffers, one priority cue, bounded voices, no stale playback queue |
| StartupTimeline / density / destroyRenderer | REUSE | Actual first Phaser frame, semantic DOM board, quiet canvas underlay, dirty painting |
| DurablePendingTransactionSession | NOT APPLICABLE | No random staged resolution: attempt, debit, progress and receipt are one deterministic atomic root replacement |
| RevisionSnapshotQueue | NOT APPLICABLE to commands | Never coalesce accepted commands/help/rewards. Periodic time checkpoints are separate |
| DurableReceiptQueue | REUSE | Reward events settle through the single session writer before acknowledgement. Exact-target policy is local. |
| ActionInterstitialGate | REUSE | The shared gate manages one deadline and durable request reservations. Crossmath supplies its active-time clock, win count and policy. |
| Calendar day / tier progress | REUSE | `calendarDayIndex`, `isCalendarDay`, `getTierProgress`; own IANA/effective-day policy, dated receipts and immutable puzzle assignment |
| Hint budget | LOCAL POLICY | Explicit 60 coins/credits, no generic free-hint budget |
| Yandex web SDK | NOT APPLICABLE | Android is not the web SDK. Later web port requires another adapter |
| Gameplay, proof, content, economy | LOCAL POLICY | Specific Crossmath rules; no common extraction justified |

Routes: new repository/architecture and approved UI/input/feel. Read pinned API, setup, UX & Art System and UI Motion. Reference is the owner's own HTML v0.10 and field-12 images, not an unobserved claim about competitor APK runtime.

KIT IMPACT: **REUSE**. No kit changes or new shared API proposed. Intrinsic-width correction belongs in this consumer's board layout.

D routes: Calendar/Tier Progress and UX & Art System/Stable Progress UI. Applied action hierarchy to saved-game/today/campaign priority, actual 48px controls and wrapping names in the 320px album; evidence in `evidence/meta-d/`. Reused day/tier primitives, atomic writer and additive navigation blocker. Crossmath mission reachability and reward policy remain consumer code; no upstream extraction proposed.

E1 KIT IMPACT: **REUSE** existing atomic writer, additive activity/navigation blockers and DOM/input controls; score/run/achievement rules remain local. Pinned UX & Art System applied to explicit Submit, neutral pre-submit state, separate record categories, partial-history labels and a bottom action reachable before scrolling at four viewports; evidence in `evidence/endless-e1/`. No new kit API, motion or art direction, and no pin change.

E2 KIT IMPACT: **REUSE** DurableReceiptQueue for external reward delivery plus additive activity reasons. E2 initially used a local confirmed-display and active-time policy. The later interstitial pilot uses the shared gate with the same active-time clock. See ACCEPTANCE_E2_2026-11-19.md for the native contract and tested cases.

MONETIZATION #27 / isolated #14 (0.5.26/31): **KIT IMPACT REUSE** pinned b1bf2026 ActionInterstitialGate and DurableReceiptQueue with outcome-keyed envelope; app-owned GameSession writer and native durable journal/optional provider seam. [Proof/SDK limits](acceptance/monetization27/README.md). Native banner is a measured sibling of WebView under the root's single safe-area owner; no CSS-to-native overlay mapping is needed. No runtime pin/API/dependency bump or mass consumer update. Native provider is Unconfigured; no generic SDK extraction claimed.
