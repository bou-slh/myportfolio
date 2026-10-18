/* gfx.js: tiny pixel-art toolkit. Everything draws on integer pixels, no anti-aliasing. */
const G = (() => {
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  };

  const rect = (x, px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px | 0, py | 0, w | 0, h | 0); };
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X | 0, Y | 0, 1, 1); };

  // Bresenham line
  const line = (x, x0, y0, x1, y1, col) => {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    x.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      x.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };

  // Scanline polygon fill sampled at pixel centres (crisp edges).
  const poly = (x, pts, col) => {
    x.fillStyle = typeof col === 'string' ? col : '#f0f';
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const cy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) {
          xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const s = Math.round(xs[i]), e = Math.round(xs[i + 1]);
        if (typeof col === 'function') { for (let X = s; X < e; X++) { x.fillStyle = col(X, y); x.fillRect(X, y, 1, 1); } }
        else if (e > s) x.fillRect(s, y, e - s, 1);
      }
    }
  };

  // Filled ellipse, optional per-pixel colour function
  const ellipse = (x, cx, cy, rx, ry, col) => {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
      if (typeof col === 'function') {
        for (let X = -half; X <= half; X++) { const c = col(X, y, half); if (c) { x.fillStyle = c; x.fillRect(cx + X, cy + y, 1, 1); } }
      } else { x.fillStyle = col; x.fillRect(cx - half, cy + y, half * 2 + 1, 1); }
    }
  };

  // Build a canvas from rows of characters + palette. '.' and ' ' are transparent.
  const fromMap = (rows, pal) => {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const [c, x] = canvas(w, h);
    rows.forEach((r, Y) => {
      for (let X = 0; X < r.length; X++) {
        const ch = r[X];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) { console.warn('missing palette', ch); continue; }
        x.fillStyle = col; x.fillRect(X, Y, 1, 1);
      }
    });
    return c;
  };

  // 1px outline around opaque pixels (returns canvas padded by 1 on each side)
  const outline = (src, col, diagonal = false) => {
    const w = src.width, h = src.height;
    const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    const [c, x] = canvas(w + 2, h + 2);
    const a = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && sd[(Y * w + X) * 4 + 3] > 20;
    x.fillStyle = col;
    for (let Y = -1; Y <= h; Y++) for (let X = -1; X <= w; X++) {
      if (a(X, Y)) continue;
      if (a(X - 1, Y) || a(X + 1, Y) || a(X, Y - 1) || a(X, Y + 1) ||
        (diagonal && (a(X - 1, Y - 1) || a(X + 1, Y - 1) || a(X - 1, Y + 1) || a(X + 1, Y + 1)))) {
        x.fillRect(X + 1, Y + 1, 1, 1);
      }
    }
    x.drawImage(src, 1, 1);
    return c;
  };

  // Only the outline ring (no sprite) for hover glow
  const ring = (src, col) => {
    const o = outline(src, col, true);
    const x = o.getContext('2d');
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(src, 1, 1);
    x.globalCompositeOperation = 'source-over';
    return o;
  };

  const flipH = (src) => {
    const [c, x] = canvas(src.width, src.height);
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  };

  // Draw sprite with vertical shear per column (for side walls)
  const shear = (x, src, dx, dy, slope) => {
    for (let i = 0; i < src.width; i++) {
      x.drawImage(src, i, 0, 1, src.height, dx + i, Math.round(dy + slope * i), 1, src.height);
    }
  };

  // Seeded RNG so static art is identical every load
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };

  return { canvas, rect, px, line, poly, ellipse, fromMap, outline, ring, flipH, shear, rng, mix };
})();
