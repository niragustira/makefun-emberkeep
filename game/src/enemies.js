// Enemies: what walks the road. An enemy is plain data; update() moves it, applies
// its chill, and reports when it reaches the Keep. Damage and death are the World's job.
// The id comes from the World, so two Worlds never share a counter.
import { ENEMY_TYPES } from './config.js';
import { pathLength, pointAt } from './path.js';

export function spawnEnemy(kind, hpMul, speedMul, id) {
  const def = ENEMY_TYPES[kind];
  return {
    id,
    kind,
    name: def.name,
    x: 0,
    y: 0,
    distance: -20 - id * 2,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    speed: def.speed * speedMul,
    reward: def.reward,
    leak: def.leak,
    radius: def.radius,
    slowUntil: 0,
    slowFactor: 0,
    flash: 0,
    wobbleSeed: id * 1.7,
  };
}

// Move one enemy forward. Returns 'leaked' when it reaches the Keep.
export function updateEnemy(enemy, dt, now) {
  if (enemy.flash > 0) enemy.flash -= dt;
  let speed = enemy.speed;
  if (now < enemy.slowUntil) speed *= 1 - enemy.slowFactor;
  enemy.distance += speed * dt;
  const point = pointAt(enemy.distance);
  const wobble = Math.sin(now * 2.2 + enemy.wobbleSeed) * 3;
  enemy.x = point.x - point.dy * wobble;
  enemy.y = point.y + point.dx * wobble;
  if (enemy.distance >= pathLength()) return 'leaked';
  return 'walking';
}

// Chill an enemy: it moves slower until `now + seconds`.
export function chillEnemy(enemy, factor, seconds, now) {
  enemy.slowFactor = Math.max(enemy.slowFactor, factor);
  enemy.slowUntil = Math.max(enemy.slowUntil, now + seconds);
}
