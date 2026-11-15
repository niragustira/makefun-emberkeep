// A small seeded random generator (mulberry32) so a wave, a screenshot scene and a
// playtest can all be replayed exactly from one seed. Gameplay randomness always
// comes from a World's rng; Math.random is only for look-only particles.
export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry from a weighted table [[value, weight], ...] using the given rng.
export function pickWeighted(rng, table) {
  let total = 0;
  for (const entry of table) total += entry[1];
  let roll = rng() * total;
  for (const entry of table) {
    roll -= entry[1];
    if (roll <= 0) return entry[0];
  }
  return table[table.length - 1][0];
}

// Shuffle a copy of an array in place order, using the given rng.
export function shuffle(rng, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
