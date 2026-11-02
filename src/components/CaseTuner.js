import { useEffect, useState } from 'react';

// Temporary: live sliders for a case study's layout and colours, opened with #/design/<id>?tune. The values are
// written as CSS variables on <html> (so they override the palette in App.css) and remembered in this browser;
// "Copy" gives the settings to bake into App.css.

const SLIDERS = [
  { group: 'Layout', k: 'labelW', label: 'Label column (px)', min: 100, max: 360, step: 5 },
  { group: 'Layout', k: 'gap', label: 'Gap to images (px)', min: 12, max: 120, step: 2 },
  { group: 'Layout', k: 'maxW', label: 'Page width (px)', min: 1000, max: 1800, step: 20 },
  { group: 'Background', k: 'bgH', label: 'Hue', min: 0, max: 360, step: 1 },
  { group: 'Background', k: 'bgS', label: 'Saturation (%)', min: 0, max: 80, step: 1 },
  { group: 'Background', k: 'bgL', label: 'Lightness (%)', min: 0, max: 20, step: 0.5 },
  { group: 'Glow', k: 'glowH', label: 'Glow hue', min: 0, max: 360, step: 1 },
  { group: 'Glow', k: 'glowA', label: 'Glow strength', min: 0, max: 0.6, step: 0.01 },
  { group: 'Accent', k: 'accH', label: 'Accent hue', min: 0, max: 360, step: 1 },
  { group: 'Accent', k: 'accS', label: 'Accent saturation (%)', min: 0, max: 100, step: 1 },
  { group: 'Accent', k: 'accL', label: 'Accent lightness (%)', min: 40, max: 90, step: 1 },
];

const PRESETS = {
  Black: { bgH: 240, bgS: 10, bgL: 2.5, glowH: 250, glowA: 0.1 },
  'Night indigo': { bgH: 236, bgS: 52, bgL: 7.5, glowH: 252, glowA: 0.28 },
  'Deep violet': { bgH: 262, bgS: 45, bgL: 7, glowH: 280, glowA: 0.3 },
  'Midnight blue': { bgH: 218, bgS: 55, bgL: 7, glowH: 205, glowA: 0.25 },
};

const DEFAULTS = { labelW: 200, gap: 40, maxW: 1320, ...PRESETS.Black, accH: 232, accS: 100, accL: 83 };

function load(id) {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(`tune-${id}`) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

function vars(v) {
  return {
    '--label-w': `${v.labelW}px`,
    '--case-gap': `${v.gap}px`,
    '--case-max': `${v.maxW}px`,
    '--ground': `hsl(${v.bgH} ${v.bgS}% ${v.bgL}%)`,
    '--sheet': `hsl(${v.bgH} ${v.bgS}% ${v.bgL + 5}%)`,
    '--glow-a': `hsl(${v.glowH} 90% 65% / ${v.glowA})`,
    '--glow-b': `hsl(${(v.glowH + 330) % 360} 90% 60% / ${v.glowA * 0.6})`,
    '--accent': `hsl(${v.accH} ${v.accS}% ${v.accL}%)`,
    '--accent-dim': `hsl(${v.accH} ${v.accS}% ${v.accL}% / 0.35)`,
  };
}

export default function CaseTuner({ project }) {
  const [v, setV] = useState(() => load(project.id));
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const css = vars(v);
    for (const [k, val] of Object.entries(css)) root.style.setProperty(k, val);
    try {
      localStorage.setItem(`tune-${project.id}`, JSON.stringify(v));
    } catch {}
    return () => Object.keys(css).forEach((k) => root.style.removeProperty(k));
  }, [v, project.id]);

  const copy = () => {
    const text = JSON.stringify({ project: project.id, ...v, css: vars(v) }, null, 2);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  let lastGroup = null;
  return (
    <aside className={open ? 'tuner' : 'tuner tuner-closed'}>
      <button className="tuner-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide ✕' : 'Tune'}
      </button>
      {open && (
        <>
          <div className="chips">
            {Object.entries(PRESETS).map(([name, p]) => (
              <button key={name} className="chip" onClick={() => setV((x) => ({ ...x, ...p }))}>
                {name}
              </button>
            ))}
          </div>
          {SLIDERS.map((s) => {
            const head = s.group !== lastGroup && <p className="tuner-group">{s.group}</p>;
            lastGroup = s.group;
            return (
              <div key={s.k}>
                {head}
                <label className="tuner-row">
                  <span>
                    {s.label}
                    <b>{v[s.k]}</b>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={v[s.k]}
                    onChange={(e) => setV((x) => ({ ...x, [s.k]: Number(e.target.value) }))}
                  />
                </label>
              </div>
            );
          })}
          <div className="tuner-actions">
            <button className="chip" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy settings'}
            </button>
            <button className="chip" onClick={() => setV(DEFAULTS)}>
              Reset
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
