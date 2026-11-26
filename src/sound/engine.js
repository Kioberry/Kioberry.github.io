// The site's one AudioContext and its mixer.
//
//   ui ──────┐
//   ambient ─┼─> master -> limiter -> speakers
//   voice ───┘      ^
//   (sends) -> hall reverb
//
// Nothing is created until a visitor turns sound on (or conversation mode), inside that click, because browsers
// (iOS Safari above all) only let a page start sound in a user gesture. The site's sound switch drives the ui and
// ambient buses; the twin's voice has its own switch (conversation mode) and is never muted by this one.
// Every sound is synthesised here, so there are no audio files to download.

const KEY = 'site-sound';

// Linear gains. Everything is quiet on purpose: the sound sits under the page, it doesn't perform.
export const LEVELS = {
  master: 1,
  ui: 1,
  ambient: 0.12, // the bed under the home scene
  ambientAway: 0.035, // on the reading pages it nearly disappears
  duck: 0.5, // while the twin speaks
  reverb: 0.32,
};

let ctx = null;
let graph = null; // the buses, or false if this browser can't build them (then sound goes straight out)
let noise = null;
const state = {
  enabled: readEnabled(),
  scene: true, // a full-bleed scene (the home page) is on screen
  ducked: false,
  hidden: typeof document !== 'undefined' && document.hidden,
};
const listeners = new Set();

function readEnabled() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

// ---- the switch, as a store useSyncExternalStore can read -------------------------------------------
export const isEnabled = () => state.enabled;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setEnabled(on) {
  if (state.enabled === on) return;
  state.enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {}
  applyGains(on ? 0 : 0.3); // turning off: let the power-down cue finish first
  listeners.forEach((fn) => fn(on));
}

export function setScene(onScene) {
  state.scene = onScene;
  applyGains();
}

export function setDucked(ducked) {
  if (state.ducked === ducked) return;
  state.ducked = ducked;
  applyGains();
}

// ---- the context -----------------------------------------------------------------------------------
// resume() returns a promise in current browsers, nothing in older WebKit
export const wake = (c = ctx) => {
  if (c && c.state !== 'running') Promise.resolve(c.resume?.()).catch(() => {});
};

export const peekContext = () => ctx;

function getContext() {
  if (ctx) return ctx;
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  return ctx;
}

// Called inside a click. `session` is the iOS audio session (Safari 17+): 'ambient' for the site's sounds, which
// mixes with the visitor's own music and respects the silent switch; 'playback' for the twin's voice, which should
// be heard even with the switch on. Once the voice has asked for playback it keeps it.
export function unlock(session = 'ambient') {
  try {
    const s = navigator.audioSession;
    if (s && (session === 'playback' || s.type !== 'playback')) s.type = session;
  } catch {}
  const c = getContext();
  if (!c) return null;
  wake(c);
  try {
    // a moment of silence: iOS counts the context as started once it has played something in a gesture
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch {}
  return c;
}

// ---- the mixer -------------------------------------------------------------------------------------
function makeGain(c, value, to) {
  const g = c.createGain();
  g.gain.value = value;
  if (to) g.connect(to);
  return g;
}

// A stereo impulse response: decaying noise, a little darker at the tail, so the reverb sounds like a large
// hard room rather than a spring.
export function impulse(c, seconds, decay) {
  const rate = c.sampleRate || 44100;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = c.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.6 * t);
      d[i] = lp * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

function build(c) {
  try {
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    limiter.connect(c.destination);
    const master = makeGain(c, LEVELS.master, limiter);
    const reverb = c.createConvolver();
    reverb.buffer = impulse(c, 2.6, 2.4);
    reverb.connect(makeGain(c, LEVELS.reverb, master));
    return {
      master,
      reverb,
      ui: makeGain(c, 0, master),
      ambient: makeGain(c, 0, master),
      voice: makeGain(c, 1, master),
    };
  } catch {
    return false;
  }
}

// The buses, built the first time they're needed; null before the context exists or when the browser can't.
export function buses() {
  if (!ctx) return null;
  if (graph === null) {
    graph = build(ctx);
    applyGains();
  }
  return graph || null;
}

// White noise, two seconds of it, shared by every cue that hisses.
export function noiseBuffer() {
  if (!noise && ctx) {
    const len = Math.floor((ctx.sampleRate || 44100) * 2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// Pink noise (softer, darker than white), four seconds, shared by the ambient air and the pointer's sounds.
let pink = null;
export function pinkBuffer() {
  if (!pink && ctx) {
    const rate = ctx.sampleRate || 44100;
    const len = Math.floor(rate * 4);
    pink = ctx.createBuffer(1, len, rate);
    const d = pink.getChannelData(0);
    // Paul Kellet's economy pink filter
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
  }
  return pink;
}

function ramp(param, value, delay = 0, tc = 0.15) {
  const t = ctx.currentTime + delay;
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value, t, tc);
}

function applyGains(delay = 0) {
  if (!graph) return;
  const on = state.enabled && !state.hidden;
  ramp(graph.ui.gain, state.enabled ? LEVELS.ui : 0, delay, 0.05);
  const bed = (state.scene ? LEVELS.ambient : LEVELS.ambientAway) * (state.ducked ? LEVELS.duck : 1);
  ramp(graph.ambient.gain, on ? bed : 0, delay, on ? 0.6 : 0.15);
}

if (typeof document !== 'undefined') {
  // a hidden tab goes quiet (and comes back on its own)
  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
    applyGains();
  });
}

// For tests: forget the context and the stored switch.
export function resetForTests() {
  ctx = null;
  graph = null;
  noise = null;
  pink = null;
  state.enabled = readEnabled();
  state.scene = true;
  state.ducked = false;
}
