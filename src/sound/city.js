import { pinkBuffer } from './engine';

// The world outside the scene, on top of the ambient chord (ambient.js): a megacity far below. A deep rumble and
// a wash of traffic that swell slowly like wind, and now and then a siren drifting across the city (its pitch
// falling as it goes, Doppler) or a craft passing overhead from left to right. All synthesised: the steady
// layers are looping noise through filters, the events are scheduled on random timers.

const rand = (a, b) => a + Math.random() * (b - a);

function loop(c, buffer) {
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(0, Math.random() * (buffer.duration || 0));
  return src;
}

function filter(c, type, freq, q = 0.7) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gain(c, value) {
  const g = c.createGain();
  g.gain.value = value;
  return g;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

function panner(c, value) {
  if (!c.createStereoPanner) return gain(c, 1);
  const p = c.createStereoPanner();
  p.pan.value = value;
  return p;
}

// Brown noise: deep, for rumble. Cached per context.
const browns = new WeakMap();
function brownBuffer(c) {
  if (!browns.has(c)) {
    const rate = c.sampleRate || 44100;
    const len = Math.floor(rate * 4);
    const buf = c.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    browns.set(c, buf);
  }
  return browns.get(c);
}

function saturation(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

// Slow random swells on a gain: two slow LFOs that never quite line up, like wind carrying the sound.
function gusts(c, param, depth) {
  return [0.07, 0.113].map((f, i) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    chain(o, gain(c, depth * (i ? 0.6 : 1)), param);
    o.start();
    return o;
  });
}

// Calls fn every [min, max] seconds (the first after [first0, first1]); skipped while the tab is hidden.
function every(min, max, fn, first0, first1) {
  let id;
  let live = true;
  const next = (a, b) => {
    id = setTimeout(() => {
      if (!live) return;
      if (!document.hidden) fn();
      next(min, max);
    }, rand(a, b) * 1000);
  };
  next(first0, first1);
  return () => {
    live = false;
    clearTimeout(id);
  };
}

// A siren somewhere across the city: a wailing triangle, swelling in and out as it drifts left to right.
function siren(c, out, reverb) {
  const t = c.currentTime;
  const dur = rand(7, 10);
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.value = rand(720, 820);
  const wail = c.createOscillator();
  wail.frequency.value = rand(0.25, 0.4);
  chain(wail, gain(c, 140), o.frequency);
  o.detune.setValueAtTime(60, t);
  o.detune.linearRampToValueAtTime(-90, t + dur);
  const e = gain(c, 0);
  e.gain.linearRampToValueAtTime(0.08, t + dur * 0.45);
  e.gain.linearRampToValueAtTime(0, t + dur);
  const p = panner(c, -0.6);
  if (p.pan) p.pan.linearRampToValueAtTime(0.6, t + dur);
  chain(o, filter(c, 'lowpass', 1400), e, p, out);
  chain(e, gain(c, 0.9), reverb);
  o.start(t);
  wail.start(t);
  o.stop(t + dur + 0.1);
  wail.stop(t + dur + 0.1);
}

// A craft passing overhead: a band of noise rising and falling in pitch as it crosses left to right.
function flyby(c, out, reverb) {
  const t = c.currentTime;
  const dur = rand(3, 4.5);
  const src = loop(c, pinkBuffer());
  const bp = filter(c, 'bandpass', 260, 2);
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.exponentialRampToValueAtTime(950, t + dur * 0.5);
  bp.frequency.exponentialRampToValueAtTime(300, t + dur);
  const e = gain(c, 0);
  e.gain.linearRampToValueAtTime(0.6, t + dur * 0.5);
  e.gain.linearRampToValueAtTime(0, t + dur);
  const p = panner(c, -1);
  if (p.pan) p.pan.linearRampToValueAtTime(1, t + dur);
  chain(src, bp, e, p, out);
  chain(e, gain(c, 0.5), reverb);
  src.stop(t + dur + 0.1);
}

const SILENT = { stop() {} };

// Starts the city behind its own fader, fading in. `env`: { c, out (the bed's output), g (the buses) }.
// Returns { stop(after) }, which fades it out over `after` seconds and then stops it.
export function makeCity({ c, out, g }) {
  try {
    const level = gain(c, 0);
    level.connect(out);
    level.gain.setTargetAtTime(1, c.currentTime, 0.8);

    // the rumble itself, felt on headphones
    const rumble = loop(c, brownBuffer(c));
    const rumbleGain = gain(c, 0.45);
    chain(rumble, filter(c, 'lowpass', 260), rumbleGain, level);
    // the same rumble, saturated so it grows harmonics a laptop or phone speaker can play: the city's roar
    const roar = loop(c, brownBuffer(c));
    const shaper = c.createWaveShaper();
    shaper.curve = saturation(3);
    const roarGain = gain(c, 0.3);
    chain(roar, filter(c, 'lowpass', 400), gain(c, 2), shaper, filter(c, 'bandpass', 320, 0.5), filter(c, 'highpass', 150), roarGain, level);
    // traffic, and the hiss of tyres on wet roads far off
    const wash = loop(c, pinkBuffer());
    const washGain = gain(c, 0.38);
    chain(wash, filter(c, 'bandpass', 520, 0.7), washGain, level);
    const tyres = loop(c, pinkBuffer());
    const tyresGain = gain(c, 0.1);
    chain(tyres, filter(c, 'bandpass', 1300, 0.9), tyresGain, level);
    const nodes = [
      rumble,
      roar,
      wash,
      tyres,
      ...gusts(c, rumbleGain.gain, 0.12),
      ...gusts(c, roarGain.gain, 0.1),
      ...gusts(c, washGain.gain, 0.1),
      ...gusts(c, tyresGain.gain, 0.04),
    ];

    const stopSirens = every(18, 40, () => siren(c, level, g.reverb), 4, 8);
    const stopFlybys = every(20, 45, () => flyby(c, level, g.reverb), 10, 16);

    return {
      stop(after = 1.5) {
        stopSirens();
        stopFlybys();
        const t = c.currentTime;
        level.gain.cancelScheduledValues(t);
        level.gain.setTargetAtTime(0, t, after / 4);
        nodes.forEach((n) => n.stop(t + after));
        setTimeout(() => level.disconnect(), (after + 0.3) * 1000);
      },
    };
  } catch {
    return SILENT;
  }
}
