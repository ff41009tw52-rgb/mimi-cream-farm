export function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

export function area(points) {
  return points.reduce((total, p, i) => {
    const q = points[(i + 1) % points.length];
    return total + p[0] * q[1] - p[1] * q[0];
  }, 0) / 2;
}

export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function project(m, [x, y]) {
  const z = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / z, (m[3] * x + m[4] * y + m[5]) / z];
}

export function homography(from, to) {
  // Solve a normalized least-squares system. Four pairs yield an exact mapping.
  const scale = 800;
  const n = 8;
  const matrix = Array.from({length:n}, () => new Float64Array(n + 1));
  function add(row) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= n; j++) matrix[i][j] += row[i] * row[j];
    }
  }
  for (let i = 0; i < from.length; i++) {
    const [x,y] = from[i].map(v => v / scale);
    const [u,v] = to[i].map(v => v / scale);
    add([x,y,1,0,0,0,-x*u,-y*u,u]);
    add([0,0,0,x,y,1,-x*v,-y*v,v]);
  }
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    }
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const div = matrix[i][i];
    if (Math.abs(div) < 1e-15) return null;
    for (let j = i; j <= n; j++) matrix[i][j] /= div;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const factor = matrix[j][i];
      for (let k = i; k <= n; k++) matrix[j][k] -= factor * matrix[i][k];
    }
  }
  const [a,b,c,d,e,f,g,h] = matrix.map(row => row[n]);
  return [a,b,c*scale,d,e,f*scale,g/scale,h/scale,1];
}

export function validQuad(points, width, height, minArea = .07) {
  return points.every(([x,y]) => Number.isFinite(x+y)
    && x >= 0 && x < width && y >= 0 && y < height)
    && area(points) >= width * height * minArea
    && points.every((p,i) => cross(p, points[(i+1)%4], points[(i+2)%4]) > 0);
}

export function convexHull(points) {
  const sorted = points.slice().sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  function half(items) {
    const hull = [];
    for (const p of items) {
      while (hull.length >= 2 && cross(hull.at(-2), hull.at(-1), p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  }
  return half(sorted).concat(half(sorted.reverse()));
}
