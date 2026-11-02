// Settings for the Descent home scene. The home page renders DEFAULTS; #/playground edits a copy live.

export const PALETTES = {
  teal: {
    label: 'Teal glass',
    bg: '#0d0d0f',
    bgGlow: '#0b1a1d',
    shadow: '#14505a',
    mid: '#5fd4e0',
    high: '#f2fffc',
    rim: '#a6fff4',
    disturb: '#ff6fae',
    grid: '#5fd4e0',
    glow: '#5fd4e0',
    name: '#effcfb',
    extrude: '#43aeb9',
    accent: '#5fd4e0',
  },
  amber: {
    label: 'Ice & amber',
    bg: '#0b0d10',
    bgGlow: '#1a1510',
    shadow: '#1f4e5a',
    mid: '#7fc8d6',
    high: '#ffe2b8',
    rim: '#ffb36b',
    disturb: '#ffd36b',
    grid: '#4fb3c4',
    glow: '#ff9a4a',
    name: '#fff4e4',
    extrude: '#c97a3a',
    accent: '#ffb36b',
  },
  noir: {
    label: 'Neon noir',
    bg: '#0a0812',
    bgGlow: '#1a0f26',
    shadow: '#3a1f5c',
    mid: '#4fd8ff',
    high: '#f2f7ff',
    rim: '#ff3d9a',
    disturb: '#ff3d9a',
    grid: '#b04dff',
    glow: '#ff3d9a',
    name: '#f4f0ff',
    extrude: '#b04dff',
    accent: '#4fd8ff',
  },
  vapor: {
    label: 'Vapor dusk',
    bg: '#120a1f',
    bgGlow: '#2a1238',
    shadow: '#4b2a7a',
    mid: '#c77dff',
    high: '#ffe3f3',
    rim: '#ff7ac6',
    disturb: '#ffd166',
    grid: '#ff7ac6',
    glow: '#ff9e5e',
    name: '#fff0fa',
    extrude: '#c94f9c',
    accent: '#ff7ac6',
  },
  phosphor: {
    label: 'Phosphor',
    bg: '#050a06',
    bgGlow: '#0b1a0e',
    shadow: '#0f3d1f',
    mid: '#3cff7a',
    high: '#d8ffe0',
    rim: '#9dff6a',
    disturb: '#f4ff6a',
    grid: '#2bd46a',
    glow: '#3cff7a',
    name: '#e4ffe8',
    extrude: '#1f9e4c',
    accent: '#3cff7a',
  },
  deepsea: {
    label: 'Deep sea',
    bg: '#03101a',
    bgGlow: '#06243a',
    shadow: '#0b3954',
    mid: '#2fa4d9',
    high: '#e0f7ff',
    rim: '#5ff2d0',
    disturb: '#ffb86b',
    grid: '#1e7fb0',
    glow: '#5ff2d0',
    name: '#e8fbff',
    extrude: '#1e7fb0',
    accent: '#5ff2d0',
  },
  bone: {
    label: 'Bone',
    bg: '#0c0b0a',
    bgGlow: '#1a1814',
    shadow: '#3a352c',
    mid: '#a59f8f',
    high: '#f3ecdc',
    rim: '#ffffff',
    disturb: '#e05a3a',
    grid: '#6a675c',
    glow: '#a59f8f',
    name: '#f3ecdc',
    extrude: '#6a675c',
    accent: '#ece8dd',
  },
};

// Fonts beyond the site's own (Silkscreen, Press Start 2P, Jersey 10, Pixelify Sans, VT323, Fira Code,
// Literata, Fira Sans, and the themes' Audiowide and Chakra Petch) are loaded only by the playground.
export const NAME_FONTS = ['Silkscreen', 'Press Start 2P', 'Jersey 10', 'Pixelify Sans', 'VT323', 'Orbitron', 'Audiowide', 'Rubik Glitch', 'Major Mono Display', 'Tilt Neon'];
export const ASCII_FONTS = ['Fira Code', 'JetBrains Mono', 'IBM Plex Mono', 'Space Mono', 'Share Tech Mono', 'VT323'];
export const ANSWER_FONTS = ['Literata', 'Fira Sans', 'VT323', 'IBM Plex Mono', 'Chakra Petch'];
export const EXTRA_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Audiowide&family=IBM+Plex+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500&family=Major+Mono+Display&family=Orbitron:wght@700;900&family=Rubik+Glitch&family=Share+Tech+Mono&family=Chakra+Petch:wght@400;500&family=Space+Mono&family=Tilt+Neon&display=swap';

export const RAMP_NAMES = ['classic', 'fine', 'blocks', 'binary', 'symbols'];

// What the two site themes share (picked in #/playground); each theme then sets its own name type and palette.
const BASE = {
  // layout
  figHeight: 65, // vh
  figTop: 21, // vh
  figFade: 83, // % of the figure's height where the fade into the floor starts
  horizon: 0.71,
  nameSize: 5.7, // cqw
  nameTrack: 0.06, // em
  panelWidth: 850, // px
  kicker: true,
  // type
  nameFont: 'Silkscreen',
  extrude: 8,
  nameGlow: 0.45,
  asciiFont: 'Fira Code',
  answerFont: 'Literata',
  // ASCII
  cols: 140,
  ramp: 'classic',
  gamma: 1,
  rim: 1.1,
  flicker: 0.12,
  // color
  palette: 'teal',
  colors: PALETTES.teal,
  // texture
  glow: 12,
  chroma: 0.75,
  grain: 0.14,
  scan: 0.25,
  vignette: 0.75,
  reflect: true,
  // interaction
  disturbRadius: 80,
  disturbStrength: 1,
  disturbDecay: 0.86,
  push: 6,
  spill: 0.3,
  parallax: 1,
  // scene
  gridStrength: 1,
  ceiling: true,
  dust: 240,
};

// The site themes the header toggles between. The reading pages follow along through the matching
// [data-theme] tokens in App.css.
export const THEMES = {
  vapor: {
    ...BASE,
    label: 'Vapor',
    nameFont: 'Audiowide',
    palette: 'vapor',
    colors: PALETTES.vapor,
  },
  bone: {
    ...BASE,
    label: 'Bone',
    nameSize: 5.4,
    nameGlow: 0.7,
    answerFont: 'Chakra Petch',
    palette: 'bone',
    colors: PALETTES.bone,
  },
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULTS = THEMES.vapor;

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export const triplet = (hex) => hexRgb(hex).join(', ');

export function mixRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// What AsciiFigure needs from a config, given the scene's light direction.
export function lookFrom(cfg, light) {
  const c = cfg.colors;
  return {
    cols: cfg.cols,
    ramp: cfg.ramp,
    gamma: cfg.gamma,
    rim: cfg.rim,
    flicker: cfg.flicker,
    light,
    colors: { shadow: c.shadow, mid: c.mid, high: c.high, rim: c.rim, disturb: c.disturb },
    disturb: {
      radius: cfg.disturbRadius,
      strength: cfg.disturbStrength,
      decay: cfg.disturbDecay,
      push: cfg.push,
      spill: cfg.spill,
    },
  };
}

// CSS custom properties the scene's stylesheet reads.
export function sceneVars(cfg) {
  const c = cfg.colors;
  return {
    '--fig-h': `${cfg.figHeight}vh`,
    '--fig-top': `${cfg.figTop}vh`,
    '--fig-fade': `${cfg.figFade}%`,
    '--name-size': `${cfg.nameSize}cqw`,
    '--name-font': `'${cfg.nameFont}', monospace`,
    '--name-track': `${cfg.nameTrack}em`,
    '--name-color': c.name,
    '--answer-font': `'${cfg.answerFont}', serif`,
    '--panel-w': `${cfg.panelWidth}px`,
    '--bg': c.bg,
    '--bg-glow': c.bgGlow,
    '--accent': c.accent,
    '--accent-dim': `rgba(${triplet(c.accent)}, 0.35)`,
    '--glow': cfg.glow,
    '--glow-color': `rgba(${triplet(c.rim)}, 0.4)`,
    '--chroma': cfg.chroma,
    '--chroma-a': cfg.chroma ? 0.55 : 0,
    '--grain': cfg.grain,
    '--scan': cfg.scan,
    '--vignette': cfg.vignette,
    '--sway': cfg.parallax,
  };
}

// Stacked offsets that read as the name's thickness, darkening with depth, plus a glow in the rim colour.
export function extrudeShadow(cfg) {
  const c = cfg.colors;
  const ex = hexRgb(c.extrude);
  const layers = [];
  for (let i = 1; i <= cfg.extrude; i++) {
    const t = cfg.extrude > 1 ? (i - 1) / (cfg.extrude - 1) : 0;
    layers.push(`calc(var(--px) * var(--sway) * -${i}px) ${i}px 0 rgb(${mixRgb(ex, [6, 8, 10], t * 0.85).join(',')})`);
  }
  layers.push(`0 0 40px rgba(${triplet(c.rim)}, ${cfg.nameGlow})`);
  return layers.join(', ');
}
