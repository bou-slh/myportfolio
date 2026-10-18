/* scene.js: Bourla's room. Static shell is baked once; furniture and props are redrawn every frame. */
const Scene = (() => {
  const W = 384, H = 216;
  const VP = { x: 192, y: 64 }, K = 1.55;
  const BX0 = 88, BX1 = 296, BY0 = 36, BY1 = 124;
  const FL = Math.round(VP.x + K * (BX0 - VP.x));       // 31
  const FR = Math.round(VP.x + K * (BX1 - VP.x));       // 353
  const FT = Math.round(VP.y + K * (BY0 - VP.y));       // 21
  const FB = Math.round(VP.y + K * (BY1 - VP.y));       // 157

  const C = {
    ink: '#2b1d4a',
    back: '#cbb8f4', backLt: '#d8c9fa', backDk: '#bea8ef',
    left: '#bba3ee', leftDk: '#a991e4', right: '#ad94e7', rightDk: '#9b80dd',
    cap: '#f7f1ff', capDk: '#e3d6fb', side: '#7a5fc4', sideDk: '#5e46a8',
    flA: '#bde3ff', flB: '#effaff', flSeam: '#9ec8f0',
    slab: '#8fb5ea', slabDk: '#6e8fd0', slabLt: '#b8d6ff',
    wood: '#fff6fb', woodMd: '#f6dcec', woodDk: '#ddb6d6', woodSh: '#b892c4',
    pink: '#ff9fd2', pinkDk: '#e470b0', pinkLt: '#ffd0ea',
    blue: '#7fd0f0', blueDk: '#3f9cc8', blueLt: '#c4f0ff',
    yel: '#ffe27a', mint: '#9ef0c8', red: '#ff6b8a',
    white: '#ffffff', screen: '#1d1840',
  };

  let shell;
  const objs = [];
  const add = (o) => { o.cv = G.canvas(o.w, o.h); objs.push(o); return o; };

  /* ---------- static shell: walls, floor, slab ---------- */
  const depthAt = (s) => (1 - 1 / s) / (1 - 1 / K); // 0 at back wall, 1 at front edge

  const buildShell = () => {
    const [c, x] = G.canvas(W, H);
    // soft shadow under floating room
    for (let i = 0; i < 6; i++) G.ellipse(x, 192, FB + 14, 170 - i * 8, 7 - i, `rgba(40,20,90,${0.05 + i * 0.02})`);

    // back wall with wallpaper: thin stripes + tiny stars
    G.rect(x, BX0, BY0, BX1 - BX0, BY1 - BY0, C.back);
    for (let X = BX0; X < BX1; X++) if ((X - BX0) % 12 === 0) G.rect(x, X, BY0, 1, BY1 - BY0, C.backDk);
    for (let Y = BY0 + 6; Y < BY1 - 10; Y += 12) for (let X = BX0 + 6; X < BX1; X += 12) {
      const off = ((Y - BY0) / 12) % 2 ? 6 : 0, sx = X + off - 6;
      if (sx < BX0 + 2 || sx > BX1 - 3) continue;
      G.px(x, sx, Y, C.backLt); G.px(x, sx - 1, Y, C.backLt); G.px(x, sx + 1, Y, C.backLt); G.px(x, sx, Y - 1, C.backLt); G.px(x, sx, Y + 1, C.backLt);
    }
    // wainscot band + baseboard
    G.rect(x, BX0, BY1 - 14, BX1 - BX0, 1, C.capDk);
    G.rect(x, BX0, BY1 - 13, BX1 - BX0, 13, '#c3aef2');
    for (let X = BX0 + 4; X < BX1; X += 8) G.rect(x, X, BY1 - 11, 1, 9, '#b39ce9');
    G.rect(x, BX0, BY1 - 3, BX1 - BX0, 3, C.cap);
    G.rect(x, BX0, BY1 - 1, BX1 - BX0, 1, C.capDk);

    // side walls (vertical stripes follow perspective)
    const side = (isLeft) => {
      const xFar = isLeft ? BX0 : BX1, xNear = isLeft ? FL : FR;
      const step = isLeft ? -1 : 1;
      for (let X = xFar; X !== xNear + step; X += step) {
        const s = (X - VP.x) / (xFar - VP.x);
        const top = Math.round(VP.y + s * (BY0 - VP.y)), bot = Math.round(VP.y + s * (BY1 - VP.y));
        const d = depthAt(s);
        const stripe = Math.floor(d * 10 * 1.0001) !== Math.floor(depthAt((X - step - VP.x) / (xFar - VP.x)) * 10);
        const base = isLeft ? C.left : C.right;
        G.rect(x, X, top, 1, bot - top, stripe ? (isLeft ? C.leftDk : C.rightDk) : base);
        // wainscot band in perspective
        const wTop = Math.round(VP.y + s * (BY1 - 14 - VP.y));
        G.rect(x, X, wTop, 1, bot - wTop, isLeft ? '#b29be9' : '#a48be1');
        G.px(x, X, wTop, C.capDk);
        G.rect(x, X, bot - Math.max(2, Math.round(3 * s)), 1, Math.max(2, Math.round(3 * s)), C.cap);
      }
    };
    side(true); side(false);
    // wall corner seams
    G.rect(x, BX0, BY0, 1, BY1 - BY0, C.leftDk);
    G.rect(x, BX1 - 1, BY0, 1, BY1 - BY0, C.rightDk);

    // floor: perspective checker
    for (let Y = BY1; Y < FB; Y++) {
      const s = (Y + 0.5 - VP.y) / (BY1 - VP.y);
      const d = depthAt(s);
      const xl = VP.x + s * (BX0 - VP.x), xr = VP.x + s * (BX1 - VP.x);
      for (let X = Math.round(xl); X < Math.round(xr); X++) {
        const u = (X + 0.5 - VP.x) / s + VP.x;
        const tu = Math.floor((u - BX0) / 16), tv = Math.floor(d * 5);
        let col = (tu + tv) % 2 ? C.flA : C.flB;
        if (d < 0.06) col = G.mix(col, '#9fb7e6', 0.35 * (1 - d / 0.06)); // contact shadow at wall
        G.px(x, X, Y, col);
      }
    }
    // slab (floor thickness) + side wall thickness
    G.rect(x, FL - 4, FB, FR - FL + 8, 2, C.slabLt);
    G.rect(x, FL - 4, FB + 2, FR - FL + 8, 6, C.slab);
    G.rect(x, FL - 4, FB + 8, FR - FL + 8, 1, C.slabDk);
    for (const [xa, dir] of [[FL, -1], [FR, 1]]) {
      const x0 = dir < 0 ? xa - 4 : xa;
      G.rect(x, x0, FT, 4, FB - FT, C.side);
      G.rect(x, dir < 0 ? x0 : x0 + 3, FT, 1, FB - FT, C.sideDk);
    }
    // wall top caps
    G.rect(x, BX0, BY0 - 3, BX1 - BX0, 3, C.cap);
    G.rect(x, BX0, BY0 - 1, BX1 - BX0, 1, C.capDk);
    G.poly(x, [[FL - 4, FT - 2], [BX0, BY0 - 3], [BX0, BY0], [FL - 4, FT + 1]], C.cap);
    G.poly(x, [[FR + 4, FT - 2], [BX1, BY0 - 3], [BX1, BY0], [FR + 4, FT + 1]], C.cap);
    G.line(x, FL - 4, FT + 1, BX0, BY0, C.capDk); G.line(x, FR + 4, FT + 1, BX1 - 1, BY0, C.capDk);

    // right wall: sheared pixel Bjork poster (Homogenic-era look: hair loops, neck rings, red kimono)
    const poster2 = (() => {
      const [p, px] = G.canvas(22, 28);
      G.rect(px, 0, 0, 22, 28, C.ink);
      for (let Y = 1; Y < 27; Y++) G.rect(px, 1, Y, 20, 1, G.mix('#e9e3f7', '#a9a4cf', Y / 26));
      for (const [sx, sy] of [[3, 3], [18, 5], [4, 12], [17, 14]]) G.px(px, sx, sy, '#ffffff');
      // red kimono shoulders
      G.poly(px, [[2, 22], [6, 17], [16, 17], [20, 22]], '#b3123a');
      G.rect(px, 6, 18, 10, 1, '#e8405f');
      // stacked gold neck rings
      for (let k = 0; k < 3; k++) G.rect(px, 8, 14 + k, 6, 1, k % 2 ? '#c99a2e' : '#ffd86a');
      // face
      G.ellipse(px, 11, 9, 3, 4, '#fbe7de');
      G.rect(px, 9, 9, 1, 1, '#2a1830'); G.rect(px, 12, 9, 1, 1, '#2a1830');
      G.px(px, 8, 8, '#2a1830'); G.px(px, 13, 8, '#2a1830');
      G.rect(px, 10, 11, 2, 1, '#d2244a');
      G.px(px, 8, 10, '#ffc2c8'); G.px(px, 13, 10, '#ffc2c8');
      // dark hair: centre part + two side loops
      G.rect(px, 8, 4, 6, 2, '#24161d'); G.px(px, 7, 5, '#24161d'); G.px(px, 14, 5, '#24161d');
      G.px(px, 10, 4, '#3e2a33');
      G.ellipse(px, 5, 8, 2, 3, '#24161d'); G.ellipse(px, 17, 8, 2, 3, '#24161d');
      G.px(px, 5, 8, '#c99a2e'); G.px(px, 17, 8, '#c99a2e');
      G.px(px, 4, 6, '#3e2a33'); G.px(px, 16, 6, '#3e2a33');
      // title, with the umlaut dots on the O
      G.rect(px, 1, 22, 20, 5, '#2b1d4a');
      PF.text(px, 'BJORK', 2, 22, '#ffffff');
      G.px(px, 10, 21, '#ff8fd0'); G.px(px, 12, 21, '#ff8fd0');
      return p;
    })();
    G.shear(x, poster2, 308, 54, -0.27);
    // decal butterflies on right wall
    for (const [bx0, by0] of [[336, 44], [340, 66]]) {
      G.px(x, bx0, by0, '#ff9fd2'); G.px(x, bx0 + 2, by0, '#ff9fd2'); G.px(x, bx0 + 1, by0 + 1, C.ink);
      G.px(x, bx0, by0 + 1, '#ffd0ea'); G.px(x, bx0 + 2, by0 + 1, '#ffd0ea');
    }
    shell = c;
  };

  /* ---------- helpers ---------- */
  const isoBox = (x, X, Y, w, h, top, front, sideC) => {
    G.rect(x, X, Y, w, h, C.ink);
    G.rect(x, X + 1, Y + 1, w - 2, 3, top);
    G.rect(x, X + 1, Y + 4, w - 2, h - 5, front);
    if (sideC) G.rect(x, X + w - 3, Y + 4, 2, h - 5, sideC);
  };

  /* ---------- the world state the frame reads ---------- */
  const S = {
    t: 0, hover: null, night: 0, party: 0, istHour: 12, istMin: 0,
    av: { lx: 0, ly: 0, blink: 0, wink: 0, mouth: 'smile', wave: 0, waveT: 0, bob: 0, sparkle: 0 },
    cat: { awake: 0, breathe: 0, tail: 0, blink: 0, look: 0, ear: 0 },
    beat: 0, music: false,
  };

  /* ---------- props ---------- */
  const initObjects = () => {
    // window with live Istanbul view
    add({
      id: 'window', x: 132, y: 42, w: 58, h: 56, z: 1, hot: true,
      draw(x) {
        // the view follows real Istanbul time, not the room lights
        const n = S.sky ?? S.night;
        G.rect(x, 2, 2, 54, 46, C.ink);
        const top = G.mix(G.mix('#7cc8ff', '#ff9ec4', Math.min(1, n * 2) * (n < 0.5 ? 1 : 0) + (n >= 0.5 ? Math.max(0, 1 - (n - 0.5) * 2) : 0)), '#1a1446', Math.max(0, n * 1.4 - 0.4));
        const bot = G.mix(G.mix('#d9f2ff', '#ffd39a', n < 0.5 ? n * 2 : Math.max(0, 2 - n * 2)), '#4a2f86', Math.max(0, n * 1.4 - 0.4));
        for (let Y = 0; Y < 42; Y++) {
          const k = Y / 41;
          for (let X = 0; X < 50; X++) {
            const dither = ((X + Y) % 2) * 0.06 - 0.03;
            G.px(x, 4 + X, 4 + Y, G.mix(top, bot, Math.min(1, Math.max(0, k + dither))));
          }
        }
        // stars / sun / moon
        if (n > 0.55) {
          for (let i = 0; i < 14; i++) {
            const sx = 5 + (i * 37) % 48, sy = 5 + (i * 23) % 18;
            if ((Math.sin(S.t * 2 + i * 1.7) + 1) / 2 > 0.3) G.px(x, sx, sy, '#fff7c8');
          }
          G.ellipse(x, 44, 11, 4, 4, '#fff3b0'); G.ellipse(x, 46, 10, 3, 3, top); // crescent
        } else {
          G.ellipse(x, 42, 12, 4, 4, n > 0.3 ? '#ffb36b' : '#fff1a0');
          G.px(x, 42, 6, '#fff7c8'); G.px(x, 48, 12, '#fff7c8'); G.px(x, 36, 12, '#fff7c8');
        }
        // clouds drifting
        if (n < 0.7) {
          const cx = 4 + ((S.t * 2) % 64) - 10;
          for (const [a, b, r] of [[0, 0, 3], [4, -1, 4], [8, 0, 3]]) G.ellipse(x, Math.round(cx + a), 18 + b, r, 2, n > 0.3 ? '#ffd9ec' : '#ffffff');
        }
        // skyline: hills, mosque with minarets, Galata tower
        const sil = G.mix('#8a7cc8', '#2a1f5e', n), sil2 = G.mix('#a597d8', '#3a2c78', n);
        G.poly(x, [[4, 36], [12, 31], [22, 33], [34, 29], [54, 32], [54, 40], [4, 40]], sil2);
        // mosque
        G.ellipse(x, 17, 30, 5, 4, sil); G.rect(x, 11, 30, 13, 6, sil); G.ellipse(x, 12, 32, 2, 2, sil); G.ellipse(x, 22, 32, 2, 2, sil);
        G.rect(x, 17, 24, 1, 3, sil);
        G.rect(x, 8, 22, 1, 14, sil); G.px(x, 8, 21, sil); G.rect(x, 7, 26, 3, 1, sil);
        G.rect(x, 26, 22, 1, 14, sil); G.px(x, 26, 21, sil); G.rect(x, 25, 26, 3, 1, sil);
        // Galata tower
        G.rect(x, 40, 24, 5, 12, sil); G.rect(x, 39, 27, 7, 1, sil);
        G.poly(x, [[39, 24], [42.5, 17], [46, 24]], sil);
        if (n > 0.5) { G.px(x, 42, 26, '#ffe27a'); G.px(x, 42, 30, '#ffe27a'); G.px(x, 13, 33, '#ffe27a'); G.px(x, 20, 33, '#ffe27a'); G.px(x, 31, 35, '#ffe27a'); G.px(x, 50, 34, '#ffe27a'); }
        // Bosphorus with shimmer + ferry
        const water = G.mix('#6fb6ee', '#22306e', n);
        G.rect(x, 4, 38, 50, 8, water);
        for (let i = 0; i < 9; i++) {
          const wx = 4 + ((i * 11 + Math.floor(S.t * 6) * (i % 2 ? 1 : -1)) % 50 + 50) % 50;
          G.rect(x, wx, 39 + (i % 4) * 2, 2, 1, G.mix('#c7ecff', '#6a7cc8', n));
        }
        const fx = 4 + ((S.t * 3) % 70) - 12;
        if (fx > -8 && fx < 54) {
          const X = Math.round(fx);
          G.rect(x, X, 40, 9, 2, '#ffffff'); G.rect(x, X + 1, 42, 7, 1, '#3a3266');
          G.rect(x, X + 3, 38, 3, 2, '#ffffff'); G.px(x, X + 4, 37, '#e05a5a');
          if (n > 0.5) { G.px(x, X + 2, 40, '#ffe27a'); G.px(x, X + 5, 40, '#ffe27a'); }
        }
        // seagulls
        for (let i = 0; i < 2; i++) {
          const gx = 4 + ((S.t * (5 + i * 2) + i * 30) % 60) - 6, gy = 10 + i * 5 + Math.round(Math.sin(S.t * 2 + i) * 1.5);
          const up = Math.sin(S.t * 8 + i * 2) > 0;
          if (gx > 3 && gx < 51) {
            const X = Math.round(gx);
            G.px(x, X, gy + (up ? 0 : 1), '#ffffff'); G.px(x, X + 1, gy + 1, '#ffffff'); G.px(x, X + 2, gy + (up ? 0 : 1), '#ffffff');
          }
        }
        // window frame
        G.rect(x, 0, 0, 58, 3, C.ink); G.rect(x, 0, 47, 58, 3, C.ink);
        G.rect(x, 1, 1, 56, 2, C.white); G.rect(x, 1, 47, 56, 2, C.white);
        G.rect(x, 1, 1, 3, 48, C.white); G.rect(x, 54, 1, 3, 48, C.white);
        G.rect(x, 28, 3, 2, 45, C.white); G.rect(x, 4, 24, 50, 1, 'rgba(255,255,255,0.6)');
        G.rect(x, 0, 0, 1, 50, C.ink); G.rect(x, 57, 0, 1, 50, C.ink);
        // glass glare
        for (let i = 0; i < 6; i++) G.px(x, 8 + i, 10 - i, 'rgba(255,255,255,0.55)');
        for (let i = 0; i < 4; i++) G.px(x, 33 + i, 9 - i, 'rgba(255,255,255,0.45)');
        // sheer curtains with folds
        const curtain = (X0, dir) => {
          for (let Y = 2; Y < 46; Y++) {
            const wv = Y < 30 ? 6 : 6 - Math.round(Math.sin(((Y - 30) / 16) * Math.PI / 2) * 3);
            for (let k = 0; k < wv; k++) {
              const X = X0 + dir * k;
              const fold = (k + Math.round(Math.sin(Y * 0.5 + S.t * 1.3) * 0.6)) % 3 === 0;
              G.px(x, X, Y, fold ? 'rgba(255,170,215,0.95)' : 'rgba(255,214,236,0.85)');
            }
          }
          G.rect(x, dir > 0 ? X0 : X0 - 5, 30, 6, 2, '#ff8fc7'); // tie-back
        };
        curtain(1, 1); curtain(56, -1);
        // rod
        G.rect(x, -1, 0, 60, 2, '#d6c4f7'); G.px(x, -1, 0, C.pink); G.px(x, 58, 0, C.pink);
        // sill + mini cactus
        G.rect(x, 0, 50, 58, 3, C.ink); G.rect(x, 1, 50, 56, 2, C.cap);
        G.rect(x, 46, 45, 6, 5, '#ff9fd2'); G.rect(x, 46, 45, 6, 1, '#ffd0ea');
        G.rect(x, 48, 39, 2, 6, '#5ac08a'); G.px(x, 47, 41, '#5ac08a'); G.px(x, 50, 42, '#5ac08a'); G.px(x, 49, 38, '#ff7fbf');
      },
    });

    // heart wall clock showing Istanbul time
    add({
      id: 'clock', x: 100, y: 40, w: 19, h: 18, z: 1, hot: true,
      draw(x) {
        const heart = (col, s) => {
          G.ellipse(x, 5, 5, 4 + s, 4 + s, col); G.ellipse(x, 13, 5, 4 + s, 4 + s, col);
          G.poly(x, [[1 - s, 6], [17 + s, 6], [9, 16 + s]], col);
        };
        heart(C.ink, 1); heart(C.pink, 0);
        G.ellipse(x, 9, 7, 4, 4, C.white);
        G.px(x, 9, 3, C.pinkDk); G.px(x, 13, 7, C.pinkDk); G.px(x, 5, 7, C.pinkDk); G.px(x, 9, 11, C.pinkDk);
        const hA = ((S.istHour % 12) + S.istMin / 60) / 12 * Math.PI * 2, mA = S.istMin / 60 * Math.PI * 2;
        G.line(x, 9, 7, 9 + Math.round(Math.sin(hA) * 2), 7 - Math.round(Math.cos(hA) * 2), C.ink);
        G.line(x, 9, 7, 9 + Math.round(Math.sin(mA) * 3.4), 7 - Math.round(Math.cos(mA) * 3.4), C.pinkDk);
        G.px(x, 4, 3, C.pinkLt); G.px(x, 3, 4, C.pinkLt);
      },
    });

    // wall calendar showing today's date in Istanbul
    add({
      id: 'calendar', x: 203, y: 46, w: 22, h: 24, z: 1, hot: true,
      draw(x) {
        G.rect(x, 1, 2, 20, 22, C.ink); G.rect(x, 2, 3, 18, 20, '#ffffff');
        G.rect(x, 2, 3, 18, 7, '#ff8fd0'); G.rect(x, 2, 9, 18, 1, '#e470b0');
        PF.text(x, S.istMon || 'OCT', 11 - Math.floor(PF.width(S.istMon || 'OCT') / 2), 4, '#ffffff');
        const d = String(S.istDay || 18);
        // big day number, 2x scaled 3x5 digits
        const [tc, tx] = G.canvas(8, 5); PF.text(tx, d, 0, 0, '#2b1d4a');
        const wNum = PF.width(d);
        x.drawImage(tc, 0, 0, wNum, 5, 11 - wNum, 11, wNum * 2, 10);
        // binder rings
        for (const rx of [6, 15]) { G.rect(x, rx, 0, 2, 4, C.ink); G.px(x, rx, 1, '#d6dbf0'); }
        // page curl
        G.px(x, 19, 22, '#e3d6fb'); G.px(x, 18, 22, '#e3d6fb'); G.px(x, 19, 21, '#e3d6fb');
      },
    });

    // pinboard with notes on the left wall (opens "notes")
    const boardArt = (() => {
      const [p, q] = G.canvas(30, 30);
      G.rect(q, 0, 0, 30, 30, C.ink); G.rect(q, 1, 1, 28, 28, '#ffd0ea'); G.rect(q, 2, 2, 26, 26, C.ink);
      G.rect(q, 3, 3, 24, 24, '#e2b07e');
      const r = G.rng(3); for (let i = 0; i < 40; i++) G.px(q, 3 + Math.floor(r() * 24), 3 + Math.floor(r() * 24), r() > 0.5 ? '#cf9a66' : '#eec393');
      const note = (X, Y, w, h, c, lines) => {
        G.rect(q, X + 1, Y + 1, w, h, 'rgba(60,30,40,0.35)');
        G.rect(q, X, Y, w, h, c);
        for (let i = 0; i < lines; i++) G.rect(q, X + 1, Y + 3 + i * 2, w - 2 - (i % 2), 1, 'rgba(43,29,74,0.45)');
      };
      note(4, 4, 10, 9, '#fff3a0', 3);                // to-do
      G.rect(q, 16, 4, 9, 11, '#ffffff'); G.rect(q, 17, 5, 7, 7, '#a5e8ff');   // polaroid of Limoo
      G.ellipse(q, 20, 9, 2, 2, '#8e98ab'); G.px(q, 18, 7, '#8e98ab'); G.px(q, 22, 7, '#8e98ab'); G.px(q, 19, 9, '#f2a23c'); G.px(q, 21, 9, '#f2a23c');
      note(4, 15, 10, 8, '#bfe9ff', 2);               // learning
      G.ellipse(q, 20, 20, 2, 1, '#ff6b8a'); G.ellipse(q, 22, 20, 1, 1, '#ff6b8a');  // heart note
      note(16, 17, 9, 8, '#ffd0ea', 0);
      G.px(q, 19, 19, '#ff5f9e'); G.px(q, 21, 19, '#ff5f9e'); G.rect(q, 19, 20, 3, 1, '#ff5f9e'); G.px(q, 20, 21, '#ff5f9e');
      G.rect(q, 6, 24, 16, 3, '#ffffff'); G.rect(q, 7, 25, 6, 1, '#7a6ab0'); G.rect(q, 15, 25, 5, 1, '#ff8fd0'); // ferry ticket
      for (const [X, Y, c] of [[8, 4, '#ff5f9e'], [20, 4, '#5fb8ff'], [8, 15, '#ffe27a'], [20, 17, '#7dff9a'], [13, 24, '#ff5f9e']]) { G.px(q, X, Y, c); G.px(q, X, Y - 1, '#ffffff'); }
      return p;
    })();
    add({
      id: 'board', x: 42, y: 44, w: 32, h: 40, z: 1, hot: true,
      draw(x) { G.shear(x, boardArt, 1, 1, 0.27); },
    });

    // pixel BUCK-TICK poster above monitors: goth singer under a blood moon
    add({
      id: 'poster', x: 240, y: 39, w: 26, h: 31, z: 1,
      draw(x) {
        G.rect(x, 0, 0, 26, 31, C.ink);
        for (let Y = 1; Y < 30; Y++) G.rect(x, 1, Y, 24, 1, G.mix('#0e0812', '#3a0818', Y / 29));
        G.ellipse(x, 13, 9, 8, 8, '#8d0f2e'); G.ellipse(x, 13, 9, 7, 7, '#b5173d');
        G.px(x, 8, 4, '#e8405f'); G.px(x, 9, 3, '#e8405f');
        // black coat with a high collar
        G.poly(x, [[3, 19], [8, 14], [18, 14], [23, 19]], '#050307');
        G.poly(x, [[9, 14], [13, 18], [17, 14]], '#2a2230');
        G.px(x, 13, 16, '#b5173d');
        // pale face
        G.ellipse(x, 13, 10, 3, 4, '#f3ece8');
        G.rect(x, 10, 9, 2, 1, '#120a14'); G.rect(x, 15, 9, 2, 1, '#120a14');
        G.px(x, 11, 8, '#5a1030'); G.px(x, 15, 8, '#5a1030');
        G.rect(x, 12, 12, 3, 1, '#7a0a22');
        // spiky black hair falling past the face
        G.poly(x, [[7, 10], [6, 4], [9, 4], [10, 1], [13, 2], [16, 0], [17, 4], [20, 3], [19, 10], [17, 6], [15, 5], [11, 5], [9, 7]], '#050307');
        G.poly(x, [[9, 6], [5, 16], [9, 12]], '#050307'); G.poly(x, [[17, 6], [21, 16], [17, 12]], '#050307');
        G.poly(x, [[11, 5], [13, 8], [14, 5]], '#050307');
        G.px(x, 12, 3, '#3a2e44'); G.px(x, 15, 4, '#3a2e44');
        // title
        PF.text(x, 'BUCK', 3, 20, '#ffffff');
        G.rect(x, 19, 22, 3, 1, '#e8405f');
        PF.text(x, 'TICK', 8, 25, '#e8405f');
      },
    });

    // bookshelf (English corner)
    add({
      id: 'books', x: 90, y: 58, w: 40, h: 70, z: 2, hot: true,
      draw(x) {
        const sx = 2, sy = 10, sw = 36, sh = 58;
        // "ENGLISH" sign on top + globe + tea
        G.rect(x, sx, sy, sw, sh, C.ink);
        G.rect(x, sx + 1, sy + 1, sw - 2, sh - 2, C.wood);
        G.rect(x, sx + 3, sy + 3, sw - 6, sh - 8, C.woodDk);
        const shelves = [sy + 18, sy + 33, sy + 48];
        for (const Y of shelves) { G.rect(x, sx + 1, Y, sw - 2, 3, C.wood); G.rect(x, sx + 1, Y + 2, sw - 2, 1, C.woodMd); }
        G.rect(x, sx + 1, sy + sh - 4, sw - 2, 3, C.woodMd);
        // books per shelf
        const r = G.rng(7);
        const cols = ['#ff8fc7', '#7fd0f0', '#ffe27a', '#b48cff', '#9ef0c8', '#ff6b8a', '#ffffff', '#5f7fe0'];
        const row = (Y0, Y1, skip) => {
          let X = sx + 4;
          while (X < sx + sw - 5) {
            const bw = 2 + Math.floor(r() * 3), bh = (Y1 - Y0) - Math.floor(r() * 4);
            if (X + bw > sx + sw - 4) break;
            if (skip && X > skip[0] && X < skip[1]) { X++; continue; }
            const col = cols[Math.floor(r() * cols.length)];
            G.rect(x, X, Y1 - bh, bw, bh, col);
            G.rect(x, X, Y1 - bh, 1, bh, G.mix(col, '#ffffff', 0.35));
            G.rect(x, X + bw - 1, Y1 - bh, 1, bh, G.mix(col, '#2b1d4a', 0.25));
            G.rect(x, X, Y1 - bh + 2, bw, 1, G.mix(col, '#2b1d4a', 0.3));
            X += bw;
          }
        };
        row(sy + 4, sy + 18, [sx + 22, sx + 32]);
        row(sy + 21, sy + 33);
        row(sy + 36, sy + 48, [sx + 4, sx + 14]);
        // lying stack + ABC blocks on bottom shelf
        G.rect(x, sx + 4, sy + 46, 10, 2, '#ff6b8a'); G.rect(x, sx + 5, sy + 44, 9, 2, '#7fd0f0'); G.rect(x, sx + 4, sy + 42, 10, 2, '#ffe27a');
        for (let i = 0; i < 2; i++) { G.rect(x, sx + 6 + i * 5, sy + 51, 4, 4, ['#ff9fd2', '#9ef0c8'][i]); PF.text(x, 'AB'[i], sx + 6 + i * 5 + 1, sy + 51, C.ink); }
        G.rect(x, sx + 8, sy + 47, 0, 0, C.ink);
        // tiny red phone box on top shelf
        G.rect(x, sx + 24, sy + 8, 6, 10, '#e8344e'); G.rect(x, sx + 24, sy + 7, 6, 1, '#b8203a');
        G.rect(x, sx + 25, sy + 10, 4, 4, '#ffe9a8'); G.rect(x, sx + 27, sy + 10, 1, 4, '#e8344e'); G.rect(x, sx + 25, sy + 12, 4, 1, '#e8344e');
        // tea cup on top of the shelf
        G.rect(x, sx + 4, sy - 4, 6, 4, C.white); G.rect(x, sx + 10, sy - 3, 1, 2, C.white); G.rect(x, sx + 5, sy - 3, 4, 1, '#c98a5a');
        const st = Math.floor(S.t * 3) % 3;
        G.px(x, sx + 6 + (st === 1 ? 1 : 0), sy - 6, 'rgba(255,255,255,0.8)'); G.px(x, sx + 7 - (st === 2 ? 1 : 0), sy - 8, 'rgba(255,255,255,0.6)');
        // globe
        G.ellipse(x, sx + 28, sy - 6, 4, 4, '#7fd0f0'); G.px(x, sx + 27, sy - 7, '#9ef0c8'); G.rect(x, sx + 29, sy - 5, 2, 2, '#9ef0c8'); G.rect(x, sx + 26, sy - 9, 2, 1, '#9ef0c8');
        G.rect(x, sx + 27, sy - 1, 3, 1, C.woodSh);
        // ENGLISH sign: bold 4x5 letters, ink on white with pink frame
        G.rect(x, sx - 1, sy, sw + 2, 10, C.ink); G.rect(x, sx, sy + 1, sw, 8, '#ff8fd0'); G.rect(x, sx + 1, sy + 2, sw - 2, 6, '#ffffff');
        const BOLD = { E: ['1111', '1000', '1110', '1000', '1111'], N: ['1001', '1101', '1011', '1001', '1001'], G: ['0111', '1000', '1011', '1001', '0111'],
          L: ['1000', '1000', '1000', '1000', '1111'], I: ['111', '010', '010', '010', '111'], S: ['0111', '1000', '0110', '0001', '1110'], H: ['1001', '1001', '1111', '1001', '1001'] };
        let lx = sx + 2;
        for (const ch of 'ENGLISH') {
          const g = BOLD[ch];
          g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') G.px(x, lx + i, sy + 3 + j, '#2b1d4a'); });
          lx += g[0].length + 1;
        }
      },
    });

    // desk with two translucent CRTs, keyboard, tea, flip phone, lava lamp
    add({
      id: 'desk', x: 190, y: 72, w: 108, h: 56, z: 3,
      draw(x) {
        const dy = 28; // desktop y in local
        // legs/back panel
        G.rect(x, 4, dy + 4, 3, 22, C.ink); G.rect(x, 5, dy + 4, 1, 22, C.woodMd);
        G.rect(x, 96, dy + 4, 3, 22, C.ink);
        // drawer unit right
        G.rect(x, 70, dy + 4, 32, 23, C.ink); G.rect(x, 71, dy + 5, 30, 21, C.wood);
        G.rect(x, 71, dy + 15, 30, 1, C.woodDk);
        G.rect(x, 84, dy + 9, 5, 2, C.pink); G.rect(x, 84, dy + 19, 5, 2, C.pink);
        G.rect(x, 71, dy + 5, 30, 1, C.woodMd);
        // stickers on drawer
        G.ellipse(x, 76, dy + 21, 2, 2, '#ffe27a'); G.px(x, 95, dy + 8, C.blue); G.px(x, 96, dy + 9, C.blue); G.px(x, 94, dy + 9, C.blue);
        // desktop
        G.rect(x, 0, dy, 104, 5, C.ink); G.rect(x, 1, dy + 1, 102, 2, C.wood); G.rect(x, 1, dy + 3, 102, 1, C.woodDk);
      },
    });

    const crt = (id, X, Y, body, dark, light, scr) => add({
      id, x: X, y: Y, w: 32, h: 30, z: 4, hot: true, group: 'pc',
      draw(x) {
        // translucent bubble body
        G.rect(x, 2, 0, 28, 26, C.ink); G.rect(x, 1, 1, 30, 24, C.ink); G.rect(x, 3, 26, 26, 1, C.ink);
        G.rect(x, 2, 1, 28, 24, body); G.rect(x, 3, 1, 26, 1, light); G.rect(x, 2, 2, 1, 21, light);
        G.rect(x, 2, 22, 28, 3, dark); G.rect(x, 4, 25, 24, 1, dark);
        for (let i = 0; i < 5; i++) G.px(x, 6 + i * 2, 23, light);
        // white bezel + screen
        G.rect(x, 4, 3, 24, 18, '#eef6ff'); G.rect(x, 5, 4, 22, 16, C.ink); G.rect(x, 6, 5, 20, 14, C.screen);
        scr(x, 6, 5);
        // scanline shimmer
        G.rect(x, 6, 5 + (Math.floor(S.t * 12) % 14), 20, 1, 'rgba(255,255,255,0.07)');
        G.px(x, 7, 6, 'rgba(255,255,255,0.35)'); G.px(x, 8, 6, 'rgba(255,255,255,0.2)');
        // foot
        G.rect(x, 11, 26, 10, 3, C.ink); G.rect(x, 12, 26, 8, 2, dark);
        G.px(x, 27, 23, '#7dff9a');
      },
    });
    const hovPC = () => S.hover === 'pc';
    crt('pc1', 222, 69, '#62c9ee', '#3a98c4', '#b4efff', (x, X, Y) => {
      if (hovPC()) { // folder icon + label
        G.rect(x, X + 6, Y + 2, 8, 6, '#ffe27a'); G.rect(x, X + 6, Y + 1, 3, 1, '#ffe27a'); G.rect(x, X + 6, Y + 3, 8, 1, '#e8b84a');
        PF.text(x, 'CODE', X + 2, Y + 9, '#9ef0c8'); return;
      }
      const t = S.t * 3, cols = ['#ff8fd0', '#9ef0c8', '#7fd0f0', '#ffe27a', '#c4a6ff'];
      for (let i = 0; i < 6; i++) {
        const line = Math.floor(t) + i, rr = G.rng(line * 31 + 5);
        const indent = Math.floor(rr() * 3) * 2, len = 3 + Math.floor(rr() * 11);
        const shown = i === 5 ? Math.min(len, Math.floor((t % 1) * len * 1.4)) : len;
        G.rect(x, X + 1 + indent, Y + 1 + i * 2, Math.min(shown, 18 - indent), 1, cols[Math.floor(rr() * 5)]);
        if (rr() > 0.5) G.rect(x, X + 2 + indent + len, Y + 1 + i * 2, 3, 1, '#ffffff');
      }
    });
    crt('pc2', 256, 71, '#ff9fd2', '#e070b0', '#ffd6ee', (x, X, Y) => {
      if (hovPC()) { PF.text(x, 'GIT', X + 4, Y + 2, '#ffe27a'); PF.text(x, 'HUB', X + 4, Y + 8, '#ffe27a'); return; }
      // terminal with a build bar that fills, then OK
      G.rect(x, X, Y, 20, 3, '#3a2f7a'); G.px(x, X + 1, Y + 1, C.red); G.px(x, X + 3, Y + 1, '#ffe27a'); G.px(x, X + 5, Y + 1, C.mint);
      const p = (S.t * 0.35) % 1;
      PF.text(x, '>', X + 1, Y + 4, '#9ef0c8');
      G.rect(x, X + 5, Y + 6, 13, 1, '#3a2f7a'); G.rect(x, X + 5, Y + 6, Math.round(13 * Math.min(1, p * 1.5)), 1, '#ff8fd0');
      if (p > 0.66) PF.text(x, 'OK', X + 1, Y + 9, '#9ef0c8');
      else if (Math.floor(S.t * 3) % 2) G.rect(x, X + 1, Y + 9, 3, 5, '#9ef0c8');
    });

    // keyboard, mouse, tea, phone (desk top items)
    add({
      id: 'deskstuff', x: 222, y: 96, w: 74, h: 6, z: 5,
      draw(x) {
        G.rect(x, 6, 2, 24, 4, C.ink); G.rect(x, 7, 2, 22, 2, '#f4efff'); G.rect(x, 7, 4, 22, 1, '#cfc4ee');
        for (let i = 0; i < 10; i++) G.px(x, 8 + i * 2, 2, (i + Math.floor(S.t * 8)) % 7 === 0 ? C.pink : '#dcd2f6');
        G.rect(x, 34, 3, 4, 3, C.ink); G.rect(x, 35, 3, 2, 2, '#ffd0ea');
        // tea mug
        G.rect(x, 44, 0, 6, 6, C.ink); G.rect(x, 45, 1, 4, 4, '#9ef0c8'); G.rect(x, 50, 2, 2, 2, C.ink); G.px(x, 46, 2, '#ffffff');
      },
    });
    add({
      id: 'phone', x: 268, y: 90, w: 10, h: 12, z: 6, hot: true,
      draw(x) {
        const ring = S.hover === 'phone' ? Math.round(Math.sin(S.t * 40)) : 0;
        x.save(); x.translate(ring, 0);
        G.rect(x, 2, 4, 6, 8, C.ink); G.rect(x, 3, 5, 4, 6, '#ff7fc4'); G.rect(x, 3, 5, 4, 2, '#c8f4ff'); G.px(x, 4, 8, '#ffffff'); G.px(x, 6, 9, '#ffffff');
        G.rect(x, 6, 0, 1, 4, C.ink); G.px(x, 6, 0, C.pink);
        x.restore();
      },
    });

    // lava lamp (toggles lights)
    add({
      id: 'lamp', x: 192, y: 76, w: 12, h: 26, z: 5, hot: true,
      draw(x) {
        G.poly(x, [[3, 4], [9, 4], [10, 18], [2, 18]], C.ink);
        G.poly(x, [[4, 5], [8, 5], [9, 18], [3, 18]], '#ff6fb5');
        for (let i = 0; i < 3; i++) {
          const by = 7 + ((S.t * (2.5 + i) + i * 4) % 10), bx = 5 + Math.round(Math.sin(S.t + i * 2) * 1);
          G.ellipse(x, bx + 1, Math.round(by), 1 + (i % 2), 1, '#ffe27a');
        }
        G.px(x, 4, 7, 'rgba(255,255,255,0.7)'); G.px(x, 4, 8, 'rgba(255,255,255,0.5)');
        G.poly(x, [[3, 1], [9, 1], [8, 4], [4, 4]], '#cfd6ea'); G.rect(x, 3, 0, 6, 1, C.ink);
        G.poly(x, [[2, 18], [10, 18], [11, 25], [1, 25]], C.ink); G.poly(x, [[3, 19], [9, 19], [10, 24], [2, 24]], '#d9def0');
        G.rect(x, 3, 20, 2, 3, '#ffffff');
      },
    });

    // fairy lights along the back wall
    add({
      id: 'lights', x: 86, y: 34, w: 212, h: 12, z: 2,
      draw(x) {
        const cols = ['#ff8fd0', '#ffe27a', '#7fd0f0', '#9ef0c8', '#c4a6ff'];
        let prev = null;
        for (let X = 2; X < 210; X++) {
          const Y = 3 + Math.round(Math.abs(Math.sin((X - 2) / 52 * Math.PI)) * 5);
          G.px(x, X, Y, '#7d6aa8');
          if ((X - 2) % 9 === 4) {
            const k = Math.floor((X - 2) / 9);
            const on = (Math.sin(S.t * 3 + k * 1.3) + 1) / 2;
            const col = cols[k % cols.length];
            G.rect(x, X, Y + 1, 2, 2, G.mix('#ffffff', col, 0.25 + (1 - on) * 0.6));
            if (on > 0.7) G.px(x, X, Y + 1, '#ffffff');
          }
          prev = Y;
        }
      },
    });

    // rug
    add({
      id: 'rug', x: 120, y: 128, w: 104, h: 30, z: 7,
      draw(x) {
        G.ellipse(x, 52, 15, 50, 13, '#e86aa8');
        G.ellipse(x, 52, 14, 49, 12, (X, Y, half) => {
          const r = Math.sqrt((X / 49) ** 2 + (Y / 12) ** 2);
          if (r > 0.86) return ((X + Y) % 2) ? '#ffffff' : '#ffd0ea';
          if (r > 0.78) return '#ff9fd2';
          return ((Math.floor(X / 6) + Math.floor((Y + 20) / 3)) % 2) ? '#ffb8dc' : '#ffc9e4';
        });
        // fluffy fringe
        for (let a = 0; a < Math.PI * 2; a += 0.12) {
          const X = Math.round(52 + Math.cos(a) * 50), Y = Math.round(15 + Math.sin(a) * 13);
          G.px(x, X, Y, '#ffe6f3');
        }
        // heart in the middle
        G.ellipse(x, 48, 12, 3, 2, '#ff7fbf'); G.ellipse(x, 55, 12, 3, 2, '#ff7fbf'); G.poly(x, [[45, 13], [59, 13], [52, 19]], '#ff7fbf');
      },
    });

    // plant in the corner
    add({
      id: 'plant', x: 36, y: 110, w: 30, h: 48, z: 8,
      draw(x) {
        const sway = Math.round(Math.sin(S.t * 1.2) * 0.6);
        const leaf = (cx, cy, ang, len, wid) => {
          const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, pts = [];
          for (let k = 0; k <= 8; k++) { const u = k / 8, w = Math.sin(u * Math.PI) * wid * (1 - u * 0.25); pts.push([cx + dx * len * u + nx * w, cy + dy * len * u + ny * w]); }
          for (let k = 8; k >= 0; k--) { const u = k / 8, w = Math.sin(u * Math.PI) * wid * (1 - u * 0.25); pts.push([cx + dx * len * u - nx * w, cy + dy * len * u - ny * w]); }
          G.poly(x, pts.map(([a, b]) => [a + (a - cx) * 0.12 + Math.sign(a - cx) * 0.6, b + Math.sign(b - cy) * 0.6]), '#1f5e4a');
          G.poly(x, pts, '#4fbf86');
          G.poly(x, pts.slice(0, 9).concat([[cx + dx * len, cy + dy * len]]), '#6fd89c');
          G.line(x, cx, cy, Math.round(cx + dx * len * 0.85), Math.round(cy + dy * len * 0.85), '#2f8f68');
        };
        G.line(x, 15, 34, 9 + sway, 16, '#2f8f68'); G.line(x, 15, 34, 21 + sway, 14, '#2f8f68'); G.line(x, 15, 34, 15, 10, '#2f8f68');
        leaf(14 + sway, 12, -1.9, 11, 4); leaf(16 + sway, 12, -1.1, 11, 4);
        leaf(10 + sway, 18, -2.6, 10, 3.5); leaf(20 + sway, 17, -0.5, 10, 3.5);
        leaf(12, 27, 2.9, 9, 3); leaf(18, 27, 0.25, 9, 3);
        // pot
        G.poly(x, [[5, 32], [25, 32], [23, 46], [7, 46]], C.ink);
        G.poly(x, [[6, 33], [24, 33], [22, 45], [8, 45]], '#8fd8ff');
        G.rect(x, 4, 31, 22, 3, C.ink); G.rect(x, 5, 32, 20, 1, '#c4f0ff');
        G.ellipse(x, 13, 38, 1, 1, '#ff8fd0'); G.ellipse(x, 16, 38, 1, 1, '#ff8fd0'); G.poly(x, [[11, 39], [18, 39], [14.5, 42]], '#ff8fd0');
        G.rect(x, 8, 34, 1, 9, '#c4f0ff');
      },
    });

    // boombox (Spotify) on the floor under the window
    add({
      id: 'speaker', x: 140, y: 100, w: 42, h: 28, z: 6, hot: true,
      draw(x) {
        const beat = S.beat > 0.6 ? 1 : 0;
        G.ellipse(x, 21, 26, 21, 1, 'rgba(43,29,74,0.28)');
        // handle + antenna
        G.rect(x, 11, 0, 20, 2, C.ink); G.rect(x, 13, 1, 16, 1, '#f6f4ff');
        G.rect(x, 11, 0, 2, 5, C.ink); G.rect(x, 29, 0, 2, 5, C.ink);
        G.line(x, 34, 5, 40, 0, C.ink); G.rect(x, 39, 0, 2, 1, '#ff8fd0');
        // shell
        G.rect(x, 1, 4, 40, 21, C.ink); G.rect(x, 0, 5, 42, 19, C.ink);
        G.rect(x, 1, 5, 40, 19, '#ece9f8');
        G.rect(x, 1, 5, 40, 3, '#d9d4ee'); G.rect(x, 2, 5, 38, 1, '#ffffff'); G.rect(x, 1, 8, 40, 1, '#bfb8de');
        G.rect(x, 1, 22, 40, 2, '#cdc6e6');
        ['#ff8fd0', '#ffffff', '#8fd8ff', '#ffe27a'].forEach((c, i) => G.rect(x, 16 + i * 3, 6, 2, 1, c));
        G.px(x, 4, 6, '#ff5f9e'); G.px(x, 6, 6, '#7dff9a');
        G.rect(x, 33, 6, 2, 1, C.ink); G.rect(x, 36, 6, 2, 1, C.ink);
        // speakers
        for (const cx of [9, 33]) {
          const cy = 15;
          G.ellipse(x, cx, cy, 6, 6, C.ink);
          G.ellipse(x, cx, cy, 5, 5, (X, Y) => (X + Y < -2 ? '#ffffff' : X + Y > 3 ? '#a9a2cc' : '#dcd8f0'));
          G.ellipse(x, cx, cy, 3, 3, C.ink);
          G.ellipse(x, cx, cy, 2 + beat, 2 + beat, (X, Y) => ((X + Y) % 2 === 0 ? '#5b3f8e' : '#46306f'));
          G.px(x, cx, cy, '#ff8fd0'); G.px(x, cx - 1, cy - 1, '#ffd0ea');
        }
        // cassette window with turning reels
        G.rect(x, 16, 10, 10, 7, C.ink); G.rect(x, 17, 11, 8, 5, '#bfefff');
        G.rect(x, 18, 12, 6, 3, '#3a2a5e');
        const sp = Math.floor(S.t * (S.music ? 10 : 2)) % 2;
        for (const rx of [19, 22]) G.px(x, rx + sp, 13, '#ffffff');
        G.px(x, 17, 11, '#ffffff');
        // LCD equalizer
        G.rect(x, 16, 18, 10, 4, C.ink); G.rect(x, 17, 18, 8, 3, '#173a2f');
        for (let i = 0; i < 4; i++) {
          const hgt = 1 + Math.round((Math.sin(S.t * (6 + i) + i) + 1) * (S.music || S.hover === 'speaker' ? 1 : 0.4));
          G.rect(x, 17 + i * 2, 21 - hgt, 1, hgt, ['#7dff9a', '#ffe27a', '#ff8fd0'][i % 3]);
        }
        G.rect(x, 3, 23, 5, 1, '#ff8fd0'); G.rect(x, 34, 23, 5, 1, '#8fd8ff');
      },
    });

    // Limoo's bowl + yarn ball
    add({
      id: 'bowl', x: 262, y: 138, w: 22, h: 10, z: 8,
      draw(x) {
        G.ellipse(x, 11, 4, 9, 2, '#2b1d4a'); G.ellipse(x, 11, 4, 8, 1, '#c98a5a');
        G.px(x, 8, 3, '#e8b07a'); G.px(x, 13, 4, '#e8b07a');
        G.poly(x, [[1, 4], [21, 4], [19, 9], [3, 9]], '#2b1d4a'); G.poly(x, [[2, 5], [20, 5], [18, 8], [4, 8]], '#ff9fd2');
        // little fish on the bowl
        G.rect(x, 8, 6, 5, 1, '#ffffff'); G.px(x, 9, 5, '#ffffff'); G.px(x, 9, 7, '#ffffff'); G.px(x, 13, 5, '#ffffff'); G.px(x, 13, 7, '#ffffff');
      },
    });
    add({
      id: 'yarn', x: 112, y: 146, w: 10, h: 9, z: 8,
      draw(x) {
        G.ellipse(x, 4, 4, 4, 4, '#2b1d4a'); G.ellipse(x, 4, 4, 3, 3, '#7fd0f0');
        G.line(x, 2, 2, 6, 6, '#c4f0ff'); G.line(x, 2, 5, 5, 2, '#c4f0ff');
        G.line(x, 8, 6, 9, 8, '#7fd0f0');
      },
    });

    // disco ball hanging from the sky
    add({
      id: 'disco', x: 312, y: 0, w: 28, h: 42, z: 9, hot: true,
      draw(x) {
        const cx = 14, cy = 28, R = 9;
        // chain + cap
        for (let Y = 0; Y < cy - R - 2; Y++) G.px(x, cx, Y, Y % 2 ? '#8f88c0' : '#d6d2ef');
        G.rect(x, cx - 2, cy - R - 3, 5, 3, C.ink); G.rect(x, cx - 1, cy - R - 2, 3, 1, '#d6d2ef');
        // sphere: rotating mirror tiles, lit from the top left
        const rot = S.t * (S.party ? 2.4 : 0.5);
        const pal = ['#3b3770', '#5f5fa0', '#8e94cf', '#b9c1ec', '#e3e8ff', '#ffffff'];
        const tint = ['#ffb3dc', '#a8e6ff', '#fff0a8'];
        G.ellipse(x, cx, cy, R + 1, R + 1, C.ink);
        for (let Y = -R; Y <= R; Y++) for (let X = -R; X <= R; X++) {
          const d2 = (X * X + Y * Y) / (R * R + 0.5);
          if (d2 > 1) continue;
          const nz = Math.sqrt(1 - d2), nx = X / R, ny = Y / R;
          const lon = Math.atan2(nx, nz) + rot, lat = Math.asin(Math.max(-1, Math.min(1, ny)));
          const tu = lon / (Math.PI / 8), tv = lat / (Math.PI / 8);
          const iu = Math.floor(tu), iv = Math.floor(tv), id = iu * 31 + iv * 17;
          const lambert = Math.max(0, -0.5 * nx - 0.62 * ny + 0.6 * nz);
          const flick = (Math.sin(id * 12.9898 + S.t * (S.party ? 9 : 3)) + 1) / 2;
          const parity = ((iu + iv) % 2 + 2) % 2;
          let k = Math.round(lambert * 3.4 + 1.2 + parity * 0.7 + (flick > 0.88 ? 1.5 : 0) - (nz < 0.3 ? 1 : 0));
          k = Math.max(0, Math.min(5, k));
          let col = pal[k];
          if (k >= 3 && ((id % 13) + 13) % 13 === 0) col = tint[((id % 3) + 3) % 3];
          G.px(x, cx + X, cy + Y, col);
        }
        // specular highlight
        G.px(x, cx - 4, cy - 5, '#ffffff'); G.px(x, cx - 3, cy - 5, '#ffffff'); G.px(x, cx - 4, cy - 4, '#ffffff');
        // twinkling glints around the ball
        const glint = (gx, gy, ph) => {
          const v = (Math.sin(S.t * 3 + ph) + 1) / 2;
          if (v < 0.45) return;
          const L = v > 0.85 ? 2 : 1;
          G.rect(x, gx - L, gy, L * 2 + 1, 1, '#ffffff'); G.rect(x, gx, gy - L, 1, L * 2 + 1, '#ffffff');
        };
        glint(cx - 7, cy - 6, 0); glint(cx + 8, cy - 2, 2.1); glint(cx + 3, cy + 8, 4.2);
      },
    });

    // Limoo
    add({
      id: 'cat', x: 128, y: 124, w: 36, h: 26, z: 9, hot: true,
      draw(x) { x.drawImage(Cat.render(S.cat), 0, 0); },
    });

    // Bourla
    add({
      id: 'me', x: 196, y: 92, w: 36, h: 50, z: 10, hot: true,
      draw(x) { Avatar.draw(x, 7, 2, S.av); },
    });
  };

  /* ---------- particles ---------- */
  const parts = [];
  const emit = (type, x, y, opts = {}) => parts.push({ type, x, y, vx: opts.vx ?? (Math.random() - 0.5) * 6, vy: opts.vy ?? -8 - Math.random() * 6, life: 0, max: opts.max ?? 2.2, col: opts.col });
  const NOTE = ['.11', '.1.1', '.1..', '11..', '11..'];
  const HEART = ['11.11', '11111', '.111.', '..1..'];
  const ZED = ['111', '..1', '.1.', '1..', '111'];
  const drawGlyph = (x, rows, X, Y, col) => {
    x.fillStyle = col;
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '1') x.fillRect(X + i, Y + j, 1, 1); });
  };

  /* ---------- per-frame ---------- */
  const [frame, fx] = G.canvas(W, H);
  const [lightBuf, lx] = G.canvas(W, H);

  const draw = (dt) => {
    if (!shell) { buildShell(); initObjects(); objs.sort((a, b) => a.z - b.z); }
    fx.clearRect(0, 0, W, H);
    fx.drawImage(shell, 0, 0);

    // window light patch on floor (day) / moonlight (night)
    const patch = [[148, 126], [192, 126], [226, 150], [176, 150]];
    G.poly(fx, patch, `rgba(255,250,220,${0.22 * (1 - S.night) + 0.08 * S.night})`);

    for (const o of objs) {
      const [c, x] = o.cv;
      x.clearRect(0, 0, o.w, o.h);
      o.draw(x);
      const hov = o.hot && (S.hover === o.id || (o.group && S.hover === o.group));
      if (hov) {
        const ring = G.ring(c, (Math.floor(S.t * 4) % 2) ? '#ffffff' : '#ffe27a');
        fx.drawImage(ring, o.x - 1, o.y - 1);
      }
      fx.drawImage(c, o.x, o.y);
    }

    // dust motes in the window light
    for (let i = 0; i < 10; i++) {
      const p = (S.t * 0.05 + i * 0.137) % 1;
      const X = 150 + ((i * 29) % 60) + p * 30, Y = 100 + p * 46 + Math.sin(S.t + i) * 2;
      if ((Math.sin(S.t * 2 + i * 3) + 1) / 2 > 0.4) G.px(fx, X, Y, `rgba(255,255,240,${0.5 * (1 - S.night * 0.6)})`);
    }

    // mirror-ball reflections drifting over the walls
    for (let i = 0; i < 9; i++) {
      const a = S.t * (S.party ? 0.9 : 0.12) + i * 0.7;
      const X = Math.round(100 + ((i * 37 + a * 40) % 190)), Y = Math.round(44 + ((i * 23) % 60) + Math.sin(a + i) * 4);
      fx.fillStyle = ['rgba(255,255,255,0.55)', 'rgba(255,190,230,0.5)', 'rgba(190,235,255,0.5)'][i % 3];
      fx.fillRect(X, Y, 2, 1); fx.fillRect(X, Y + 1, 1, 1);
    }

    // party lights
    if (S.party > 0.01) {
      fx.save(); fx.globalAlpha = 0.35 * S.party; fx.globalCompositeOperation = 'lighter';
      const cols = ['#ff4fa8', '#4fd8ff', '#ffe24f', '#8f6bff', '#4fffa8'];
      for (let i = 0; i < 14; i++) {
        const a = S.t * 0.8 + i * 0.9;
        const X = 192 + Math.cos(a + i) * (60 + (i % 4) * 30), Y = 92 + Math.sin(a * 1.3 + i * 2) * 50;
        G.ellipse(fx, Math.round(X), Math.round(Y), 3, 2, cols[i % cols.length]);
      }
      fx.restore();
    }

    // night: darken and add glows
    if (S.night > 0.01) {
      lx.clearRect(0, 0, W, H);
      lx.globalCompositeOperation = 'source-over';
      lx.fillStyle = `rgba(22,12,58,${0.58 * S.night})`;
      lx.fillRect(0, 0, W, H);
      lx.globalCompositeOperation = 'destination-out';
      const hole = (X, Y, r, a) => {
        const g = lx.createRadialGradient(X, Y, 0, X, Y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        lx.fillStyle = g; lx.fillRect(X - r, Y - r, r * 2, r * 2);
      };
      hole(198, 88, 34, 0.9); hole(254, 84, 40, 0.85); hole(324, 120, 26, 0.5);
      for (let X = 92; X < 294; X += 18) hole(X, 42, 12, 0.6);
      hole(161, 70, 30, 0.5);
      // only darken the room itself, not the sky around it
      lx.globalCompositeOperation = 'destination-in';
      lx.drawImage(shell, 0, 0);
      lx.globalCompositeOperation = 'source-over';
      fx.drawImage(lightBuf, 0, 0);
      fx.save(); fx.globalCompositeOperation = 'lighter'; fx.globalAlpha = 0.18 * S.night;
      const glow = (X, Y, r, col) => { const g = fx.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); fx.fillStyle = g; fx.fillRect(X - r, Y - r, r * 2, r * 2); };
      glow(198, 88, 30, '#ff5fb0'); glow(238, 82, 26, '#4fd0ff'); glow(270, 84, 24, '#ff7fc4');
      fx.restore();
    }

    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'note') p.x += Math.sin(p.life * 5) * 0.3;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      const fade = 1 - p.life / p.max;
      fx.globalAlpha = Math.min(1, fade * 2);
      const X = Math.round(p.x), Y = Math.round(p.y);
      if (p.type === 'note') drawGlyph(fx, NOTE, X, Y, p.col || '#ff5fb0');
      else if (p.type === 'heart') drawGlyph(fx, HEART, X, Y, p.col || '#ff5f9e');
      else if (p.type === 'z') drawGlyph(fx, ZED, X, Y, p.col || '#ffffff');
      else if (p.type === 'spark') {
        const s = p.life < p.max / 2 ? 2 : 1;
        G.rect(fx, X - s, Y, s * 2 + 1, 1, p.col || '#ffffff'); G.rect(fx, X, Y - s, 1, s * 2 + 1, p.col || '#ffffff');
      }
      fx.globalAlpha = 1;
    }
    return frame;
  };

  // scene rectangles used for DOM hotspots
  const rectOf = (id) => {
    const o = objs.find(q => q.id === id);
    return o ? { x: o.x, y: o.y, w: o.w, h: o.h } : null;
  };

  return { W, H, S, draw, emit, rectOf, init: () => { if (!shell) { buildShell(); initObjects(); objs.sort((a, b) => a.z - b.z); } } };
})();
