// Waves: what each wave sends down the road. The mix shifts as the waves go on:
// motes from wave 2, shades from wave 3, wraiths from wave 4, gilded wisps from
// wave 3, and the Gloomlord alone closes wave 10. Counts and health both grow.
import { pickWeighted } from './random.js';

// Health multiplier for ordinary enemies on a wave; the boss scales more gently.
export function hpMultiplier(wave, kind) {
  if (kind === 'boss') return 1 + 0.15 * (wave - 1);
  return 1 + 0.26 * (wave - 1) + 0.014 * (wave - 1) * (wave - 1);
}

// Seconds between spawns on a wave.
export function spawnInterval(wave) {
  return Math.max(0.45, 0.95 - wave * 0.04);
}

// The ordered spawn list for a wave: [{ kind, delay }] with delay in seconds after
// the previous spawn. Built from the wave's rng, so a seed replays the same wave.
export function buildWave(wave, rng) {
  const spawns = [];
  if (wave === 10) {
    spawns.push({ kind: 'boss', delay: 0.5 });
    spawns.push({ kind: 'wisp', delay: 6 });
    spawns.push({ kind: 'wisp', delay: 2 });
    spawns.push({ kind: 'mote', delay: 2 });
    spawns.push({ kind: 'mote', delay: 2 });
    spawns.push({ kind: 'shade', delay: 8 });
    spawns.push({ kind: 'wraith', delay: 4 });
    return spawns;
  }
  const count = 6 + wave * 2;
  const table = [['wisp', 10]];
  if (wave >= 2) table.push(['mote', 4 + wave]);
  if (wave >= 3) table.push(['shade', 2 + wave]);
  if (wave >= 4) table.push(['wraith', 1 + wave]);
  for (let i = 0; i < count; i += 1) {
    spawns.push({ kind: pickWeighted(rng, table), delay: spawnInterval(wave) });
  }
  if (wave >= 3) {
    const gildedCount = wave >= 7 ? 2 : 1;
    for (let g = 0; g < gildedCount; g += 1) {
      const at = Math.floor(rng() * spawns.length);
      spawns.splice(at, 0, { kind: 'gilded', delay: spawnInterval(wave) });
    }
  }
  return spawns;
}
