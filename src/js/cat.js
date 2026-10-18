/* cat.js: Limoo, a grey-blue British Shorthair with white bib and paws, loafing on the rug. */
const Cat = (() => {
  const C = {
    o: '#2f2a40', g: '#b7bcc6', G: '#8f95a2', D: '#5f6472', l: '#d4d8e0', L: '#e6e9ef',
    w: '#f7f6fb', W: '#d9dae8', e: '#d6b444', E: '#f2dc7c', p: '#2f2a40', n: '#ff9fb4', i: '#f5a9bb',
  };
  const [buf, bx] = G.canvas(34, 24);

  // st: {awake (0..1), breathe (0|1), tail (rad), blink, look (-1..1), ear (0|1)}
  const render = (st) => {
    bx.clearRect(0, 0, 34, 24);
    const ox = 1, oy = 2 - (st.awake > 0.5 ? 1 : 0);
    const br = st.breathe ? 1 : 0;

    // tail: curls around the front of the body, tip sways
    const tailPts = [];
    for (let k = 0; k <= 14; k++) {
      const a = k / 14;
      const tx = 27 - a * 18 + Math.sin(a * 3.1) * 2;
      const ty = 16 + Math.sin(a * Math.PI) * 3 + (a > 0.7 ? Math.sin(st.tail) * (a - 0.7) * 10 : 0);
      tailPts.push([ox + tx, oy + ty]);
    }

    // body loaf + haunch
    G.ellipse(bx, ox + 17, oy + 13 - br, 11, 6 + br, (X, Y) => (Y > 3 ? C.G : Y < -4 ? C.l : C.g));
    G.ellipse(bx, ox + 24, oy + 12 - br, 6, 6, (X, Y) => (Y > 3 ? C.G : Y < -3 && X < 1 ? C.l : C.g));
    // subtle fur stripes on back
    // silver tabby stripes
    for (const sx of [13, 16, 19, 22, 25]) { G.rect(bx, ox + sx, oy + 8 - br, 1, 4, C.D); G.px(bx, ox + sx + 1, oy + 12 - br, C.D); }

    // tail
    for (let k = 0; k < tailPts.length; k++) {
      const [tx, ty] = tailPts[k];
      G.rect(bx, Math.round(tx), Math.round(ty), 2, 2, k > 11 ? C.D : C.G);
      if (k < 12) G.px(bx, Math.round(tx), Math.round(ty), C.g);
    }

    // white paws peeking out front
    G.rect(bx, ox + 5, oy + 18, 3, 2, C.w); G.rect(bx, ox + 9, oy + 18, 3, 2, C.w);
    G.px(bx, ox + 6, oy + 19, C.W); G.px(bx, ox + 10, oy + 19, C.W);

    // head (round, chubby cheeks), facing viewer
    const hx = ox + 8 + (st.look > 0.4 ? 1 : st.look < -0.4 ? -1 : 0), hy = oy + 9;
    // ears
    const ear = st.ear ? 1 : 0;
    G.poly(bx, [[hx - 6, hy - 3], [hx - 5, hy - 8 + ear], [hx - 2, hy - 5]], C.g);
    G.poly(bx, [[hx + 6, hy - 3], [hx + 5, hy - 8], [hx + 2, hy - 5]], C.g);
    G.px(bx, hx - 5, hy - 5 + ear, C.i); G.px(bx, hx + 4, hy - 5, C.i);
    G.ellipse(bx, hx, hy, 7, 5, (X, Y) => (Y < -3 ? C.l : Y > 3 ? C.G : C.g));
    // tabby "M" on the forehead + cheek stripes
    G.px(bx, hx - 2, hy - 3, C.D); G.px(bx, hx - 1, hy - 2, C.D); G.px(bx, hx, hy - 3, C.D); G.px(bx, hx + 1, hy - 2, C.D); G.px(bx, hx + 2, hy - 3, C.D);
    G.px(bx, hx, hy - 4, C.D);
    G.px(bx, hx - 6, hy + 1, C.D); G.px(bx, hx + 6, hy + 1, C.D);
    // white bib + muzzle
    G.ellipse(bx, hx, hy + 6, 3, 2, C.w);
    G.ellipse(bx, hx, hy + 2, 2, 1, C.w);
    G.px(bx, hx - 3, hy + 2, C.L); G.px(bx, hx + 3, hy + 2, C.L);
    // eyes (copper, classic BSH)
    if (st.awake > 0.5 && !st.blink) {
      for (const ex of [hx - 3, hx + 2]) {
        G.rect(bx, ex, hy - 1, 2, 2, C.e); G.px(bx, ex + 1, hy - 1, C.E);
        G.px(bx, ex + (st.look > 0.2 ? 1 : 0), hy, C.p);
      }
    } else {
      G.rect(bx, hx - 3, hy, 2, 1, C.o); G.rect(bx, hx + 2, hy, 2, 1, C.o);
    }
    // nose + mouth
    G.px(bx, hx, hy + 1, C.n);
    G.px(bx, hx - 1, hy + 3, C.D); G.px(bx, hx + 1, hy + 3, C.D);
    const out = G.outline(buf, C.o), ox2 = out.getContext('2d');
    // whiskers drawn after the outline so they stay hair-thin
    for (const [a, b] of [[-8, 2], [-9, 0], [8, 2], [9, 0]]) G.px(ox2, hx + a + 1, hy + b + 1, C.L);
    return out;
  };
  return { render, W: 36, H: 26 };
})();
