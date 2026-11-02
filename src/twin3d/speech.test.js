import { silentSpeech, toVisemes, wordEnds } from './speech';
import { collect, spoken, visemeId } from '../../twin-api/src/tts';

describe('toVisemes (Azure ids -> Oculus, as on matthewpetersen.ca)', () => {
  it('drops leading silence and times each viseme until the next', () => {
    const v = toVisemes([
      { visemeId: 0, audioOffset: 0 },
      { visemeId: 12, audioOffset: 500000 }, // 50 ms
      { visemeId: 1, audioOffset: 1200000 },
      { visemeId: 21, audioOffset: 2000000 },
    ]);
    expect(v.visemes).toEqual(['kk', 'aa', 'PP']);
    expect(v.times).toEqual([50, 120, 200]);
    expect(v.durations).toEqual([70, 80, 100]);
  });
});

describe('wordEnds', () => {
  it('finds each spoken word in the written line', () => {
    const text = 'Hi, I build agents.';
    expect(wordEnds(text, ['Hi', 'I', 'build', 'agents'])).toEqual([3, 5, 11, 19]);
  });

  it('holds its place when the voice says something not in the text', () => {
    const text = 'It hit 98.1% accuracy.';
    const ends = wordEnds(text, ['It', 'hit', 'ninety-eight', 'point', 'one', 'percent', 'accuracy']);
    expect(ends[0]).toBe(2);
    expect(ends[1]).toBe(6);
    expect(ends[ends.length - 1]).toBe(text.length);
    expect([...ends].sort((a, b) => a - b)).toEqual(ends);
  });

  it('matches Chinese character by character', () => {
    expect(wordEnds('我在南加大读书。', ['我', '在', '南加大', '读书'])).toEqual([1, 2, 5, 7]);
  });
});

describe('silentSpeech', () => {
  it('times every word in order and ends each where the text reveal would stop', () => {
    const s = silentSpeech('Hey there. I build agents, mostly.', () => 0.5);
    expect(s.words).toEqual(['Hey', 'there.', 'I', 'build', 'agents,', 'mostly.']);
    expect(s.ends[s.ends.length - 1]).toBe('Hey there. I build agents, mostly.'.length);
    s.wtimes.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(s.wtimes[i]));
    expect(s.ms).toBeGreaterThan(s.wtimes[s.wtimes.length - 1]);
    // a full stop leaves a breath before the next word
    expect(s.wtimes[2] - s.wtimes[1]).toBeGreaterThan(s.wtimes[1] - s.wtimes[0]);
  });
});

describe('voicedSpeech without timings (the Workers AI voices)', () => {
  it('stretches the typing rhythm over the audio and leaves the mouth shapes to TalkingHead', async () => {
    const line = 'Hey there. I build agents, mostly.';
    const was = process.env.REACT_APP_TWIN_API_URL;
    process.env.REACT_APP_TWIN_API_URL = 'https://twin.test';
    let voicedSpeech;
    jest.isolateModules(() => ({ voicedSpeech } = require('./speech')));
    process.env.REACT_APP_TWIN_API_URL = was;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ audio: btoa('mp3'), words: [], visemes: [] }) });
    const s = await voicedSpeech(line, { decodeAudioData: async () => ({ duration: 3 }) });
    const typed = silentSpeech(line, () => 0.5);
    expect(s.ms).toBe(3000);
    expect(s.words).toEqual(typed.words);
    expect(s.ends).toEqual(typed.ends);
    expect(s.wtimes[1] / s.wtimes[2]).toBeCloseTo(typed.wtimes[1] / typed.wtimes[2]);
    expect(s.wtimes[s.wtimes.length - 1]).toBeLessThan(3000);
    expect(s.visemes).toBeUndefined();
  });
});

describe('twin-api tts', () => {
  it('maps IPA phonemes to Azure visemes', () => {
    expect(['h', 'ə', 'l', 'oʊ'].map(visemeId)).toEqual([12, 1, 14, 8]);
    expect(['aɪ', 'tʃ', 'ð', 'f', 'm', 'ˈɑː'].map(visemeId)).toEqual([11, 16, 17, 18, 21, 2]);
    expect(visemeId('')).toBe(0);
  });

  it('collects Cartesia events into audio, words and visemes in 100 ns ticks', () => {
    const pcm = btoa(String.fromCharCode(1, 0, 2, 0));
    const out = collect([
      { type: 'chunk', data: pcm },
      { type: 'timestamps', word_timestamps: { words: ['Hello'], start: [0.1], end: [0.4] } },
      { type: 'phoneme_timestamps', phoneme_timestamps: { phonemes: ['h', 'ə'], start: [0.1, 0.2], end: [0.2, 0.3] } },
      { type: 'chunk', data: pcm },
      { type: 'done' },
    ]);
    expect(out.words).toEqual([{ text: 'Hello', audioOffset: 1000000, duration: 3000000 }]);
    expect(out.visemes).toEqual([
      { visemeId: 12, audioOffset: 1000000 },
      { visemeId: 1, audioOffset: 2000000 },
    ]);
    const wav = atob(out.audio);
    expect(wav.slice(0, 4)).toBe('RIFF');
    expect(wav.length).toBe(44 + 8);
  });

  it('throws on an error event', () => {
    expect(() => collect([{ type: 'error', message: 'bad voice' }])).toThrow('bad voice');
  });

  it('says names the way people say them, not letter by letter', () => {
    expect(spoken('It won 1st place at USC Build4SC, and I love it.')).toBe('It won 1st place at USC Build for SC, and I love it.');
    expect(spoken('Peeko 在 USC Build4SC 拿了第一名')).toBe('Peeko 在 USC Build for SC 拿了第一名');
    expect(spoken('Peeko, easily.')).toBe('Peeko, easily.');
  });
});
