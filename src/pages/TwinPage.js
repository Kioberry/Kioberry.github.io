import { useCallback, useEffect, useRef, useState } from 'react';
import AsciiPortrait from '../components/AsciiPortrait';
import { askTwin, greeting, suggestedQuestions } from '../agent/twinAgent';
import { highlights, person } from '../data/profile';

const TYPE_MS = 18;
const TWIN = `${process.env.PUBLIC_URL}/twin`;

export default function TwinPage() {
  const [answers, setAnswers] = useState([{ q: null, ...greeting }]);
  const [view, setView] = useState(0); // which exchange the ‹ › arrows are showing
  const [typed, setTyped] = useState(0);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [voice, setVoice] = useState(false);
  const inputRef = useRef(null);

  const current = answers[view];
  const text = pending ? '' : current.text;
  const talking = !pending && typed < text.length;

  useEffect(() => {
    if (typed >= text.length) return;
    const id = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    return () => clearTimeout(id);
  }, [typed, text]);

  // conversation mode: read answers aloud with the browser's speech engine
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!voice || pending) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[一-鿿]/.test(text) ? 'zh-CN' : 'en-US';
    window.speechSynthesis.speak(u);
  }, [voice, text, pending]);

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q || pending) return;
      setPending(true);
      setInput('');
      let res;
      try {
        const history = answers.filter((a) => a.q).flatMap((a) => [
          { role: 'user', content: a.q },
          { role: 'assistant', content: a.text },
        ]);
        res = await askTwin(q, history);
      } catch {
        res = { text: 'Connection glitch. Try again?', expression: 'think' };
      }
      setAnswers([...answers, { q, ...res }]);
      setView(answers.length);
      setTyped(0);
      setPending(false);
    },
    [answers, pending]
  );

  const browse = (dir) => {
    const next = Math.min(answers.length - 1, Math.max(0, view + dir));
    if (next !== view) {
      setView(next);
      setTyped(answers[next].text.length);
    }
  };

  return (
    <main className="twin">
      <figure className="twin-screen">
        <AsciiPortrait
          video={`${TWIN}/idle.mp4`}
          poster={`${TWIN}/portrait.png`}
          talking={talking}
          label="ASCII portrait of Astrid's digital twin"
        />
        <figcaption>
          <span className={`dot ${pending ? 'is-busy' : ''}`} />
          {pending ? 'thinking' : talking ? 'speaking' : 'online'} · astrid.twin
        </figcaption>
      </figure>

      <section className="twin-chat">
        <p className="pb-lbl">Digital twin</p>
        <h1 className="pb-h1">Ask me anything.</h1>
        <p className="pb-dek">I'm {person.name.split(' ')[0]}'s AI twin. I know her work, projects and the way she thinks.</p>

        <div className="chips">
          {suggestedQuestions.map((s) => (
            <button key={s.id} className="chip" onClick={() => ask(s.label)} disabled={pending}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="exchange" aria-live="polite">
          {current.q && <p className="exchange-q">› {current.q}</p>}
          <p className="exchange-a" onClick={() => setTyped(text.length)}>
            {pending ? <span className="dots">thinking</span> : text.slice(0, typed)}
            {talking && <span className="caret" />}
          </p>
        </div>

        <form
          className="ask"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <button type="button" className="ask-nav" onClick={() => browse(-1)} disabled={view === 0} aria-label="Previous answer">
            ‹
          </button>
          <button type="button" className="ask-nav" onClick={() => browse(1)} disabled={view === answers.length - 1} aria-label="Next answer">
            ›
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about my work, projects… 中文也可以"
            aria-label="Ask Astrid's digital twin"
          />
          <button type="submit" className="ask-send" disabled={!input.trim() || pending}>
            Ask
          </button>
        </form>
        <button className="mode" onClick={() => setVoice((v) => !v)} aria-pressed={voice}>
          Conversation mode <b>{voice ? 'ON' : 'OFF'}</b>
        </button>

        <ul className="twin-facts">
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="pb-more">
          <a href="#/home">More about me</a> · <a href="#/projects">Projects</a> · <a href="#/resume">Resume</a>
        </p>
      </section>
    </main>
  );
}
