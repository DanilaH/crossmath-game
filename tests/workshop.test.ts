import { describe, expect, test } from 'vitest';
import { workshopBeats, workshopTarget } from '../src/meta/workshopProgress';

describe('workshop receipt presentation', () => {
  test('uses the interval since the last awarded fragment', () => {
    expect(workshopTarget(15,5)).toMatchObject({index:1, part:2, percent:40, remaining:3});
    expect(workshopBeats({from:15,to:16},5,0)).toMatchObject([{index:1,part:2,percent:60}]);
    expect(workshopTarget(17,5)?.percent).toBe(80);
    expect(workshopBeats({from:17,to:18},6,1)).toMatchObject([{index:1,part:2,percent:100}]);
    expect(workshopTarget(18,6)).toMatchObject({index:1,part:3,percent:0,remaining:5});
  });

  test('carries only the remaining steps into the next interval', () => {
    expect(workshopBeats({from:17,to:24},7,2)).toMatchObject([
      {index:1,part:2,percent:100},
      {index:1,part:3,percent:100},
      {index:1,part:4,percent:20},
    ]);
    expect(workshopBeats({from:2,to:5},2,2)).toMatchObject([
      {index:0,part:1,percent:100},
      {index:0,part:2,percent:100},
      {index:0,part:3,percent:50},
    ]);
    expect(workshopBeats({from:27,to:29},8,1)).toMatchObject([
      {index:1,part:4,percent:100},
      {index:2,part:1,percent:20},
    ]);
    expect(workshopBeats({from:227,to:228},48,1)).toMatchObject([{index:11,part:4,percent:100}]);
    expect(workshopTarget(228,48)).toBeUndefined();
  });

  test('uses credited fragments to respect migrated collections', () => {
    expect(workshopBeats({from:2,to:3},4,0)).toMatchObject([{index:1,part:1,percent:0}]);
    expect(workshopBeats({from:18,to:18},6,0)).toMatchObject([{index:1,part:3,percent:0}]);
  });
});
