export type Point = Readonly<{ x: number; y: number }>;

/** Maps values onto an SVG box: oldest on the left, highest value at the top. */
export function toSparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
): readonly Point[] {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero; draw it along the vertical middle instead.
  const range = max - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: index * step,
    y: range === 0 ? height / 2 : height - ((value - min) / range) * height,
  }));
}
