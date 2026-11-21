import type { Save } from '../app/model';
import { canResumeDaily, dailyArchiveStart } from './calendar';

/** Expired slots cannot reopen unless they still have a playable layout. Keep the active result intact. */
export function compactDailyArchive(save: Save): boolean {
  const {createdAt,timeZone} = save.profile;
  const {inactive,effectiveDay} = save.meta;
  const first = dailyArchiveStart(createdAt,timeZone,effectiveDay);
  let changed = false;
  for (const [key,{attempt,result}] of Object.entries(inactive)) {
    if (attempt.mode !== 'daily' || !attempt.dayKey || attempt.dayKey >= first || canResumeDaily(attempt)) continue;
    if (result) (save.meta.archivedDailyResults ??= {})[attempt.dayKey] = result;
    delete inactive[key];
    changed = true;
  }
  return changed;
}
