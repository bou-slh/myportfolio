/* main.js: camera, scroll story, hotspots, avatar + Limoo behaviour, sound, modal. */
(() => {
  const LINKS = {
    projects: 'https://github.com/bou-slh',
    spotify: 'https://open.spotify.com/user/odmygy6v1mtjqe5bwsglt8ewv',
  };
  const S = Scene.S;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (q) => document.querySelector(q);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bourla.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bourla.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------- Istanbul clock ---------- */
  const istNow = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => parts.find(p => p.type === t).value;
      return { h: +get('hour'), m: +get('minute'), d: +get('day'), mon: get('month').slice(0, 3).toUpperCase() };
    } catch { const d = new Date(Date.now() + 3 * 3600e3); return { h: d.getUTCHours(), m: d.getUTCMinutes(), d: d.getUTCDate(), mon: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()] }; }
  };
  const nightFromHour = (h) => (h >= 20 || h < 6 ? 1 : h >= 18.5 ? (h - 18.5) / 1.5 : h < 7.5 ? 1 - (h - 6) / 1.5 : 0);
  let ist = istNow();
  S.istHour = ist.h; S.istMin = ist.m; S.istDay = ist.d; S.istMon = ist.mon;
  // lights are on by default; the lava lamp / dock button switches them off
  let nightTarget = 0;
  S.sky = nightFromHour(ist.h + ist.m / 60);
  S.night = nightTarget;
  let partyTarget = 0;

  /* ---------- canvases ---------- */
  const stage = $('#stage'), ctx = stage.getContext('2d');
  const fxc = $('#fx'), fctx = fxc.getContext('2d');
  let vw = 0, vh = 0, dpr = 1, portrait = false;

  const stars = Array.from({ length: 110 }, (_, i) => {
    const r = G.rng(i * 97 + 13);
    return { x: r(), y: r(), d: 0.2 + r() * 0.8, ph: r() * 6.28, big: r() > 0.86, col: ['#ffffff', '#ffe9a8', '#ffc4e8', '#c4ecff'][Math.floor(r() * 4)] };
  });

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = innerWidth; vh = innerHeight; portrait = vw < 760 || vw < vh * 0.9;
    for (const c of [stage, fxc]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    ctx.imageSmoothingEnabled = false; fctx.imageSmoothingEnabled = false;
    measure();
  };

  /* ---------- camera keys: focus point (scene px) shown at screen fraction, with zoom ---------- */
  const keys = () => portrait ? [
    { fx: 192, fy: 98, sx: 0.5, sy: 0.54, z: 1.0 },
    { fx: 213, fy: 112, sx: 0.5, sy: 0.25, z: 2.5 },
    { fx: 213, fy: 106, sx: 0.5, sy: 0.24, z: 3.2 },
  ] : [
    { fx: 192, fy: 92, sx: 0.5, sy: 0.62, z: 0.82 },
    { fx: 213, fy: 112, sx: 0.27, sy: 0.54, z: 2.5 },
    { fx: 213, fy: 107, sx: 0.73, sy: 0.5, z: 3.5 },
  ];
  const baseScale = () => portrait ? (vw * dpr) / 330 : Math.min((vw * dpr * 0.94) / 344, (vh * dpr * 0.86) / 192);

  const sections = ['home', 'about', 'contact'].map(id => document.getElementById(id));
  let stops = [0, 1, 2];
  const measure = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    stops = sections.map((s, i) => Math.min(max, i === 0 ? 0 : s.offsetTop - (i === sections.length - 1 ? 0 : vh * 0.05)));
  };

  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const camTarget = () => {
    const y = scrollY, k = keys();
    let i = 0;
    while (i < stops.length - 2 && y > stops[i + 1]) i++;
    const span = Math.max(1, stops[i + 1] - stops[i]);
    const t = ease(Math.min(1, Math.max(0, (y - stops[i]) / span)));
    const a = k[i], b = k[i + 1];
    const L = (p) => a[p] + (b[p] - a[p]) * t;
    return { fx: L('fx'), fy: L('fy'), sx: L('sx'), sy: L('sy'), z: L('z'), sec: t > 0.5 ? i + 1 : i, raw: i + t };
  };
  let cam = null;

  /* ---------- pointer ---------- */
  const mouse = { x: 0.5, y: 0.5, px: -1, py: -1, active: false };
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX / vw; mouse.y = e.clientY / vh; mouse.px = e.clientX; mouse.py = e.clientY; mouse.active = true;
    if (!reduced && e.pointerType === 'mouse' && Math.random() < 0.35) trail.push({ x: e.clientX, y: e.clientY, life: 0, col: ['#ffffff', '#ffe27a', '#ff9fd2', '#8fd8ff'][Math.floor(Math.random() * 4)] });
  }, { passive: true });

  /* ---------- hotspots ---------- */
  const HOT = [
    { id: 'speaker', label: 'my spotify ♪', href: LINKS.spotify, rect: { x: 140, y: 100, w: 42, h: 26 } },
    { id: 'pc1', group: 'pc', label: 'my github profile', href: LINKS.projects, rect: { x: 222, y: 69, w: 32, h: 29 } },
    { id: 'pc2', group: 'pc', label: 'my github profile', href: LINKS.projects, rect: { x: 256, y: 71, w: 32, h: 28 } },
    { id: 'books', label: 'english lessons ✎', action: () => openEnglish(), rect: { x: 91, y: 62, w: 38, h: 66 } },
    { id: 'cat', label: 'Limoo', cls: 'cat', action: () => petCat(), rect: { x: 130, y: 128, w: 32, h: 22 } },
    { id: 'me', label: "that's me! say hi", action: () => sayHi(), rect: { x: 203, y: 93, w: 22, h: 48 } },
    { id: 'lamp', label: 'lava lamp: lights', action: () => toggleLights(), rect: { x: 193, y: 76, w: 10, h: 26 } },
    { id: 'disco', label: 'party mode!', action: () => toggleParty(), rect: { x: 314, y: 16, w: 24, h: 24 } },
    { id: 'phone', label: 'call me maybe? → contact', action: () => document.getElementById('contact').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), rect: { x: 268, y: 89, w: 10, h: 13 } },
    { id: 'window', label: () => 'istanbul, live · ' + pad(S.istHour) + ':' + pad(S.istMin), action: () => { nudge('window'); }, rect: { x: 134, y: 44, w: 54, h: 50 } },
    { id: 'board', label: 'my pinboard: what i\'m up to', action: () => openNotes(), rect: { x: 43, y: 45, w: 30, h: 38 } },
    { id: 'calendar', label: () => 'today in istanbul: ' + S.istDay + ' ' + (S.istMon || '').toLowerCase(), action: () => nudge('calendar'), rect: { x: 204, y: 46, w: 20, h: 24 } },
    { id: 'clock', label: () => 'istanbul time ' + pad(S.istHour) + ':' + pad(S.istMin), action: () => nudge('clock'), rect: { x: 100, y: 40, w: 19, h: 17 } },
  ];
  const pad = (n) => String(n).padStart(2, '0');
  const hotLayer = $('#hotspots'), tip = $('#tip');
  let tipFor = null;
  for (const h of HOT) {
    const el = document.createElement(h.href ? 'a' : 'button');
    el.className = 'hot';
    if (h.href) { el.href = h.href; el.target = '_blank'; el.rel = 'noopener'; }
    else { el.type = 'button'; el.addEventListener('click', (e) => { e.preventDefault(); h.action(); Sound.blip(660); }); }
    if (h.href) el.addEventListener('click', () => { Sound.blip(880); burst(h); });
    const lbl = typeof h.label === 'function' ? h.label() : h.label;
    el.setAttribute('aria-label', h.id === 'cat' ? 'Limoo the cat. Pet him' : lbl);
    const enter = () => { S.hover = h.group || h.id; tipFor = h; Sound.blip(h.id === 'cat' ? 1046 : 520, 0.03); };
    const leave = () => { if (tipFor === h) { tipFor = null; S.hover = null; } };
    el.addEventListener('pointerenter', enter); el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', enter); el.addEventListener('blur', leave);
    hotLayer.appendChild(el); h.el = el;
  }
  const burst = (h) => {
    const r = h.rect;
    for (let i = 0; i < 6; i++) Scene.emit(h.id === 'speaker' ? 'note' : 'spark', r.x + r.w / 2, r.y + 6, { col: ['#ff5fb0', '#ffe27a', '#7fd0f0'][i % 3] });
  };
  const nudge = (id) => { const h = HOT.find(q => q.id === id); for (let i = 0; i < 5; i++) Scene.emit('spark', h.rect.x + Math.random() * h.rect.w, h.rect.y + Math.random() * h.rect.h, { vy: -4, col: '#ffffff', max: 0.8 }); };

  /* ---------- bubbles ---------- */
  const meBubble = $('#meBubble'), catBubble = $('#catBubble');
  let meBubbleUntil = 0, catBubbleUntil = 0;
  const say = (el, text, secs) => { el.textContent = text; el.classList.add('on'); return performance.now() + secs * 1000; };

  /* ---------- avatar behaviour ---------- */
  const A = { blinkAt: 2, blinkEnd: 0, waveUntil: 0, nextWave: 6, winkCycle: 0, hiIndex: 0, sparkleAt: 3, talkUntil: 0 };
  const greetings = ['hi there!', 'merhaba!', 'salam!', 'hello, world!', 'want some tea?'];
  const sayHi = () => {
    A.waveUntil = S.t + 1.8;
    meBubbleUntil = say(meBubble, greetings[A.hiIndex++ % greetings.length], 2.2);
    for (let i = 0; i < 4; i++) Scene.emit('heart', 210 + Math.random() * 8, 92, { col: ['#ff5f9e', '#ff9fd2'][i % 2] });
  };

  /* ---------- Limoo ---------- */
  const K = { awakeUntil: 0, zAt: 1, earAt: 3, pets: store.get('pets', 0) };
  const catLines = ['mrrp!', 'purrrr…', 'meow :3', '*slow blink*', 'more pets pls'];
  const petCat = () => {
    K.awakeUntil = S.t + 4; K.pets++; store.set('pets', K.pets);
    for (let i = 0; i < 5; i++) Scene.emit('heart', 136 + Math.random() * 16, 126, { col: ['#ff5f9e', '#ff9fd2', '#ffffff'][i % 3], vy: -10 - Math.random() * 6 });
    const line = catLines[(K.pets - 1) % catLines.length];
    catBubbleUntil = say(catBubble, K.pets === 1 ? 'mrrp! (pet #1)' : `${line}  ×${K.pets}`, 2);
    Sound.meow();
  };

  /* ---------- toggles ---------- */
  const lightsBtn = $('#lightsBtn'), musicBtn = $('#musicBtn');
  const syncLights = () => { lightsBtn.setAttribute('aria-pressed', String(nightTarget === 1)); lightsBtn.innerHTML = nightTarget ? '☾ <span class="lbl">lights off</span>' : '☀ <span class="lbl">lights on</span>'; };
  const toggleLights = () => { nightTarget = nightTarget ? 0 : 1; syncLights(); Sound.blip(nightTarget ? 330 : 990); };
  let partyStartedMusic = false;
  const toggleParty = () => {
    partyTarget = partyTarget ? 0 : 1;
    Sound.setMode(partyTarget ? 'party' : 'chill');
    if (partyTarget && !Sound.on) { Sound.toggle(true); partyStartedMusic = true; }
    else if (!partyTarget && partyStartedMusic) { Sound.toggle(false); partyStartedMusic = false; }
    toast(partyTarget ? 'party mode ON ✦ click the ball again to stop' : 'party over, back to work');
  };
  lightsBtn.addEventListener('click', toggleLights);
  musicBtn.addEventListener('click', () => {
    Sound.toggle();
    try { localStorage.setItem('bou-music-off', Sound.on ? '' : '1'); } catch {}
  });
  syncLights();

  /* ---------- toast + copy ---------- */
  const toastEl = $('#toast'); let toastT = 0;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const v = b.getAttribute('data-copy');
    const done = () => toast('copied ' + v);
    const fallback = () => {
      const s = window.getSelection(), r = document.createRange();
      const t = document.getElementById('mailAddr'); r.selectNodeContents(t); s.removeAllRanges(); s.addRange(r);
      toast('selected, press ctrl/cmd + C');
    };
    try { navigator.clipboard.writeText(v).then(done, fallback); } catch { fallback(); }
  });

  /* ---------- english modal + quiz ---------- */
  const modal = $('#english');
  let lastFocus = null;
  const openEnglish = () => {
    lastFocus = document.activeElement;
    modal.hidden = false; startQuiz();
    setTimeout(() => modal.querySelector('.win-close').focus(), 30);
    for (let i = 0; i < 6; i++) Scene.emit('spark', 100 + Math.random() * 30, 70, { col: '#ffe27a' });
  };
  const closeEnglish = () => { modal.hidden = true; if (lastFocus) lastFocus.focus(); };
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeEnglish(); });
  const notes = $('#notes');
  const openNotes = () => {
    lastFocus = document.activeElement;
    notes.hidden = false;
    setTimeout(() => notes.querySelector('.win-close').focus(), 30);
    for (let i = 0; i < 6; i++) Scene.emit('spark', 50 + Math.random() * 24, 50 + Math.random() * 30, { col: '#ffe27a' });
  };
  const closeNotes = () => { notes.hidden = true; if (lastFocus) lastFocus.focus(); };
  notes.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeNotes(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeEnglish();
    if (!notes.hidden) closeNotes();
  });

  const QUIZ = [
    { q: 'She ___ in Istanbul since 2022.', o: ['lives', 'has lived', 'is living'], a: 1 },
    { q: 'If I ___ more time, I would learn to code.', o: ['had', 'have', 'would have'], a: 0 },
    { q: 'Limoo is used to ___ on the rug all day.', o: ['sleep', 'sleeping', 'slept'], a: 1 },
  ];
  let qi = 0, score = 0;
  const startQuiz = () => { qi = 0; score = 0; $('#quizRes').textContent = ''; showQ(); };
  const showQ = () => {
    const item = QUIZ[qi], opts = $('#quizOpts');
    $('#quizQ').textContent = `${qi + 1}/3 · ${item.q}`;
    opts.innerHTML = '';
    item.o.forEach((txt, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = txt;
      b.addEventListener('click', () => {
        const ok = i === item.a; if (ok) score++;
        b.classList.add(ok ? 'right' : 'wrong'); opts.children[item.a].classList.add('right');
        [...opts.children].forEach(c => c.disabled = true);
        Sound.blip(ok ? 1046 : 220);
        setTimeout(() => { qi++; if (qi < QUIZ.length) showQ(); else finishQuiz(); }, 650);
      });
      opts.appendChild(b);
    });
  };
  const finishQuiz = () => {
    const lvl = score === 3 ? 'B2 or above' : score === 2 ? 'around B1' : 'around A2';
    $('#quizQ').textContent = `you got ${score}/3!`;
    $('#quizOpts').innerHTML = '';
    $('#quizRes').textContent = `Looks like you're ${lvl}. Book a lesson and we'll find your exact level together.`;
    const sub = encodeURIComponent(`English lessons (quiz: ${score}/3)`);
    $('#bookLesson').href = `mailto:salehibourla@gmail.com?subject=${sub}`;
  };
  // pixel book icon for the modal header
  (() => {
    const c = $('#enIcon').getContext('2d');
    G.rect(c, 2, 3, 12, 10, '#2b1d4a'); G.rect(c, 3, 4, 5, 8, '#ff9fd2'); G.rect(c, 8, 4, 5, 8, '#8fd8ff');
    G.rect(c, 7, 3, 2, 11, '#2b1d4a'); G.rect(c, 4, 6, 3, 1, '#fff'); G.rect(c, 4, 8, 2, 1, '#fff'); G.rect(c, 9, 6, 3, 1, '#fff'); G.rect(c, 9, 8, 3, 1, '#fff');
    G.px(c, 13, 1, '#ffe27a'); G.px(c, 12, 2, '#ffe27a'); G.px(c, 14, 2, '#ffe27a'); G.px(c, 13, 3, '#ffe27a');
  })();

  /* ---------- typewriter (about) ---------- */
  const typedEl = $('#typed');
  const fullText = typedEl.dataset.text;
  let typing = null;
  const startTyping = () => {
    if (typing || reduced) return;
    typing = { i: 0 };
    typedEl.textContent = '';
    const caret = document.createElement('span'); caret.className = 'caret';
    const node = document.createTextNode('');
    typedEl.append(node, caret);
    const step = () => {
      typing.i += 1 + (Math.random() < 0.3 ? 1 : 0);
      node.data = fullText.slice(0, typing.i);
      A.talkUntil = S.t + 0.25;
      if (typing.i < fullText.length) setTimeout(step, fullText[typing.i - 1] === ',' || fullText[typing.i - 1] === '.' ? 180 : 24);
      else setTimeout(() => caret.remove(), 1600);
    };
    step();
  };
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) {
      e.target.classList.add('in');
      if (e.target.closest('#about')) setTimeout(startTyping, 350);
    }
  }, { threshold: 0.25 });
  document.querySelectorAll('.reveal').forEach((el) => { io.observe(el); el.querySelectorAll('.tag').forEach((t, i) => t.style.setProperty('--i', i)); });

  /* ---------- sound: tiny chiptune ---------- */
  const Sound = (() => {
    let ac = null, master = null, bus = null, timer = 0, step = 0, nextT = 0, mode = 'chill';
    const api = { on: false };
    const ensure = () => {
      if (ac) return true;
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
        // music bus with a soft, long reverb (generated impulse) for the dreamy feel
        bus = ac.createGain(); bus.gain.value = 0.7; bus.connect(master);
        const verb = ac.createConvolver(), len = ac.sampleRate * 3.2, ir = ac.createBuffer(2, len, ac.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        verb.buffer = ir;
        const wet = ac.createGain(); wet.gain.value = 0.45;
        bus.connect(verb); verb.connect(wet); wet.connect(master);
        return true;
      } catch { return false; }
    };
    const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const env = (g, t, a, peak, rel) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel); };
    const tone = (f, t, d, type = 'square', vol = 0.3, out) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      env(g, t, 0.01, vol, d);
      o.connect(g); g.connect(out || master); o.start(t); o.stop(t + d + 0.05);
    };
    const noise = (t, len, type, freq, vol, q = 1) => {
      const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      src.buffer = b; src.connect(f); f.connect(g); g.connect(bus); src.start(t);
    };

    /* ---- chill: slow, airy, a little melancholy (think late-night bedroom) ---- */
    const pad = (notes, t, dur) => {
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1300, t + dur * 0.5); f.frequency.linearRampToValueAtTime(700, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.15);
      f.connect(g); g.connect(bus);
      for (const n of notes) for (const det of [-7, 7]) {
        const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = N(n); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur * 1.2);
      }
    };
    const bell = (n, t, vol = 0.09) => { // soft FM celesta
      const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
      c.frequency.value = N(n); m.frequency.value = N(n) * 3.5;
      mg.gain.setValueAtTime(N(n) * 1.6, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
      m.connect(mg); mg.connect(c.frequency);
      env(g, t, 0.008, vol, 2.6);
      c.connect(g); g.connect(bus); c.start(t); m.start(t); c.stop(t + 2.8); m.stop(t + 2.8);
    };
    const subBass = (n, t, dur) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = N(n);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.1);
    };
    // Fmaj9 – Em9 – Dm9 – Bbmaj7, one bar each
    const CHILL = [
      { pad: [53, 57, 60, 64, 67], bass: 41 }, { pad: [52, 55, 59, 62, 66], bass: 40 },
      { pad: [50, 53, 57, 60, 64], bass: 38 }, { pad: [46, 50, 53, 57, 62], bass: 34 },
    ];
    const CHILL_MEL = [76, 0, 0, 72, 0, 0, 74, 0, 0, 0, 71, 0, 0, 67, 0, 0, 74, 0, 0, 69, 0, 0, 72, 0, 0, 0, 77, 0, 74, 0, 0, 0];
    const ARP = [0, 2, 4, 3, 1, 3, 2, 4];
    const chillStep = (t, st) => {
      const bar = Math.floor(st / 8) % 4, s8 = st % 8, ch = CHILL[bar], e = 60 / 66 / 2;
      if (s8 === 0) { pad(ch.pad, t, e * 8); subBass(ch.bass, t, e * 7); setBeat(t); }
      const n = ch.pad[ARP[s8]] + 12;
      tone(N(n), t, 1.2, 'sine', 0.035, bus);
      const m = CHILL_MEL[st % 32];
      if (m) bell(m, t);
      if (s8 === 4) { noise(t, 0.25, 'bandpass', 2400, 0.025, 0.7); setBeat(t); } // soft brush
      return e;
    };

    /* ---- party: four-on-the-floor house ---- */
    const kick = (t) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      env(g, t, 0.002, 0.9, 0.32); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
    };
    const synth = (notes, t, dur, type, cutoff, vol, q = 2) => {
      const f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(cutoff * 2, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + dur);
      env(g, t, 0.005, vol, dur); f.connect(g); g.connect(bus);
      for (const n of notes) { const o = ac.createOscillator(); o.type = type; o.frequency.value = N(n); o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
    };
    // Am7 – Fmaj7 – C – G
    const PARTY = [
      { st: [57, 60, 64, 67], b: 45 }, { st: [57, 60, 64, 65], b: 41 },
      { st: [55, 60, 64, 67], b: 48 }, { st: [55, 59, 62, 67], b: 43 },
    ];
    const HOOK = { 0: 76, 3: 74, 6: 72, 8: 74, 11: 76, 14: 79 };
    const partyStep = (t, st) => {
      const bar = Math.floor(st / 16) % 4, s = st % 16, ch = PARTY[bar], e = 60 / 124 / 4;
      if (s % 4 === 0) { kick(t); setBeat(t); }
      if (s === 4 || s === 12) noise(t, 0.16, 'bandpass', 1400, 0.35, 0.9);         // clap
      if (s % 4 === 2) noise(t, 0.09, 'highpass', 7000, 0.18);                         // open hat
      else if (s % 2 === 1) noise(t, 0.03, 'highpass', 9000, 0.06);                    // closed hat
      if (s % 4 === 2 || s === 7 || s === 15) synth([ch.b + (s === 15 ? 12 : 0)], t, e * 1.6, 'sawtooth', 420, 0.22, 6);
      if (s === 3 || s === 10) synth(ch.st, t, e * 2.2, 'sawtooth', 1500, 0.07, 1);    // chord stabs
      if (bar % 2 === 1 && HOOK[s]) synth([HOOK[s]], t, e * 2.5, 'square', 2200, 0.05, 1);
      return e;
    };

    const setBeat = (when) => setTimeout(() => { S.beat = 1; }, Math.max(0, (when - ac.currentTime) * 1000));
    const schedule = () => {
      while (nextT < ac.currentTime + 0.15) {
        nextT += (mode === 'party' ? partyStep : chillStep)(nextT, step);
        step++;
      }
    };
    const restart = () => { step = 0; nextT = ac.currentTime + 0.08; };
    api.setMode = (m) => {
      if (m === mode) return;
      mode = m;
      if (api.on && ac) restart();
    };
    api.toggle = (force) => {
      const want = force ?? !api.on;
      if (want && !ensure()) { toast('sound is not available here'); return; }
      api.on = want; S.music = want;
      musicBtn.setAttribute('aria-pressed', String(want));
      musicBtn.innerHTML = want ? '♪ <span class="lbl">music on</span>' : '♪ <span class="lbl">music</span>';
      clearInterval(timer);
      if (want) { ac.resume(); restart(); timer = setInterval(schedule, 30); }
    };
    api.blip = (f, vol = 0.06) => { if (!api.on || !ac) return; tone(f, ac.currentTime, 0.07, 'square', vol); };
    api.meow = () => {
      if (!api.on || !ac) return;
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.12); o.frequency.exponentialRampToValueAtTime(520, t + 0.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
    };
    // old-school mouse click: a sharp "tick" on press, a softer one on release
    const tick = (t, vol, freq) => {
      const len = 0.012, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.4; g.gain.value = vol;
      src.buffer = b; src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t);
    };
    api.click = () => {
      if (!ensure()) return;
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + 0.005;
      tick(t, 0.38, 1700); tick(t + 0.002, 0.2, 550);
      tick(t + 0.075, 0.18, 1300);
    };
    return api;
  })();
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // only things you can actually interact with: buttons, links, hotspots, quiz options
    if (e.target.closest('a, button, .hot, [data-copy], .tag, .sticky')) Sound.click();
  }, { passive: true });

  /* ---------- frame loop ---------- */
  const trail = [];
  let last = performance.now(), clockTick = 0;

  const update = (dt) => {
    S.t += dt;
    clockTick += dt;
    if (clockTick > 15) { clockTick = 0; ist = istNow(); S.istHour = ist.h; S.istMin = ist.m; S.istDay = ist.d; S.istMon = ist.mon; S.sky = nightFromHour(ist.h + ist.m / 60); }
    S.night += (nightTarget - S.night) * Math.min(1, dt * 2.5);
    S.party += (partyTarget - S.party) * Math.min(1, dt * 3);
    S.beat = Math.max(0, S.beat - dt * 5);
    if (!S.music) S.beat = (Math.sin(S.t * 6) + 1) / 2 > 0.92 ? 0.8 : S.beat;

    const ct = camTarget();
    const sec = ct.sec;
    const av = S.av;

    // where is her head on screen? (for eye-tracking + bubble)
    const head = toScreen(213, 100);
    if (mouse.active) {
      av.lx = Math.max(-1, Math.min(1, (mouse.px - head.x) / (vw * 0.18)));
      av.ly = Math.max(-1, Math.min(1, (mouse.py - head.y) / (vh * 0.25)));
    } else { av.lx = Math.sin(S.t * 0.4) * 0.5; av.ly = 0; }

    // blink
    if (S.t > A.blinkAt) { A.blinkEnd = S.t + 0.13; A.blinkAt = S.t + 2.2 + Math.random() * 3; }
    av.blink = S.t < A.blinkEnd ? 1 : 0;
    // nostril piercing glint
    if (S.t > A.sparkleAt) { A.sparkleAt = S.t + 3 + Math.random() * 3; }
    av.sparkle = S.t > A.sparkleAt - 0.18 ? 1 : 0;

    // per-section mood
    av.wink = 0; av.mouth = 'smile';
    if (sec === 2) {
      A.winkCycle += dt;
      const c = A.winkCycle % 3.2;
      if (c < 0.7) { av.wink = 1; av.mouth = 'grin'; av.blink = 0; if (c < dt * 1.5) { Scene.emit('spark', 226, 104, { vx: 10, vy: -8, col: '#ffe27a', max: 0.9 }); Scene.emit('heart', 224, 102, { vx: 8, vy: -10, max: 1.4 }); } }
      if (A.winkCycle < 2.2 && A.waveUntil < S.t + 0.1) A.waveUntil = S.t + 0.2;
      if (meBubbleUntil < performance.now() && A.winkCycle > 0.3 && A.winkCycle < 0.5) meBubbleUntil = say(meBubble, "let's talk ;)", 3);
    } else { A.winkCycle = 0; }
    if (S.t < A.talkUntil) av.mouth = Math.floor(S.t * 9) % 2 ? 'o' : 'smile';
    if (sec === 0 && S.t > A.nextWave) { A.waveUntil = S.t + 1.5; A.nextWave = S.t + 9 + Math.random() * 6; }
    av.wave = S.t < A.waveUntil ? 1 : 0;
    if (av.wave && av.mouth === 'smile') av.mouth = 'open';
    av.waveT = S.t;
    av.bob = (S.music || S.party > 0.5) ? (Math.floor(S.t * (S.party > 0.5 ? 4 : 3.06)) % 2) : 0;

    // Limoo
    const cs = S.cat, catHovered = S.hover === 'cat';
    const awake = catHovered || S.t < K.awakeUntil || S.party > 0.5;
    cs.awake += ((awake ? 1 : 0) - cs.awake) * Math.min(1, dt * 8);
    cs.breathe = Math.floor(S.t * (awake ? 2 : 0.9)) % 2;
    cs.tail = S.t * (awake ? 5 : 1.6);
    if (S.t > K.earAt) { cs.ear = 1; if (S.t > K.earAt + 0.15) { cs.ear = 0; K.earAt = S.t + 3 + Math.random() * 5; } }
    const catHead = toScreen(146, 133);
    cs.look = awake && mouse.active ? Math.max(-1, Math.min(1, (mouse.px - catHead.x) / (vw * 0.12))) : 0;
    cs.blink = awake && (S.t % 4) < 0.12 ? 1 : 0;
    if (!awake && S.t > K.zAt) { K.zAt = S.t + 1.6; Scene.emit('z', 142, 124, { vx: 3, vy: -5, max: 2.4, col: '#ffffff' }); }

    // boombox notes
    if ((S.music || S.hover === 'speaker') && Math.random() < dt * (S.music ? 3 : 2)) {
      Scene.emit('note', 146 + Math.random() * 30, 104, { vy: -10, vx: (Math.random() - 0.5) * 8, col: ['#ff5fb0', '#ffe27a', '#7fd0f0', '#9ef0c8'][Math.floor(Math.random() * 4)], max: 2.6 });
    }
    if (S.party > 0.5 && Math.random() < dt * 6) Scene.emit('spark', 60 + Math.random() * 260, 40 + Math.random() * 100, { vy: 0, vx: 0, max: 0.6, col: ['#ff9fd2', '#8fd8ff', '#ffe27a'][Math.floor(Math.random() * 3)] });

    // camera follow
    if (!cam || reduced) cam = { ...ct };
    else { const f = 1 - Math.exp(-dt * 5); for (const k of ['fx', 'fy', 'sx', 'sy', 'z']) cam[k] += (ct[k] - cam[k]) * f; }
  };

  const view = () => {
    const s = baseScale() * cam.z;
    const par = reduced ? 0 : 1;
    const ox = vw * dpr * cam.sx - cam.fx * s + (mouse.x - 0.5) * -16 * dpr * par;
    const oy = vh * dpr * cam.sy - cam.fy * s + (mouse.y - 0.5) * -10 * dpr * par;
    return { s, ox: Math.round(ox), oy: Math.round(oy) };
  };
  const toScreen = (x, y) => {
    if (!cam) return { x: 0, y: 0 };
    const v = view();
    return { x: (v.ox + x * v.s) / dpr, y: (v.oy + y * v.s) / dpr };
  };

  const render = () => {
    const v = view();
    const W = stage.width, H = stage.height;
    ctx.clearRect(0, 0, W, H);

    // pixel stars with parallax
    const ps = Math.max(2, Math.round(dpr * 2.5));
    for (const st of stars) {
      const tw = (Math.sin(S.t * (1 + st.d) + st.ph) + 1) / 2;
      if (tw < 0.25) continue;
      let x = (st.x * W + (mouse.x - 0.5) * -40 * st.d * dpr) % W;
      let y = ((st.y * H - scrollY * dpr * 0.15 * st.d) % H + H) % H;
      ctx.fillStyle = st.col; ctx.globalAlpha = 0.35 + tw * 0.65;
      x = Math.round(x / ps) * ps; y = Math.round(y / ps) * ps;
      ctx.fillRect(x, y, ps, ps);
      if (st.big && tw > 0.7) { ctx.fillRect(x - ps, y, ps, ps); ctx.fillRect(x + ps, y, ps, ps); ctx.fillRect(x, y - ps, ps, ps); ctx.fillRect(x, y + ps, ps, ps); }
    }
    ctx.globalAlpha = 1;

    const frame = Scene.draw(lastDt);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, 0, 0, Scene.W, Scene.H, v.ox, v.oy, Math.round(Scene.W * v.s), Math.round(Scene.H * v.s));

    // hotspots follow the camera
    for (const h of HOT) {
      const r = h.rect;
      const x = (v.ox + r.x * v.s) / dpr, y = (v.oy + r.y * v.s) / dpr, w = r.w * v.s / dpr, hh = r.h * v.s / dpr;
      const off = x + w < 0 || y + hh < 0 || x > vw || y > vh;
      if (off !== h.el.hidden) h.el.hidden = off;
      if (!off) h.el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${hh}px`;
      const talking = (h.id === 'cat' && catBubble.classList.contains('on')) || (h.id === 'me' && meBubble.classList.contains('on'));
      if (tipFor === h && talking) tip.className = 'tip';
      else if (tipFor === h) {
        tip.textContent = typeof h.label === 'function' ? h.label() : h.label;
        tip.className = 'tip on' + (h.cls ? ' ' + h.cls : '');
        tip.style.left = Math.max(70, Math.min(vw - 70, x + w / 2)) + 'px';
        tip.style.top = Math.max(60, y - 10) + 'px';
      }
    }
    if (!tipFor) tip.className = 'tip';

    // bubbles
    const now = performance.now();
    const hb = toScreen(224, 92);
    meBubble.style.left = hb.x + 'px'; meBubble.style.top = hb.y + 'px';
    if (now > meBubbleUntil) meBubble.classList.remove('on');
    const cb = toScreen(154, 124);
    catBubble.style.left = cb.x + 'px'; catBubble.style.top = cb.y + 'px';
    if (now > catBubbleUntil) catBubble.classList.remove('on');

    // sparkle cursor trail
    fctx.clearRect(0, 0, fxc.width, fxc.height);
    const q = Math.max(2, Math.round(dpr * 2));
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i]; p.life += lastDt; p.y += lastDt * 20;
      if (p.life > 0.6) { trail.splice(i, 1); continue; }
      const X = Math.round(p.x * dpr / q) * q, Y = Math.round(p.y * dpr / q) * q, k = p.life < 0.25 ? 2 : 1;
      fctx.globalAlpha = 1 - p.life / 0.6; fctx.fillStyle = p.col;
      fctx.fillRect(X - k * q, Y, (k * 2 + 1) * q, q); fctx.fillRect(X, Y - k * q, q, (k * 2 + 1) * q);
    }
    fctx.globalAlpha = 1;
  };

  let lastDt = 0.016;
  const loop = (now) => {
    lastDt = Math.min(0.05, (now - last) / 1000); last = now;
    update(lastDt);
    render();
    requestAnimationFrame(loop);
  };

  addEventListener('resize', resize);
  addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
  resize();
  Scene.init();
  update(0.016);
  requestAnimationFrame((t) => { last = t; loop(t); });

  /* ---------- music on by default ---------- */
  // browsers only allow sound after a gesture, so the first tap or key anywhere starts it
  let musicOptOut = false;
  try { musicOptOut = localStorage.getItem('bou-music-off') === '1'; } catch {}
  if (!musicOptOut) {
    const autoStart = (e) => {
      removeEventListener('pointerdown', autoStart, true); removeEventListener('keydown', autoStart, true);
      if (e.target && e.target.closest && e.target.closest('#musicBtn')) return;
      if (!Sound.on) Sound.toggle(true);
    };
    addEventListener('pointerdown', autoStart, true); addEventListener('keydown', autoStart, true);
  }

  /* ---------- boot screen ---------- */
  const boot = $('#boot');
  const msgs = ['starting up…', 'waking up limoo…', 'brewing tea…', 'untangling fairy lights…', 'tuning the boombox…', 'ready ✦'];
  if (reduced || sessionStorageSeen()) { boot.classList.add('done'); }
  else {
    const bars = boot.querySelectorAll('.boot-bar i');
    let i = 0;
    const iv = setInterval(() => {
      if (i < bars.length) bars[i].classList.add('on');
      $('#bootMsg').textContent = msgs[Math.min(msgs.length - 1, Math.floor(i / 2.2))];
      i++;
      if (i > bars.length + 2) { clearInterval(iv); boot.classList.add('done'); }
    }, 110);
    boot.addEventListener('click', () => { clearInterval(iv); boot.classList.add('done'); });
  }
  function sessionStorageSeen() { try { const s = sessionStorage.getItem('bourla.seen'); sessionStorage.setItem('bourla.seen', '1'); return !!s; } catch { return false; } }
})();
