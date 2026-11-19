# E2 acceptance — 19 November 2026

Crossmath 0.4.0, Android versionCode 4, save schema 4.

| Scenario | Evidence |
| --- | --- |
| RU ↔ EN and timer | Chromium changes language through Settings, inspects main/board/help/calendar/album/profile copy and accessible labels, restarts the page in English, then switches back. English card parts, achievement names and mission copy are localized. Optional timer persists and is reserved for Campaign and Free Play. |
| Reload or migration failure | Schema 3 opens without losing the active board, detailed career, wallet or language. First migration write failure leaves the validated prior snapshot available for retry. |
| Confirmed reward | Scripted provider confirms a durable request before showing. Earned-before-close and close-before-earned both settle once. Help credit is spent through the normal help action. Duplicate delivery or failed acknowledgement cannot grant a second resource. |
| Unavailable, cancelled, interrupted | Simulated no-fill, cancellation, failure and stalled availability queries preserve play. A 1.5-second deadline lets an unopened fullscreen request release its blocker. Background/modal reasons remain independent. Durable provider receipts recover after cold load. |
| Continuation target | Daily adds one life to the exact active or parked attempt. An expired/replaced attempt gets no life. Endless revives the exact run once and marks it assisted. The free restart is still available in the offline preview. |
| Interstitial and banner | Explicit continuation after a result is the only interstitial entry point. First-five-win protection, 180 active seconds between shown impressions, and 120 active seconds after earned video are covered in tests. Optional banner visibility is sent to the native owner. Native reservation geometry requires the provider. |

The pinned kit receipt queue delivers confirmed external receipts through the session's single writer. Crossmath persists the settlement and wallet/life change in the same root transaction before acknowledging the receipt. An acknowledgement deadline releases the queue while the underlying bridge call stays single-flight. Placement, action clocks and ad cadence remain game-owned policy.

## Native provider contract

The release client discovers the optional Capacitor `CrossmathAds` plugin on Android. The preview contains the bridge client and runs offline. Provider SDK, credentials, placements and live verification require the release configuration.

| Bridge entry | Required behavior |
| --- | --- |
| `availability` and `availabilityChanged` | Return readiness for rewarded, interstitial and banner. A readiness query can fail without delaying the first playable frame. |
| `showRewarded` and `showInterstitial` | Match the supplied presentation ID, refuse starts after `startBefore`, emit `fullscreenOpened` only for actual presentation and resolve on dismissal or pre-show refusal. Use `shown` for a confirmed impression. |
| `rewardSettled`, `pendingRewards`, `acknowledge` | Persist each final event before notification. A dismissal may precede the earned callback. Cancelled/failed are final outcomes and must only be emitted once the provider knows no reward was earned. Remove only the matching request after acknowledgement. |
| `setBanner` | Own the measured native reservation under the WebView layout contract. Hide when backgrounded, in a modal or during fullscreen. Apply system insets once. |

Scripted provider lives in tests. Production provider selection and actual banners, impressions, earned callbacks and device interruption evidence belong to release acceptance.

## Preview artifact

| Field | Verified value |
| --- | --- |
| APK | `Crossmath_0.4.0_E2_preview.apk` |
| Package and version | `com.danilah.crossmath.releasecheck`, 0.4.0, versionCode 4 |
| Source commit | `570b72882534a7a71c2c345a70453ed11622c61d` |
| SHA-256 | `05a232780a40564e0f22e83381c6c5f186bdc8c50327703a08a1e465a16c2267` |
| Size | 1,224,169 bytes |
| Preview certificate SHA-256 | `4739355dd79808984bff922da97ba2a5d3bec4e06be67987daab9b14bdce4ea0` |
| Build | Temurin JDK 21.0.13, Gradle 8.14.3, AGP 8.13.0. Debug and optimized R8 releaseCheck passed. |
| APK inspection | Signature v2, 16K alignment, package, version, portrait, disabled app/WebView debugging, exact release web payload and intact storage bridge. |

Local verification includes 68 tests, all three Chromium scenarios, content/model checks, release sync and exact APK inspection. See `evidence/e2/` for the reports and English UI frames. [CI run 44476862913](https://github.com/DanilaH/crossmath-game/actions/runs/44476862913) stopped before client checks at the private-kit access requirement. Device installation, TalkBack and OS font testing remain pending.

KIT IMPACT is REUSE of the pinned DurableReceiptQueue and activity coordinator. The kit's request-based interstitial gate measures a different event from Crossmath's impression-based spacing.
