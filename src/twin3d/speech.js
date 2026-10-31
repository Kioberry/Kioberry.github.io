import { chunkDelay, nextStop } from '../agent/pace';

// What the avatar says, as TalkingHead's speakAudio() takes it: { words, wtimes, wdurations, visemes?, vtimes?,
// vdurations? } in ms, plus `ends`, where each word ends in the line (so the text can be revealed word by word as
// it is said) and the line's length in ms.
//
// With Cartesia (twin-api /tts), the timings come from the audio, as on matthewpetersen.ca; the free Workers AI
// voices give none, so the typing rhythm is stretched over their audio. Without a voice
// the twin still mouths the words, silently, at the pace the text used to be typed at (pace.js), and TalkingHead
// works out the mouth shapes from the words.

const API_URL = process.env.REACT_APP_TWIN_API_URL;
const CJK = /[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/;

// Azure viseme id -> Oculus viseme, as on matthewpetersen.ca
export const OCULUS = ['sil', 'aa', 'aa', 'O', 'E', 'E', 'I', 'U', 'O', 'aa', 'O', 'I', 'kk', 'RR', 'nn', 'SS', 'SS', 'TH', 'FF', 'DD', 'kk', 'PP'];

// Each viseme lasts until the next one starts (75 ms by default, 100 ms for the last); leading silence is dropped.
export function toVisemes(list) {
  const visemes = [];
  const times = [];
  const durations = [];
  for (const v of list) {
    const name = OCULUS[v.visemeId] || 'sil';
    const t = v.audioOffset / 1e4;
    if (!visemes.length && name === 'sil') continue;
    if (visemes.length) durations[durations.length - 1] = t - times[times.length - 1];
    visemes.push(name);
    times.push(t);
    durations.push(75);
  }
  if (durations.length) durations[durations.length - 1] = 100;
  return { visemes, times, durations };
}

// Where each spoken word ends in the written line. TTS words can differ from the text (numbers spelled out,
// punctuation dropped), so each is looked for, as a whole word, a little ahead of the last match, and a word that
// isn't there keeps the place (Petersen's version skips ahead instead, and loses its place after "98.1%" is read
// out as four words). Chinese is matched character by character. Never goes backwards.
export function wordEnds(text, words) {
  const ends = [];
  let at = 0;
  if (CJK.test(text)) {
    for (const w of words) {
      const i = text.indexOf(w, at);
      at = i >= 0 ? i + w.length : at + w.length;
      ends.push(Math.min(at, text.length));
    }
    return ends;
  }
  let last = 0;
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const w of words) {
    const word = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || w;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, 'iu');
    const m = text.slice(at, at + 40).match(re);
    if (m) {
      last = at + m.index + m[0].length;
      while (last < text.length && /[^\s\p{L}\p{N}]/u.test(text[last])) last += 1; // keep "agents," together
      at = last;
    }
    ends.push(last);
  }
  for (let i = 1; i < ends.length; i++) ends[i] = Math.max(ends[i], ends[i - 1]);
  return ends.map((e) => Math.min(e, text.length));
}

// The silent version: the line split the way the text reveal splits it, each word timed by pace.js.
export function silentSpeech(line, rng = Math.random) {
  const words = [];
  const wtimes = [];
  const wdurations = [];
  const ends = [];
  let t = 0;
  for (let i = 0; i < line.length; ) {
    const j = nextStop(line, i);
    const word = line.slice(i, j).trim();
    const d = chunkDelay(line, i, j, rng);
    if (word) {
      words.push(word);
      wtimes.push(t);
      // the mouth moves for the word, not for the pause after it
      wdurations.push(Math.min(d, 120 + word.length * 55));
      ends.push(j);
    }
    t += d;
    i = j;
  }
  return { words, wtimes, wdurations, ends, ms: t };
}

export const languageOf = (line) => (/[一-鿿]/.test(line) ? 'zh' : 'en');

// The spoken version, from twin-api /tts. Rejects when there is no voice (not configured, over budget, offline).
export async function voicedSpeech(line, audioCtx) {
  if (!API_URL) throw new Error('no api');
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line, language: languageOf(line) }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `tts ${res.status}`);
  const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
  const audio = await audioCtx.decodeAudioData(bytes.buffer);
  if (!data.words?.length) {
    // a voice without timings (Workers AI): the typing rhythm, stretched to the audio; TalkingHead mouths the words
    const s = silentSpeech(line, () => 0.5);
    const k = (audio.duration * 1000) / s.ms;
    return { ...s, audio, wtimes: s.wtimes.map((t) => t * k), wdurations: s.wdurations.map((d) => d * k), ms: audio.duration * 1000 };
  }
  const v = toVisemes(data.visemes);
  const words = data.words.map((w) => w.text);
  return {
    audio,
    words,
    wtimes: data.words.map((w) => w.audioOffset / 1e4),
    wdurations: data.words.map((w) => w.duration / 1e4),
    visemes: v.visemes,
    vtimes: v.times,
    vdurations: v.durations,
    ends: wordEnds(line, words),
    ms: audio.duration * 1000,
  };
}

// Petersen caps the voice at 180 seconds a day per browser; past that the twin mouths the words silently.
const BUDGET_KEY = 'twin-voice-budget';
const BUDGET_MS = 180 * 1000;

export function voiceBudgetLeft(now = new Date()) {
  try {
    const b = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');
    return b.day === now.toDateString() ? BUDGET_MS - b.used : BUDGET_MS;
  } catch {
    return BUDGET_MS;
  }
}

export function spendVoice(ms, now = new Date()) {
  try {
    const left = voiceBudgetLeft(now);
    localStorage.setItem(BUDGET_KEY, JSON.stringify({ day: now.toDateString(), used: BUDGET_MS - left + ms }));
  } catch {
    // private mode: no budget kept, the server's rate limit still applies
  }
}
