# Consolidation · 25.11.2026

Crossmath 0.5.24 / 29; actual developer HEAD `04576ec2239e840176a1a412c06e82aa7b9253cb`, gameplay/artifact source `d37cd305f597d38074929af1fbe3080aeac13549`, runtime kit `b1bf2026eda7dd68a5ccbc883946191e03d235af`, guidance pin `469928d03f4bae5053e23db26e82187bedbc252e`. Independent source inventory `a135147f059c6f6c201c653dc6967c686486579f`: 449 IDs. [Consolidation](RESEARCH_CONSOLIDATION_2026-11-25.md) and [ledger](ADOPTION_LEDGER.json). Historical dated snapshots below are not current directives.

## Reconciliation

Source branch `a135147f059c6f6c201c653dc6967c686486579f` and previous consumer research `e072aacfea5e3dae22d89306c59574dc1cab3e74` contained all 449 IDs. Active developer branch had 333 rows. The research branch diverged from developer work after `73fbc059149aba440297cf4cdc074b98433ad7e5`; a new documentation-only branch on the actual developer HEAD is used rather than merging old research changes into runtime. Historical reports are retained with original blob identities, and shared documents explicitly preserve the developer decisions and acceptance. PR #7/#10 are historical/stacked research packages; do not merge both old and consolidated packages blindly.

- Added 116 mapped IDs to the proposed developer-based ledger; no invented source ID, no missing/orphan/duplicate IDs.
- HELP-02 already implemented, 515/515 Explain in two protocols per [independent compiled audit](https://github.com/DanilaH/mini-games-kit/blob/353328644b5eb172ba938578dcd62ce5230802df/research/games/crossmath/porting/guru-profile-balance-20261125/HELP02_REVIEW.md); physical Android gate remains open. Existing named original strategies remain distinct.
- [Ad cooldown pilot](https://github.com/DanilaH/crossmath-game/blob/04576ec2239e840176a1a412c06e82aa7b9253cb/docs/acceptance/interstitial-cooldown.md), [consumer gate](https://github.com/DanilaH/crossmath-game/blob/04576ec2239e840176a1a412c06e82aa7b9253cb/src/platform/adState.ts), [kit code](https://github.com/DanilaH/mini-games-kit/blob/b1bf2026eda7dd68a5ccbc883946191e03d235af/src/platform/interstitial-gate.ts) inspected. First five wins, 180/120/420/30 active seconds, durable reservation and earned-only extension remain intact. Corrected 5 rows: `guru-ad-protect`, `guru-ad-cd-base-clamp`, `guru-ad-cd-extra-nonnegative`, `guru-ad-cd-zero-reset`, `guru-ad-cd-fallback-hidden`. Only umbrella ad protection becomes IMPLEMENTED_UNVERIFIED/PARTIAL. Four exact original behaviors remain MISSING, not regressions: fixed vs remote base clamp, remote nonnegative parser, zero-reset vs no-op, fallback hidden routing. Owner-deferred rewarded→interstitial fallback stays deferred. No accepted status promotion.
- No product source, assets, tests, dependency pin, save schema or policy changes in this consolidation.

## Verification

Full JSON objects read via GitHub connector; equivalent check of every condition in `tools/verify-reference-porting.py` at methodology `b6e71122134f89ab76498aebd3f38a8cfd0683d5` plus sourceFeatureId equality and comparison vocabulary: 449 / 449, 0 errors. Status distribution: {"IMPLEMENTED_UNVERIFIED":34,"ACCEPTED":17,"ROADMAPPED":5,"RESEARCHED":207,"EVIDENCE_GAP":44,"DEFERRED":142}. Comparison: {"MATCH":27,"PARTIAL":90,"MISSING":295,"UNKNOWN":37}. Python CLI not yet executed on complete local files (no network in local execution environment); retain separate exact-CLI gate. This is inventory coverage, not source exhaustiveness or live original/device acceptance.

## Next source work

AnalyticsCalibration evaluator and event queue/sending/readiness; then remote-config consumer bindings to issuance, ads and offer eligibility. Do not assume server-directed difficulty from b_level. Original 4.17.0/26101374 APKM exists in owner Drive, not yet locally available in this session. If binary execution unavailable, work from archived evidence and label derived hypotheses; no fabricated instruction anchors. Keep GUI 4.18.0 distinct. Full solver catalogue convergence, authoring stuck, active config, IAP/SDK and physical acceptance remain open.

KIT IMPACT: RESEARCH / REUSE; no runtime changes.
