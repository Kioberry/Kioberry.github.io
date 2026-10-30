import { useCallback, useEffect, useRef, useState } from 'react';
import { askTwin, pickFollowups, suggestedQuestions, toBubbles } from './twinAgent';
import { chunkDelay, gapMs, nextStop, thinkingMs } from './pace';

const NO_BUBBLES = [];
const GLITCH = { bubbles: ['Hmm, my connection just glitched.', 'Mind asking that again?'], expression: 'think' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Conversation state shared by every home layout.
//
// The twin answers like a person in a chat:
//   thinking -> typing gap -> talking (bubble 1, typed at a human rhythm) -> typing gap -> talking (bubble 2) ... -> idle
// A model answer streams in bubble by bubble, so the next bubble may not exist yet when the previous one is
// done: the twin then stays in the typing gap until it arrives or the answer ends (`streaming` turns false).
// Visitors can keep asking while it talks: new questions wait in a queue and are answered in order.
// Conversation mode reads each bubble aloud and keeps the text in step with the voice.
export default function useTwinChat() {
  const [answers, setAnswers] = useState([]); // [{ q, bubbles, streaming, topic, project, company, expression }]
  const [active, setActive] = useState(-1); // exchange being revealed
  const [bubble, setBubble] = useState(0); // bubble being typed in the active exchange (-1: none yet)
  const [typed, setTyped] = useState(0); // characters shown of that bubble
  const [phase, setPhase] = useState('idle'); // idle | thinking | talking | gap
  const [asking, setAsking] = useState('');
  const [queue, setQueue] = useState([]);
  const [input, setInput] = useState('');
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [followups, setFollowups] = useState(suggestedQuestions);
  const recognition = useRef(null);
  const speaking = useRef(false);
  const [spokenTick, setSpokenTick] = useState(0);

  const current = answers[active] || null;
  const bubbles = current ? current.bubbles : NO_BUBBLES;
  const streaming = Boolean(current?.streaming);
  const line = bubbles[bubble] || '';
  const nextLine = bubbles[bubble + 1];

  // ---- the talking rhythm --------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'talking') return undefined;
    if (typed < line.length) {
      // word by word, with pauses where a speaker would breathe. In conversation mode the voice drives the
      // text (see the speak effect) and this timer is only a slow fallback.
      const j = nextStop(line, typed);
      const ms = typed === 0 ? 0 : chunkDelay(line, typed, j) * (voice && canSpeak ? 2.2 : 1);
      const id = setTimeout(() => setTyped((n) => Math.max(n, j)), reduceMotion ? 0 : ms);
      return () => clearTimeout(id);
    }
    if (voice && canSpeak && speaking.current) return undefined; // let the sentence finish being spoken
    setPhase(bubble < bubbles.length - 1 || streaming ? 'gap' : 'idle');
    return undefined;
  }, [phase, typed, line, bubble, bubbles.length, streaming, voice, spokenTick]);

  useEffect(() => {
    if (phase !== 'gap') return undefined;
    if (nextLine === undefined) {
      if (!streaming) setPhase('idle'); // the answer ended here; otherwise keep "typing" until the next bubble arrives
      return undefined;
    }
    const id = setTimeout(() => {
      setBubble((b) => b + 1);
      setTyped(0);
      setPhase('talking');
    }, reduceMotion || bubble < 0 ? 0 : gapMs(nextLine));
    return () => clearTimeout(id);
  }, [phase, bubble, nextLine, streaming]);

  // ---- conversation mode: speak each bubble, reveal words as they are spoken ----------------------
  useEffect(() => {
    if (!canSpeak) return undefined;
    window.speechSynthesis.cancel();
    speaking.current = false;
    if (!voice || phase !== 'talking' || !line) return undefined;
    const u = new SpeechSynthesisUtterance(line);
    u.lang = /[一-鿿]/.test(line) ? 'zh-CN' : 'en-US';
    u.rate = 1.02;
    u.onboundary = (e) => setTyped((n) => Math.max(n, Math.min(line.length, e.charIndex + (e.charLength || 1))));
    u.onend = () => {
      speaking.current = false;
      setTyped(line.length);
      setSpokenTick((t) => t + 1);
    };
    u.onerror = u.onend;
    speaking.current = true;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
    // re-run only when a new bubble starts or the mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, active, bubble, phase === 'talking']);

  // ---- asking ----------------------------------------------------------------------------------
  const run = useCallback(
    async (q) => {
      setPhase('thinking');
      setAsking(q);
      const index = answers.length;
      const history = answers.flatMap((a) => [
        { role: 'user', content: a.q },
        { role: 'assistant', content: a.bubbles.join('\n\n'), topic: a.topic, topics: a.topics, project: a.project, company: a.company },
      ]);
      const finished = (r) => ({ q, ...r, bubbles: r.bubbles?.length ? r.bubbles : toBubbles(r.text || ''), streaming: false });
      const update = (patch) => setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

      // bubbles that stream in before the exchange is on screen are collected, later ones are shown as they come
      const got = [];
      let shown = false;
      let firstBubble;
      const arrived = new Promise((r) => {
        firstBubble = r;
      });
      const onBubble = (b) => {
        got.push(b);
        if (shown) update({ bubbles: [...got] });
        else firstBubble();
      };
      let final = null;
      const reply = askTwin(q, history, { onBubble })
        .catch(() => (got.length ? { bubbles: got, expression: 'smile' } : GLITCH))
        .then((r) => (final = r));

      // a human pause first, then start talking as soon as there is something to say
      await Promise.all([Promise.race([arrived, reply]), wait(reduceMotion ? 0 : thinkingMs(q))]);
      shown = true;
      const doneEarly = final;
      setAnswers((prev) => [...prev, doneEarly ? finished(doneEarly) : { q, bubbles: [...got], streaming: true }]);
      setActive(index);
      setBubble(-1);
      setTyped(0);
      setPhase('gap');

      const res = await reply;
      if (!doneEarly) update(finished(res));
      setFollowups(res.followups || pickFollowups([...answers.map((a) => a.q), q], res.topic));
    },
    [answers]
  );

  const ask = useCallback(
    (question) => {
      const q = question.trim();
      if (!q) return;
      setInput('');
      if (phase !== 'idle') {
        setQueue((qs) => (qs.includes(q) || q === asking ? qs : [...qs, q]));
        return;
      }
      run(q);
    },
    [phase, run, asking]
  );

  // answer queued questions one after another, with a small breath in between
  useEffect(() => {
    if (phase !== 'idle' || !queue.length) return undefined;
    const id = setTimeout(() => {
      const [next, ...rest] = queue;
      setQueue(rest);
      run(next);
    }, reduceMotion ? 0 : 500);
    return () => clearTimeout(id);
  }, [phase, queue, run]);

  // click on the answer: finish the current answer at once
  const skip = () => {
    if (!current || phase === 'thinking' || !bubbles.length) return;
    if (canSpeak) window.speechSynthesis.cancel();
    speaking.current = false;
    setBubble(bubbles.length - 1);
    setTyped(bubbles[bubbles.length - 1].length);
    setPhase(streaming ? 'gap' : 'idle');
  };

  const shuffleFollowups = () => {
    const asked = answers.map((a) => a.q);
    setFollowups(pickFollowups([...asked, ...followups], current?.topic));
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

  // what the panel shows: every exchange so far, the active one partly revealed
  const exchanges = answers.map((a, i) => {
    if (i !== active || phase === 'idle' || phase === 'thinking') return { q: a.q, lines: a.bubbles, done: true };
    if (phase === 'gap') return { q: a.q, lines: a.bubbles.slice(0, bubble + 1), done: false };
    return { q: a.q, lines: [...a.bubbles.slice(0, bubble), a.bubbles[bubble].slice(0, typed)], done: false };
  });

  const text = current ? current.bubbles.join('\n\n') : '';
  return {
    exchanges,
    current,
    text,
    typed,
    phase,
    talking: phase === 'talking' && typed < line.length,
    typing: phase === 'gap',
    pending: phase === 'thinking',
    asking,
    queue,
    input,
    setInput,
    ask,
    skip,
    followups,
    shuffleFollowups,
    voice,
    toggleVoice: () => setVoice((v) => !v),
    listening,
    listen,
    canListen: Boolean(SpeechRecognition),
  };
}
