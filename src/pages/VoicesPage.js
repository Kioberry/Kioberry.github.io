import { useEffect, useMemo, useRef, useState } from 'react';

// Temporary: an audition of the free voices conversation mode could use. Not linked from the nav; open #/voices.
// Kokoro runs in this browser (the model downloads on first use); MeloTTS and Aura-2 come from Workers AI through
// a local twin-api (`npm run voices` in twin-api/); system voices are whatever this device has. Starred voices
// persist in this browser, and "Copy picks" gives the list to send back.

const LAB_URL = process.env.REACT_APP_VOICE_LAB_URL || 'http://localhost:8787';
const KOKORO_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const STORE = 'voice-picks';
const CJK = /[一-鿿]/;

const PRESETS = {
  en: "It won first place at USC Build4SC, and it's my favorite project I've done. Want to try the live version?",
  zh: '嗨，我是 AI 版的 Astrid。Peeko 是我最喜欢的项目，在 USC Build4SC 拿了第一名，要不要试试线上版本？',
};

// Deepgram's own descriptions (developers.deepgram.com/docs/tts-models); Workers AI offers all but selene.
const AURA = `amalthea F Filipino Engaging, Natural, Cheerful
andromeda F American Casual, Expressive, Comfortable
apollo M American Confident, Comfortable, Casual
arcas M American Natural, Smooth, Clear, Comfortable
aries M American Warm, Energetic, Caring
asteria F American Clear, Confident, Knowledgeable, Energetic
athena F American Calm, Smooth, Professional
atlas M American Enthusiastic, Confident, Approachable, Friendly
aurora F American Cheerful, Expressive, Energetic
callista F American Clear, Energetic, Professional, Smooth
cora F American Smooth, Melodic, Caring
cordelia F American Approachable, Warm, Polite
delia F American Casual, Friendly, Cheerful, Breathy
draco M British Warm, Approachable, Trustworthy, Baritone
electra F American Professional, Engaging, Knowledgeable
harmonia F American Empathetic, Clear, Calm, Confident
helena F American Caring, Natural, Positive, Friendly, Raspy
hera F American Smooth, Warm, Professional
hermes M American Expressive, Engaging, Professional
hyperion M Australian Caring, Warm, Empathetic
iris F American Cheerful, Positive, Approachable
janus F American Southern, Smooth, Trustworthy
juno F American Natural, Engaging, Melodic, Breathy
jupiter M American Expressive, Knowledgeable, Baritone
luna F American Friendly, Natural, Engaging
mars M American Smooth, Patient, Trustworthy, Baritone
minerva F American Positive, Friendly, Natural
neptune M American Professional, Patient, Polite
odysseus M American Calm, Smooth, Comfortable, Professional
ophelia F American Expressive, Enthusiastic, Cheerful
orion M American Approachable, Comfortable, Calm, Polite
orpheus M American Professional, Clear, Confident, Trustworthy
pandora F British Smooth, Calm, Melodic, Breathy
phoebe F American Energetic, Warm, Casual
pluto M American Smooth, Calm, Empathetic, Baritone
saturn M American Knowledgeable, Confident, Baritone
thalia F American Clear, Confident, Energetic, Enthusiastic
theia F Australian Expressive, Polite, Sincere
vesta F American Natural, Expressive, Patient, Empathetic
zeus M American Deep, Trustworthy, Smooth`
  .split('\n')
  .map((row) => {
    const [id, g, accent, ...tags] = row.split(' ');
    return { id, name: id[0].toUpperCase() + id.slice(1), gender: g, meta: `${accent} · ${tags.join(' ')}`, lang: 'en' };
  });

const MELO = [
  { id: 'en', name: 'English', meta: 'one default speaker', lang: 'en' },
  { id: 'zh', name: '中文', meta: 'one default speaker, reads mixed English too', lang: 'zh' },
];

// Natural-sounding system voices first: Edge's "Online (Natural)", Apple's Enhanced/Premium, Google's.
const SYSTEM_RANK = [/natural/i, /premium|enhanced/i, /google/i, /siri/i];
const rank = (v) => {
  const i = SYSTEM_RANK.findIndex((re) => re.test(v.name));
  return i < 0 ? SYSTEM_RANK.length : i;
};

function readPicks() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || [];
  } catch {
    return [];
  }
}

function useSystemVoices() {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const read = () => setVoices(window.speechSynthesis.getVoices());
    read();
    window.speechSynthesis.addEventListener('voiceschanged', read);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', read);
  }, []);
  return voices;
}

function Voice({ v, k, state, onPlay, picked, onPick, disabled }) {
  const s = state[k];
  return (
    <li className={`vx-voice ${s === 'playing' ? 'is-playing' : ''}`}>
      <button type="button" className="vx-play" onClick={() => onPlay(k, v)} disabled={disabled || s === 'loading'}>
        {s === 'loading' ? '…' : s === 'playing' ? '■' : '▶'}
      </button>
      <div className="vx-label">
        <b>
          {v.name}
          {v.gender && <small> {v.gender === 'F' ? '♀' : '♂'}</small>}
          {v.grade && <small className="vx-grade"> {v.grade}</small>}
        </b>
        <span>{typeof s === 'object' ? <em>{s.error}</em> : v.meta}</span>
      </div>
      <button
        type="button"
        className={`vx-star ${picked ? 'is-on' : ''}`}
        onClick={() => onPick(k)}
        aria-pressed={picked}
        aria-label={`Star ${v.name}`}
      >
        {picked ? '★' : '☆'}
      </button>
    </li>
  );
}

export default function VoicesPage() {
  const [text, setText] = useState(PRESETS.en);
  const [state, setState] = useState({}); // key -> 'loading' | 'playing' | { error }
  const [picks, setPicks] = useState(readPicks);
  const [kokoro, setKokoro] = useState({ status: 'idle' }); // idle | loading (progress) | ready (voices) | error
  const [device, setDevice] = useState('wasm');
  const [copied, setCopied] = useState(false);
  const systemVoices = useSystemVoices();
  const tts = useRef(null);
  const audio = useRef(null);
  const cache = useRef(new Map()); // `${key}\n${text}` -> object URL
  const playing = useRef(null);
  const zh = CJK.test(text);
  const lang = zh ? 'zh' : 'en';

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(picks));
    } catch {}
  }, [picks]);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (k, s) => setState((m) => ({ ...m, [k]: s }));

  function stop() {
    audio.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (playing.current) mark(playing.current, undefined);
    playing.current = null;
  }

  async function loadKokoro() {
    setKokoro({ status: 'loading', progress: 0 });
    try {
      const { KokoroTTS } = await import(/* webpackIgnore: true */ KOKORO_URL);
      const files = {};
      tts.current = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
        device,
        progress_callback: (p) => {
          if (p.status !== 'progress' || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          const [loaded, total] = Object.values(files).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
          setKokoro({ status: 'loading', progress: loaded / total, mb: Math.round(total / 1e6) });
        },
      });
      const voices = Object.entries(tts.current.voices)
        .map(([id, v]) => ({
          id,
          name: v.name,
          gender: v.gender === 'Female' ? 'F' : 'M',
          grade: v.overallGrade,
          meta: `${v.language === 'en-gb' ? 'British' : 'American'} · ${id}`,
          lang: 'en',
        }))
        .sort((a, b) => a.grade.localeCompare(b.grade) || a.id.localeCompare(b.id));
      setKokoro({ status: 'ready', voices });
    } catch (err) {
      console.error('[voices] kokoro failed:', err);
      setKokoro({ status: 'error', error: String(err?.message || err) });
    }
  }

  async function synthesize(k, v) {
    const [engine, id] = k.split(':');
    if (engine === 'kokoro') {
      const out = await tts.current.generate(text, { voice: id });
      return out.toBlob();
    }
    const res = await fetch(`${LAB_URL}/voice-lab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine, speaker: id, text }),
    }).catch(() => {
      throw new Error('twin-api not running: `npm run voices` in twin-api/');
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`);
    return res.blob();
  }

  async function play(k, v) {
    const was = playing.current;
    stop();
    if (was === k) return;
    playing.current = k;
    if (k.startsWith('system:')) {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v.voice;
      u.lang = v.voice.lang;
      u.onend = u.onerror = () => playing.current === k && stop();
      mark(k, 'playing');
      window.speechSynthesis.speak(u);
      return;
    }
    const at = `${k}\n${text}`;
    try {
      if (!cache.current.has(at)) {
        mark(k, 'loading');
        cache.current.set(at, URL.createObjectURL(await synthesize(k, v)));
      }
      if (playing.current !== k) return; // another voice was picked meanwhile
      audio.current.src = cache.current.get(at);
      audio.current.onended = () => playing.current === k && stop();
      await audio.current.play();
      mark(k, 'playing');
    } catch (err) {
      if (playing.current === k) playing.current = null;
      mark(k, { error: String(err?.message || err) });
    }
  }

  const pick = (k) => setPicks((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const system = useMemo(
    () =>
      systemVoices
        .filter((v) => v.lang.toLowerCase().startsWith(lang))
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
        .map((voice) => ({
          id: voice.voiceURI,
          name: voice.name,
          meta: `${voice.lang}${voice.localService ? '' : ' · online'}`,
          voice,
        })),
    [systemVoices, lang]
  );

  const list = (engine, voices, enabled = (v) => v.lang === lang) => (
    <ul className="vx-grid">
      {voices.map((v) => {
        const k = `${engine}:${v.id}`;
        return (
          <Voice key={k} k={k} v={v} state={state} onPlay={play} picked={picks.includes(k)} onPick={pick} disabled={!enabled(v)} />
        );
      })}
    </ul>
  );

  return (
    <main className="vx">
      <header className="vx-head">
        <p className="pb-lbl">Voices · 音色试听</p>
        <h1>Which voice should the twin have?</h1>
        <p>
          Each engine reads the line below. Play, compare, star the ones you like. A voice that can't read this language
          is greyed out.
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Sample line" />
        <div className="vx-presets">
          <button type="button" className="chip" aria-pressed={text === PRESETS.en} onClick={() => setText(PRESETS.en)}>
            English answer
          </button>
          <button type="button" className="chip" aria-pressed={text === PRESETS.zh} onClick={() => setText(PRESETS.zh)}>
            中文回答
          </button>
        </div>
      </header>

      <section className="vx-engine">
        <div className="vx-engine-head">
          <h2>Kokoro-82M</h2>
          <p>
            <span className="vx-tag">Apache 2.0</span>
            <span className="vx-tag">runs in the browser</span>
            <span className="vx-tag">English only</span> Free, no server. The model downloads once and is cached. Grades
            are the Kokoro authors' own (A best).
          </p>
        </div>
        {kokoro.status === 'ready' ? (
          list('kokoro', kokoro.voices)
        ) : (
          <div className="vx-load">
            <select value={device} onChange={(e) => setDevice(e.target.value)} disabled={kokoro.status === 'loading'}>
              <option value="wasm">WASM · q8 (~90 MB, any browser)</option>
              <option value="webgpu" disabled={!navigator.gpu}>
                WebGPU · fp32 (~330 MB, much faster){navigator.gpu ? '' : ' (not in this browser)'}
              </option>
            </select>
            <button type="button" onClick={loadKokoro} disabled={kokoro.status === 'loading'}>
              {kokoro.status === 'loading'
                ? `Loading ${Math.round((kokoro.progress || 0) * 100)}%${kokoro.mb ? ` of ${kokoro.mb} MB` : ''}`
                : 'Load Kokoro'}
            </button>
            {kokoro.status === 'error' && <em>{kokoro.error}</em>}
          </div>
        )}
      </section>

      <section className="vx-engine">
        <div className="vx-engine-head">
          <h2>MeloTTS</h2>
          <p>
            <span className="vx-tag">MIT</span>
            <span className="vx-tag">Workers AI</span>
            <span className="vx-tag">中文 ✓</span> Open source, served by Cloudflare from the twin's worker; costs fractions
            of a cent, well inside the free daily allowance.
          </p>
        </div>
        {list('melotts', MELO)}
      </section>

      <section className="vx-engine">
        <div className="vx-engine-head">
          <h2>Deepgram Aura-2</h2>
          <p>
            <span className="vx-tag">not open source</span>
            <span className="vx-tag">Workers AI</span>
            <span className="vx-tag">English only</span> $0.03 per 1,000 characters, also from the twin's worker. Here for
            comparison.
          </p>
        </div>
        {list('aura-2', AURA)}
      </section>

      <section className="vx-engine">
        <div className="vx-engine-head">
          <h2>System voices</h2>
          <p>
            <span className="vx-tag">free</span>
            <span className="vx-tag">depends on the device</span> What this browser has for {zh ? 'Chinese' : 'English'},
            natural-sounding ones first. Visitors on other devices hear different voices.
          </p>
        </div>
        {system.length ? list('system', system, () => true) : <p className="vx-empty">No {lang} voices in this browser.</p>}
      </section>

      <footer className="vx-bar">
        <span>
          {picks.length ? `★ ${picks.length}: ${picks.map((k) => k.split(':').slice(0, 2).join(':')).join(', ')}` : 'Star voices to shortlist them'}
        </span>
        <button
          type="button"
          disabled={!picks.length}
          onClick={() => {
            navigator.clipboard?.writeText(picks.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy picks'}
        </button>
      </footer>
      <audio ref={audio} hidden />
    </main>
  );
}
