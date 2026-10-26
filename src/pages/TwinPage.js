import { useCallback, useEffect, useRef, useState } from 'react';
import TwinStage from '../components/TwinStage';
import { askTwin, greeting, suggestedQuestions } from '../agent/twinAgent';
import { highlights, person } from '../data/profile';

const TYPE_MS = 24;

export default function TwinPage() {
  const [answers, setAnswers] = useState([{ q: null, ...greeting }]);
  const [view, setView] = useState(0); // which answer the ‹ › arrows are showing
  const [typed, setTyped] = useState(0);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [auto, setAuto] = useState(false);
  const [voice, setVoice] = useState(false);
  const [playing, setPlaying] = useState(true);
  const inputRef = useRef(null);

  const current = answers[view];
  const text = pending ? '' : current.text;
  const talking = !pending && typed < text.length;

  // typewriter
  useEffect(() => {
    if (typed >= text.length) return;
    const id = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    return () => clearTimeout(id);
  }, [typed, text]);

  // conversation mode: read answers aloud with the browser's speech engine
  useEffect(() => {
    if (!voice || pending || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[一-鿿]/.test(text) ? 'zh-CN' : 'en-US';
    u.pitch = 1.2;
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
        res = { text: 'Connection glitch ✕ try again?', expression: 'think' };
      }
      setAnswers([...answers, { q, ...res }]);
      setView(answers.length);
      setTyped(0);
      setPending(false);
    },
    [answers, pending]
  );

  // AUTO walks through the suggested questions on its own
  useEffect(() => {
    if (!auto || pending || talking) return;
    const asked = new Set(answers.map((a) => a.q));
    const next = suggestedQuestions.find((s) => !asked.has(s.label));
    if (!next) {
      setAuto(false);
      return;
    }
    const id = setTimeout(() => {
      setSelected(next.id);
      ask(next.label);
    }, 1400);
    return () => clearTimeout(id);
  }, [auto, pending, talking, answers, ask]);

  const pick = (s) => {
    setSelected(s.id);
    ask(s.label);
  };

  const browse = (dir) => {
    const next = Math.min(answers.length - 1, Math.max(0, view + dir));
    if (next !== view) {
      setView(next);
      setTyped(answers[next].text.length);
    }
  };

  const asked = answers.length - 1;
  const hearts = Math.min(3, asked);

  return (
    <div className="twin">
      <section className="win twin-win">
        <div className="win-bar">
          <span className="win-title">astrid.exe — talk to my digital twin</span>
          <span className="win-btns" aria-hidden="true">
            <i>_</i>
            <i>□</i>
            <i>×</i>
          </span>
        </div>

        <div className="stage">
          <TwinStage className="stage-canvas" talking={talking} expression={pending ? 'think' : current.expression} />
          <div className="stage-scan" aria-hidden="true" />

          <div className="hud-battery" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="hud-logo">
            <span className="rec">● REC</span>
            Astrid<span className="hud-bunny">ʚɞ</span>
          </div>

          <fieldset className="options">
            <legend>请选择你想问的问题：</legend>
            {suggestedQuestions.map((s) => (
              <button
                key={s.id}
                className={`option ${selected === s.id ? 'is-selected' : ''}`}
                onClick={() => pick(s)}
                disabled={pending}
              >
                <span className="radio" />
                {s.label}
              </button>
            ))}
            <button
              className={`option ${selected === 'other' ? 'is-selected' : ''}`}
              onClick={() => {
                setSelected('other');
                inputRef.current?.focus();
              }}
            >
              <span className="radio" />
              其他…
            </button>
          </fieldset>

          <div className="hearts" aria-label={`${hearts} of 3 hearts`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < hearts ? 'heart is-full' : 'heart'}>
                ♥
              </span>
            ))}
          </div>

          <div className="counter">
            <span>ASKED</span>
            <b>{String(asked).padStart(2, '0')}</b>
            <i style={{ transform: `scaleX(${Math.min(1, asked / 5)})` }} />
          </div>

          <div className="dialog" onClick={() => setTyped(text.length)}>
            <div className="dialog-name">{person.name.split(' ')[0]}</div>
            {current.q && !pending && <div className="dialog-q">you › {current.q}</div>}
            <p className="dialog-text">
              {pending ? <span className="dots">thinking</span> : text.slice(0, typed)}
              {!pending && !talking && <span className="caret">♡</span>}
            </p>
            <span className="spark spark-a">✦</span>
            <span className="spark spark-b">✧</span>
          </div>

          {showLog && (
            <div className="log">
              <div className="log-head">
                <b>LOG</b>
                <button onClick={() => setShowLog(false)}>×</button>
              </div>
              {answers.map((a, i) => (
                <div key={i} className="log-item">
                  {a.q && <p className="log-q">you › {a.q}</p>}
                  <p>astrid › {a.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="controls">
          <button onClick={() => setShowLog((v) => !v)} className={showLog ? 'is-on' : ''}>
            ▤ LOG
          </button>
          <button onClick={() => setAuto((v) => !v)} className={auto ? 'is-on' : ''}>
            ▶ AUTO
          </button>
          <button onClick={() => setTyped(text.length)}>▶▶ SKIP</button>
          <button onClick={() => setVoice((v) => !v)} className={voice ? 'is-on' : ''}>
            ◉ VOICE {voice ? 'ON' : 'OFF'}
          </button>
          <div className="player">
            <span className="note">♫</span>
            <span className="track">
              dusk.wav
              <small>astrid fm</small>
            </span>
            <span className={`eq ${playing ? 'is-playing' : ''}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="player-btns">
              <button aria-label="previous">◀◀</button>
              <button aria-label={playing ? 'pause' : 'play'} onClick={() => setPlaying((p) => !p)}>
                {playing ? '❚❚' : '▶'}
              </button>
              <button aria-label="next">▶▶</button>
            </span>
          </div>
        </div>
      </section>

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <button type="button" className="ask-arrow" onClick={() => browse(-1)} disabled={view === 0} aria-label="previous answer">
          ‹
        </button>
        <button type="button" className="ask-arrow" onClick={() => browse(1)} disabled={view === answers.length - 1} aria-label="next answer">
          ›
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask me anything… / 问我任何问题"
          aria-label="Ask Astrid's digital twin"
        />
        <button type="submit" className="ask-send" disabled={!input.trim() || pending}>
          send ↵
        </button>
      </form>

      <div className="twin-about">
        <ul>
          {highlights.map((h) => (
            <li key={h.text}>
              <span>{h.icon}</span>
              {h.text}
            </li>
          ))}
        </ul>
        <div className="twin-links">
          <a href="#/home" className="btn">
            full story →
          </a>
          <a href="#/projects" className="btn btn-ghost">
            projects →
          </a>
        </div>
      </div>
    </div>
  );
}
