import { noiseBuffer } from './engine';

// What the pointer sounds like as it scrambles the ASCII figure: a neon tube. Noise chopped at mains rate
// (100 Hz) over a low saw buzz, both behind a dull filter, heard only while the pointer moves; a harder push
// flickers the tube and the buzz brightens. Built into the ambient bed (ambient.js), which calls `update` every
// frame the figure draws with how hard the pointer is moving (`a`, 0..1).

function filter(c, type, freq, q) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

const SILENT = { update() {}, stop() {} };

// `env`: { c (the context), out (the bed's output), g (the buses) }
export function makeScramble({ c, out, g }) {
  try {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const bp = filter(c, 'bandpass', 1400, 0.9);

    // the noise is switched on and off 100 times a second, like the arc in a tube on mains power
    const chop = c.createGain();
    chop.gain.value = 0.5;
    const mains = c.createOscillator();
    mains.type = 'square';
    mains.frequency.value = 100;
    const depth = c.createGain();
    depth.gain.value = 0.5;
    chain(mains, depth, chop.gain);

    const buzz = c.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 100;
    const buzzLp = filter(c, 'lowpass', 700, 1.2);
    const buzzGain = c.createGain();
    buzzGain.gain.value = 0.35;

    const lp = filter(c, 'lowpass', 2600, 0.7);
    const gain = c.createGain();
    gain.gain.value = 0;
    const send = c.createGain();
    send.gain.value = 0.15;
    chain(src, bp, chop, lp);
    chain(buzz, buzzLp, buzzGain, lp);
    chain(lp, gain, out);
    chain(gain, send, g.reverb);
    src.start(0, Math.random() * 1.9);
    mains.start();
    buzz.start();

    let level = 0;
    return {
      update(a) {
        if (Math.abs(a - level) < 0.01) return;
        const rising = a > level;
        level = a;
        const t = c.currentTime;
        gain.gain.setTargetAtTime(Math.pow(a, 1.2) * 0.32, t, rising ? 0.03 : 0.25); // fast in, slow out
        buzzLp.frequency.setTargetAtTime(700 + a * 1800, t, 0.05);
      },
      stop(t) {
        src.stop(t);
        mains.stop(t);
        buzz.stop(t);
      },
    };
  } catch {
    return SILENT;
  }
}
