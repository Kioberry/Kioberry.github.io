// POST /tts { text, language }  ->  { audio, words, visemes, voice }, the same shape as matthewpetersen.ca's
// /api/cartesia-tts, so the page can drive TalkingHead the way his does:
//
//   audio    base64 audio (WAV or MP3)
//   words    [{ text, audioOffset, duration }]        times in 100 ns ticks (ms * 1e4), as Azure Speech reports them
//   visemes  [{ visemeId, audioOffset }]               Azure viseme ids 0-21, mapped to Oculus visemes in the page
//
// With Cartesia configured (as on his site), Cartesia speaks: it gives word and IPA phoneme timestamps, and each
// phoneme becomes the Azure viseme for that sound. Otherwise Workers AI speaks, for free: English in Deepgram
// Aura-2 (AURA_SPEAKER) while today's AURA_DAILY_CHARS last, then MeloTTS; Chinese always in MeloTTS. Neither
// gives timings, so `words` and `visemes` come back empty and the page times the words itself.

const MAX_TEXT = 500; // characters per sentence
const SAMPLE_RATE = 24000;
const TICKS = 1e7; // per second

// Longest IPA symbols first, so "aɪ" wins over "a".
const VISEME_OF = [
  [['aɪ', 'eɪ'], 11],
  [['aʊ'], 9],
  [['ɔɪ', 'oɪ'], 10],
  [['oʊ', 'o'], 8],
  [['tʃ', 'dʒ', 'ʃ', 'ʒ', 'ɕ', 'ʂ', 'ʐ', 'tɕ', 'ʈʂ'], 16],
  [['æ', 'ə', 'ʌ', 'ɐ', 'a'], 1],
  [['ɑ', 'ɒ'], 2],
  [['ɔ'], 3],
  [['ɛ', 'e', 'ʊ'], 4],
  [['ɝ', 'ɚ', 'ɜ'], 5],
  [['i', 'ɪ', 'j', 'y'], 6],
  [['u', 'w', 'ɯ'], 7],
  [['h', 'x'], 12],
  [['ɹ', 'r', 'ɾ'], 13],
  [['l', 'ɫ'], 14],
  [['s', 'z', 'ts', 'dz'], 15],
  [['ð'], 17],
  [['f', 'v'], 18],
  [['θ', 'd', 't', 'n', 'ɗ'], 19],
  [['k', 'g', 'ɡ', 'ŋ', 'ʔ'], 20],
  [['p', 'b', 'm'], 21],
].flatMap(([symbols, id]) => symbols.map((s) => [s, id]))
  .sort((a, b) => b[0].length - a[0].length);

export function visemeId(phoneme) {
  const p = (phoneme || '').normalize('NFC').replace(/[ˈˌːˑ̃ʰʲʷ\d]/g, '').toLowerCase();
  if (!p) return 0;
  const hit = VISEME_OF.find(([s]) => p.startsWith(s));
  return hit ? hit[1] : 1; // an unknown vowel-ish sound: an open mouth reads better than a closed one
}

function wav(pcm) {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Cartesia's SSE events, collected into one response.
export function collect(events) {
  const chunks = [];
  const words = [];
  const visemes = [];
  for (const e of events) {
    if (e.type === 'error') throw new Error(e.message || e.title || 'tts error');
    if (e.type === 'chunk' && e.data) chunks.push(fromBase64(e.data));
    if (e.type === 'timestamps' && e.word_timestamps) {
      const { words: w, start, end } = e.word_timestamps;
      w.forEach((text, i) =>
        words.push({ text, audioOffset: Math.round(start[i] * TICKS), duration: Math.round((end[i] - start[i]) * TICKS) })
      );
    }
    if (e.type === 'phoneme_timestamps' && e.phoneme_timestamps) {
      const { phonemes, start } = e.phoneme_timestamps;
      phonemes.forEach((p, i) => visemes.push({ visemeId: visemeId(p), audioOffset: Math.round(start[i] * TICKS) }));
    }
  }
  const pcm = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    pcm.set(c, at);
    at += c.length;
  }
  return { audio: toBase64(wav(pcm)), words, visemes };
}

export async function* readSse(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let cut;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      const data = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('');
      if (data) yield JSON.parse(data);
    }
  }
}

async function cartesia(env, text, language) {
  const res = await fetch('https://api.cartesia.ai/tts/sse', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      'Cartesia-Version': env.CARTESIA_VERSION || '2026-08-14',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: env.CARTESIA_MODEL || 'sonic-3.6',
      transcript: text,
      voice: { id: env.CARTESIA_VOICE_ID },
      language,
      output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: SAMPLE_RATE },
      add_timestamps: true,
      add_phoneme_timestamps: true,
      use_normalized_timestamps: false, // word timestamps in the text as written, so the page can match them
    }),
  });
  if (!res.ok) {
    console.error('[twin] tts failed:', res.status, await res.text().catch(() => ''));
    return { status: 502, json: { error: `upstream ${res.status}` } };
  }
  const events = [];
  for await (const e of readSse(res.body)) events.push(e);
  return { status: 200, json: { ...collect(events), voice: 'cartesia' } };
}

// Workers AI answers MeloTTS with { audio: base64 WAV }, Aura with a stream of MP3 bytes.
export async function aiBytes(out) {
  if (typeof out?.audio === 'string') return fromBase64(out.audio);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export const AURA = '@cf/deepgram/aura-2-en';
export const MELO = '@cf/myshell-ai/melotts';

// Whether Aura may say `chars` more characters today (TtsBudget, budget.js). No budget bound: no Aura.
function auraBudget(env, chars) {
  const limit = Number(env.AURA_DAILY_CHARS) || 0;
  if (!env.TTS_BUDGET || !limit) return false;
  return env.TTS_BUDGET.get(env.TTS_BUDGET.idFromName('aura')).take(chars, limit);
}

async function workersAi(env, text, language) {
  const said = (bytes, voice) => ({ status: 200, json: { audio: toBase64(bytes), words: [], visemes: [], voice } });
  if (language === 'en' && (await auraBudget(env, text.length))) {
    const speaker = env.AURA_SPEAKER || 'iris';
    try {
      return said(await aiBytes(await env.AI.run(AURA, { text, speaker, encoding: 'mp3' })), `aura-2:${speaker}`);
    } catch (err) {
      console.error('[twin] aura failed, using melotts:', err);
    }
  }
  return said(await aiBytes(await env.AI.run(MELO, { prompt: text, lang: language })), `melotts:${language}`);
}

export async function speak(env, body) {
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
  if (!text) return { status: 400, json: { error: 'no text' } };
  const language = body.language === 'zh' ? 'zh' : 'en';
  if (env.CARTESIA_API_KEY && env.CARTESIA_VOICE_ID) return cartesia(env, text, language);
  if (env.AI) return workersAi(env, text, language);
  return { status: 503, json: { error: 'voice not configured' } };
}
