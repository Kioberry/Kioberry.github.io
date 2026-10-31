// POST /voice-lab { engine, speaker, text }  ->  the audio (MeloTTS gives WAV, Aura MP3)
//
// Samples for the voice audition page (#/voices) from Workers AI: MeloTTS (open source, en and zh) and Deepgram
// Aura-2. Only answers when VOICE_LAB is set, which `npm run voices` does for `wrangler dev`; the deployed worker
// leaves it unset, so this never serves the public.

import { AURA, MELO, aiBytes } from './tts.js';

const MAX_TEXT = 500;

const ENGINES = {
  melotts: (speaker, text) => [MELO, { prompt: text, lang: speaker === 'zh' ? 'zh' : 'en' }],
  'aura-2': (speaker, text) => [AURA, { text, speaker, encoding: 'mp3' }],
};

export async function voiceLab(env, body) {
  if (!env.VOICE_LAB || !env.AI) return { status: 404, json: { error: 'voice lab is off' } };
  const engine = ENGINES[body?.engine];
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
  if (!engine || !text || typeof body.speaker !== 'string') return { status: 400, json: { error: 'bad request' } };
  const [model, input] = engine(body.speaker, text);
  const audio = await aiBytes(await env.AI.run(model, input));
  const wav = String.fromCharCode(...audio.subarray(0, 4)) === 'RIFF';
  return { status: 200, audio, type: wav ? 'audio/wav' : 'audio/mpeg' };
}
