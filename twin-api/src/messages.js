// Turns what the browser sent into the `messages` the model sees. Everything here comes from a stranger, so it is
// cut to size and only user and assistant text gets through; nothing from the request reaches the system prompt.

const MAX_QUESTION = 600; // characters
const MAX_HISTORY = 12; // earlier messages kept (six exchanges)
const MAX_TURN = 1500; // characters per earlier message

// The visitor's recent history plus the new question, in Messages API shape; null if there is no question.
export function toMessages(body) {
  const query = typeof body?.query === 'string' ? body.query.trim().slice(0, MAX_QUESTION) : '';
  if (!query) return null;
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN) }));
  while (history.length && history[0].role !== 'user') history.shift();
  return [...history, { role: 'user', content: query }];
}
