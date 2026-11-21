// Astrid's digital twin API: a Cloudflare Worker between the website and the Claude API.
//
// POST { query, messages: [{ role, content }] }  ->  text/event-stream of chat bubbles (format: src/agent/twinStream.js)
// POST /tts { text, language }                   ->  the twin's voice for one sentence, with word and viseme timings (tts.js)
// POST /voice-lab { engine, speaker, text }       ->  a voice sample for #/voices, only under `npm run voices` (voiceLab.js)
//
// The API key stays here, never in the browser. Only the site's own origins may call it (ALLOWED_ORIGINS), each
// visitor IP gets LIMITER's questions a minute and CHAT_DAILY_PER_IP a day, the whole site gets CHAT_DAILY_TOTAL a
// day, and questions and history are capped (messages.js), so a stranger can't run up the bill.

import Anthropic from '@anthropic-ai/sdk';
import { createBubbler, sse } from '../../src/agent/twinStream.js';
import { toMessages } from './messages.js';
import { systemPrompt } from './prompt.js';
import { speak } from './tts.js';
import { voiceLab } from './voiceLab.js';

export { ChatBudget, TtsBudget } from './budget.js';

const OFF_LIMITS = "Hmm, I'd rather not get into that one. Ask me about my projects or my work?";

// Browsers enforce this; the rate limit covers everything else.
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim());
  if (!origin || !allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// Whether this visitor may ask one more question today (ChatBudget, budget.js). No budget bound: no model, and
// the site answers from its built-in rules.
function chatBudget(env, ip) {
  const perIp = Number(env.CHAT_DAILY_PER_IP) || 0;
  const total = Number(env.CHAT_DAILY_TOTAL) || 0;
  if (!env.CHAT_BUDGET || !perIp || !total) return false;
  return env.CHAT_BUDGET.get(env.CHAT_BUDGET.idFromName('chat')).take(ip, perIp, total);
}

// Streams the model's reply into `writable` as bubble events, then follow-ups, then done.
async function answer(env, messages, writable) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event) => writer.write(encoder.encode(sse(event)));
  const bubbler = createBubbler();
  let said = 0;
  const say = async (bubbles) => {
    for (const text of bubbles) {
      said += 1;
      await send({ type: 'bubble', text });
    }
  };
  let stream;
  try {
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL || undefined, // optional, e.g. a Cloudflare AI Gateway URL
      timeout: 30_000,
      maxRetries: 1,
    });
    const model = env.MODEL || 'claude-opus-5-5';
    stream = client.beta.messages.stream({
      model,
      max_tokens: 2048,
      output_config: { effort: env.EFFORT || 'low' },
      system: systemPrompt(),
      messages,
      // if a safety classifier declines, the API retries on the model it recommends (Haiku has no fallback)
      ...(model.includes('haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') await say(bubbler.push(event.delta.text));
    }
    const message = await stream.finalMessage();
    await say(bubbler.end());
    if (message.stop_reason === 'refusal') await say([OFF_LIMITS]);
    if (!said) throw new Error('empty answer'); // the site then answers from its built-in rules
    if (bubbler.followups?.length) await send({ type: 'followups', questions: bubbler.followups });
    await send({ type: 'done' });
  } catch (err) {
    stream?.abort(); // the visitor left, or the API failed: stop generating either way
    console.error('[twin] answer failed:', err);
    const message =
      err instanceof Anthropic.RateLimitError
        ? 'busy'
        : err instanceof Anthropic.APIConnectionError
          ? 'unreachable'
          : err instanceof Anthropic.APIError
            ? `upstream ${err.status}`
            : 'internal';
    await send({ type: 'error', message }).catch(() => {});
  } finally {
    await writer.close().catch(() => {});
  }
}

export default {
  async fetch(request, env, ctx) {
    const headers = corsHeaders(request, env);
    if (!headers) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (new URL(request.url).pathname === '/voice-lab') {
      const { status, json, audio, type } = await voiceLab(env, await request.json().catch(() => null)).catch((err) => {
        console.error('[twin] voice lab failed:', err);
        return { status: 502, json: { error: String(err?.message || err) } };
      });
      return audio ? new Response(audio, { headers: { ...headers, 'Content-Type': type } }) : Response.json(json, { status, headers });
    }
    if (new URL(request.url).pathname === '/tts') {
      if (env.TTS_LIMITER && !(await env.TTS_LIMITER.limit({ key: ip })).success) {
        return Response.json({ error: 'busy' }, { status: 429, headers });
      }
      const { status, json } = await speak(env, await request.json().catch(() => null)).catch((err) => {
        console.error('[twin] tts failed:', err);
        return { status: 500, json: { error: 'internal' } };
      });
      return Response.json(json, { status, headers });
    }
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return new Response('Too many questions, try again in a minute', { status: 429, headers });
    }
    const messages = toMessages(await request.json().catch(() => null));
    if (!messages) return new Response('Bad request', { status: 400, headers });
    if (!(await chatBudget(env, ip))) return new Response('No more questions today', { status: 429, headers });
    const { readable, writable } = new TransformStream();
    ctx.waitUntil(answer(env, messages, writable));
    return new Response(readable, { headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  },
};
