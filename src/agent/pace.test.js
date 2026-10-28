import { bubbleMs, charDelay, chunkDelay, gapMs, nextStop, PACE, thinkingMs } from './pace';

const mid = () => 0.5; // no jitter

test('pauses are longer at punctuation than inside words', () => {
  expect(charDelay('a', 'b', mid)).toBeCloseTo(PACE.charMs);
  expect(charDelay(',', ' ', mid)).toBeGreaterThan(charDelay('a', 'b', mid) * 3);
  expect(charDelay('.', ' ', mid)).toBeGreaterThan(charDelay(',', ' ', mid));
  expect(charDelay('.', '5', mid)).toBeCloseTo(PACE.charMs); // decimal point, not a full stop
});

test('Chinese characters are spoken slower than Latin letters', () => {
  expect(charDelay('好', '', mid)).toBeGreaterThan(charDelay('a', '', mid));
});

test('a typical bubble takes a few seconds, like a person talking', () => {
  const s = "I'm doing my M.S. Computer Science at USC right now (GPA 3.85 / 4.0), finishing in Dec 2026.";
  const ms = bubbleMs(s);
  expect(s.length / (ms / 1000)).toBeGreaterThan(15); // characters per second
  expect(s.length / (ms / 1000)).toBeLessThan(35);
});

test('reveals by word, and by character for Chinese', () => {
  expect(nextStop('hello world', 0)).toBe(6);
  expect(nextStop('你好，世界', 0)).toBe(1);
  expect(nextStop('你好，世界', 1)).toBe(3); // punctuation stays with its character
});

test('abbreviations do not get a full-stop pause', () => {
  const t = 'M.S. Computer';
  expect(chunkDelay(t, 0, 5, () => 0.5)).toBeLessThan(PACE.stopMs);
  expect(chunkDelay('done. Next', 0, 6, () => 0.5)).toBeGreaterThan(PACE.stopMs);
});

test('thinking and typing gaps stay within bounds', () => {
  expect(thinkingMs('hi', () => 0)).toBeGreaterThanOrEqual(PACE.thinkMs[0]);
  expect(thinkingMs('x'.repeat(500), () => 1)).toBeLessThanOrEqual(PACE.thinkMs[1]);
  expect(gapMs('x'.repeat(1000), () => 1)).toBeLessThanOrEqual(PACE.gapMs[1]);
});
