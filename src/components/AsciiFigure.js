import { useEffect, useRef } from 'react';
import { toneMap } from './useMediaFrames';

// The twin as a lit, layered ASCII figure drawn on canvas. Unlike AsciiPortrait's fixed crop, the grid is
// fitted to her silhouette (found in each source), the edge facing the scene's light picks up a teal rim,
// and the glyphs are split into depth bands that CSS shifts at different rates with the pointer, so she
// reads as a body standing in the scene rather than a flat projection.

const RAMP = ' .:-=+*#%@';
const CHAR_ASPECT = 0.6; // Fira Code advance width / line height
const MOUTH = { cx: 0.5, cy: 0.49, w: 0.06, h: 0.05 }; // fractions of the source, as in AsciiPortrait
const BACKDROP = 0.09; // luminance below this is the black backdrop (the video's corners sit near 0.07)
const BANDS = [0.18, 0.5]; // depth thresholds: silhouette edge, body, core (face and chest)

const INK = [214, 236, 232];
const RIM = [130, 236, 244];
// bucket = rim level (0..2) * 2 + bright (0/1)
const COLORS = [0, 1, 2].flatMap((r) =>
  [0.5, 0.95].map((a) => {
    const t = r / 2;
    const c = INK.map((v, i) => Math.round(v + (RIM[i] - v) * t));
    return `rgba(${c.join(',')}, ${r ? Math.min(1, a + 0.1) : a})`;
  }),
);

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

export default function AsciiFigure({
  video,
  poster,
  cols = 110,
  light = [0, -1], // direction the light comes from, in screen space (x right, y down)
  talking = false,
  className = '',
  label,
}) {
  const boxRef = useRef(null);
  const bandRefs = useRef([]);
  const [lightX, lightY] = light;
  const talkingRef = useRef(talking);
  talkingRef.current = talking;

  useEffect(() => {
    const box = boxRef.current;
    const bands = bandRefs.current.map((c) => c.getContext('2d'));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const sample = document.createElement('canvas');
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    const ln = Math.hypot(lightX, lightY) || 1;
    const lx = lightX / ln;
    const ly = lightY / ln;

    let crop = null; // { source, sx, sy, sw, sh, rows }
    let fs = 0;
    let raf;
    let last = 0;
    let visible = true;

    const layout = () => {
      if (!crop) return;
      const W = box.clientWidth;
      fs = W / (cols * CHAR_ASPECT);
      const H = crop.rows * fs;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      bandRefs.current.forEach((c, i) => {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
        const ctx = bands[i];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${fs}px 'Fira Code', ui-monospace, Menlo, monospace`;
        ctx.textBaseline = 'top';
        ctx.textRendering = 'optimizeSpeed'; // no ligatures: every glyph keeps its own cell
      });
    };

    const fit = (source, w, h) => {
      if (crop && crop.source === source) return;
      const s = findSubject(source, w, h);
      const sx = s.x0 * w;
      const sy = s.y0 * h;
      const sw = (s.x1 - s.x0) * w;
      const sh = (s.y1 - s.y0) * h;
      const rows = Math.round(cols * CHAR_ASPECT * (sh / sw));
      crop = { source, w, h, sx, sy, sw, sh, rows };
      sample.width = cols;
      sample.height = rows;
      box.style.aspectRatio = `${cols * CHAR_ASPECT} / ${rows}`;
      // a source that runs off the top of its frame fades out there instead of ending in a hard line
      box.classList.toggle('is-cut-top', s.y0 < 0.02);
      layout();
    };

    const draw = (source, w, h) => {
      fit(source, w, h);
      const { sx, sy, sw, sh, rows } = crop;
      sctx.drawImage(source, sx, sy, sw, sh, 0, 0, cols, rows);
      const data = sctx.getImageData(0, 0, cols, rows).data;
      const n = cols * rows;
      const tone = toneMap(data, cols, rows);

      // distance (in cells) from each subject cell to the backdrop: drives depth and the rim
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
      let maxD = 1;
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
          if (dist[p] > maxD) maxD = dist[p];
        }
      }

      const mouth = talkingRef.current && {
        x0: Math.round(((MOUTH.cx - MOUTH.w / 2) * crop.w - sx) / sw * cols),
        x1: Math.round(((MOUTH.cx + MOUTH.w / 2) * crop.w - sx) / sw * cols),
        y0: Math.round(((MOUTH.cy - MOUTH.h / 2) * crop.h - sy) / sh * rows),
        y1: Math.round(((MOUTH.cy + MOUTH.h / 2) * crop.h - sy) / sh * rows),
      };

      const W = box.clientWidth;
      bands.forEach((ctx) => ctx.clearRect(0, 0, W, rows * fs));
      const top = RAMP.length - 1;
      const at = (x, y) => dist[Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x))];
      for (let y = 0; y < rows; y++) {
        const bufs = [];
        for (let x = 0; x < cols; x++) {
          const p = y * cols + x;
          const d = dist[p];
          if (!d) continue;
          let idx = Math.round(Math.pow(tone[p], 1.3) * top);
          // rim: cells near the silhouette whose outward side faces the light
          const nx = at(x + 1, y) - at(x - 1, y);
          const ny = at(x, y + 1) - at(x, y - 1);
          const nl = Math.hypot(nx, ny) || 1;
          const facing = Math.max(0, -(nx * lx + ny * ly) / nl);
          const rim = Math.max(0, 1 - (d - 1) / 3.5) * (0.3 + 0.7 * facing);
          if (rim > 0.5) idx = Math.max(idx, 2);
          if (mouth && y >= mouth.y0 && y <= mouth.y1 && x >= mouth.x0 && x <= mouth.x1 && Math.random() < 0.4) {
            idx = Math.max(1, Math.min(top, idx + Math.round((Math.random() - 0.5) * 3)));
          }
          if (!idx) continue;
          const depth = d / maxD;
          const band = depth < BANDS[0] ? 0 : depth < BANDS[1] ? 1 : 2;
          const bucket = (rim > 0.6 ? 2 : rim > 0.25 ? 1 : 0) * 2 + (idx >= 5 ? 1 : 0);
          const k = band * COLORS.length + bucket;
          (bufs[k] ||= new Array(cols).fill(' '))[x] = RAMP[idx];
        }
        for (let k = 0; k < bufs.length; k++) {
          if (!bufs[k]) continue;
          const ctx = bands[Math.floor(k / COLORS.length)];
          ctx.fillStyle = COLORS[k % COLORS.length];
          ctx.fillText(bufs[k].join(''), 0, y * fs);
        }
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

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 50 || document.hidden || !visible) return;
      last = now;
      if (vid.readyState >= 2) draw(vid, vid.videoWidth, vid.videoHeight);
      else if (img.complete && img.naturalWidth) draw(img, img.naturalWidth, img.naturalHeight);
    };

    const ro = new ResizeObserver(() => {
      layout();
      if (reduceMotion && img.naturalWidth) draw(img, img.naturalWidth, img.naturalHeight);
    });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(box);
    if (reduceMotion) img.onload = () => draw(img, img.naturalWidth, img.naturalHeight);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    };
  }, [video, poster, cols, lightX, lightY]);

  return (
    <div ref={boxRef} className={`fig ${className}`} role="img" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <canvas key={i} ref={(el) => (bandRefs.current[i] = el)} className="fig-band" style={{ '--d': i }} />
      ))}
    </div>
  );
}
