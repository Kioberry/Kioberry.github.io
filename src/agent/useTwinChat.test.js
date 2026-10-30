import { act, renderHook } from '@testing-library/react';
import useTwinChat from './useTwinChat';
import { askTwin } from './twinAgent';

jest.mock('./twinAgent', () => ({ ...jest.requireActual('./twinAgent'), askTwin: jest.fn() }));

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
