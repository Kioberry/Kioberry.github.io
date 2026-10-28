import { useCallback, useEffect, useRef, useState } from 'react';
import { askTwin, pickFollowups, suggestedQuestions } from './twinAgent';

const TYPE_MS = 18;

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Conversation state shared by every home layout: the exchanges, the typewriter, follow-up
// suggestions, conversation mode (answers read aloud) and the mic (browser speech recognition).
export default function useTwinChat() {
  const [answers, setAnswers] = useState([]);
  const [view, setView] = useState(-1); // which exchange the ‹ › arrows are showing
  const [typed, setTyped] = useState(0);
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(''); // the question in flight, shown while pending
  const [input, setInput] = useState('');
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [followups, setFollowups] = useState(suggestedQuestions);
  const recognition = useRef(null);

  const current = answers[view] || null;
  const text = pending || !current ? '' : current.text;
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
    if (!voice || pending || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = /[一-鿿]/.test(text) ? 'zh-CN' : 'en-US';
    window.speechSynthesis.speak(u);
  }, [voice, text, pending]);

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q || pending) return;
      setPending(true);
      setAsking(q);
      setInput('');
      let res;
      try {
        const history = answers.flatMap((a) => [
          { role: 'user', content: a.q },
          { role: 'assistant', content: a.text },
        ]);
        res = await askTwin(q, history);
      } catch {
        res = { text: 'Connection glitch. Try again?', expression: 'think' };
      }
      const asked = [...answers.map((a) => a.q), q];
      setAnswers([...answers, { q, ...res }]);
      setView(answers.length);
      setFollowups(res.followups || pickFollowups(asked));
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

  const shuffleFollowups = () => {
    const asked = answers.map((a) => a.q);
    const pool = pickFollowups([...asked, ...followups]);
    setFollowups(pool);
  };

  const listen = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new SpeechRecognition();
    r.lang = navigator.language || 'en-US';
    r.interimResults = false;
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    setListening(true);
    r.start();
  };

  return {
    current,
    text,
    typed,
    talking,
    pending,
    asking,
    input,
    setInput,
    ask,
    browse,
    canBack: view > 0,
    canForward: view < answers.length - 1,
    skip: () => setTyped(text.length),
    followups,
    shuffleFollowups,
    voice,
    toggleVoice: () => setVoice((v) => !v),
    listening,
    listen,
    canListen: Boolean(SpeechRecognition),
  };
}
