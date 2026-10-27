import { useEffect, useRef } from 'react';
import { toneMap } from './useMediaFrames';
import { hexRgb, mixRgb } from './sceneConfig';

// The twin as lit ASCII on a canvas. Unlike AsciiPortrait's fixed crop, the grid is fitted to her
// silhouette (found in each source). Glyphs are coloured along a shadow → mid → highlight ramp, the edge
// facing the scene's light picks up a rim colour, and glyphs near the pointer scramble and get pushed
// aside, leaving a short trail (after matthewpetersen.ca). `look` applies live; only the media and the
// font restart the loop.

export const RAMPS = {
  classic: ' .:-=+*#%@',
  fine: " .'`^,:;Il!i~+_-?]}1)|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@",
  blocks: ' ░▒▓█',
  binary: ' .01',
  symbols: ' .-+x*#',
};
const SCRAMBLE = '!<>-_\\/[]{}=+*^?#%@&$01';
const MOUTH = { cx: 0.5, cy: 0.49, w: 0.06, h: 0.05 }; // fractions of the source, as in AsciiPortrait
const BACKDROP = 0.09; // luminance below this is the black backdrop (the video's corners sit near 0.07)
const LEVELS = 5; // tone steps in the colour ramp; each also has 3 rim steps

// Bounding box of the lit subject, as fractions of the source, padded a little at the sides.
function findSubject(source, w, h) {
  const sw = 160;
  const sh = Math.max(1, Math.round((h / w) * sw));
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, sw, sh);
  const d = ctx.getImageData(0, 0, sw, sh).data;
  const colHits = new Uint16Array(sw);
  const rowHits = new Uint16Array(sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const p = (y * sw + x) * 4;
      if ((0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255 > 0.1) {
        colHits[x]++;
        rowHits[y]++;
      }
    }
  }
  // the longest run of lit lines, so a stray lit column at the frame edge (encoder noise) is ignored
  const span = (hits, n, of) => {
    let best = null;
    let start = -1;
    for (let i = 0; i <= n; i++) {
      const lit = i < n && hits[i] >= of * 0.03;
      if (lit && start < 0) start = i;
      if (!lit && start >= 0) {
        if (!best || i - start > best[1] - best[0]) best = [start, i];
        start = -1;
      }
    }
    return best ? [best[0] / n, best[1] / n] : [0, 1];
  };
  let [x0, x1] = span(colHits, sw, sh);
  const [y0, y1] = span(rowHits, sh, sw);
  const pad = (x1 - x0) * 0.05;
  x0 = Math.max(0, x0 - pad);
  x1 = Math.min(1, x1 + pad);
  return { x0, x1, y0, y1 };
}

// rgb + css for every (rim, tone) bucket; index = rim * LEVELS + level
function buildPalette(c) {
  const sh = hexRgb(c.shadow);
  const md = hexRgb(c.mid);
  const hi = hexRgb(c.high);
  const rm = hexRgb(c.rim);
  const rgb = [];
  const css = [];
  for (let r = 0; r < 3; r++) {
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const base = t < 0.5 ? mixRgb(sh, md, t * 2) : mixRgb(md, hi, (t - 0.5) * 2);
      const col = mixRgb(base, rm, (r / 2) * 0.85);
      rgb.push(col);
      css.push(`rgba(${col.join(',')}, ${Math.min(1, 0.5 + 0.5 * t + (r ? 0.1 : 0))})`);
    }
  }
  return { key: JSON.stringify(c), rgb, css, disturb: hexRgb(c.disturb) };
}

export default function AsciiFigure({ video, poster, font = 'Fira Code', fps = 30, look, talking = false, className = '', label }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const lookRef = useRef(look);
  lookRef.current = look;
  const talkingRef = useRef(talking);
  talkingRef.current = talking;

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const sample = document.createElement('canvas');
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    const fontSpec = (px) => `${px}px '${font}', ui-monospace, Menlo, monospace`;

    let aspect = 0.6; // glyph advance / line height, measured once the font has loaded
    let ready = false;
    let alive = true;
    let crop = null; // { source, cols, rows, sx, sy, sw, sh, w, h }
    let fs = 0;
    let heat = null; // per-cell disturbance, decays every frame
    let pointer = null; // in px relative to the box, or null when the pointer is away
    let lastPointer = { x: 0, y: 0 };
    let pal = null;
    const aligned = {}; // ramp -> whether every glyph has the font's advance, so a row can be one string
    let raf;
    let last = 0;
    let visible = true;

    const layout = () => {
      if (!crop) return;
      const W = box.clientWidth;
      fs = W / (crop.cols * aspect);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(crop.rows * fs * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontSpec(fs);
      ctx.textBaseline = 'top';
      ctx.textRendering = 'optimizeSpeed'; // no ligatures: every glyph keeps its own cell
    };

    const fit = (source, w, h, cols) => {
      if (crop && crop.source === source && crop.cols === cols) return;
      const s = findSubject(source, w, h);
      const sx = s.x0 * w;
      const sy = s.y0 * h;
      const sw = (s.x1 - s.x0) * w;
      const sh = (s.y1 - s.y0) * h;
      const rows = Math.round(cols * aspect * (sh / sw));
      crop = { source, cols, rows, w, h, sx, sy, sw, sh };
      heat = new Float32Array(cols * rows);
      sample.width = cols;
      sample.height = rows;
      box.style.aspectRatio = `${cols * aspect} / ${rows}`;
      // a source that runs off the top of its frame fades out there instead of ending in a hard line
      box.classList.toggle('is-cut-top', s.y0 < 0.02);
      layout();
    };

    const draw = (source, w, h) => {
      const lk = lookRef.current;
      fit(source, w, h, lk.cols);
      if (!pal || pal.key !== JSON.stringify(lk.colors)) pal = buildPalette(lk.colors);
      const ramp = RAMPS[lk.ramp] || RAMPS.classic;
      const top = ramp.length - 1;
      if (aligned[ramp] === undefined) {
        const adv = ctx.measureText('M').width;
        aligned[ramp] = [...ramp].every((g) => Math.abs(ctx.measureText(g).width - adv) < adv * 0.002);
      }
      const { cols, rows, sx, sy, sw, sh } = crop;
      const n = cols * rows;

      sctx.drawImage(source, sx, sy, sw, sh, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;
      const tone = toneMap(data, cols, rows);

      // distance (in cells) from each subject cell to the backdrop: drives the rim
      const dist = new Float32Array(n);
      for (let p = 0; p < n; p++) {
        const l = (0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2]) / 255;
        dist[p] = l < BACKDROP ? 0 : 1e4;
        if (!dist[p]) tone[p] = 0;
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const p = y * cols + x;
          if (!dist[p]) continue;
          if (x > 0) dist[p] = Math.min(dist[p], dist[p - 1] + 1);
          if (y > 0) dist[p] = Math.min(dist[p], dist[p - cols] + 1);
          if (x > 0 && y > 0) dist[p] = Math.min(dist[p], dist[p - cols - 1] + 1.4);
          if (x < cols - 1 && y > 0) dist[p] = Math.min(dist[p], dist[p - cols + 1] + 1.4);
        }
      }
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = cols - 1; x >= 0; x--) {
          const p = y * cols + x;
          if (!dist[p]) continue;
          if (x < cols - 1) dist[p] = Math.min(dist[p], dist[p + 1] + 1);
          if (y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols] + 1);
          if (x < cols - 1 && y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols + 1] + 1.4);
          if (x > 0 && y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols - 1] + 1.4);
          // the frame edges are not silhouette: cells there count as deep, not as rim
          if (dist[p] > 9e3) dist[p] = 40;
        }
      }

      // disturbance: heat the cells under the pointer, let the rest cool off into a trail
      const cw = fs * aspect;
      const dz = lk.disturb;
      for (let p = 0; p < n; p++) heat[p] *= dz.decay;
      if (pointer && dz.strength > 0 && dz.radius > 0) {
        const R = dz.radius;
        const x0 = Math.max(0, Math.floor((pointer.x - R) / cw));
        const x1 = Math.min(cols - 1, Math.ceil((pointer.x + R) / cw));
        const y0 = Math.max(0, Math.floor((pointer.y - R) / fs));
        const y1 = Math.min(rows - 1, Math.ceil((pointer.y + R) / fs));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const dx = x * cw + cw / 2 - pointer.x;
            const dy = y * fs + fs / 2 - pointer.y;
            const f = 1 - (dx * dx + dy * dy) / (R * R);
            if (f > 0) heat[y * cols + x] = Math.max(heat[y * cols + x], dz.strength * f * f);
          }
        }
      }

      const mouth = talkingRef.current && {
        x0: Math.round((((MOUTH.cx - MOUTH.w / 2) * crop.w - sx) / sw) * cols),
        x1: Math.round((((MOUTH.cx + MOUTH.w / 2) * crop.w - sx) / sw) * cols),
        y0: Math.round((((MOUTH.cy - MOUTH.h / 2) * crop.h - sy) / sh) * rows),
        y1: Math.round((((MOUTH.cy + MOUTH.h / 2) * crop.h - sy) / sh) * rows),
      };
      const ln = Math.hypot(lk.light[0], lk.light[1]) || 1;
      const lx = lk.light[0] / ln;
      const ly = lk.light[1] / ln;
      const rimFloor = Math.max(1, Math.ceil(top * 0.2));
      const at = (x, y) => dist[Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x))];
      const loose = []; // disturbed glyphs, drawn one by one so they can move

      ctx.clearRect(0, 0, box.clientWidth, rows * fs);
      for (let y = 0; y < rows; y++) {
        const bufs = [];
        for (let x = 0; x < cols; x++) {
          const p = y * cols + x;
          const d = dist[p];
          const hv = heat[p];
          let idx = d ? Math.round(Math.pow(tone[p], lk.gamma) * top) : 0;
          let rim = 0;
          if (d) {
            // rim: cells near the silhouette whose outward side faces the light
            const nx = at(x + 1, y) - at(x - 1, y);
            const ny = at(x, y + 1) - at(x, y - 1);
            const facing = Math.max(0, -(nx * lx + ny * ly) / (Math.hypot(nx, ny) || 1));
            rim = Math.max(0, 1 - (d - 1) / 3.5) * (0.3 + 0.7 * facing) * lk.rim;
            if (rim > 0.5) idx = Math.max(idx, rimFloor);
            if (mouth && y >= mouth.y0 && y <= mouth.y1 && x >= mouth.x0 && x <= mouth.x1 && Math.random() < 0.4) {
              idx = Math.max(1, Math.min(top, idx + Math.round((Math.random() - 0.5) * 3)));
            }
          }
          const r = rim > 0.6 ? 2 : rim > 0.25 ? 1 : 0;
          if (hv > 0.12 && Math.random() < hv * (idx ? 1 : dz.spill)) {
            const level = idx ? Math.round((idx / top) * (LEVELS - 1)) : LEVELS - 1;
            loose.push(x, y, r * LEVELS + level, hv);
            continue;
          }
          if (!idx) continue;
          let level = Math.round((idx / top) * (LEVELS - 1));
          if (lk.flicker && Math.random() < lk.flicker) level = Math.max(0, Math.min(LEVELS - 1, level + (Math.random() < 0.5 ? -1 : 1)));
          const k = r * LEVELS + level;
          (bufs[k] ||= new Array(cols).fill(' '))[x] = ramp[idx];
        }
        for (let k = 0; k < bufs.length; k++) {
          if (!bufs[k]) continue;
          ctx.fillStyle = pal.css[k];
          if (aligned[ramp]) ctx.fillText(bufs[k].join(''), 0, y * fs);
          // glyphs from a fallback font (block elements) have their own width: place each in its cell
          else {
            const buf = bufs[k];
            for (let x = 0; x < cols; x++) if (buf[x] !== ' ') ctx.fillText(buf[x], x * cw, y * fs);
          }
        }
      }

      // scrambled glyphs, pushed away from the pointer and tinted toward the disturbance colour
      const from = pointer || lastPointer;
      for (let i = 0; i < loose.length; i += 4) {
        const x = loose[i];
        const y = loose[i + 1];
        const hv = Math.min(1, loose[i + 3]);
        const gx = x * cw;
        const gy = y * fs;
        const dx = gx + cw / 2 - from.x;
        const dy = gy + fs / 2 - from.y;
        const dl = Math.hypot(dx, dy) || 1;
        const col = mixRgb(pal.rgb[loose[i + 2]], pal.disturb, hv);
        ctx.fillStyle = `rgba(${col.join(',')}, ${0.55 + 0.45 * hv})`;
        ctx.fillText(SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0], gx + (dx / dl) * hv * dz.push, gy + (dy / dl) * hv * dz.push);
      }
    };

    const img = new Image();
    img.src = poster;
    const vid = document.createElement('video');
    if (video && !reduceMotion) {
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.src = video;
      Promise.resolve(vid.play()).catch(() => {});
    }
    const drawCurrent = () => {
      if (vid.readyState >= 2) draw(vid, vid.videoWidth, vid.videoHeight);
      else if (img.complete && img.naturalWidth) draw(img, img.naturalWidth, img.naturalHeight);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!ready || now - last < 1000 / fps || document.hidden || !visible) return;
      last = now;
      drawCurrent();
    };

    // the pointer is tracked on the window: the name and the ask panel sit over parts of the figure
    const onMove = (e) => {
      const r = box.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      lastPointer = pointer;
    };
    const onLeave = () => {
      pointer = null;
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);

    const ro = new ResizeObserver(() => {
      layout();
      if (reduceMotion && ready) drawCurrent();
    });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(box);

    Promise.resolve(document.fonts?.load(fontSpec(20))).finally(() => {
      if (!alive) return;
      ctx.font = fontSpec(100);
      aspect = ctx.measureText('M').width / 100 || 0.6;
      crop = null;
      ready = true;
      if (reduceMotion) {
        if (img.complete) drawCurrent();
        else img.onload = drawCurrent;
      }
    });
    if (!reduceMotion) raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    };
  }, [video, poster, font, fps]);

  return (
    <div ref={boxRef} className={`fig ${className}`} role="img" aria-label={label}>
      <canvas ref={canvasRef} />
    </div>
  );
}
