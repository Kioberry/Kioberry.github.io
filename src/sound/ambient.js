import { buses, peekContext, pinkBuffer } from './engine';
import { makeScramble } from './scramble';
import { makeCity } from './city';

// The bed under the home scene: a low minor chord of slightly detuned triangles behind a slowly breathing
// low-pass, a thin layer of air (pink noise, high up), a megacity far below (city.js), and a neon buzz that
// answers the pointer when it scrambles the ASCII figure (scramble.js). It runs only while sound is on; the
// engine fades it with the page (lower on the reading pages, ducked under the twin's voice, silent in a hidden tab).

// Each theme's chord (Hz) and how open the filter is: vapor sits warm and low, bone colder and thinner. The root
// gives weight on headphones; the upper notes are what a laptop or phone speaker can actually play.
const CHORDS = {
  vapor: { notes: [55, 110, 164.81, 261.63], cutoff: 700 }, // A1 A2 E3 C4
  bone: { notes: [61.74, 123.47, 185, 277.18], cutoff: 900 }, // B1 B2 F#3 C#4, open and bare
};

let bed = null; // the running nodes
let theme = 'vapor';

// the running bed, if it belongs to the current context
const live = () => (bed && bed.ctx === peekContext() ? bed : null);

export function startAmbient() {
  const c = peekContext();
  const g = c && buses();
  if (!g || live()) return;
  try {
    const out = c.createGain();
    out.gain.value = 1;
    out.connect(g.ambient);
    const stoppable = [];

    // the chord
    const chord = CHORDS[theme] || CHORDS.vapor;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = chord.cutoff;
    lp.Q.value = 0.7;
    lp.connect(out);
    const wet = c.createGain();
    wet.gain.value = 0.6;
    lp.connect(wet);
    wet.connect(g.reverb);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = chord.cutoff * 0.45;
    lfo.connect(lfoDepth);
    lfoDepth.connect(lp.frequency);
    stoppable.push(lfo);
    const oscs = [];
    chord.notes.forEach((f, i) => {
      [-5, 5].forEach((cents, side) => {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = cents + (Math.random() - 0.5) * 2;
        const v = c.createGain();
        v.gain.value = i === 0 ? 0.07 : 0.04;
        o.connect(v);
        if (c.createStereoPanner) {
          const p = c.createStereoPanner();
          p.pan.value = side ? 0.35 : -0.35;
          v.connect(p);
          p.connect(lp);
        } else v.connect(lp);
        oscs.push(o);
        stoppable.push(o);
      });
    });

    // air
    const air = c.createBufferSource();
    air.buffer = pinkBuffer();
    air.loop = true;
    const airBp = c.createBiquadFilter();
    airBp.type = 'bandpass';
    airBp.frequency.value = 5200;
    airBp.Q.value = 0.6;
    const airGain = c.createGain();
    airGain.gain.value = 0.05;
    air.connect(airBp);
    airBp.connect(airGain);
    airGain.connect(out);
    stoppable.push(air);

    stoppable.forEach((n) => n.start());
    bed = { ctx: c, out, lp, lfoDepth, oscs, stoppable };
    // what the pointer sounds like over the figure, silent until it moves
    bed.scramble = makeScramble({ c, out, g });
    // the city outside
    bed.city = makeCity({ c, out, g });
  } catch {
    bed = null;
  }
}

// The engine has already faded the ambient bus; the oscillators stop once it is quiet.
export function stopAmbient(after = 1.2) {
  if (!live()) return;
  const c = peekContext();
  const { stoppable, out, scramble, city } = bed;
  bed = null;
  const t = c.currentTime + after;
  try {
    scramble.stop(t);
    city.stop(after);
  } catch {}
  stoppable.forEach((n) => {
    try {
      n.stop(t);
    } catch {}
  });
  setTimeout(() => {
    try {
      out.disconnect();
    } catch {}
  }, (after + 0.2) * 1000);
}

// The chord follows the site theme, gliding over a couple of seconds.
export function setAmbientTheme(id) {
  theme = CHORDS[id] ? id : 'vapor';
  if (!live()) return;
  const c = peekContext();
  const chord = CHORDS[theme];
  const t = c.currentTime;
  bed.oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord.notes[i >> 1], t, 0.8));
  bed.lp.frequency.setTargetAtTime(chord.cutoff, t, 0.8);
  bed.lfoDepth.gain.setTargetAtTime(chord.cutoff * 0.45, t, 0.8);
}

// How hard the pointer is scrambling the figure, 0..1, called every frame the figure draws.
export function disturb(amount) {
  if (!live()) return;
  try {
    bed.scramble.update(Math.max(0, Math.min(1, amount)));
  } catch {}
}
