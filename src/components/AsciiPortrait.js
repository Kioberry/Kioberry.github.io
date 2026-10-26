import { useEffect, useRef } from 'react';

// Renders a video (or still image) as live ASCII text.
// Each frame is drawn into a tiny canvas (one pixel per character), then every pixel's brightness
// picks a glyph from RAMP. The text is real text, so it stays crisp at any size.
// short ramp with evenly spaced ink density; long letter ramps read as noise at this size
const RAMP = ' .:-=+*#%@';
const CHAR_ASPECT = 0.6; // Fira Code advance width / line height (line-height: 1)
const FPS = 20;

// Square crop of the source: ZOOM > 1 frames head and shoulders; FOCUS_Y is the crop's vertical centre.
const ZOOM = 1.3;
const FOCUS_Y = 0.4;

// Where the mouth sits inside that crop, as fractions of width/height. Characters in this box
// shimmer while the twin is "talking" so the portrait reads as speaking.
const MOUTH = { x0: 0.44, x1: 0.56, y0: 0.58, y1: 0.65 };

function toAscii(data, cols, rows, talking) {
  const n = cols * rows;
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    lum[p] = (0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2]) / 255;
  }

  // auto-levels over the subject (ignore the black backdrop), so skin, hair and shadows
  // spread across the whole ramp instead of collapsing into a block of '@'
  const lit = Array.from(lum).filter((v) => v > 0.06).sort((a, b) => a - b);
  const lo = lit.length ? lit[Math.floor(lit.length * 0.02)] : 0;
  // 90th percentile: the white shirt clips to '@' and the face gets the upper half of the ramp
  const hi = lit.length ? lit[Math.floor(lit.length * 0.9)] : 1;
  const span = Math.max(0.05, hi - lo);

  let out = '';
  const last = RAMP.length - 1;
  for (let y = 0; y < rows; y++) {
    const inMouthRow = talking && y / rows > MOUTH.y0 && y / rows < MOUTH.y1;
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      let l = lum[p];
      // unsharp mask against the 4 neighbours: brings out eyes, brows and lips
      if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) {
        const blur = (lum[p - 1] + lum[p + 1] + lum[p - cols] + lum[p + cols]) / 4;
        l += (l - blur) * 1.2;
      }
      l = l < 0.06 ? 0 : Math.min(1, Math.max(0, (l - lo) / span));
      let idx = Math.round(Math.pow(l, 1.3) * last);
      if (inMouthRow && x / cols > MOUTH.x0 && x / cols < MOUTH.x1 && Math.random() < 0.4) {
        idx = Math.max(1, Math.min(last, idx + Math.round((Math.random() - 0.5) * 3)));
      }
      out += RAMP[idx];
    }
    out += '\n';
  }
  return out;
}

export default function AsciiPortrait({ video, poster, cols = 120, talking = false, className = '', label }) {
  const preRef = useRef(null);
  const talkingRef = useRef(talking);
  talkingRef.current = talking;

  useEffect(() => {
    const pre = preRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let rows;
    let raf;
    let last = 0;

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

    // every source (16:9 video, square poster) is cropped to the same square so the grid never changes shape
    rows = Math.round(cols * CHAR_ASPECT);
    canvas.width = cols;
    canvas.height = rows;
    pre.style.setProperty('--cols', cols);

    const draw = (source, w, h) => {
      const side = Math.min(w, h) / ZOOM;
      const top = Math.max(0, Math.min(h - side, h * FOCUS_Y - side / 2));
      ctx.drawImage(source, (w - side) / 2, top, side, side, 0, 0, cols, rows);
      pre.textContent = toAscii(ctx.getImageData(0, 0, cols, rows).data, cols, rows, talkingRef.current);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS || document.hidden) return;
      last = now;
      if (vid.readyState >= 2) draw(vid, vid.videoWidth, vid.videoHeight);
      else if (img.complete && img.naturalWidth) draw(img, img.naturalWidth, img.naturalHeight);
    };

    if (reduceMotion) {
      img.onload = () => draw(img, img.naturalWidth, img.naturalHeight);
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    };
  }, [video, poster, cols]);

  return <pre ref={preRef} className={`ascii ${className}`} role="img" aria-label={label} />;
}
