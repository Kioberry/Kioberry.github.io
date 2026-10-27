import { useEffect, useState } from 'react';
import { LayoutDescent } from '../components/HomeLayouts';
import { ANSWER_FONTS, ASCII_FONTS, DEFAULTS, EXTRA_FONTS_URL, NAME_FONTS, PALETTES, RAMP_NAMES, THEMES } from '../components/sceneConfig';

// Temporary: the Descent home with live controls. Not linked from the nav; open #/playground.
// Settings persist in this browser; "Copy settings" gives the JSON to bake into DEFAULTS.

const STORE = 'playground-cfg';
const COLOR_KEYS = [
  ['bg', 'Background'],
  ['bgGlow', 'Background glow'],
  ['shadow', 'Figure shadow'],
  ['mid', 'Figure midtone'],
  ['high', 'Figure highlight'],
  ['rim', 'Rim light'],
  ['disturb', 'Disturbance'],
  ['grid', 'Grid'],
  ['glow', 'Horizon glow'],
  ['name', 'Name'],
  ['extrude', 'Name extrude'],
  ['accent', 'Accent / panel'],
];

const SECTIONS = [
  {
    title: 'Layout 排版',
    controls: [
      { k: 'figHeight', label: 'Figure height (vh)', min: 30, max: 110, step: 1 },
      { k: 'figTop', label: 'Figure top (vh)', min: -20, max: 50, step: 1 },
      { k: 'figFade', label: 'Fade starts at (%)', min: 30, max: 100, step: 1 },
      { k: 'horizon', label: 'Horizon', min: 0.3, max: 0.95, step: 0.01 },
      { k: 'nameSize', label: 'Name size (cqw)', min: 2, max: 14, step: 0.1 },
      { k: 'nameTrack', label: 'Name tracking (em)', min: -0.05, max: 0.5, step: 0.01 },
      { k: 'panelWidth', label: 'Panel width (px)', min: 420, max: 1100, step: 10 },
      { k: 'kicker', label: 'Show tagline', type: 'toggle' },
    ],
  },
  {
    title: 'Type 字体',
    controls: [
      { k: 'nameFont', label: 'Name font', type: 'select', options: NAME_FONTS },
      { k: 'extrude', label: 'Name extrude (px)', min: 0, max: 20, step: 1 },
      { k: 'nameGlow', label: 'Name glow', min: 0, max: 1, step: 0.05 },
      { k: 'asciiFont', label: 'ASCII font', type: 'select', options: ASCII_FONTS },
      { k: 'answerFont', label: 'Answer font', type: 'select', options: ANSWER_FONTS },
    ],
  },
  {
    title: 'ASCII 风格',
    controls: [
      { k: 'cols', label: 'Density (columns)', min: 60, max: 240, step: 2 },
      { k: 'ramp', label: 'Glyph ramp', type: 'select', options: RAMP_NAMES },
      { k: 'gamma', label: 'Gamma', min: 0.4, max: 2.6, step: 0.05 },
      { k: 'rim', label: 'Rim light', min: 0, max: 2, step: 0.05 },
      { k: 'flicker', label: 'Glyph flicker', min: 0, max: 0.3, step: 0.01 },
    ],
  },
  { title: 'Color 色彩', colors: true },
  {
    title: 'Texture 质感',
    controls: [
      { k: 'glow', label: 'Figure glow (px)', min: 0, max: 24, step: 1 },
      { k: 'chroma', label: 'Chromatic fringe (px)', min: 0, max: 4, step: 0.25 },
      { k: 'grain', label: 'Film grain', min: 0, max: 0.6, step: 0.01 },
      { k: 'scan', label: 'Scanlines', min: 0, max: 0.8, step: 0.01 },
      { k: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.05 },
      { k: 'reflect', label: 'Floor reflection', type: 'toggle' },
    ],
  },
  {
    title: 'Interaction 扰动',
    controls: [
      { k: 'disturbRadius', label: 'Radius (px)', min: 0, max: 240, step: 2 },
      { k: 'disturbStrength', label: 'Strength', min: 0, max: 1.5, step: 0.05 },
      { k: 'disturbDecay', label: 'Trail (decay)', min: 0.5, max: 0.98, step: 0.01 },
      { k: 'push', label: 'Push (px)', min: 0, max: 30, step: 1 },
      { k: 'spill', label: 'Spill into air', min: 0, max: 1, step: 0.05 },
      { k: 'parallax', label: 'Space parallax', min: 0, max: 2.5, step: 0.05 },
    ],
  },
  {
    title: 'Scene 场景',
    controls: [
      { k: 'gridStrength', label: 'Grid strength', min: 0, max: 2, step: 0.05 },
      { k: 'ceiling', label: 'Ceiling grid', type: 'toggle' },
      { k: 'dust', label: 'Dust', min: 0, max: 400, step: 10 },
    ],
  },
];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved) return { ...DEFAULTS, ...saved, colors: { ...DEFAULTS.colors, ...saved.colors } };
  } catch {}
  return DEFAULTS;
}

// the extra fonts are only for trying out; the home page keeps the site's own
function useExtraFonts() {
  useEffect(() => {
    if (document.getElementById('pg-fonts')) return;
    const link = document.createElement('link');
    link.id = 'pg-fonts';
    link.rel = 'stylesheet';
    link.href = EXTRA_FONTS_URL;
    document.head.appendChild(link);
  }, []);
}

function Control({ c, value, onChange }) {
  if (c.type === 'toggle') {
    return (
      <label className="pg-row pg-toggle">
        <span>{c.label}</span>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }
  if (c.type === 'select') {
    return (
      <label className="pg-row">
        <span>{c.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {c.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="pg-row pg-range">
      <span>
        {c.label} <b>{value}</b>
      </span>
      <input type="range" min={c.min} max={c.max} step={c.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function PlaygroundPage() {
  const [cfg, setCfg] = useState(load);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  useExtraFonts();

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(cfg));
    } catch {}
  }, [cfg]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setColor = (k, v) => setCfg((c) => ({ ...c, palette: 'custom', colors: { ...c.colors, [k]: v } }));
  const setPalette = (id) => setCfg((c) => (PALETTES[id] ? { ...c, palette: id, colors: PALETTES[id] } : c));
  const copy = async () => {
    const { label, ...colors } = cfg.colors;
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...cfg, colors }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <main className="home home-dark pg">
      <LayoutDescent cfg={cfg} />
      <aside className={`pg-panel${open ? '' : ' is-closed'}`} aria-label="Scene settings">
        <div className="pg-head">
          <b>Playground</b>
          <button type="button" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Settings'}
          </button>
        </div>
        {open && (
          <>
            <div className="pg-actions">
              <button type="button" onClick={copy}>
                {copied ? 'Copied ✓' : 'Copy settings'}
              </button>
              <button type="button" onClick={() => setCfg(DEFAULTS)}>
                Reset
              </button>
            </div>
            <label className="pg-row">
              <span>Start from theme</span>
              <select value="" onChange={(e) => THEMES[e.target.value] && setCfg(THEMES[e.target.value])}>
                <option value="">Choose…</option>
                {Object.entries(THEMES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {SECTIONS.map((sec) => (
              <details key={sec.title} open>
                <summary>{sec.title}</summary>
                {sec.colors ? (
                  <>
                    <label className="pg-row">
                      <span>Palette</span>
                      <select value={cfg.palette} onChange={(e) => setPalette(e.target.value)}>
                        {Object.entries(PALETTES).map(([id, p]) => (
                          <option key={id} value={id}>
                            {p.label}
                          </option>
                        ))}
                        {cfg.palette === 'custom' && <option value="custom">Custom</option>}
                      </select>
                    </label>
                    <div className="pg-swatches">
                      {COLOR_KEYS.map(([k, label]) => (
                        <label key={k} className="pg-swatch" title={label}>
                          <input type="color" value={cfg.colors[k]} onChange={(e) => setColor(k, e.target.value)} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  sec.controls.map((c) => <Control key={c.k} c={c} value={cfg[c.k]} onChange={(v) => set(c.k, v)} />)
                )}
              </details>
            ))}
          </>
        )}
      </aside>
    </main>
  );
}
