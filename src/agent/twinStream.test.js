import { createBubbler, parseEvents, sse } from './twinStream';

const feed = (chunks) => {
  const b = createBubbler();
  const out = chunks.flatMap((c) => b.push(c));
  return { bubbles: [...out, ...b.end()], followups: b.followups };
};

test('each line the model writes becomes one bubble, even when split across deltas', () => {
  const { bubbles } = feed(['Pretty good! Mostly heads-', 'down on applications.\nHow', "'s yours going?"]);
  expect(bubbles).toEqual(['Pretty good! Mostly heads-down on applications.', "How's yours going?"]);
});

test('a bubble is released as soon as its line ends, not at the end of the reply', () => {
  const b = createBubbler();
  expect(b.push('Probably DayPilot.')).toEqual([]);
  expect(b.push('\nI led')).toEqual(['Probably DayPilot.']);
});

test('the >> line becomes follow-up questions and is never shown', () => {
  const { bubbles, followups } = feed(['Sure!\n\n>> How did Peeko win? | "What\'s your stack?" | Where are you based?']);
  expect(bubbles).toEqual(['Sure!']);
  expect(followups).toEqual(['How did Peeko win?', "What's your stack?", 'Where are you based?']);
  expect(feed(['Happy to help. >> One? | Two?']).followups).toEqual(['One?', 'Two?']);
});

test('markdown the model should not have used is dropped, and long lines are split at sentences', () => {
  expect(feed(['- **DayPilot** is my favorite.']).bubbles).toEqual(['DayPilot is my favorite.']);
  const long = `${'A sentence that goes on for a while. '.repeat(8)}`.trim();
  const { bubbles } = feed([long]);
  expect(bubbles.length).toBeGreaterThan(1);
  bubbles.forEach((x) => expect(x.length).toBeLessThanOrEqual(220));
  expect(feed(['It hit 0.842 accuracy.']).bubbles).toEqual(['It hit 0.842 accuracy.']);
});

test('server-sent events survive being cut at any point', () => {
  const wire = sse({ type: 'bubble', text: 'Hi!' }) + sse({ type: 'followups', questions: ['A?'] }) + sse({ type: 'done' });
  for (let cut = 1; cut < wire.length; cut++) {
    const first = parseEvents(wire.slice(0, cut));
    const second = parseEvents(first.rest + wire.slice(cut));
    expect([...first.events, ...second.events].map((e) => e.type)).toEqual(['bubble', 'followups', 'done']);
  }
});
