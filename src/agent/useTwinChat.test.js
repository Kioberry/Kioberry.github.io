import { act, renderHook } from '@testing-library/react';
import useTwinChat from './useTwinChat';
import { askTwin } from './twinAgent';
import { silentSpeech, voicedSpeech } from './speech';

jest.mock('./twinAgent', () => ({ ...jest.requireActual('./twinAgent'), askTwin: jest.fn() }));
jest.mock('./speech', () => ({
  ...jest.requireActual('./speech'),
  voicedSpeech: jest.fn(),
  voiceBudgetLeft: () => 180000,
  spendVoice: () => {},
}));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const later = (ms) => new Promise((r) => setTimeout(r, ms));
const run = async (ms) => {
  for (let t = 0; t < ms; t += 100) {
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  }
};

test('a streamed answer is typed out bubble by bubble, waiting "typing" for bubbles still on the way', async () => {
  askTwin.mockImplementation(async (q, history, { onBubble }) => {
    onBubble('Pretty good!');
    await later(8000); // the second bubble takes a while to arrive
    onBubble("How's yours?");
    return { bubbles: ['Pretty good!', "How's yours?"], followups: ['What are you up to?', 'Favorite project?'] };
  });
  const { result } = renderHook(() => useTwinChat());
  act(() => result.current.ask("how's your day?"));
  expect(result.current.phase).toBe('thinking');

  await run(5000); // thought, then typed the first bubble; the second hasn't arrived
  expect(result.current.exchanges[0].lines).toEqual(['Pretty good!']);
  expect(result.current.typing).toBe(true);

  await run(10000);
  expect(result.current.phase).toBe('idle');
  expect(result.current.exchanges[0].lines).toEqual(['Pretty good!', "How's yours?"]);
  expect(result.current.followups).toEqual(['What are you up to?', 'Favorite project?']);
});

test('an answer that arrives all at once (the built-in rules) is still revealed at a human pace', async () => {
  askTwin.mockResolvedValue({ bubbles: ['Hi there!', 'Ask me anything.'], topic: 'greeting' });
  const { result } = renderHook(() => useTwinChat());
  act(() => result.current.ask('hi'));
  await run(2500);
  expect(result.current.exchanges[0].done).toBe(false);
  await run(8000);
  expect(result.current.phase).toBe('idle');
  expect(result.current.exchanges[0].lines).toEqual(['Hi there!', 'Ask me anything.']);
});

describe('conversation mode', () => {
  let played;
  beforeEach(() => {
    played = [];
    // each sentence "plays" for its audio's duration
    window.AudioContext = class {
      destination = {};
      resume() {}
      createBufferSource() {
        const src = {
          connect() {},
          stop() {},
          start() {
            played.push(src.buffer.line);
            setTimeout(() => src.onended?.(), src.buffer.duration * 1000);
          },
        };
        return src;
      }
    };
  });
  afterEach(() => delete window.AudioContext);

  const voiceAfter = (ms) => (line) =>
    later(ms).then(() => ({ ...silentSpeech(line, () => 0.5), audio: { duration: 2, line }, ms: 2000 }));

  test('the words wait ("typing") for the voice, then appear as it is said', async () => {
    voicedSpeech.mockImplementation(voiceAfter(4000));
    askTwin.mockResolvedValue({ bubbles: ['Peeko, easily.', 'It won 1st place.'] });
    const { result } = renderHook(() => useTwinChat());
    act(() => result.current.toggleVoice());
    act(() => result.current.ask('Favorite project?'));

    await run(4000); // thought for about a second; the voice takes 4
    expect(result.current.typing).toBe(true);
    expect(result.current.exchanges[0].lines).toEqual([]);
    expect(played).toEqual([]);
    // every bubble's voice was asked for as soon as the answer was in, not when its turn came
    expect(voicedSpeech.mock.calls.map(([line]) => line)).toEqual(['Peeko, easily.', 'It won 1st place.']);

    await run(1500);
    expect(played).toEqual(['Peeko, easily.']);
    expect(result.current.exchanges[0].lines[0]).toMatch(/^Peeko/);

    await run(6000);
    expect(played).toEqual(['Peeko, easily.', 'It won 1st place.']);
    expect(result.current.phase).toBe('idle');
    expect(result.current.exchanges[0].lines).toEqual(['Peeko, easily.', 'It won 1st place.']);
  });

  test('a voice that never comes holds the answer up for a few seconds at most', async () => {
    voicedSpeech.mockImplementation(() => new Promise(() => {}));
    askTwin.mockResolvedValue({ bubbles: ['Peeko, easily.', 'It won 1st place.'] });
    const { result } = renderHook(() => useTwinChat());
    act(() => result.current.toggleVoice());
    act(() => result.current.ask('Favorite project?'));

    await run(12000);
    expect(result.current.phase).toBe('idle');
    expect(result.current.exchanges[0].lines).toEqual(['Peeko, easily.', 'It won 1st place.']);
  });
});
