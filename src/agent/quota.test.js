import { takeDaily } from '../../twin-api/src/quota';

const DAY = '2026-11-21';

// Asks `n` questions for `key`, carrying the state along; returns how many were let through and the last state.
function ask(state, key, n, perKey, total, day = DAY) {
  let allowed = 0;
  for (let i = 0; i < n; i += 1) {
    const taken = takeDaily(state, key, perKey, total, day);
    if (taken.ok) allowed += 1;
    state = taken.state;
  }
  return { allowed, state };
}

describe('takeDaily (the twin\'s daily question limits)', () => {
  it('lets a visitor ask up to the per-visitor limit, then no more', () => {
    const { allowed, state } = ask(undefined, '1.1.1.1', 5, 3, 100);
    expect(allowed).toBe(3);
    expect(state).toEqual({ day: DAY, total: 3, byKey: { '1.1.1.1': 3 } });
  });

  it('counts each visitor separately', () => {
    const first = ask(undefined, '1.1.1.1', 3, 3, 100);
    const second = ask(first.state, '2.2.2.2', 2, 3, 100);
    expect(second.allowed).toBe(2);
    expect(second.state.byKey).toEqual({ '1.1.1.1': 3, '2.2.2.2': 2 });
  });

  it('stops everyone once the whole site has used the day\'s total', () => {
    let state;
    let allowed = 0;
    for (let i = 0; i < 10; i += 1) {
      const r = ask(state, `10.0.0.${i}`, 1, 3, 4);
      allowed += r.allowed;
      state = r.state;
    }
    expect(allowed).toBe(4);
    expect(state.total).toBe(4);
    expect(Object.keys(state.byKey)).toHaveLength(4); // visitors turned away aren't remembered
  });

  it('leaves the count alone when it refuses', () => {
    const full = ask(undefined, '1.1.1.1', 3, 3, 100).state;
    const refused = takeDaily(full, '1.1.1.1', 3, 100, DAY);
    expect(refused.ok).toBe(false);
    expect(refused.state).toBe(full);
  });

  it('starts from zero on a new day', () => {
    const yesterday = ask(undefined, '1.1.1.1', 3, 3, 3).state;
    const today = takeDaily(yesterday, '1.1.1.1', 3, 3, '2026-11-22');
    expect(today.ok).toBe(true);
    expect(today.state).toEqual({ day: '2026-11-22', total: 1, byKey: { '1.1.1.1': 1 } });
  });

  it('treats a key that names an Object method as an ordinary visitor', () => {
    const { allowed } = ask(undefined, 'constructor', 2, 1, 100);
    expect(allowed).toBe(1);
  });
});
