import * as engine from './engine';
import { cue, resetCuesForTests } from './cues';
import { playVoice, voiceInput } from './voiceFx';
import { toggleSound } from './useSound';

// A Web Audio stand-in that records the nodes made and the sources started.
function fakeParam(value = 0) {
  return {
    value,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime(v) {
      this.value = v;
    },
    cancelScheduledValues() {},
  };
}
function fakeNode(extra = {}) {
  return { connect() {}, disconnect() {}, start() {}, stop() {}, ...extra };
}
class FullContext {
  static made = 0;
  static started = [];
  constructor() {
    FullContext.made += 1;
  }
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = { name: 'speakers' };
  resume() {}
  createGain = () => fakeNode({ gain: fakeParam(1) });
  createOscillator = () =>
    fakeNode({ frequency: fakeParam(440), detune: fakeParam(), start: () => FullContext.started.push('osc') });
  createBufferSource = () => fakeNode({ start: () => FullContext.started.push('buffer') });
  createBuffer = (ch, len) => ({ getChannelData: () => new Float32Array(len) });
  createBiquadFilter = () => fakeNode({ frequency: fakeParam(), Q: fakeParam(), gain: fakeParam() });
  createDynamicsCompressor = () =>
    fakeNode({ threshold: fakeParam(), knee: fakeParam(), ratio: fakeParam(), attack: fakeParam(), release: fakeParam() });
  createConvolver = () => fakeNode();
  createWaveShaper = () => fakeNode();
  createDelay = () => fakeNode({ delayTime: fakeParam() });
  createAnalyser = () => fakeNode({ fftSize: 512, getByteTimeDomainData: (a) => a.fill(128) });
}

beforeEach(() => {
  localStorage.clear();
  engine.resetForTests();
  resetCuesForTests();
  FullContext.made = 0;
  FullContext.started = [];
  window.AudioContext = FullContext;
});
afterEach(() => delete window.AudioContext);

test('sound starts off, and nothing is created until a visitor turns it on', () => {
  expect(engine.isEnabled()).toBe(false);
  expect(cue('select')).toBe(false);
  expect(FullContext.made).toBe(0);
  expect(engine.peekContext()).toBe(null);
});

test('the switch starts the context, plays, and is remembered', () => {
  toggleSound();
  expect(FullContext.made).toBe(1);
  expect(engine.isEnabled()).toBe(true);
  expect(localStorage.getItem('site-sound')).toBe('on');
  expect(FullContext.started.length).toBeGreaterThan(0); // the power-on cue and the ambient bed

  engine.resetForTests(); // a reload
  expect(engine.isEnabled()).toBe(true);

  toggleSound();
  expect(engine.isEnabled()).toBe(false);
  expect(localStorage.getItem('site-sound')).toBe('off');
});

test('cues are silent while sound is off, even once the context exists (the voice made it)', () => {
  engine.unlock('playback');
  expect(engine.peekContext()).not.toBe(null);
  expect(cue('select')).toBe(false);
  engine.setEnabled(true);
  expect(cue('select')).toBe(true);
});

test('sweeping the pointer over a list does not buzz: hovers are spaced out', () => {
  engine.unlock();
  engine.setEnabled(true);
  expect(cue('hover')).toBe(true);
  expect(cue('hover')).toBe(false);
});

test("the twin's voice goes through its chain (even with site sound off), opens with a squelch and ducks the bed", () => {
  engine.unlock('playback');
  const input = voiceInput();
  expect(input).not.toEqual({ name: 'speakers' });
  expect(input.frequency).toBeDefined(); // the chain's first filter
  FullContext.started = [];
  const src = playVoice({ duration: 1 }, { open: true });
  expect(src).toBeDefined();
  // the squelch's noise and tick, then the voice itself
  expect(FullContext.started).toEqual(['buffer', 'osc', 'buffer']);
  expect(cue('select')).toBe(false); // the site's own sounds stay off
});

test("without the nodes the mixer needs, the twin's voice goes straight to the speakers", () => {
  window.AudioContext = class {
    destination = { name: 'speakers' };
    resume() {}
    createBufferSource() {
      return fakeNode();
    }
  };
  engine.unlock('playback');
  expect(voiceInput()).toEqual({ name: 'speakers' });
  expect(() => playVoice({ duration: 1 })).not.toThrow();
  expect(cue('select')).toBe(false);
});
