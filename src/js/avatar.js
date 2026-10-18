/* avatar.js: Bourla, drawn as pixel maps plus procedural face features so she can look, blink, wink and wave. */
const Avatar = (() => {
  const P = {
    o: '#22141f', // ink
    s: '#ffe4d6', S: '#f4c2ad', d: '#d98f7a', b: '#ff9db4',
    h: '#1c1315', H: '#2e2023', i: '#46323a', I: '#6a5560',   // near-black brown
    B: '#4a2a1c',
    T: '#2f4c9c', t: '#22397a', Y: '#4a6cc4', w: '#ffffff',   // navy stripe
    U: '#a9c9ff', u: '#86a8ea',                               // sky stripe
    J: '#2b3f7e', j: '#1e2c5e', K: '#3a2a52', L: '#45609f',   // dark indigo flares
    g: '#8ff5ff', G: '#ffe58a',
    P: '#ff7fc4', x: '#e4dcf2',
    c: '#7fe3ff', C: '#3fb4e8', // butterfly clip blue
    m: '#ffd84f', M: '#e8a92c', // butterfly clip yellow
    k: '#2a1a2a', // choker
  };

  // 17 x 18 head. Face area left blank (skin) for procedural features.
  const HEAD = [
    '.....ooooooo.....',
    '...ooHHHHHHHoo...',
    '..oHHHHiiiHHHHo..',
    '.oHHHiIIIIIiHHHo.',
    '.oHHiIIiiiIIiHHo.',
    'oHHHHHHHHHHHHHHHo',
    'oHHhHHHHHHHHHhHHo',
    'oHHHHsHHHsHHsHHHo',
    'oHHHsssssssssHHHo',
    'oHHHsssssssssHHHo',
    'oHHHsssssssssHHHo',
    'oHHhsssssssssHHHo',
    'oHHsssssssssssHHo',
    'oHHsssssssssssHHo',
    'oHHsssssssssssHHo',
    'oHHSsssssssssSHHo',
    'oHHoSsssssssSoHHo',
    'oHHHooSsssSooHHHo',
  ];

  // 21 wide body, starts at y = 18 (neck)
  const BODY = [
    '........oSSSo........',
    '......oooSSSooo......',
    '...oYYYYosssoYYYYo...',
    '..oTTTTTTosoTTTTTTo..',
    '..oTTtTTTToTTTTtTTo..',
    '..ottoTTTwTwTTTotto..',
    '..ossoTTTwwwTTTosso..',
    '..osSotTTTwTTTtoSso..',
    '..osSotTTTTTTTtoSso..',
    '..osSotttttttttoSso..',
    '..osSoosssssssooSso..',
    '..osSoKgKgKgKgKoSso..',
    '...ossJJJJJJJJJsso...',
    '...oSsJJJJjJJJJsSo...',
    '...oLLLJJJjJJJLLLo...',
    '...ojjjjjjojjjjjjo...',
    '....oJJJJo.oJJJJo....',
    '....oJJJjo.ojJJJo....',
    '....oLJJjo.ojJJLo....',
    '....oJJJjo.ojJJJo....',
    '...oJJJJjo.ojJJJJo...',
    '...oJJJJjo.ojJJJJo...',
    '..oJJJJJjo.ojJJJJJo..',
    '..ojjjjjjo.ojjjjjjo..',
    '..owwwwwxo.oxwwwwwo..',
    '..owwwwwwo.owwwwwwo..',
    '..oPPPPPPo.oPPPPPPo..',
    '...oooooo...oooooo...',
  ];

  // Long hair falling in front of the shoulders (21 wide, starts y = 16)
  const STRANDS = [
    '..oHH...........HHo..',
    '..oHi...........iHo..',
    '..oHiH.........HiHo..',
    '.oHiHHo.......oHHiHo.',
    '.oHiHho.......ohHiHo.',
    '.oHiHho.......ohHiHo.',
    '.ohiHho.......ohHihо.',
    '.ohIHho.......ohHIho.',
    '.oHiHho.......ohHiHo.',
    '.oHiHho.......ohHiHo.',
    '.ohiHho.......ohHiho.',
    '..ohHho.......ohHho..',
    '..o.ho.........oh.o..',
    '....o...........o....',
  ].map(r => r.replace('о', 'o'));

  // Hair behind body (21 wide, starts y = 14)
  const BACKHAIR = [
    '.oHHHHHHHHHHHHHHHHHo.',
    'oHHHHHHHHHHHHHHHHHHHo',
    'oHHHHHHHHHHHHHHHHHHHo',
    'ohHHHHHHHHHHHHHHHHHho',
    'ohHHHHHHHHHHHHHHHHHho',
    'ohHHHHHHHHHHHHHHHHHho',
    'ohHHHHHHHHHHHHHHHHHho',
    'ohhHHHHHHHHHHHHHHHhho',
    'ohhHHHHHHHHHHHHHHHhho',
    'ohhHHHHHHHHHHHHHHHhho',
    'ohhHHHHHHHHHHHHHHHhho',
    'ohhhHHHHHHHHHHHHHhhho',
    '.ohhHHHHHHHHHHHHHhho.',
    '.oho.ho.......oh.oho.',
    '..o...o.......o...o..',
  ];

  let head, body, strands, backhair;
  const build = () => {
    head = G.fromMap(HEAD, P);
    // striped baby tee: alternate navy / sky rows, drop the old heart print
    const striped = BODY.map((r, i) => {
      if (i < 2 || i > 9) return r;
      const sky = i % 2 === 1 && i < 9;
      return r.replace(/w/g, 'T').replace(/T/g, sky ? 'U' : 'T').replace(/t/g, sky ? 'u' : 't').replace(/Y/g, i === 2 ? 'U' : 'Y');
    });
    body = G.fromMap(striped, P);
    strands = G.fromMap(STRANDS, P);
    backhair = G.fromMap(BACKHAIR, P);
  };

  // Butterfly hair clip, 5x4
  const clip = (x, X, Y, a, b) => {
    G.px(x, X, Y, a); G.px(x, X + 1, Y, a); G.px(x, X + 3, Y, a); G.px(x, X + 4, Y, a);
    G.px(x, X, Y + 1, b); G.px(x, X + 1, Y + 1, a); G.px(x, X + 2, Y + 1, P.o); G.px(x, X + 3, Y + 1, a); G.px(x, X + 4, Y + 1, b);
    G.px(x, X + 1, Y + 2, b); G.px(x, X + 2, Y + 2, P.o); G.px(x, X + 3, Y + 2, b);
  };

  // Inflatable see-through chair (very 1999)
  const chairBack = (x, ox, oy) => {
    const tube = (X) => {
      const k = ((X % 6) + 6) % 6;
      return k === 0 ? '#6a3fd6' : k === 1 ? '#e4d4ff' : k === 2 ? '#c4a6ff' : k === 5 ? '#8a5cf0' : '#a983ff';
    };
    x.globalAlpha = 0.9;
    G.ellipse(x, ox + 10, oy + 23, 16, 15, '#4b2a99');
    G.ellipse(x, ox + 10, oy + 23, 15, 14, (X) => tube(X + 15));
    // armrests
    for (const cx of [-3, 23]) {
      G.ellipse(x, ox + cx, oy + 32, 6, 8, '#4b2a99');
      G.ellipse(x, ox + cx, oy + 32, 5, 7, (X, Y) => (Y < -4 && X < 0 ? '#e4d4ff' : X === -2 ? '#d2bcff' : X > 3 ? '#8a5cf0' : '#a983ff'));
    }
    // seat cushion
    G.ellipse(x, ox + 10, oy + 39, 16, 5, '#4b2a99');
    G.ellipse(x, ox + 10, oy + 39, 15, 4, (X, Y) => (Y < -1 ? '#c4a6ff' : Y > 2 ? '#7a4de6' : '#a983ff'));
    x.globalAlpha = 1;
    // glossy highlights
    G.px(x, ox - 1, oy + 13, '#ffffff'); G.px(x, ox, oy + 12, '#ffffff'); G.px(x, ox + 1, oy + 11, '#ffffff');
    G.px(x, ox - 6, oy + 27, '#ffffff'); G.px(x, ox - 6, oy + 28, '#ffffff');
  };

  // state: {lx, ly, blink, wink, mouth, wave, waveT, bob, sparkle}
  const draw = (x, ox, oy, st) => {
    if (!head) build();
    const bob = st.bob | 0;
    chairBack(x, ox, oy);
    x.drawImage(backhair, ox, oy + 14 + bob);
    x.drawImage(body, ox, oy + 18 + bob * 0); // legs don't bob
    // re-draw upper body with bob (torso breathes)
    if (bob) x.drawImage(body, 0, 0, 21, 12, ox, oy + 18 + bob, 21, 12);

    // choker
    G.rect(x, ox + 9, oy + 19 + bob, 3, 1, P.k);
    G.px(x, ox + 10, oy + 20 + bob, P.G);

    // waving arm replaces right hand on lap
    if (st.wave) {
      G.rect(x, ox + 15, oy + 30, 2, 2, P.J); G.px(x, ox + 15, oy + 30, P.L);
      G.px(x, ox + 17, oy + 30, P.o); G.px(x, ox + 17, oy + 31, P.o);
      G.rect(x, ox + 16, oy + 24 + bob, 2, 6, P.T); G.px(x, ox + 16, oy + 27 + bob, P.t);
    }

    const hx = ox + 2, hy = oy + (st.ly < -0.4 ? -1 : 0) + bob;
    x.drawImage(head, hx, hy);
    features(x, hx, hy, st);
    clip(x, hx + 1, hy + 4, P.c, P.C);
    clip(x, hx + 11, hy + 3, P.m, P.M);
    x.drawImage(strands, ox, oy + 16 + bob);
    G.px(x, hx + 15, hy + 14, '#e8eef8'); // tiny silver earring

    if (st.wave) waveArm(x, ox, oy + bob, st.waveT || 0);
  };

  const features = (x, hx, hy, st) => {
    const fx = hx + (st.lx > 0.35 ? 1 : st.lx < -0.35 ? -1 : 0);
    const fy = hy + (st.ly > 0.45 ? 1 : 0);
    // brows (soft, arched)
    G.rect(x, fx + 4, fy + 9, 2, 1, '#3a2626'); G.rect(x, fx + 11, fy + 9, 2, 1, '#3a2626');
    const eye = (ex, closed, happy, left) => {
      if (happy) { // ^ wink
        G.px(x, ex - 1, fy + 13, P.o); G.px(x, ex, fy + 12, P.o); G.px(x, ex + 1, fy + 12, P.o); G.px(x, ex + 2, fy + 13, P.o);
        return;
      }
      if (closed) { G.rect(x, ex - 1, fy + 13, 4, 1, P.o); return; }
      G.rect(x, ex, fy + 11, 2, 1, P.o);                // lashes
      const wx = left ? ex - 1 : ex + 2;
      G.px(x, wx, fy + 11, P.o); G.px(x, left ? wx - 1 : wx + 1, fy + 10, P.o); // flick
      G.rect(x, ex, fy + 12, 2, 2, P.o);
      G.px(x, left ? ex + 1 : ex, fy + 12, P.w);
      G.px(x, ex, fy + 13, '#5a2e1e'); G.px(x, ex + 1, fy + 13, '#8c5434');
    };
    eye(fx + 5, st.blink, false, true);
    eye(fx + 10, st.blink && !st.wink, st.wink, false);
    // blush
    const bl = st.wink ? '#ff7fa2' : P.b;
    G.rect(x, fx + 3, fy + 14, 2, 1, bl); G.rect(x, fx + 12, fy + 14, 2, 1, bl);
    // nose + nostril piercing
    G.px(x, fx + 8, fy + 14, P.d);
    G.px(x, fx + 9, fy + 14, st.sparkle ? '#ffffff' : '#fff1b8');
    // mouth
    const m = st.mouth || 'smile', my = fy + 15;
    if (m === 'smile') { G.rect(x, fx + 7, my, 3, 1, '#d9506f'); G.px(x, fx + 8, my + 1, '#ffa3b8'); }
    else if (m === 'open') { G.rect(x, fx + 7, my, 3, 2, '#7a2a3a'); G.px(x, fx + 8, my + 1, '#ff8aa0'); }
    else if (m === 'o') { G.px(x, fx + 8, my, '#7a2a3a'); G.px(x, fx + 8, my + 1, '#c24a66'); }
    else if (m === 'grin') { G.rect(x, fx + 6, my, 5, 1, '#7a2a3a'); G.rect(x, fx + 7, my, 3, 1, '#ffffff'); G.rect(x, fx + 7, my + 1, 3, 1, '#ff8aa0'); }
  };

  const waveArm = (x, ox, oy, t) => {
    const a = 0.35 + Math.sin(t * 9) * 0.32;
    const sx = ox + 17, sy = oy + 23, len = 8;
    const hx = sx + Math.sin(a) * len, hy = sy - Math.cos(a) * len;
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      const X = Math.round(sx + (hx - sx) * k / steps), Y = Math.round(sy + (hy - sy) * k / steps);
      G.rect(x, X - 1, Y - 1, 4, 3, P.o);
    }
    for (let k = 0; k <= steps; k++) {
      const X = Math.round(sx + (hx - sx) * k / steps), Y = Math.round(sy + (hy - sy) * k / steps);
      G.rect(x, X, Y, 2, 1, k < 3 ? P.T : P.s);
    }
    const HX = Math.round(hx), HY = Math.round(hy);
    G.rect(x, HX - 1, HY - 4, 4, 5, P.o);
    G.rect(x, HX - 2, HY - 3, 1, 2, P.o);
    G.rect(x, HX, HY - 3, 2, 3, P.s);
    G.px(x, HX - 1, HY - 2, P.s);
    G.px(x, HX + 1, HY - 1, P.S);
  };

  return { draw, W: 21, H: 46, palette: P };
})();
