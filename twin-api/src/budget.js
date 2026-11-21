// How many characters Aura has said today (UTC, when Workers AI's free allocation resets), kept in one Durable
// Object so every worker instance shares the count. A request runs to completion before the next one reads, so
// two sentences can't both squeeze into the last of the budget.

import { DurableObject } from 'cloudflare:workers';
import { takeDaily } from './quota.js';

export class TtsBudget extends DurableObject {
  // Takes `chars` from today's `limit` if they fit; false (taking nothing) if not.
  async take(chars, limit, now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    const saved = (await this.ctx.storage.get('used')) || {};
    const used = saved.day === day ? saved.used : 0;
    if (used + chars > limit) return false;
    await this.ctx.storage.put('used', { day, used: used + chars });
    return true;
  }
}

// How many questions each visitor and the whole site have asked today (UTC), in one Durable Object for the same
// reason: every worker instance shares the count, and two requests can't both take the last question.
export class ChatBudget extends DurableObject {
  // Takes one question for `key` (the visitor's IP) if today's per-visitor and site-wide limits both allow it.
  async take(key, perKey, total, now = new Date()) {
    const { ok, state } = takeDaily(await this.ctx.storage.get('asked'), key, perKey, total, now.toISOString().slice(0, 10));
    if (ok) await this.ctx.storage.put('asked', state);
    return ok;
  }
}
