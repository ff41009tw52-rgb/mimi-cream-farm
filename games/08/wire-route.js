const LEAD = 18;
const EDGE = 8;
const CLEARANCE = 6;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function outgoing(contact, size) {
  const { x, y, dx = 0, dy = 0, box } = contact;
  const axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  const direction = Math.sign(axis === 'x' ? dx : dy);
  if (!direction) return { x, y, axis, direction };

  const boundary = axis === 'x'
    ? direction > 0 ? box?.right : box?.left
    : direction > 0 ? box?.bottom : box?.top;
  const distance = boundary === undefined ? LEAD : Math.max(LEAD, (boundary - contact[axis]) * direction + CLEARANCE);
  const limit = axis === 'x' ? size.width : size.height;
  const coordinate = clamp(contact[axis] + distance * direction, EDGE, limit - EDGE);
  return { x, y, [axis]: coordinate, axis, direction };
}

function simplify(points) {
  const result = [];
  for (const next of points) {
    const last = result.at(-1);
    if (last && next.x === last.x && next.y === last.y) continue;
    const before = result.at(-2);
    if (before && (
      (before.x === last.x && last.x === next.x && (last.y - before.y) * (next.y - last.y) >= 0) ||
      (before.y === last.y && last.y === next.y && (last.x - before.x) * (next.x - last.x) >= 0)
    )) result.pop();
    result.push(next);
  }
  return result;
}

const overlaps = (a, b, low, high) => Math.max(a, b) > low && Math.min(a, b) < high;
function crosses(a, b, box) {
  if (a.x === b.x) return a.x > box.left && a.x < box.right && overlaps(a.y, b.y, box.top, box.bottom);
  return a.y > box.top && a.y < box.bottom && overlaps(a.x, b.x, box.left, box.right);
}

function candidate(a, b, start, end, axis, track, obstacles) {
  const firstCorner = { x: start.x, y: start.y, [axis]: track };
  const lastCorner = { x: end.x, y: end.y, [axis]: track };
  const middle = simplify([start, firstCorner, lastCorner, end]);
  let blocked = 0;
  for (let i = 1; i < middle.length; i += 1) {
    for (const box of obstacles) {
      if (crosses(middle[i - 1], middle[i], box)) blocked += 1;
    }
  }
  const reverse = (lead, next) => next && (next[lead.axis] - lead[lead.axis]) * lead.direction < 0;
  if (reverse(start, middle[1])) blocked += 1;
  if (reverse(end, middle.at(-2))) blocked += 1;

  const points = simplify([a, ...middle, b]);
  const length = points.slice(1).reduce((sum, point, i) =>
    sum + Math.abs(point.x - points[i].x) + Math.abs(point.y - points[i].y), 0);
  const span = Math.abs(firstCorner.x - lastCorner.x) + Math.abs(firstCorner.y - lastCorner.y);
  return {
    points, axis, track, blocked,
    score: length + points.length * 16 + (span < 12 ? 80 : 0),
    handle: { x: (firstCorner.x + lastCorner.x) / 2, y: (firstCorner.y + lastCorner.y) / 2 }
  };
}

export function routeWire(a, b, size, obstacles = [], adjustment = null) {
  const start = outgoing(a, size);
  const end = outgoing(b, size);
  let best = null;
  let lowest = Infinity;
  for (const axis of adjustment ? [adjustment.axis] : ['x', 'y']) {
    const limit = axis === 'x' ? size.width : size.height;
    const target = adjustment?.track ?? (start[axis] + end[axis]) / 2;
    const tracks = new Set([target, start[axis], end[axis], EDGE, limit - EDGE]);
    for (const box of obstacles) {
      tracks.add((axis === 'x' ? box.left : box.top) - CLEARANCE);
      tracks.add((axis === 'x' ? box.right : box.bottom) + CLEARANCE);
    }
    for (const value of tracks) {
      const track = clamp(value, EDGE, limit - EDGE);
      const route = candidate(a, b, start, end, axis, track, obstacles);
      const distance = Math.abs(track - target);
      const score = route.blocked * 1e6 + (adjustment ? distance * 1000 : 0) + route.score + distance * 0.12;
      if (score < lowest) {
        lowest = score;
        best = route;
      }
    }
  }
  return best;
}

export function distanceToWire(point, points) {
  let distance = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const x = clamp(point.x, Math.min(a.x, b.x), Math.max(a.x, b.x));
    const y = clamp(point.y, Math.min(a.y, b.y), Math.max(a.y, b.y));
    distance = Math.min(distance, Math.hypot(point.x - x, point.y - y));
  }
  return distance;
}
