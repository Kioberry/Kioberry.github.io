import { useEffect, useRef } from 'react';

// Procedural 16-bit style scene: Y2K dusk sky over a cyberpunk skyline, with Astrid's twin in front.
// Everything is drawn on a 192x144 grid and upscaled with `image-rendering: pixelated`.
// Swap this component for a generated <img>/<video> portrait later without touching the page.

export const W = 192;
export const H = 144;
const CX = 96;

const C = {
  outline: '#2b1d4a',
  hairDark: '#3a1c17', hair: '#5a2a20', hairMid: '#6f3626', hairHi: '#9a5238', hairShine: '#c27454',
  skin: '#f8dccb', skinLight: '#fde9dc', skinShade: '#ebbca7', skinDeep: '#dba08b',
  lash: '#2a1612', iris: '#4a2a1e', irisLow: '#8a5038', white: '#ffffff', lowLash: '#c99a88',
  lip: '#e07f88', lipDeep: '#c45a66', lipHi: '#ffc2c6', mouth: '#7a2e36',
  shirt: '#fbfaff', shirtShade: '#e2def0',
  vest: '#a9d4f5', vestRib: '#94c3ec', vestEdge: '#6e9dcc', vestShade: '#86b3e0',
};

const hash = (x, y = 0) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------- background (static) ----------

function drawBackground(ctx) {
  const put = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };

  // dithered sky bands
  const sky = ['#6c58d4', '#8c72e6', '#b49af0', '#d7a8ee', '#f2b3d9', '#ffc9cf', '#ffdcc8'];
  const horizon = 100;
  for (let y = 0; y < horizon; y++) {
    const t = (y / horizon) * (sky.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    for (let x = 0; x < W; x++) {
      const pick = f * 16 > BAYER[y % 4][x % 4] ? sky[Math.min(i + 1, sky.length - 1)] : sky[i];
      put(x, y, pick);
    }
  }

  // moon with soft ring
  for (let y = 8; y < 52; y++) {
    for (let x = 136; x < 180; x++) {
      const d = Math.hypot(x - 158, y - 30);
      if (d < 12) put(x, y, d < 10 ? '#fff6fb' : '#ffe3f1');
      else if (d < 15 && BAYER[y % 4][x % 4] < 6) put(x, y, '#f6c6e6');
    }
  }

  // pixel clouds
  const cloud = (cx, cy, w) => {
    for (let y = -3; y <= 3; y++) {
      for (let x = -w; x <= w; x++) {
        const r = (x * x) / (w * w) + (y * y) / 9 + hash(x + cx, y) * 0.25;
        if (r < 1) put(cx + x, cy + y, y > 1 ? '#e6c7f2' : '#fbeefe');
      }
    }
  };
  cloud(30, 26, 14);
  cloud(48, 22, 9);
  cloud(128, 52, 11);

  // far skyline
  let x = 0;
  while (x < W) {
    const w = 6 + Math.floor(hash(x, 1) * 10);
    const h = 18 + Math.floor(hash(x, 2) * 22);
    ctx.fillStyle = '#a58fdf';
    ctx.fillRect(x, horizon - h, w, h);
    x += w + 1;
  }

  // near skyline: taller toward the edges so the twin stays framed
  x = 0;
  while (x < W) {
    const w = 9 + Math.floor(hash(x, 3) * 12);
    const edge = Math.abs(x + w / 2 - CX) / CX;
    const h = 14 + Math.floor(edge * 46 + hash(x, 4) * 14);
    ctx.fillStyle = '#5c4a9e';
    ctx.fillRect(x, horizon - h, w, h);
    ctx.fillStyle = '#6d5ab3';
    ctx.fillRect(x, horizon - h, 1, h);
    if (hash(x, 5) > 0.6) {
      ctx.fillStyle = '#5c4a9e';
      ctx.fillRect(x + Math.floor(w / 2), horizon - h - 6, 1, 6);
      put(x + Math.floor(w / 2), horizon - h - 7, '#ff7ad9');
    }
    x += w + 2;
  }

  // neon heart sign on the right, vertical neon bar on the left
  const heart = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  heart.forEach((row, j) =>
    [...row].forEach((ch, i) => ch === 'X' && put(166 + i, 58 + j, '#ff8fe0'))
  );
  ctx.fillStyle = 'rgba(255,143,224,0.25)';
  ctx.fillRect(164, 56, 11, 10);
  ctx.fillStyle = '#7ef9ff';
  ctx.fillRect(14, 50, 2, 26);
  ctx.fillStyle = 'rgba(126,249,255,0.22)';
  ctx.fillRect(12, 48, 6, 30);

  // ground + synthwave grid
  for (let y = horizon; y < H; y++) {
    ctx.fillStyle = y % 2 ? '#2f2460' : '#33276a';
    ctx.fillRect(0, y, W, 1);
  }
  ctx.fillStyle = '#ff7ad9';
  ctx.fillRect(0, horizon, W, 1);
  for (let k = 1; k < 9; k++) {
    const y = horizon + Math.round(k * k * 0.6);
    if (y < H) {
      ctx.fillStyle = 'rgba(255,122,217,0.55)';
      ctx.fillRect(0, y, W, 1);
    }
  }
  for (let k = -12; k <= 12; k++) {
    for (let y = horizon; y < H; y++) {
      const t = (y - horizon) / (H - horizon);
      const gx = Math.round(CX + k * 6 + k * 40 * t);
      if (gx >= 0 && gx < W) put(gx, y, 'rgba(126,249,255,0.45)');
    }
  }
}

// window lights on the near skyline, re-rolled each frame for a flicker
function buildWindows() {
  const list = [];
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, 7) * W);
    const edge = Math.abs(x - CX) / CX;
    const y = 100 - 4 - Math.floor(hash(i, 8) * (10 + edge * 40));
    const colors = ['#7ef9ff', '#ff8fe0', '#ffe08a'];
    list.push({ x, y, c: colors[i % 3], seed: hash(i, 9) });
  }
  return list;
}

function buildStars() {
  const list = [];
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 11) * W);
    const y = Math.floor(hash(i, 12) * 46);
    if (Math.hypot(x - 158, y - 30) > 17) list.push({ x, y, seed: hash(i, 13) });
  }
  return list;
}

// ---------- character (static base + animated face) ----------

function drawCharacter(ctx) {
  const put = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const hairTone = (x, y) => {
    const r = hash(x, 77);
    if (r < 0.1) return C.hairDark;
    if (r > 0.8) return C.hairMid;
    return hash(x, Math.floor(y / 9)) > 0.93 ? C.hairMid : C.hair;
  };

  // back hair
  for (let y = 21; y < 136; y++) {
    let hw;
    if (y < 48) hw = 29 * Math.sqrt(Math.max(0, 1 - ((y - 48) / 27) ** 2));
    else hw = 29 + (y - 48) * 0.12;
    hw = Math.round(hw);
    for (let x = CX - hw; x <= CX + hw; x++) {
      const end = 124 + Math.floor(hash(x, 21) * 10);
      if (y < end) put(x, y, hairTone(x, y));
    }
  }

  // neck
  for (let y = 70; y < 92; y++) {
    for (let x = CX - 7; x <= CX + 7; x++) put(x, y, y < 78 ? C.skinShade : C.skin);
  }

  // torso: white shirt with sleeves, light-blue knit vest, V-neck with collar
  for (let y = 86; y < H; y++) {
    const tw = Math.round(y < 95 ? 12 + (y - 86) * 3.1 : 40 + (y - 95) * 0.12);
    for (let x = CX - tw; x <= CX + tw; x++) {
      const dx = Math.abs(x - CX);
      const vneck = Math.max(0, 10 - (y - 88) * 0.4);
      const sleeve = y >= 93 && dx > tw - 7;
      let c;
      if (sleeve) c = (x + y) % 9 === 0 ? C.shirtShade : C.shirt;
      else if (dx < vneck) c = y > 104 ? C.shirtShade : C.shirt;
      else if (Math.abs(dx - vneck) < 1.5 && y < 113) c = C.vestEdge;
      else if (dx > tw - 10) c = C.vestShade;
      else c = Math.floor(x / 2) % 2 ? C.vest : C.vestRib;
      if (sleeve && dx === tw - 7) c = C.vestEdge;
      put(x, y, c);
    }
  }
  // shirt collar points
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j <= i; j++) {
      put(CX - 9 + j + Math.floor(i / 2), 87 + i, C.shirt);
      put(CX + 9 - j - Math.floor(i / 2), 87 + i, C.shirt);
    }
  }
  // a button line under the V
  put(CX, 114, C.vestEdge);
  put(CX, 120, C.vestEdge);
  put(CX, 126, C.vestEdge);

  // face
  for (let y = 33; y < 80; y++) {
    let hw;
    if (y < 37) hw = 17 - (37 - y);
    else if (y < 58) hw = 17;
    else hw = 17 - Math.pow((y - 58) / 21, 1.5) * 11;
    hw = Math.round(hw);
    for (let x = CX - hw; x <= CX + hw; x++) {
      const edge = Math.abs(x - CX) >= hw - 1;
      put(x, y, edge ? C.skinShade : y > 70 && Math.abs(x - CX) > hw - 3 ? C.skinShade : C.skin);
    }
  }
  // cheek light
  for (let x = CX - 12; x <= CX - 8; x++) put(x, 57, C.skinLight);
  for (let x = CX + 8; x <= CX + 12; x++) put(x, 57, C.skinLight);

  // nose
  put(CX + 1, 61, C.skinShade);
  put(CX, 63, C.skinDeep);
  put(CX + 1, 63, C.skinShade);

  // mole under her eye (from the reference photos)
  put(CX + 5, 59, '#7a4232');

  // crown over the forehead + blunt bangs (齐刘海)
  for (let x = CX - 20; x <= CX + 20; x++) {
    const dx = Math.abs(x - CX);
    const wisp = Math.floor(hash(x, 31) * 3) - 1;
    const gap = hash(x, 32) > 0.9 ? -3 : 0;
    const bottom = 47 + wisp + gap + (dx > 15 ? Math.round((dx - 15) * 1.6) : 0);
    for (let y = 22; y <= bottom; y++) {
      const dome = 29 * Math.sqrt(Math.max(0, 1 - ((y - 48) / 27) ** 2));
      if (dx <= dome) {
        let c = hairTone(x, y);
        if (y > bottom - 3 && x % 3 === 0) c = C.hairDark;
        put(x, y, c);
      }
    }
  }
  // glossy halo shine across the crown
  for (let x = CX - 14; x <= CX + 14; x++) {
    if (hash(x, 41) > 0.35) {
      const y = 30 + Math.round(((x - CX) / 14) ** 2 * 3);
      put(x, y, C.hairHi);
      if (hash(x, 42) > 0.6) put(x, y + 1, C.hairShine);
    }
  }

  // face-framing side locks sweeping toward the cheeks
  for (let y = 44; y < 82; y++) {
    const inset = 2 + Math.round(3 * Math.sin(((y - 44) / 38) * Math.PI));
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 6 + inset; k++) {
        const x = CX + s * (17 - inset + k + 1);
        put(x, y, k === 0 ? C.hairDark : hairTone(x, y));
      }
    }
  }

  // long front strands falling over the shoulders
  for (let y = 66; y < H; y++) {
    for (let s = -1; s <= 1; s += 2) {
      const inner = 18 + Math.round(Math.max(0, y - 90) * 0.06);
      const outer = 29 + Math.round((y - 66) * 0.11);
      for (let d = inner; d <= outer; d++) {
        const x = CX + s * d;
        const end = 132 + Math.floor(hash(x, 51) * 12);
        if (y < end) {
          let c = hairTone(x, y);
          if (d === inner || (d - inner) % 7 === 0) c = C.hairDark;
          if (y > 97 && y < 103 && hash(x, 61) > 0.3) c = C.hairHi;
          put(x, y, c);
        }
      }
    }
  }
}

function addOutline(ctx) {
  const img = ctx.getImageData(0, 0, W, H);
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img.data[(y * W + x) * 4 + 3]);
  const [r, g, b] = hexToRgb(C.outline);
  const out = new Uint8ClampedArray(img.data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (a(x, y)) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
        const i = (y * W + x) * 4;
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

// right eye authored; left eye is the mirror
const EYE_OPEN = [
  '..LLLLLL..',
  '.LLLLLLLLL',
  '.LWHIIIWL.',
  '.WIIPPIIW.',
  '.WIIPPIIW.',
  '..WJJJJW..',
  '...llll...',
];
const EYE_CLOSED = ['..........', '..........', '..........', '.LLLLLLLL.', '..llllll..', '..........', '..........'];
const EYE_SMILE = ['..........', '..........', '...LLLL...', '..L....L..', '.L......L.', '..........', '..........'];
const EYE_COLORS = { L: C.lash, W: C.white, I: C.iris, H: C.white, P: C.lash, J: C.irisLow, l: C.lowLash };

function drawFace(ctx, { blink, talking, mouthOpen, expression }) {
  const put = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const eye = blink ? EYE_CLOSED : expression === 'laugh' ? EYE_SMILE : EYE_OPEN;
  for (let j = 0; j < eye.length; j++) {
    for (let i = 0; i < 10; i++) {
      // clear to skin first so blinking erases the open eye
      const c = eye[j][i] === '.' ? C.skin : EYE_COLORS[eye[j][i]];
      put(CX + 4 + i, 49 + j, c);
      put(CX - 4 - i, 49 + j, c);
    }
  }

  // blush + little anime hatch marks
  ctx.fillStyle = 'rgba(255,120,150,0.32)';
  ctx.fillRect(CX - 14, 59, 6, 2);
  ctx.fillRect(CX + 9, 59, 6, 2);
  [[-13, 59], [-11, 59], [10, 59], [12, 59]].forEach(([dx, y]) => put(CX + dx, y, '#f29aa8'));

  // mouth area reset
  for (let y = 65; y < 70; y++) for (let x = CX - 5; x <= CX + 5; x++) put(x, y, C.skin);

  const thinking = expression === 'think';
  if (talking && mouthOpen) {
    for (let x = CX - 3; x <= CX + 3; x++) put(x, 66, C.lipDeep);
    for (let x = CX - 2; x <= CX + 2; x++) put(x, 67, C.mouth);
    for (let x = CX - 3; x <= CX + 3; x++) put(x, 68, C.lip);
    put(CX - 1, 68, C.lipHi);
  } else if (thinking) {
    for (let x = CX - 2; x <= CX + 2; x++) put(x, 67, C.lipDeep);
    put(CX - 1, 68, C.lip);
    put(CX, 68, C.lip);
  } else {
    // soft gradient lips (deeper in the middle), corners lifted when smiling
    for (let x = CX - 2; x <= CX + 2; x++) put(x, 66, x === CX ? C.lipDeep : C.lip);
    for (let x = CX - 3; x <= CX + 3; x++) put(x, 67, Math.abs(x - CX) < 2 ? C.lipDeep : C.lip);
    for (let x = CX - 2; x <= CX + 2; x++) put(x, 68, C.lip);
    put(CX - 1, 68, C.lipHi);
    if (expression === 'smile' || expression === 'laugh') {
      put(CX - 4, 66, C.lipDeep);
      put(CX + 4, 66, C.lipDeep);
    }
  }
}

// Fallback portrait used until a generated image exists in public/twin/ (see TwinStage).
export default function PixelScene({ talking = false, expression = 'idle', background = true, className }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ talking, expression });
  stateRef.current = { talking, expression };

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    const bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    if (background) drawBackground(bg.getContext('2d'));

    const body = document.createElement('canvas');
    body.width = W;
    body.height = H;
    const bctx = body.getContext('2d', { willReadFrequently: true });
    drawCharacter(bctx);
    addOutline(bctx);

    const windows = buildWindows();
    const stars = buildStars();
    let nextBlink = performance.now() + 2500;
    let blinkUntil = 0;
    let raf;
    let last = 0;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 90) return; // ~11fps keeps the retro feel
      last = now;
      if (now > nextBlink) {
        blinkUntil = now + 140;
        nextBlink = now + 2500 + Math.random() * 3000;
      }

      ctx.clearRect(0, 0, W, H);
      if (background) {
        ctx.drawImage(bg, 0, 0);
        const tick = Math.floor(now / 400);
        stars.forEach((s) => {
          const on = hash(Math.floor(s.seed * 100), tick) > 0.35;
          if (!on) return;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(s.x, s.y, 1, 1);
          if (s.seed > 0.75) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(s.x - 1, s.y, 3, 1);
            ctx.fillRect(s.x, s.y - 1, 1, 3);
          }
        });
        windows.forEach((w, i) => {
          if (hash(i, Math.floor(now / 700 + w.seed * 5)) > 0.2) {
            ctx.fillStyle = w.c;
            ctx.fillRect(w.x, w.y, 1, 1);
          }
        });
      }
      // breathing: a 1px bob every couple of seconds
      const bob = Math.floor(now / 1100) % 2;
      ctx.drawImage(body, 0, bob);
      ctx.save();
      ctx.translate(0, bob);
      const { talking: t, expression: e } = stateRef.current;
      drawFace(ctx, { blink: now < blinkUntil, talking: t, mouthOpen: Math.floor(now / 140) % 2 === 0, expression: e });
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [background]);

  return <canvas ref={canvasRef} width={W} height={H} className={className} aria-label="Pixel portrait of Astrid's digital twin" role="img" />;
}
