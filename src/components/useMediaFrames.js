import { useEffect, useRef } from 'react';

// Plays a video (falling back to a still poster) off-screen and hands each frame to onFrame,
// already cropped to `aspect` and scaled down to cols x rows.
// zoom > 1 crops in; focusY is the crop's vertical centre (fraction of source height).
// onFrame(data, map): data is RGBA ImageData.data; map.col(fx)/map.row(fy) turn source
// fractions into grid coordinates (used to find the mouth).
export default function useMediaFrames({ video, poster, cols, rows, aspect, zoom = 1, focusY = 0.45, fps = 20 }, onFrame) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

    // every source (16:9 video, square poster) is cropped to the same aspect so the grid never changes shape
    const draw = (source, w, h) => {
      let sh = h / zoom;
      let sw = sh * aspect;
      if (sw > w) {
        sw = w;
        sh = w / aspect;
      }
      const sx = (w - sw) / 2;
      const sy = Math.max(0, Math.min(h - sh, h * focusY - sh / 2));
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, cols, rows);
      onFrameRef.current(ctx.getImageData(0, 0, cols, rows).data, {
        col: (fx) => Math.round(((fx * w - sx) / sw) * cols),
        row: (fy) => Math.round(((fy * h - sy) / sh) * rows),
      });
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / fps || document.hidden) return;
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
  }, [video, poster, cols, rows, aspect, zoom, focusY, fps]);
}

// Per-pixel luminance with auto-levels over the subject (the black backdrop is ignored), plus an
// unsharp mask so eyes, brows and lips separate from the skin. Returns values in 0..1, backdrop = 0.
export function toneMap(data, cols, rows) {
  const n = cols * rows;
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    lum[p] = (0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2]) / 255;
  }
  const lit = Array.from(lum).filter((v) => v > 0.06).sort((a, b) => a - b);
  const lo = lit.length ? lit[Math.floor(lit.length * 0.02)] : 0;
  // 90th percentile: the white shirt clips to full and the face gets the upper half of the range
  const hi = lit.length ? lit[Math.floor(lit.length * 0.9)] : 1;
  const span = Math.max(0.05, hi - lo);

  const out = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      let l = lum[p];
      if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) {
        const blur = (lum[p - 1] + lum[p + 1] + lum[p - cols] + lum[p + cols]) / 4;
        l += (l - blur) * 1.2;
      }
      out[p] = lum[p] < 0.06 ? 0 : Math.min(1, Math.max(0, (l - lo) / span));
    }
  }
  return out;
}
