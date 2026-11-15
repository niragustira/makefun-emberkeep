// The road: its length, and where a given distance along it lands. Enemies walk it
// from distance 0 to its end; towers measure range to points on it.
import { PATH_POINTS } from './config.js';

const segments = [];
let totalLength = 0;
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const a = PATH_POINTS[i];
  const b = PATH_POINTS[i + 1];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  segments.push({ a, b, length, start: totalLength });
  totalLength += length;
}

export function pathLength() {
  return totalLength;
}

// The point `distance` along the road, plus the direction of travel there.
export function pointAt(distance) {
  const d = Math.max(0, Math.min(totalLength, distance));
  for (const seg of segments) {
    if (d <= seg.start + seg.length || seg === segments[segments.length - 1]) {
      const t = seg.length === 0 ? 0 : (d - seg.start) / seg.length;
      const x = seg.a.x + (seg.b.x - seg.a.x) * t;
      const y = seg.a.y + (seg.b.y - seg.a.y) * t;
      const len = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1;
      return { x, y, dx: (seg.b.x - seg.a.x) / len, dy: (seg.b.y - seg.a.y) / len };
    }
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  return { x: last.x, y: last.y, dx: 1, dy: 0 };
}

// Shortest distance from a point to the road's centre line (for build validation).
export function distanceToPath(x, y) {
  let best = Infinity;
  for (const seg of segments) {
    const vx = seg.b.x - seg.a.x;
    const vy = seg.b.y - seg.a.y;
    const len2 = vx * vx + vy * vy || 1;
    let t = ((x - seg.a.x) * vx + (y - seg.a.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = seg.a.x + vx * t;
    const py = seg.a.y + vy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}
