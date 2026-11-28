# MON-01 · request-ID admission recovery

Base: PR #4 `d91b5bf5cb9150d560946bd473c8da6e609dc127`, reviewed product 0.5.26/31. This is a product bridge correction, not a kit runtime upgrade or SDK selection.

The game could save a rewarded request and then never reach native dispatch because `fullscreenOpened` registration failed or hung. An empty native pending-receipt list could not safely close that request. It blocked every later rewarded/interstitial indefinitely.

## Corrected protocol 3

- Native CAD3 journal durably distinguishes preparation from SDK admission. Admission is written **before** provider control. Existing CAD2 unresolved records decode conservatively as admitted/unknown.
- `reconcileReward(request)` checks immutable request ID/profile/kind. Absent or prepared requests receive a persisted cancelled tombstone. A later dispatch/reserve/arm of that ID cannot show.
- Live request profile/kind ownership is validated before any lease is touched; null/reward-less requests cannot target an interstitial lease. A live unopened lease is invalidated on main before its fence is queued on the shared IO executor. `willOpen` uses the same main-thread owner. An admitted record without a live proof stays unknown; no timeout or empty receipt list expires it.
- Native terminal receipts remain available for request reconciliation after ACK. Honest late earned dominates cancellation/failure and is still applied once by the saved game transaction before exact outcome ACK.
- The game reconciles orphan pending requests after startup/refresh, excluding its own current admission. A proved fence retires a hung JS operation and its listener handles. Old work cannot clear a newer fullscreen owner.
- Bridge reply failure after native opening retains the input/audio hold until correlated `fullscreenClosed`. Failure to query native is not dismissal. Ordinary play remains possible after restart with an unknown receipt, while competing ads stay blocked by the pending request.

## Executable evidence

`tests/mon01-admission.test.ts` runs the actual Android JS adapter, AdsController, GameSession and repository against an explicitly scripted native contract. It covers registration rejection/hang, late registration, lost show reply after open, duplicate earned, lost ACK, cold restart before dispatch, fenced late dispatch and lost fence reply/retry. These are **bridge integration tests, not Android SDK execution**.

`tests/ads.test.ts` adds restart cases absent/prepared/armed/earned, unchanged cooldown on non-earned, restored eligibility and stale completion versus a newer owner. Existing receipt, banner, no-fill, first-five and 180/120/420/30 tests remain.

`AdReceiptJournalTest` adds six JVM cases: durable absent fence/restart, prepared versus admitted crash cuts, live unopened proof, failed/ambiguous fence commit, CAD2 migration, profile/kind mismatch. Existing 1100-tombstone, old-Activity, exact ACK and ambiguous IO cases remain.

Physical kill/update, SDK callbacks, real network/no-fill, audio/haptics and live creatives remain **BLOCKED** until device, approved SDK/test units and previous signing key are available. No SDK or mock creative is installed by this change.
