// The World: every rule of Emberkeep and nothing else. It holds no canvas, no DOM
// and no audio of its own; it reports what happened as events the main loop turns
// into sound, and as particles and floating text the renderer draws. A World built
// from one seed always plays the same waves, so a screenshot scene replays exactly.
import {
  ENEMY_TYPES, KEEP, MAX_WAVES, PADS, PAD_RADIUS, SCREEN, SELL_RATE,
  START_EMBERS, START_LIGHT, TOWER_TYPES, killScore, waveClearEmbers, waveClearScore,
} from './config.js';
import { makeRng } from './random.js';
import { buildWave, hpMultiplier } from './waves.js';
import { chillEnemy, spawnEnemy, updateEnemy } from './enemies.js';
import {
  buildTower, maxLevel, towerStats, updateProjectile, updateTower, upgradeCost,
} from './towers.js';

const BEST_KEY = 'emberkeep-best-score';

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.best = 0;
    try {
      if (typeof localStorage !== 'undefined') this.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.reset();
  }

  reset() {
    this.screen = SCREEN.TITLE;
    this.phase = 'build';
    this.wave = 0;
    this.embers = START_EMBERS;
    this.light = START_LIGHT;
    this.score = 0;
    this.kills = 0;
    this.leaked = 0;
    this.built = 0;
    this.upgraded = 0;
    this.time = 0;
    this.paused = false;
    this.speed = 1;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floats = [];
    this.ambient = [];
    this.events = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.selectedPad = null;
    this.selectedTowerId = null;
    this.selectedBuildType = 'spark';
    this.hoverPad = null;
    this.message = '';
    this.messageTimer = 0;
    this.stars = 0;
    this.nextEnemyId = 1;
    this.nextTowerId = 1;
  }

  // ---- flow ----

  startGame() {
    this.reset();
    this.screen = SCREEN.PLAYING;
    this.phase = 'build';
    this.showMessage('Build your lanterns, then start wave 1', 4);
    this.events.push('start');
  }

  restart() {
    this.startGame();
  }

  startWave() {
    if (this.screen !== SCREEN.PLAYING || this.phase !== 'build' || this.paused) return false;
    this.wave += 1;
    this.spawnQueue = buildWave(this.wave, this.rng);
    this.spawnTimer = 0.5;
    this.phase = 'wave';
    this.selectedPad = null;
    this.selectedTowerId = null;
    this.showMessage(this.wave === MAX_WAVES ? 'Final wave: the Gloomlord comes' : `Wave ${this.wave} of ${MAX_WAVES}`, 3);
    this.events.push('horn');
    return true;
  }

  togglePause() {
    if (this.screen !== SCREEN.PLAYING) return;
    this.paused = !this.paused;
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
  }

  // ---- building ----

  towerAtPad(padIndex) {
    return this.towers.find((t) => t.padIndex === padIndex) || null;
  }

  towerById(id) {
    return this.towers.find((t) => t.id === id) || null;
  }

  padAt(x, y) {
    for (let i = 0; i < PADS.length; i += 1) {
      if (Math.hypot(PADS[i].x - x, PADS[i].y - y) <= PAD_RADIUS + 6) return i;
    }
    return null;
  }

  buildOnPad(padIndex, type) {
    if (this.screen !== SCREEN.PLAYING || this.towerAtPad(padIndex)) return false;
    const cost = TOWER_TYPES[type].levels[0].cost;
    if (this.embers < cost) {
      this.events.push('denied');
      return false;
    }
    this.embers -= cost;
    const pad = PADS[padIndex];
    this.towers.push(buildTower(type, padIndex, pad.x, pad.y, this.nextTowerId));
    this.nextTowerId += 1;
    this.built += 1;
    this.selectedTowerId = this.towers[this.towers.length - 1].id;
    this.selectedPad = null;
    this.burst(pad.x, pad.y, '#ffd27a', 14);
    this.events.push('build');
    return true;
  }

  upgradeSelected() {
    const tower = this.towerById(this.selectedTowerId);
    if (!tower || maxLevel(tower)) return false;
    const cost = upgradeCost(tower);
    if (this.embers < cost) {
      this.events.push('denied');
      return false;
    }
    this.embers -= cost;
    tower.invested += cost;
    tower.level += 1;
    this.upgraded += 1;
    this.burst(tower.x, tower.y, '#9fe8ff', 16);
    this.events.push('upgrade');
    return true;
  }

  sellSelected() {
    const tower = this.towerById(this.selectedTowerId);
    if (!tower) return false;
    const refund = Math.floor(tower.invested * SELL_RATE);
    this.embers += refund;
    this.towers = this.towers.filter((t) => t.id !== tower.id);
    this.selectedTowerId = null;
    this.addFloat(tower.x, tower.y - 20, `+${refund}`, '#ffd27a');
    this.events.push('sell');
    return true;
  }

  // Place a tower without charging: only the title scene uses it, for decoration.
  placeDecor(type, padIndex) {
    if (this.towerAtPad(padIndex)) return;
    const pad = PADS[padIndex];
    this.towers.push(buildTower(type, padIndex, pad.x, pad.y, this.nextTowerId));
    this.nextTowerId += 1;
  }

  // ---- simulation ----

  showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  }

  addFloat(x, y, text, color) {
    this.floats.push({ x, y, text, color, life: 1.1 });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const speed = 30 + this.rng() * 90;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5 + this.rng() * 0.4,
        maxLife: 0.9,
        color,
        size: 2 + this.rng() * 3,
      });
    }
  }

  spawnAmbient(count) {
    this.ambient = [];
    for (let i = 0; i < count; i += 1) {
      const enemy = spawnEnemy(i % 2 === 0 ? 'wisp' : 'mote', 1, 1, this.nextEnemyId);
      this.nextEnemyId += 1;
      enemy.distance = 120 + i * 260;
      this.ambient.push(enemy);
    }
  }

  damageEnemy(enemy, damage, tower) {
    enemy.hp -= damage;
    enemy.flash = 0.12;
    if (enemy.hp > 0) return false;
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) this.enemies.splice(index, 1);
    this.embers += enemy.reward;
    this.score += killScore(enemy.kind, this.wave);
    this.kills += 1;
    if (tower) tower.kills += 1;
    this.burst(enemy.x, enemy.y, enemy.kind === 'gilded' ? '#ffd94a' : '#ffb37a', enemy.kind === 'boss' ? 40 : 12);
    this.addFloat(enemy.x, enemy.y - 14, `+${enemy.reward}`, '#ffd27a');
    this.events.push(enemy.kind === 'gilded' ? 'coin' : 'kill');
    return true;
  }

  step(dt) {
    this.updateFx(dt);
    if (this.screen === SCREEN.TITLE) {
      for (const enemy of this.ambient) {
        if (updateEnemy(enemy, dt, this.time) === 'leaked') enemy.distance = -20;
      }
      this.time += dt;
      return;
    }
    if (this.screen !== SCREEN.PLAYING || this.paused) return;
    this.time += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;

    if (this.phase === 'wave' && this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift();
        this.spawnTimer = next.delay;
        const enemy = spawnEnemy(next.kind, hpMultiplier(this.wave, next.kind), 1, this.nextEnemyId);
        this.nextEnemyId += 1;
        this.enemies.push(enemy);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (updateEnemy(enemy, dt, this.time) === 'leaked') {
        this.enemies.splice(i, 1);
        this.light -= enemy.leak;
        this.leaked += 1;
        this.burst(KEEP.x - 20, KEEP.y, '#7a5cff', 18);
        this.addFloat(KEEP.x - 30, KEEP.y - 40, `-${enemy.leak} light`, '#c9a7ff');
        this.events.push('leak');
        if (this.light <= 0) {
          this.light = 0;
          this.endGame(false);
          return;
        }
      }
    }

    for (const tower of this.towers) {
      const projectile = updateTower(tower, this.enemies, dt);
      if (projectile) {
        this.projectiles.push(projectile);
        this.events.push(projectile.type === 'mortar' ? 'mortar' : projectile.type === 'frost' ? 'frost' : 'shoot');
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      const result = updateProjectile(projectile, this.enemies, dt);
      if (result !== 'hit') {
        if (result === 'lost') this.projectiles.splice(i, 1);
        continue;
      }
      this.projectiles.splice(i, 1);
      const tower = this.towerById(projectile.towerId);
      const target = this.enemies.find((e) => e.id === projectile.targetId);
      if (projectile.splash > 0) {
        this.burst(projectile.x, projectile.y, '#ff9a4d', 10);
        for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = this.enemies[j];
          if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) <= projectile.splash + enemy.radius) {
            this.damageEnemy(enemy, projectile.damage, tower);
          }
        }
      } else if (target) {
        if (projectile.slow > 0) chillEnemy(target, projectile.slow, projectile.slowTime, this.time);
        this.damageEnemy(target, projectile.damage, tower);
      }
    }

    if (this.phase === 'wave' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.phase = 'build';
      const bonus = waveClearEmbers(this.wave);
      this.embers += bonus;
      this.score += waveClearScore(this.wave);
      if (this.wave >= MAX_WAVES) {
        this.endGame(true);
        return;
      }
      this.showMessage(`Wave ${this.wave} cleared  +${bonus} embers`, 3);
      this.events.push('waveClear');
    }
  }

  updateFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i -= 1) {
      const f = this.floats[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
  }

  endGame(won) {
    this.phase = 'build';
    this.projectiles = [];
    if (won) {
      this.screen = SCREEN.VICTORY;
      this.score += this.light * 50;
      this.stars = this.light >= 15 ? 3 : this.light >= 8 ? 2 : 1;
      this.events.push('victory');
    } else {
      this.screen = SCREEN.DEFEAT;
      this.stars = 0;
      this.events.push('defeat');
    }
    if (this.score > this.best) {
      this.best = this.score;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Best score is a nicety; a storage failure must never break the game.
      }
    }
  }

  // How the run is going, for the HUD and the end screens.
  stats() {
    return {
      wave: this.wave,
      embers: this.embers,
      light: this.light,
      score: this.score,
      best: this.best,
      kills: this.kills,
      leaked: this.leaked,
      built: this.built,
      upgraded: this.upgraded,
      towers: this.towers.length,
      remaining: this.spawnQueue.length + this.enemies.length,
      stars: this.stars,
    };
  }
}
