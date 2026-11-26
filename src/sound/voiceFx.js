import { buses, peekContext, setDucked } from './engine';
import { hiss } from './cues';

// The twin's voice, made to sound like it comes through a machine without losing the words:
//
//   source -> high-pass 120 Hz -> presence +3 dB at 2.5 kHz -> soft saturation ─┬─> voice bus
//                                                                               ├─> comb (a short metallic ring)
//                                                                               ├─> hall reverb (a little)
//                                                                               └─> analyser (drives the figure)
//
// A short radio squelch opens and closes each answer. Only the twin's own voice passes through here; the
// browser's fallback voice (speechSynthesis) can't be routed through Web Audio and stays as it is.

let chain = null;
let levelData = null;

function saturation(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

function build(c, g) {
  try {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 120;
    const presence = c.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2500;
    presence.Q.value = 0.9;
    presence.gain.value = 3;
    const shaper = c.createWaveShaper();
    shaper.curve = saturation(1.6);
    shaper.oversample = '2x';
    const post = c.createGain();
    post.gain.value = 0.9;
    hp.connect(presence);
    presence.connect(shaper);
    shaper.connect(post);
    post.connect(g.voice);

    // comb: a ~9 ms delay fed back into itself rings at ~105 Hz and its harmonics, like a voice in a metal tube
    const delay = c.createDelay(0.05);
    delay.delayTime.value = 0.0095;
    const fb = c.createGain();
    fb.gain.value = 0.3;
    const combBp = c.createBiquadFilter();
    combBp.type = 'bandpass';
    combBp.frequency.value = 1800;
    combBp.Q.value = 0.8;
    const combWet = c.createGain();
    combWet.gain.value = 0.14;
    post.connect(delay);
    delay.connect(combBp);
    combBp.connect(fb);
    fb.connect(delay);
    combBp.connect(combWet);
    combWet.connect(g.voice);

    const send = c.createGain();
    send.gain.value = 0.16;
    post.connect(send);
    send.connect(g.reverb);

    const analyser = c.createAnalyser();
    analyser.fftSize = 512;
    post.connect(analyser);
    return { input: hp, analyser };
  } catch {
    return false;
  }
}

// Where a voice source should connect: the chain, or the speakers if the browser can't build it.
export function voiceInput() {
  const c = peekContext();
  if (!c) return null;
  const g = buses();
  if (!g) return c.destination;
  if (chain === null) chain = build(c, g);
  return chain ? chain.input : g.voice;
}

// Plays one sentence of the twin's voice. `open`: it is the first of an answer, so the squelch goes first.
// Returns the source; the caller sets `onended`.
export function playVoice(buffer, { open = false } = {}) {
  const c = peekContext();
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(voiceInput());
  if (open) squelch('open');
  setDucked(true);
  src.start(open && chain ? (c.currentTime || 0) + 0.09 : 0);
  return src;
}

// The voice has stopped (ended, skipped, or switched off): the ambient bed comes back up.
export const voiceStopped = () => setDucked(false);

// A radio key-up (open) or key-down (close): band-passed noise and a faint tick.
export function squelch(kind) {
  const c = peekContext();
  const g = c && buses();
  if (!g) return;
  try {
    if (kind === 'open') hiss(c, g.voice, { from: 1400, to: 3200, q: 2.5, dur: 0.08, peak: 0.05, g });
    else hiss(c, g.voice, { from: 3200, to: 900, q: 2.5, dur: 0.1, peak: 0.045, send: 0.2, g });
    const t = c.currentTime + (kind === 'open' ? 0 : 0.08);
    const o = c.createOscillator();
    o.frequency.value = kind === 'open' ? 1250 : 950;
    const e = c.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(0.025, t + 0.002);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(e);
    e.connect(g.voice);
    o.start(t);
    o.stop(t + 0.05);
  } catch {}
}

// How loud the twin is speaking right now, 0..1 (0 without the chain). Cheap enough to call every frame.
export function voiceLevel() {
  if (!chain) return 0;
  const a = chain.analyser;
  if (!levelData) levelData = new Uint8Array(a.fftSize);
  a.getByteTimeDomainData(levelData);
  let sum = 0;
  for (let i = 0; i < levelData.length; i++) {
    const v = (levelData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / levelData.length) * 4);
}
