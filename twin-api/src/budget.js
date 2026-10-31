// How many characters Aura has said today (UTC, when Workers AI's free allocation resets), kept in one Durable
// Object so every worker instance shares the count. A request runs to completion before the next one reads, so
// two sentences can't both squeeze into the last of the budget.

import { DurableObject } from 'cloudflare:workers';

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
