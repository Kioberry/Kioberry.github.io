import { useEffect, useRef } from 'react';
import useMediaFrames, { toneMap } from './useMediaFrames';

// Renders a video (or still image) as live ASCII text: every pixel of a tiny, cropped frame picks
// a glyph from RAMP by brightness. The text is real text, so it stays crisp at any size.
// short ramp with evenly spaced ink density; long letter ramps read as noise at this size
const RAMP = ' .:-=+*#%@';
const CHAR_ASPECT = 0.6; // Fira Code advance width / line height (line-height: 1)

// Where the mouth sits in the source video, as fractions of its width/height. Characters over it
// shimmer while the twin is "talking" so the portrait reads as speaking.
const MOUTH = { cx: 0.5, cy: 0.49, w: 0.06, h: 0.05 };

export default function AsciiPortrait({
  video,
  poster,
  cols = 160,
  aspect = 2,
  zoom = 1,
  focusY = 0.45,
  talking = false,
  className = '',
  label,
}) {
  const preRef = useRef(null);
  const rows = Math.round((cols * CHAR_ASPECT) / aspect);

  useEffect(() => {
    preRef.current.style.setProperty('--cols', cols);
    preRef.current.style.setProperty('--aspect', aspect);
  }, [cols, aspect]);

  useMediaFrames({ video, poster, cols, rows, aspect, zoom, focusY }, (data, map) => {
    const tone = toneMap(data, cols, rows);
    const mouth = talking && {
      x0: map.col(MOUTH.cx - MOUTH.w / 2),
      x1: map.col(MOUTH.cx + MOUTH.w / 2),
      y0: map.row(MOUTH.cy - MOUTH.h / 2),
      y1: map.row(MOUTH.cy + MOUTH.h / 2),
    };
    const last = RAMP.length - 1;
    let out = '';
    for (let y = 0; y < rows; y++) {
      const inMouthRow = mouth && y >= mouth.y0 && y <= mouth.y1;
      for (let x = 0; x < cols; x++) {
        const l = tone[y * cols + x];
        let idx = Math.round(Math.pow(l, 1.3) * last);
        if (inMouthRow && x >= mouth.x0 && x <= mouth.x1 && Math.random() < 0.4) {
          idx = Math.max(1, Math.min(last, idx + Math.round((Math.random() - 0.5) * 3)));
        }
        out += RAMP[idx];
      }
      out += '\n';
    }
    preRef.current.textContent = out;
  });

  return <pre ref={preRef} className={`ascii ${className}`} role="img" aria-label={label} />;
}
