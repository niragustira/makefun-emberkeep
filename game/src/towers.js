// Towers: what the player builds on the stone pads. A tower is plain data; update()
// picks its target and fires, and the World moves the projectiles it returns.
// The id comes from the World, so two Worlds never share a counter.
import { TOWER_TYPES } from './config.js';

export function towerStats(type, level) {
  return TOWER_TYPES[type].levels[level - 1];
}

export function buildTower(type, padIndex, x, y, id) {
  return {
    id,
    type,
    padIndex,
    x,
    y,
    level: 1,
    invested: TOWER_TYPES[type].levels[0].cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    kills: 0,
  };
}

export function upgradeCost(tower) {
  const def = TOWER_TYPES[tower.type];
  if (tower.level >= def.levels.length) return null;
  return def.levels[tower.level].cost;
}

export function maxLevel(tower) {
  return tower.level >= TOWER_TYPES[tower.type].levels.length;
}

// The enemy furthest along the road inside this tower's range, if any.
export function pickTarget(tower, enemies) {
  const stats = towerStats(tower.type, tower.level);
  let best = null;
  for (const enemy of enemies) {
    if (enemy.distance < 0) continue;
    const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (d <= stats.range + enemy.radius && (best === null || enemy.distance > best.distance)) best = enemy;
  }
  return best;
}

// Tick one tower. Returns a projectile to launch, or null. Frost fires a chill bolt
// that hurts a little and slows; mortar shells splash on impact (the World applies it).
export function updateTower(tower, enemies, dt) {
  const stats = towerStats(tower.type, tower.level);
  tower.cooldown -= dt;
  const target = pickTarget(tower, enemies);
  if (!target) return null;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  if (tower.cooldown > 0) return null;
  tower.cooldown = 1 / stats.rate;
  return {
    towerId: tower.id,
    type: tower.type,
    x: tower.x,
    y: tower.y + -14,
    targetId: target.id,
    targetX: target.x,
    targetY: target.y,
    speed: TOWER_TYPES[tower.type].projectileSpeed,
    damage: stats.damage,
    splash: stats.splash || 0,
    slow: stats.slow || 0,
    slowTime: stats.slowTime || 0,
    travelled: 0,
  };
}

// Move a projectile toward its target's last known spot. Returns 'hit' when it lands,
// 'lost' when its target died first (mortar shells still land where they were aimed).
export function updateProjectile(projectile, enemies, dt) {
  const target = enemies.find((e) => e.id === projectile.targetId);
  if (target) {
    projectile.targetX = target.x;
    projectile.targetY = target.y;
  }
  const dx = projectile.targetX - projectile.x;
  const dy = projectile.targetY - projectile.y;
  const dist = Math.hypot(dx, dy);
  const step = projectile.speed * dt;
  projectile.travelled += step;
  if (dist <= Math.max(step, 6)) {
    projectile.x = projectile.targetX;
    projectile.y = projectile.targetY;
    return 'hit';
  }
  projectile.x += (dx / dist) * step;
  projectile.y += (dy / dist) * step;
  if (projectile.travelled > 900) return 'lost';
  return 'flying';
}
