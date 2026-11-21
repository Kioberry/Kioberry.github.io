// One day's chat questions: how many each visitor and the whole site have asked. Pure, so the site's tests can
// run it; ChatBudget (budget.js) keeps the state between requests.

// Takes one question for `key` from `day`'s limits if both allow it. `saved` is the state from the last call (or
// nothing); a new day starts from zero. Returns { ok, state }: when ok is false the state is unchanged.
// byKey gains at most one entry per question taken, so it never holds more than `total` visitors.
export function takeDaily(saved, key, perKey, total, day) {
  const state = saved?.day === day ? saved : { day, total: 0, byKey: {} };
  const mine = Object.hasOwn(state.byKey, key) ? state.byKey[key] : 0;
  if (state.total >= total || mine >= perKey) return { ok: false, state };
  return { ok: true, state: { day, total: state.total + 1, byKey: { ...state.byKey, [key]: mine + 1 } } };
}
