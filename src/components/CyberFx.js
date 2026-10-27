import { useEffect, useRef } from 'react';

// Effects for the immersive home candidates in #/lab: a canvas loop that sleeps off screen, eased
// pointer parallax, and the backdrops built on them. Everything is teal on the shared dark ground.

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const TEAL = '95, 212, 224';

// Calls draw(ctx, w, h, t) each frame while the canvas is visible, sized to its CSS box at device pixel ratio.
// With reduced motion it draws a single still frame.
function useCanvasLoop(draw) {
  const ref = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const still = reduceMotion();
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still && w) drawRef.current(ctx, w, h, 0);
    };
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (visible && !document.hidden && w) drawRef.current(ctx, w, h, now / 1000);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    if (!still) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  return ref;
}

// Pointer position over the element as -1..1, eased. Written to --px/--py for CSS and returned as a ref
// for canvases.
export function useParallax() {
  const ref = useRef(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const el = ref.current;
    if (reduceMotion()) return;
    const p = pos.current;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      p.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      p.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      p.tx = 0;
      p.ty = 0;
    };
    let raf;
    const ease = () => {
      raf = requestAnimationFrame(ease);
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      if (Math.abs(dx) + Math.abs(dy) < 0.0005) return;
      p.x += dx * 0.06;
      p.y += dy * 0.06;
      el.style.setProperty('--px', p.x.toFixed(4));
      el.style.setProperty('--py', p.y.toFixed(4));
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(ease);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return [ref, pos];
}

// A floor (and optionally ceiling) grid running into a vanishing point at `horizon` (fraction of height),
// with dust flying out of it. The vanishing point drifts against the pointer by `sway`; `strength` scales
// every alpha. Colours are "r, g, b" triplets.
export function GridTunnel({ pos, horizon = 0.6, ceiling = true, strength = 1, dust = 140, sway = 1, color = TEAL, glowColor = color, dustColor = '205, 238, 233' }) {
  const state = useRef(null);
  const ref = useCanvasLoop((ctx, w, h, t) => {
    if (!state.current || state.current.dust.length !== dust) {
      state.current = {
        last: t,
        dust: Array.from({ length: dust }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() })),
      };
    }
    const s = state.current;
    const dt = Math.min(0.05, t - s.last);
    s.last = t;
    const p = pos.current;
    const vx = w / 2 - p.x * sway * w * 0.05;
    const vy = h * horizon - p.y * sway * h * 0.035;
    ctx.clearRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, Math.max(w, h) * 0.6);
    glow.addColorStop(0, `rgba(${glowColor}, ${0.2 * strength})`);
    glow.addColorStop(0.3, `rgba(${glowColor}, ${0.05 * strength})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    const scroll = (t * 0.5) % 1;
    const planes = ceiling ? [[1, 0.5], [-1, 0.14]] : [[1, 0.5]];
    for (const [dir, a] of planes) {
      const alpha = a * strength;
      const edge = dir > 0 ? h : 0;
      const span = Math.abs(edge - vy);
      // rails: lines from the vanishing point to the edge, fading toward the horizon
      const rail = ctx.createLinearGradient(0, vy, 0, edge);
      rail.addColorStop(0, `rgba(${color}, 0)`);
      rail.addColorStop(1, `rgba(${color}, ${alpha})`);
      ctx.strokeStyle = rail;
      ctx.beginPath();
      for (let k = -24; k <= 24; k++) {
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx + k * w * 0.07, edge);
      }
      ctx.stroke();
      // sleepers: evenly spaced in depth, so they bunch up near the horizon
      for (let i = 0; i < 28; i++) {
        const d = i + 1 - scroll;
        const y = vy + (dir * span * 2.4) / (d + 1.4);
        if ((dir > 0 && y > h) || (dir < 0 && y < 0)) continue;
        ctx.strokeStyle = `rgba(${color}, ${alpha * Math.min(1, 1.6 / Math.sqrt(d))})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // dust coming toward the viewer
    for (const d of s.dust) {
      d.z -= dt * 0.12;
      if (d.z <= 0.03) {
        d.x = Math.random() * 2 - 1;
        d.y = Math.random() * 2 - 1;
        d.z = 1;
      }
      const sx = vx + (d.x / d.z) * w * 0.18;
      const sy = vy + (d.y / d.z) * h * 0.18;
      const near = 1 - d.z;
      ctx.fillStyle = `rgba(${dustColor}, ${near * 0.7})`;
      const r = 0.4 + near * 1.8;
      ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
  });
  return <canvas ref={ref} className="cx-canvas" aria-hidden="true" />;
}

// Soft out-of-focus motes drifting upward at three depths: near ones are larger, blurrier and faster.
export function Motes({ pos, count = 46 }) {
  const state = useRef(null);
  const ref = useCanvasLoop((ctx, w, h, t) => {
    if (!state.current) {
      state.current = {
        last: t,
        motes: Array.from({ length: count }, () => ({
          x: Math.random(),
          y: Math.random(),
          z: 0.2 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
        })),
      };
    }
    const s = state.current;
    const dt = Math.min(0.05, t - s.last);
    s.last = t;
    const p = pos.current;
    ctx.clearRect(0, 0, w, h);
    for (const m of s.motes) {
      m.y -= dt * 0.012 * (0.4 + m.z);
      if (m.y < -0.05) {
        m.y = 1.05;
        m.x = Math.random();
      }
      const x = (m.x + Math.sin(t * 0.3 + m.phase) * 0.01) * w - p.x * m.z * 24;
      const y = m.y * h - p.y * m.z * 14;
      const r = 1 + m.z * m.z * 7;
      const a = (0.25 + 0.35 * Math.sin(t * 0.8 + m.phase) ** 2) * (1.1 - m.z * 0.6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(205, 238, 233, ${a})`);
      g.addColorStop(0.4, `rgba(${TEAL}, ${a * 0.4})`);
      g.addColorStop(1, `rgba(${TEAL}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
  return <canvas ref={ref} className="cx-canvas" aria-hidden="true" />;
}

// Three CSS star layers at different depths (they shift with --px/--py) that twinkle out of step.
export function StarField() {
  return (
    <div className="stars" aria-hidden="true">
      <i className="stars-far" />
      <i className="stars-mid" />
      <i className="stars-near" />
    </div>
  );
}
