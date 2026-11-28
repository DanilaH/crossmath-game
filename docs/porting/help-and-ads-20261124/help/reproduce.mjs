// Executes the pinned, unchanged current Help implementation. It does not implement the proposed feature.
import './loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('./', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const manifest = JSON.parse(read('baseline/MANIFEST.json'));
for (const entry of manifest) {
  const bytes = read('baseline/' + entry.path);
  const hash = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  assert.equal(hash, entry.git_blob_sha, 'Git blob mismatch: ' + entry.path);
}
const { explain, verifyExplanation, visiblePlacements } = await import('./baseline/src/help/logic.ts');
const { createAttempt, applyCommand } = await import('./baseline/src/core/engine.ts');
const { assertInventory } = await import('./baseline/src/core/types.ts');
const { parsePuzzle, countSolutions } = await import('./baseline/src/content/validator.ts');
const input = JSON.parse(read('CASES.json'));
const results = [];
for (const item of input.cases) {
  const puzzle = parsePuzzle(structuredClone(input.puzzles[item.puzzle]));
  let attempt = createAttempt(puzzle, 'research:' + item.id, item.mode);
  for (const [index, placement] of item.placements.entries()) {
    const transition = applyCommand(puzzle, attempt, {type: 'PlaceFromTray', ...placement, commandId: item.id + ':' + index, expectedRevision: attempt.boardRevision});
    assert.equal(transition.outcome, 'applied');
    attempt = transition.state;
  }
  assertInventory(puzzle, attempt);
  const before = JSON.stringify(attempt);
  const compatibility = countSolutions(puzzle, item.budget, visiblePlacements(puzzle, attempt));
  const plan = explain(puzzle, attempt, item.budget);
  const summary = plan ? {rule: plan.rule, assignments: plan.assignments} : null;
  assert.deepEqual(compatibility, item.expectedCompatibility, item.id + ': compatibility');
  assert.deepEqual(summary, item.expectedBaselinePlan, item.id + ': current plan');
  assert.equal(JSON.stringify(attempt), before, item.id + ': preparation mutated attempt');
  const verified = plan ? verifyExplanation(puzzle, attempt, plan) : null;
  if (plan) assert.equal(verified, true, item.id + ': existing proof failed');
  results.push({id:item.id, attemptStatus:attempt.status, compatibility, currentPlan:summary, verified, attemptUnchanged:true, futureOutcome:item.expectedFutureOutcome, futurePhase:item.expectedPhase ?? null, futureUiProjection:item.expectedUiProjection});
}
process.stdout.write(JSON.stringify({schema:'crossmath-help-baseline-reproduction-v1',status:'PASS',node:process.version,baselineCommit:input.baselineCommit,verifiedGitBlobs:manifest.length,cases:results.length,futureContractImplemented:false,results}, null, 2) + '\n');
