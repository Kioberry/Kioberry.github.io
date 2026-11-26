import { buses, isEnabled, noiseBuffer, peekContext } from './engine';

// The interface's sounds: short, soft, mostly sine, with a little hall reverb so they sound like they happen in
// a big dark space. Each one is synthesised on the spot and lasts well under half a second.

// A sine (or other) blip with a fast attack and an exponential tail.
function tone(c, out, { type = 'sine', freq, to, at = 0, dur, peak, attack = 0.004, send = 0, g }) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env);
  env.connect(out);
  if (send) env.connect(sendTo(c, g, send));
  osc.start(t);
  osc.stop(t + dur + 0.05);
  return osc;
}

// Band-passed noise whose centre sweeps from `from` to `to`.
export function hiss(c, out, { from, to, q = 1, at = 0, dur, peak, send = 0, g }) {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + Math.min(0.02, dur / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp);
  bp.connect(env);
  env.connect(out);
  if (send) env.connect(sendTo(c, g, send));
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

function sendTo(c, g, amount) {
  const s = c.createGain();
  s.gain.value = amount;
  s.connect(g.reverb);
  return s;
}

// A two-operator FM bell: glassy, cold, decays slowly.
function bell(c, out, { freq, at = 0, dur = 0.9, peak, send, g }) {
  const t = c.currentTime + at;
  const mod = c.createOscillator();
  mod.frequency.value = freq * 3.5;
  const depth = c.createGain();
  depth.gain.setValueAtTime(freq * 1.8, t);
  depth.gain.exponentialRampToValueAtTime(1, t + dur * 0.6);
  mod.connect(depth);
  const osc = tone(c, out, { freq, at, dur, peak, attack: 0.003, send, g });
  depth.connect(osc.frequency);
  mod.start(t);
  mod.stop(t + dur + 0.05);
}

const BELL_ROOT = { vapor: 523.25, bone: 739.99 }; // vapor a warm C, bone a colder F#

const CUES = {
  hover: (c, o, g) => tone(c, o, { freq: 2400 * (0.97 + Math.random() * 0.06), dur: 0.03, peak: 0.018, attack: 0.002, g }),
  select: (c, o, g) => {
    tone(c, o, { freq: 880, dur: 0.07, peak: 0.045, g });
    tone(c, o, { freq: 1320, at: 0.045, dur: 0.14, peak: 0.035, send: 0.25, g });
  },
  // the page drops away: a falling breath of air over a low thump
  nav: (c, o, g) => {
    hiss(c, o, { from: 4200, to: 500, q: 1.4, dur: 0.38, peak: 0.05, send: 0.3, g });
    tone(c, o, { freq: 92, to: 52, dur: 0.28, peak: 0.12, attack: 0.008, g });
  },
  theme: (c, o, g, id) => {
    const f = BELL_ROOT[id] || BELL_ROOT.vapor;
    bell(c, o, { freq: f, dur: 0.8, peak: 0.04, send: 0.45, g });
    bell(c, o, { freq: f * 1.5, at: 0.09, dur: 1.1, peak: 0.03, send: 0.45, g });
  },
  powerOn: (c, o, g) => {
    tone(c, o, { freq: 110, to: 220, dur: 0.6, peak: 0.05, attack: 0.08, g });
    [440, 659.25, 987.77].forEach((f, i) => tone(c, o, { freq: f, at: 0.06 + i * 0.08, dur: 0.32, peak: 0.04, send: 0.4, g }));
  },
  powerOff: (c, o, g) => tone(c, o, { freq: 660, to: 220, dur: 0.26, peak: 0.04, send: 0.2, g }),
  // a broken signal: a few square-wave stutters at random pitches, like a corrupted packet
  glitch: (c, o, g) => {
    for (let i = 0; i < 4; i++) {
      tone(c, o, { type: 'square', freq: 180 + Math.random() * 1600, at: i * 0.03, dur: 0.018, peak: 0.022, attack: 0.001, g });
    }
    hiss(c, o, { from: 6000, to: 2000, q: 0.8, at: 0.02, dur: 0.1, peak: 0.03, g });
  },
};

// the fewest ms between two of the same cue, so sweeping the pointer over a list doesn't buzz
const GAP = { hover: 60, select: 40, nav: 150, theme: 150, glitch: 300 };
const last = {};

// Plays a cue if sound is on. `arg` is passed through (the theme id for `theme`).
export function cue(name, arg) {
  const c = peekContext();
  const g = c && buses();
  const make = CUES[name];
  if (!g || !make || (!isEnabled() && name !== 'powerOff')) return false;
  const now = Date.now();
  if (now - (last[name] || 0) < (GAP[name] || 0)) return false;
  last[name] = now;
  try {
    make(c, g.ui, g, arg);
  } catch {
    return false;
  }
  return true;
}

export function resetCuesForTests() {
  Object.keys(last).forEach((k) => delete last[k]);
}
