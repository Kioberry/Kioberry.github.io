// How fast the twin "talks". Everything time-related lives here so it is easy to tune.
//
// The goal is the rhythm of a person typing or speaking, not a constant typewriter:
//   - a short "thinking" pause first, longer for longer questions,
//   - characters at a slightly uneven speed (people don't type like metronomes),
//   - real pauses at commas, full stops and dashes, where a speaker would breathe,
//   - Chinese characters slower than Latin letters (each one carries more),
//   - a "typing..." gap between chat bubbles, longer when the next bubble is long.

export const PACE = {
  wordMs: 90, // fixed cost per word ("saying" it), plus perCharMs for each letter
  perCharMs: 13, // => about 25 characters a second in running English text, 2x slower than the old typewriter
  charMs: 38, // per character when revealing letter by letter (charDelay)
  jitter: 0.5, // +/- 50% randomness per character
  cjkMs: 110, // per Chinese character
  commaMs: 190,
  stopMs: 380, // . ! ? 。！？
  dashMs: 260, // — : ;
  newlineMs: 320,
  thinkMs: [700, 1900], // min, max thinking pause before the first bubble
  thinkPerChar: 16,
  gapMs: [550, 1300], // min, max "typing..." gap between bubbles
  gapPerChar: 4,
};

const CJK = /[一-鿿]/;

// Reveal by word: returns the index just after the next word (and the spaces after it).
// Chinese has no spaces, so it advances one character at a time.
export function nextStop(text, i) {
  if (i >= text.length) return text.length;
  if (CJK.test(text[i])) {
    let j = i + 1;
    while (j < text.length && /[，。！？、：；）」』\s]/.test(text[j])) j += 1; // keep punctuation with its character
    return j;
  }
  let j = i;
  while (j < text.length && !/\s/.test(text[j]) && !CJK.test(text[j])) j += 1;
  while (j < text.length && /\s/.test(text[j])) j += 1;
  return Math.max(j, i + 1);
}

// How long to wait after showing text.slice(i, j): the word itself, then a pause if it ends a clause.
export function chunkDelay(text, i, j, rng = Math.random, pace = PACE) {
  const word = text.slice(i, j).trim();
  const wobble = 1 + (rng() * 2 - 1) * pace.jitter * 0.6;
  if (!word) return pace.wordMs * wobble;
  if (CJK.test(word[0])) {
    const last = word[word.length - 1];
    return (pace.cjkMs + (CJK.test(last) ? 0 : charDelay(last, '', () => 0.5, pace))) * wobble;
  }
  const last = word[word.length - 1];
  const abbrev = /^([A-Z]\.)+[A-Z]?\.?$/.test(word) || /^(e\.g|i\.e|etc|vs|Dr|Mr|Ms)\.$/i.test(word);
  let pause = 0;
  if (/[.!?]/.test(last) && !abbrev) pause = pace.stopMs;
  else if (/[,]/.test(last)) pause = pace.commaMs;
  else if (/[:;—]/.test(last)) pause = pace.dashMs;
  return (pace.wordMs + word.length * pace.perCharMs) * wobble + pause;
}

export function charDelay(ch, next = '', rng = Math.random, pace = PACE) {
  const wobble = 1 + (rng() * 2 - 1) * pace.jitter;
  if (/[.!?。！？]/.test(ch) && (!next || /\s|["')\]]/.test(next) || CJK.test(ch))) return pace.stopMs * wobble;
  if (/[,，、]/.test(ch)) return pace.commaMs * wobble;
  if (/[—:;：；]/.test(ch)) return pace.dashMs * wobble;
  if (ch === '\n') return pace.newlineMs;
  if (CJK.test(ch)) return pace.cjkMs * wobble;
  return pace.charMs * wobble;
}

export function thinkingMs(question, rng = Math.random, pace = PACE) {
  const [lo, hi] = pace.thinkMs;
  return Math.min(hi, lo + question.length * pace.thinkPerChar + rng() * 300);
}

export function gapMs(nextBubble = '', rng = Math.random, pace = PACE) {
  const [lo, hi] = pace.gapMs;
  return Math.min(hi, lo + nextBubble.length * pace.gapPerChar + rng() * 250);
}

// Total time to "say" a bubble word by word (what the UI does), used for tests.
export function bubbleMs(text, rng = () => 0.5, pace = PACE) {
  let t = 0;
  for (let i = 0; i < text.length; ) {
    const j = nextStop(text, i);
    t += chunkDelay(text, i, j, rng, pace);
    i = j;
  }
  return t;
}
