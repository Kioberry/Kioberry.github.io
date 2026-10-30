// How the twin's answers travel from the API (twin-api/) to the page, shared by both sides.
//
// The API answers with server-sent events, one JSON object per `data:` line, the same idea as
// matthewpetersen.ca's /api/chat but in whole chat bubbles instead of sentences:
//   { type: 'bubble', text }          one chat message, sent as soon as the model has written it
//   { type: 'followups', questions }  up to three questions the visitor might ask next
//   { type: 'done' }  or  { type: 'error', message }

export const sse = (event) => `data: ${JSON.stringify(event)}\n\n`;

// Complete events in `buffer`, plus the unfinished tail to keep for the next chunk.
export function parseEvents(buffer) {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop();
  const events = blocks
    .flatMap((b) => b.split(/\r?\n/))
    .filter((line) => line.startsWith('data:'))
    .map((line) => {
      try {
        return JSON.parse(line.slice(5).trim());
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return { events, rest };
}

// for await (const event of readEvents(response.body)) ...
export async function* readEvents(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const { events, rest } = parseEvents(buffer + decoder.decode(value, { stream: true }));
    buffer = rest;
    yield* events;
  }
  yield* parseEvents(`${buffer}\n\n`).events;
}

// split after . ! ? only when followed by a space, so "2.0" and "0.842" stay intact
const sentences = (s) =>
  String(s)
    .split(/(?<=[.!?])\s+|(?<=[。！？])/)
    .map((x) => x.trim())
    .filter(Boolean);

// Turn a paragraph into chat-sized bubbles (sentences packed up to ~170 chars each).
export function toBubbles(text, max = 170) {
  if (Array.isArray(text)) return text;
  const parts = String(text)
    .split(/\n\s*\n/)
    .flatMap((p) => sentences(p));
  const out = [];
  for (const s of parts) {
    const last = out[out.length - 1];
    if (last && last.length + s.length + 1 <= max) out[out.length - 1] = `${last} ${s}`;
    else out.push(s);
  }
  return out;
}

// The model ends its reply with a hidden line of suggested questions: ">> Question one? | Question two?"
const FOLLOWUPS = /(?:^|\s)>>\s*/;

// Cuts streamed model text into chat bubbles. Each line the model writes is one bubble (an overlong line is
// split at sentence ends), markdown it should not have used is dropped, and the ">>" line is kept aside as
// `followups` instead of being shown.
export function createBubbler({ max = 220 } = {}) {
  let buffer = '';
  let followups = null;
  const lines = (text) =>
    text.split('\n').flatMap((line) => {
      const at = line.search(FOLLOWUPS);
      if (at !== -1) {
        followups = line
          .slice(at)
          .replace(FOLLOWUPS, '')
          .split('|')
          .map((q) => q.trim().replace(/^["“']|["”']$/g, ''))
          .filter((q) => q.length > 1 && q.length <= 60)
          .slice(0, 3);
        line = line.slice(0, at);
      }
      const clean = line
        .replace(/\*\*|__|`/g, '')
        .replace(/^\s*(?:[-*•]|#+|\d+\.)\s+/, '')
        .trim();
      return clean ? toBubbles(clean, max) : [];
    });
  return {
    // feed a text delta; returns the bubbles it completed
    push(delta) {
      buffer += delta;
      const nl = buffer.lastIndexOf('\n');
      if (nl === -1) return [];
      const done = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      return lines(done);
    },
    // the stream ended: whatever is left is the last bubble
    end() {
      const out = lines(buffer);
      buffer = '';
      return out;
    },
    get followups() {
      return followups;
    },
  };
}
