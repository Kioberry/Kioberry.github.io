import { useEffect, useRef } from 'react';

// The ask panel, modelled on matthewpetersen.ca, now a short conversation instead of a single answer:
// earlier exchanges stay above (dimmed), the latest question sits under them, and the answer arrives as a few
// chat bubbles on ↳ lines, typed at a human pace with a "typing" pause between bubbles. Questions asked while
// the twin is still talking wait in line and are answered in order.
function Conversation({ chat }) {
  const { exchanges, phase, asking, queue, skip, talking } = chat;
  const ref = useRef(null);
  const lastLen = exchanges.length ? exchanges[exchanges.length - 1].lines.join('').length : 0;
  // keep the newest line in view while it is being typed
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lastLen, phase, exchanges.length, queue.length]);
  if (!exchanges.length && phase !== 'thinking') return null;
  return (
    <div ref={ref} className="tw-exchange" aria-live="polite" onClick={skip} title="Click to skip ahead">
      {exchanges.map((x, i) => (
        <div key={i} className={`tw-turn ${i < exchanges.length - 1 || phase === 'thinking' ? 'is-past' : ''}`}>
          <p className="tw-q">{x.q}</p>
          {x.lines.map((l, j) => (
            <p className="tw-reply" key={j}>
              <span aria-hidden="true">↳</span>
              <span className="tw-a">
                {l}
                {!x.done && j === x.lines.length - 1 && talking && <span className="caret" />}
              </span>
            </p>
          ))}
          {!x.done && phase === 'gap' && (
            <p className="tw-reply tw-typing" aria-label="typing">
              <span aria-hidden="true">↳</span>
              <span className="tw-a">
                <span className="tw-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            </p>
          )}
        </div>
      ))}
      {phase === 'thinking' && (
        <div className="tw-turn">
          <p className="tw-q">{asking}</p>
          <p className="tw-reply tw-typing">
            <span aria-hidden="true">↳</span>
            <span className="tw-a">
              <span className="tw-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
          </p>
        </div>
      )}
      {queue.map((q) => (
        <p key={q} className="tw-q tw-queued">
          {q} <small>(next)</small>
        </p>
      ))}
    </div>
  );
}

export default function TwinPanel({ chat, name = 'Astrid' }) {
  const { input, setInput, ask, followups, shuffleFollowups } = chat;
  return (
    <div className="tw-wrap">
      <form
        className="tw-panel"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <Conversation chat={chat} />
        <div className="tw-chips">
          <button type="button" className="tw-icon" onClick={shuffleFollowups} aria-label="Show other questions">
            ↻
          </button>
          {followups.map((q) => (
            <button type="button" key={q} className="tw-chip" onClick={() => ask(q)}>
              <span aria-hidden="true">↳</span> {q}
            </button>
          ))}
        </div>
        <div className="tw-input">
          <span className="tw-grip" aria-hidden="true">
            ⣿
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chat.phase === 'idle' ? `Ask about ${name}` : "Ask another, I'll get to it next"}
            aria-label={`Ask ${name}'s digital twin`}
          />
          {input.trim() ? (
            <button type="submit" className="tw-mic" aria-label="Send">
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
