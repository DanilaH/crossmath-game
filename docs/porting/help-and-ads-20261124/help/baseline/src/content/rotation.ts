export const rotations = {
  relax: ['easy-short', 'easy-long', 'normal-short', 'easy-short', 'easy-long', 'normal-long'],
  challenge: ['hard-short', 'hard-short', 'expert-short', 'hard-short', 'hard-short', 'hell-short'],
} as const;
export type FreeTrack = keyof typeof rotations;
export type Bucket = typeof rotations[FreeTrack][number] | 'daily';
export type ContentVersion = 'content-v1' | 'content-v2';
export const challengeUnlockWins = 15;
export const freeTracks = Object.keys(rotations) as FreeTrack[];
export const isFreeTrack = (value: unknown): value is FreeTrack => value === 'relax' || value === 'challenge';
export const buckets: readonly Bucket[] = [...new Set(Object.values(rotations).flat()), 'daily'];

export function bucketTurn(track: FreeTrack, index: number): { bucket: Bucket; turn: number } {
  const sequence = rotations[track];
  const position = index % sequence.length;
  const bucket = sequence[position]!;
  const copies = sequence.filter(entry => entry === bucket).length;
  const preceding = sequence.slice(0, position).filter(entry => entry === bucket).length;
  return {bucket, turn: Math.floor(index / sequence.length) * copies + preceding};
}

const primes = [383, 571, 677, 269, 347, 499, 673, 761, 809, 877];
export function bankIndex(turn: number, size: number): number {
  if (turn < size) return turn;
  const pass = Math.floor(turn / size);
  const stride = primes[(pass - 1) % primes.length]!;
  // The bank sizes are below every prime. Each pass visits every index once.
  return ((turn % size) * stride) % size;
}
