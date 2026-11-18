# Crossmath handoff

1. Read `AGENTS.md`, `STATUS.md`, `PROJECT_DECISIONS.md`, `ROADMAP.md`, then the acceptance protocol. Owner specification 1.0 and delivered product JSON are the source of truth.
2. Current work is the A–C vertical slice on `feat/vertical-slice-20261118`. Preserve it when switching branches; check actual remote HEAD before continuing. Do not use the repository's original empty state as a fresh start.
3. Tests/builds: `npm run check`, `npm run content:verify`, `npm run android:sync:release`, `npm run test:browser`. Pinned kit doctor: `node <verified-kit>/tools/bootstrap/doctor-game-guidance.mjs . --strict`.
4. `src/core` owns pure commands; `src/content` owns strict import and independent search; `src/help/logic.ts` must not import author answers; only `src/help/reveal.ts` reads them. `src/app/model.ts` settles progress; `saveRepository.ts` controls atomic root/backup/recovery; `session.ts` is the session writer; `src/ui` owns input/presentation. Native bridge remains generated baseline.
5. All numbers come from delivered config. Do not change hint cost, use authored trace as a runtime hint oracle, add a hidden director, freeze correct equations or conflate duplicate values with duplicate physical instances.
6. Native preview and production signing are different. Never commit private keys. `KIT_READ_TOKEN` is required for CI read access to the private kit; local Git/proxy access does not establish CI access. Production certificate remains unset.
7. See `ACCEPTANCE_2026-11-18.md` for exact tested scope/artifact and untested device behavior. A–C cannot be called owner-accepted solely from test/build success. Next product implementation is D (meta/calendar), then E/F, keeping the first phone slice reviewable.
