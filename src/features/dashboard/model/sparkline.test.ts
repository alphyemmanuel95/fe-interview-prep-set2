import { describe, expect, it } from 'vitest';
import { toSparklinePoints } from './sparkline';

describe('toSparklinePoints', () => {
  it('returns no points for an empty series', () => {
    expect(toSparklinePoints([], 100, 40)).toEqual([]);
  });

  it('spreads values across the width with the maximum at the top', () => {
    expect(toSparklinePoints([10, 30, 20], 100, 40)).toEqual([
      { x: 0, y: 40 },
      { x: 50, y: 0 },
      { x: 100, y: 20 },
    ]);
  });

  it('draws a flat series through the middle', () => {
    expect(toSparklinePoints([5, 5], 100, 40)).toEqual([
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]);
  });
});
