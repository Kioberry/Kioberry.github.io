// The ask panel, modelled on matthewpetersen.ca: follow-up chips with a shuffle button, the input
// with a mic, and the conversation-mode switch underneath.
export function TwinAnswer({ chat }) {
  const { current, text, typed, talking, pending, skip } = chat;
  if (!current && !pending) return <div className="tw-answer" aria-live="polite" />;
  return (
    <div className="tw-answer" aria-live="polite" onClick={skip}>
      {current && !pending && <p className="tw-q">› {current.q}</p>}
      <p className="tw-a">
        {pending ? <span className="dots">thinking</span> : text.slice(0, typed)}
        {talking && <span className="caret" />}
      </p>
    </div>
  );
}

export default function TwinPanel({ chat, name = 'Astrid' }) {
  const { input, setInput, ask, pending, followups, shuffleFollowups, browse, canBack, canForward } = chat;
  return (
    <div className="tw-wrap">
      <form
        className="tw-panel"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <div className="tw-chips">
          <button type="button" className="tw-icon" onClick={shuffleFollowups} aria-label="Show other questions">
            ↻
          </button>
          {followups.map((q) => (
            <button type="button" key={q} className="tw-chip" onClick={() => ask(q)} disabled={pending}>
              <span aria-hidden="true">↳</span> {q}
            </button>
          ))}
        </div>
        <div className="tw-input">
          {(canBack || canForward) && (
            <span className="tw-nav">
              <button type="button" onClick={() => browse(-1)} disabled={!canBack} aria-label="Previous answer">
                ‹
              </button>
              <button type="button" onClick={() => browse(1)} disabled={!canForward} aria-label="Next answer">
                ›
              </button>
            </span>
          )}
          <span className="tw-grip" aria-hidden="true">
            ⣿
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${name}`}
            aria-label={`Ask ${name}'s digital twin`}
          />
          {input.trim() ? (
            <button type="submit" className="tw-mic" disabled={pending} aria-label="Send">
              ↵
            </button>
          ) : (
            <button
              type="button"
              className={`tw-mic ${chat.listening ? 'is-on' : ''}`}
              onClick={chat.listen}
              disabled={!chat.canListen}
              aria-label={chat.listening ? 'Stop listening' : 'Ask by voice'}
            >
              <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
                <rect x="4" y="0" width="6" height="10" rx="3" />
                <path d="M1 7v1a6 6 0 0 0 12 0V7h-1.5v1a4.5 4.5 0 0 1-9 0V7z" />
                <rect x="6.25" y="13" width="1.5" height="3" />
              </svg>
            </button>
          )}
        </div>
      </form>
      <div className="tw-mode">
        <span>Conversation mode</span>
        <button
          type="button"
          role="switch"
          aria-checked={chat.voice}
          className={`tw-switch ${chat.voice ? 'is-on' : ''}`}
          onClick={chat.toggleVoice}
        >
          <i />
        </button>
        <span>{chat.voice ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
}
