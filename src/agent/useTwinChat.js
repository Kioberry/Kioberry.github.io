import { useCallback, useEffect, useRef, useState } from 'react';
import { askTwin, pickFollowups, suggestedQuestions, toBubbles } from './twinAgent';
import { chunkDelay, gapMs, nextStop, thinkingMs } from './pace';
import { silentSpeech, spendVoice, voiceBudgetLeft, voicedSpeech } from './speech';

const NO_BUBBLES = [];
const GLITCH = { bubbles: ['Hmm, my connection just glitched.', 'Mind asking that again?'], expression: 'think' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const readyAvatar = (speaker) => (speaker?.current?.ready ? speaker.current : null);
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const VOICE_WAIT = 8000; // longest a sentence's voice may take to arrive; after that the browser says it
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Conversation state shared by every home layout.
//
// The twin answers like a person in a chat:
//   thinking -> typing gap -> talking (bubble 1, typed at a human rhythm) -> typing gap -> talking (bubble 2) ... -> idle
// A model answer streams in bubble by bubble, so the next bubble may not exist yet when the previous one is
// done: the twin then stays in the typing gap until it arrives or the answer ends (`streaming` turns false).
// Visitors can keep asking while it talks: new questions wait in a queue and are answered in order.
// Conversation mode reads each bubble aloud and keeps the text in step with the voice: every bubble's voice is
// fetched as soon as the bubble exists, and the twin keeps "typing" until it is in, so words and voice start together.
//
// With a 3D avatar (`speaker`, a ref to TalkingAvatar), the avatar says every bubble, as on matthewpetersen.ca:
// aloud when the twin has a voice, else mouthing it silently, and the text appears word by word as it is said.
// Conversation mode then means hands-free: once the twin has answered, it listens for the next question.
export default function useTwinChat({ speaker } = {}) {
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
  const audioCtx = useRef(null); // made when conversation mode is switched on, inside the click, so it may play
  const voiceLines = useRef(new Map()); // line -> Promise of its voiced speech
  const prepare = useRef(() => {}); // fetches a line's voice ahead of time
  const source = useRef(null);
  const [spokenTick, setSpokenTick] = useState(0);

  const current = answers[active] || null;
  const bubbles = current ? current.bubbles : NO_BUBBLES;
  const streaming = Boolean(current?.streaming);
  const line = bubbles[bubble] || '';
  const nextLine = bubbles[bubble + 1];
  const avatar = () => readyAvatar(speaker);

  // ---- the talking rhythm --------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'talking') return undefined;
    if (typed < line.length) {
      // the avatar's speech, or in conversation mode the voice, reveals the words (see the effects below)
      if (readyAvatar(speaker) || voice) return undefined;
      // word by word, with pauses where a speaker would breathe
      const j = nextStop(line, typed);
      const ms = typed === 0 ? 0 : chunkDelay(line, typed, j);
      const id = setTimeout(() => setTyped((n) => Math.max(n, j)), reduceMotion ? 0 : ms);
      return () => clearTimeout(id);
    }
    if (speaking.current) return undefined; // let the sentence finish being spoken
    setPhase(bubble < bubbles.length - 1 || streaming ? 'gap' : 'idle');
    return undefined;
  }, [phase, typed, line, bubble, bubbles.length, streaming, voice, spokenTick, speaker]);

  useEffect(() => {
    if (phase !== 'gap') return undefined;
    if (nextLine === undefined) {
      if (!streaming) setPhase('idle'); // the answer ended here; otherwise keep "typing" until the next bubble arrives
      return undefined;
    }
    let live = true;
    const go = () => {
      if (!live) return;
      setBubble((b) => b + 1);
      setTyped(0);
      setPhase('talking');
    };
    // in conversation mode, keep "typing" until the line's voice is in (or has failed, or is too slow)
    const voiced = voice && !readyAvatar(speaker) ? fetchVoice(nextLine).catch(() => {}) : null;
    const id = setTimeout(() => (voiced ? voiced.then(go) : go()), reduceMotion || bubble < 0 ? 0 : gapMs(nextLine));
    return () => {
      live = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, bubble, nextLine, streaming, speaker, voice]);

  // every bubble still to come has its voice fetched now, so it is ready by its turn
  useEffect(() => {
    bubbles.slice(bubble + 1).forEach((l) => prepare.current(l));
  }, [bubbles, bubble, voice]);

  // ---- the avatar says each bubble, revealing words as they are said ---------------------------------
  const isTalking = phase === 'talking';
  useEffect(() => {
    const a = avatar();
    if (!a || !isTalking || !line) return undefined;
    let live = true;
    speaking.current = true;
    a.say(line, (end) => live && setTyped((n) => Math.max(n, end))).then(() => {
      if (!live) return;
      speaking.current = false;
      setTyped(line.length);
      setSpokenTick((t) => t + 1);
    });
    return () => {
      live = false;
      speaking.current = false;
    };
    // a new bubble starts the next line; the avatar is looked up when it does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, bubble, isTalking]);

  // ---- conversation mode without an avatar: the twin's voice (twin-api /tts), else the browser's ----------
  // a line's voice, given up on VOICE_WAIT ms after it was asked for
  const fetchVoice = (l) => {
    if (!audioCtx.current || voiceBudgetLeft() <= 0) return Promise.reject(new Error('no voice'));
    if (!voiceLines.current.has(l)) {
      const slow = wait(VOICE_WAIT).then(() => Promise.reject(new Error('voice too slow')));
      const p = Promise.race([voicedSpeech(l, audioCtx.current), slow]);
      p.catch(() => {});
      voiceLines.current.set(l, p);
    }
    return voiceLines.current.get(l);
  };
  prepare.current = (l) => {
    if (readyAvatar(speaker)) readyAvatar(speaker).prepare(l);
    else if (voice) fetchVoice(l).catch(() => {});
  };
  const hush = () => {
    if (source.current) {
      source.current.onended = null;
      source.current.stop();
      source.current = null;
    }
    if (canSpeak) window.speechSynthesis.cancel();
  };
  useEffect(() => {
    if (avatar()) return undefined;
    hush();
    speaking.current = false;
    if (!voice || phase !== 'talking' || !line) return undefined;
    let live = true;
    const timers = [];
    const reveal = (n) => live && setTyped((t) => Math.max(t, Math.min(line.length, n)));
    const done = () => {
      if (!live) return;
      speaking.current = false;
      setTyped(line.length);
      setSpokenTick((t) => t + 1);
    };
    const browserVoice = () => {
      if (!canSpeak) return done();
      const u = new SpeechSynthesisUtterance(line);
      u.lang = /[一-鿿]/.test(line) ? 'zh-CN' : 'en-US';
      u.rate = 1.02;
      u.onboundary = (e) => reveal(e.charIndex + (e.charLength || 1));
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      // not every voice reports word boundaries: the typing rhythm, slowed to speaking speed, keeps words coming
      const s = silentSpeech(line);
      s.ends.forEach((end, i) => timers.push(setTimeout(() => reveal(end), s.wtimes[i] * 2.2)));
      return undefined;
    };
    speaking.current = true;
    const voiced = fetchVoice(line);
    voiceLines.current.delete(line); // said once; a failed or slow voice isn't kept for next time
    voiced
      .then((s) => {
        if (!live) return;
        spendVoice(s.ms);
        const src = audioCtx.current.createBufferSource();
        src.buffer = s.audio;
        src.connect(audioCtx.current.destination);
        src.onended = done;
        source.current = src;
        src.start();
        s.words.forEach((_, i) => timers.push(setTimeout(() => reveal(s.ends[i]), s.wtimes[i])));
      })
      .catch(() => live && browserVoice());
    return () => {
      live = false;
      timers.forEach(clearTimeout);
      hush();
    };
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
        prepare.current(b);
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
    avatar()?.stop();
    hush();
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

  // hands-free: after an answer, listen for the next question
  useEffect(() => {
    if (phase !== 'idle' || !voice || !avatar() || !answers.length || queue.length) return;
    listen();
    // only when an answer ends, not when the mic stops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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
    toggleVoice: () => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!voice && AudioCtx) {
        audioCtx.current = audioCtx.current || new AudioCtx();
        audioCtx.current.resume();
      }
      setVoice((v) => !v);
    },
    listening,
    listen,
    canListen: Boolean(SpeechRecognition),
  };
}
