export const CHART_COLORS = {
  gold: '#C9A227',
  goldBright: '#E3C052',
  teal: '#3E9C8F',
  tealBright: '#63C2B3',
  rust: '#C06A45',
  rustBright: '#DF8A62',
  steel: '#7E93A0',
  line: '#2B3438',
  text: '#98A29D',
  textStrong: '#F1EFE8',
  surface: '#1A2024',
  bg: '#121619',
};

export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function buildTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const ticks = Array.from({ length: count + 1 }, (_, index) => (max * index) / count);
  return [...new Set(ticks.map((tick) => Math.round(tick)))];
}

export function linePath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

export function areaPath(points: Array<[number, number]>, floorY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last[0].toFixed(2)},${floorY.toFixed(2)} L${first[0].toFixed(2)},${floorY.toFixed(2)} Z`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mixColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
