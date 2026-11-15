// Rendering: everything Emberkeep shows, drawn on one canvas. No images, no fonts
// to load: every sprite is code. The same draw() serves live play and the
// deterministic screenshot scenes; hitRegions() tells input.js what is clickable.
import {
  KEEP, MAX_WAVES, PADS, PAD_RADIUS, PATH_POINTS, PATH_WIDTH, SCREEN,
  TOWER_ORDER, TOWER_TYPES, VIEW,
} from './config.js';
import { makeRng } from './random.js';
import { pathLength, pointAt } from './path.js';
import { towerStats, upgradeCost } from './towers.js';

export const HUD = { height: 56 };
export const SHOP = { y: 652, height: 64, cardWidth: 220, gap: 12 };
export const PANEL = { x: 972, y: 64, width: 292, height: 218 };

const STARS = (() => {
  const rng = makeRng(99);
  const stars = [];
  for (let i = 0; i < 90; i += 1) stars.push({ x: rng() * VIEW.width, y: rng() * 620, r: 0.5 + rng() * 1.4, tw: rng() * Math.PI * 2 });
  return stars;
})();

const ENEMY_COLORS = {
  wisp: '#b78cff',
  mote: '#8f7bff',
  shade: '#5a4a8a',
  wraith: '#d8d2ff',
  gilded: '#ffd94a',
  boss: '#ff5a6e',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, '#0d1026');
  grad.addColorStop(0.6, '#141831');
  grad.addColorStop(1, '#1a1430');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  for (const star of STARS) {
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(world.time * 0.7 + star.tw));
    ctx.fillStyle = '#cdd6ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPath(ctx) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#241f33';
  ctx.lineWidth = PATH_WIDTH;
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (let i = 1; i < PATH_POINTS.length; i += 1) ctx.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#322b4a';
  ctx.lineWidth = PATH_WIDTH - 16;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,122,0.16)';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 14]);
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (let i = 1; i < PATH_POINTS.length; i += 1) ctx.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPads(ctx, world) {
  for (let i = 0; i < PADS.length; i += 1) {
    const pad = PADS[i];
    const tower = world.towerAtPad(i);
    const hovered = world.hoverPad === i;
    const selected = world.selectedPad === i;
    if (!tower) {
      ctx.fillStyle = hovered || selected ? '#4a4468' : '#37334f';
      ctx.strokeStyle = selected ? '#ffd27a' : hovered ? '#8f86b8' : '#4d4768';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, PAD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(205,214,255,0.35)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', pad.x, pad.y + 1);
    }
  }
}

function drawKeep(ctx, world) {
  const pulse = 1 + 0.06 * Math.sin(world.time * 2);
  const strength = 0.25 + 0.75 * (world.light / 20);
  glowCircle(ctx, KEEP.x, KEEP.y - 6, 90 * pulse * strength + 20, 'rgba(255,190,90,0.55)', 0.8 * strength);
  ctx.fillStyle = '#3a3348';
  ctx.strokeStyle = '#6b6486';
  ctx.lineWidth = 2;
  roundRect(ctx, KEEP.x - 26, KEEP.y - 8, 52, 44, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  roundRect(ctx, KEEP.x - 14, KEEP.y - 34, 28, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(KEEP.x, KEEP.y - 19, 7 * pulse, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, `♥ ${world.light}`, KEEP.x, KEEP.y + 52, 15, '#ffd27a', 'center');
}

function towerColors(type) {
  if (type === 'mortar') return { glow: '#ff9a4d', core: '#ffb37a', dark: '#7a4a26' };
  if (type === 'frost') return { glow: '#7adfff', core: '#bfefff', dark: '#2a5a6e' };
  return { glow: '#ffd27a', core: '#fff3c9', dark: '#6e5a26' };
}

function drawTower(ctx, tower) {
  const colors = towerColors(tower.type);
  const stats = towerStats(tower.type, tower.level);
  glowCircle(ctx, tower.x, tower.y - 12, 46, colors.glow, 0.35);
  ctx.fillStyle = '#3a3348';
  ctx.strokeStyle = '#6b6486';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (tower.type === 'mortar') {
    ctx.fillStyle = colors.dark;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 8, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'frost') {
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y - 30);
    ctx.lineTo(tower.x + 9, tower.y - 6);
    ctx.lineTo(tower.x - 9, tower.y - 6);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = colors.core;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tower.x, tower.y - 4);
    ctx.lineTo(tower.x, tower.y - 24);
    ctx.stroke();
    const flicker = 4 + Math.sin(tower.id * 3 + Date.now() / 300) * 1.2;
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 28, flicker, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < tower.level; i += 1) {
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.arc(tower.x - 8 + i * 8, tower.y + 14, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  void stats;
}

function drawEnemy(ctx, enemy, now) {
  const color = ENEMY_COLORS[enemy.kind];
  const chilled = now < enemy.slowUntil;
  if (enemy.kind === 'boss') {
    glowCircle(ctx, enemy.x, enemy.y, 70, 'rgba(255,90,110,0.5)', 0.7);
    ctx.fillStyle = '#2a1530';
    ctx.strokeStyle = '#ff5a6e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 10 + 2 * Math.sin(now * 5), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(enemy.x - 8, enemy.y - 6, 2.5, 0, Math.PI * 2);
    ctx.arc(enemy.x + 8, enemy.y - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'shade') {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff6a5e';
    ctx.beginPath();
    ctx.arc(enemy.x - 5, enemy.y - 3, 2.2, 0, Math.PI * 2);
    ctx.arc(enemy.x + 5, enemy.y - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    glowCircle(ctx, enemy.x, enemy.y, enemy.radius * 2.4, color, 0.55);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius * (enemy.flash > 0 ? 1.25 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(enemy.x - 3, enemy.y - 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (chilled) {
    ctx.strokeStyle = 'rgba(122,223,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (enemy.hp < enemy.maxHp) {
    const w = Math.max(22, enemy.radius * 2);
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w, 4);
    ctx.fillStyle = ratio > 0.5 ? '#7ddc8a' : ratio > 0.25 ? '#ffd27a' : '#ff6a5e';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 10, w * ratio, 4);
  }
}

function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    if (p.type === 'mortar') {
      ctx.fillStyle = '#ff9a4d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'frost') {
      ctx.fillStyle = '#7adfff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      glowCircle(ctx, p.x, p.y, 12, 'rgba(255,210,122,0.8)', 0.8);
      ctx.fillStyle = '#fff3c9';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFx(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function button(ctx, x, y, w, h, label, enabled, accent) {
  ctx.fillStyle = enabled ? (accent ? '#8a6a2f' : '#2c2a4a') : '#222036';
  ctx.strokeStyle = enabled ? (accent ? '#ffd27a' : '#6b6486') : '#3a3654';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 15, enabled ? '#f2ead8' : '#6f6a8a', 'center');
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(10,10,24,0.85)';
  ctx.fillRect(0, 0, VIEW.width, HUD.height);
  ctx.fillStyle = '#2c2a4a';
  ctx.fillRect(0, HUD.height - 1, VIEW.width, 1);
  text(ctx, 'EMBERKEEP', 16, 29, 20, '#ffd27a');
  const s = world.stats();
  text(ctx, `Wave ${Math.max(1, s.wave)} / ${MAX_WAVES}`, 190, 29, 16, '#f2ead8');
  text(ctx, `◆ ${s.embers} embers`, 320, 29, 16, '#ffd27a');
  text(ctx, `♥ ${s.light} light`, 480, 29, 16, s.light <= 5 ? '#ff6a5e' : '#ff9db0');
  text(ctx, `Score ${s.score}`, 620, 29, 16, '#f2ead8');
  text(ctx, `Best ${s.best}`, 760, 29, 15, '#9a94b8');
  if (world.phase === 'wave') text(ctx, `${s.remaining} foes left`, 940, 29, 15, '#c9a7ff', 'right');
  const canStart = world.screen === SCREEN.PLAYING && world.phase === 'build' && !world.paused;
  button(ctx, 950, 10, 150, 36, world.wave === 0 ? 'Start wave 1' : `Start wave ${Math.min(MAX_WAVES, world.wave + 1)}`, canStart, true);
  button(ctx, 1108, 10, 46, 36, world.speed === 1 ? '1×' : '2×', true, false);
  button(ctx, 1162, 10, 46, 36, world.paused ? '▶' : '❚❚', world.screen === SCREEN.PLAYING, false);
  button(ctx, 1216, 10, 46, 36, '♪', true, false);
  if (world.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, world.messageTimer);
    text(ctx, world.message, VIEW.width / 2, 92, 18, '#ffe9b0', 'center');
    ctx.globalAlpha = 1;
  }
}

function drawShop(ctx, world) {
  ctx.fillStyle = 'rgba(10,10,24,0.85)';
  ctx.fillRect(0, SHOP.y, VIEW.width, SHOP.height);
  ctx.fillStyle = '#2c2a4a';
  ctx.fillRect(0, SHOP.y, VIEW.width, 1);
  TOWER_ORDER.forEach((type, i) => {
    const x = 16 + i * (SHOP.cardWidth + SHOP.gap);
    const def = TOWER_TYPES[type];
    const selected = world.selectedBuildType === type;
    const afford = world.embers >= def.levels[0].cost;
    ctx.fillStyle = selected ? '#3d3350' : '#232040';
    ctx.strokeStyle = selected ? '#ffd27a' : '#4d4768';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    roundRect(ctx, x, SHOP.y + 8, SHOP.cardWidth, 50, 8);
    ctx.fill();
    ctx.stroke();
    const colors = towerColors(type);
    ctx.fillStyle = colors.core;
    ctx.beginPath();
    ctx.arc(x + 20, SHOP.y + 33, 8, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `[${def.hotkey}] ${def.name}`, x + 36, SHOP.y + 24, 14, '#f2ead8');
    const base = def.levels[0];
    const stat = type === 'frost'
      ? `slows ${Math.round(base.slow * 100)}%`
      : type === 'mortar'
        ? `${base.damage} dmg · splash ${base.splash}`
        : `${base.damage} dmg · ${base.rate}/s`;
    text(ctx, `◆ ${base.cost} · ${stat}`, x + 36, SHOP.y + 44, 12, afford ? '#c9b98a' : '#8a6a5a', 'left', 'normal');
  });
  text(ctx, 'Click a stone circle to build · 1/2/3 pick a tower · Space start wave · P pause · R restart', 720, SHOP.y + 33, 13, '#9a94b8', 'left', 'normal');
}

function drawPanel(ctx, world) {
  const { x, y, width } = PANEL;
  ctx.fillStyle = 'rgba(16,14,32,0.95)';
  ctx.strokeStyle = '#6b6486';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, PANEL.height, 10);
  ctx.fill();
  ctx.stroke();
  if (world.selectedPad !== null) {
    text(ctx, 'Build here', x + 16, y + 24, 16, '#ffd27a');
    TOWER_ORDER.forEach((type, i) => {
      const def = TOWER_TYPES[type];
      const by = y + 48 + i * 52;
      const afford = world.embers >= def.levels[0].cost;
      ctx.fillStyle = afford ? '#2c2a4a' : '#201e33';
      roundRect(ctx, x + 12, by, width - 24, 44, 8);
      ctx.fill();
      const colors = towerColors(type);
      ctx.fillStyle = colors.core;
      ctx.beginPath();
      ctx.arc(x + 32, by + 22, 8, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, `${def.name}  ◆ ${def.levels[0].cost}`, x + 48, by + 15, 14, '#f2ead8');
      text(ctx, def.blurb, x + 48, by + 33, 12, '#9a94b8', 'left', 'normal');
    });
    text(ctx, 'Click a tower above, or press 1 / 2 / 3', x + 16, y + 48 + 3 * 52 + 8, 12, '#9a94b8', 'left', 'normal');
    return;
  }
  const tower = world.towerById(world.selectedTowerId);
  if (!tower) return;
  const def = TOWER_TYPES[tower.type];
  const stats = towerStats(tower.type, tower.level);
  text(ctx, def.name, x + 16, y + 24, 16, '#ffd27a');
  text(ctx, `Level ${tower.level} / ${def.levels.length}   ·   ${tower.kills} banished`, x + 16, y + 48, 13, '#f2ead8', 'left', 'normal');
  text(ctx, `Damage ${stats.damage}   ·   ${stats.rate.toFixed(1)}/s   ·   Range ${stats.range}`, x + 16, y + 72, 13, '#c9c2de', 'left', 'normal');
  if (stats.splash) text(ctx, `Splash ${stats.splash}`, x + 16, y + 94, 13, '#c9c2de', 'left', 'normal');
  if (stats.slow) text(ctx, `Slows ${Math.round(stats.slow * 100)}% for ${stats.slowTime}s`, x + 16, y + 94, 13, '#c9c2de', 'left', 'normal');
  const cost = upgradeCost(tower);
  if (cost !== null) {
    button(ctx, x + 16, y + 116, 130, 36, `Upgrade ◆ ${cost}`, world.embers >= cost, true);
  } else {
    text(ctx, 'Fully upgraded', x + 16, y + 134, 13, '#9a94b8', 'left', 'normal');
  }
  const refund = Math.floor(tower.invested * 0.7);
  button(ctx, x + 156, y + 116, 120, 36, `Sell +${refund}`, true, false);
  text(ctx, 'Click elsewhere to close', x + 16, y + 178, 12, '#9a94b8', 'left', 'normal');
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(8,8,20,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, world) {
  overlay(ctx);
  text(ctx, 'EMBERKEEP', VIEW.width / 2, 190, 64, '#ffd27a', 'center');
  text(ctx, 'Lanterns of the Last Light', VIEW.width / 2, 240, 22, '#f2ead8', 'center', 'normal');
  text(ctx, 'Shadow wisps march on the Keep. Raise lantern towers on the stone circles,', VIEW.width / 2, 300, 16, '#c9c2de', 'center', 'normal');
  text(ctx, 'spend the embers they drop, and hold the light through all 10 waves.', VIEW.width / 2, 324, 16, '#c9c2de', 'center', 'normal');
  text(ctx, 'The Gloomlord comes last. If the light reaches zero, the dark wins.', VIEW.width / 2, 348, 16, '#c9c2de', 'center', 'normal');
  if (world.best > 0) text(ctx, `Best score: ${world.best}`, VIEW.width / 2, 392, 16, '#ffd27a', 'center');
  button(ctx, VIEW.width / 2 - 130, 430, 260, 52, 'Begin the defence', true, true);
  text(ctx, 'Mouse to build · 1/2/3 pick a tower · Space starts a wave · P pauses', VIEW.width / 2, 516, 14, '#9a94b8', 'center', 'normal');
}

function drawEnd(ctx, world) {
  overlay(ctx);
  const won = world.screen === SCREEN.VICTORY;
  const s = world.stats();
  text(ctx, won ? 'THE LIGHT HOLDS' : 'THE LIGHT IS OUT', VIEW.width / 2, 180, 52, won ? '#ffd27a' : '#ff6a5e', 'center');
  if (won) {
    const stars = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
    text(ctx, stars, VIEW.width / 2, 240, 40, '#ffd27a', 'center');
    text(ctx, 'All 10 waves held. The Gloomlord is banished.', VIEW.width / 2, 288, 17, '#f2ead8', 'center', 'normal');
  } else {
    text(ctx, `The dark took the Keep on wave ${Math.max(1, s.wave)}.`, VIEW.width / 2, 240, 17, '#f2ead8', 'center', 'normal');
  }
  text(ctx, `Score ${s.score}   ·   Best ${s.best}`, VIEW.width / 2, 330, 18, '#f2ead8', 'center');
  text(ctx, `${s.kills} wisps banished · ${s.built} towers raised · ${s.upgraded} upgrades · ${s.leaked} leaked through`, VIEW.width / 2, 362, 15, '#c9c2de', 'center', 'normal');
  button(ctx, VIEW.width / 2 - 130, 410, 260, 52, won ? 'Play again' : 'Try again', true, true);
  text(ctx, 'or press R to restart', VIEW.width / 2, 492, 14, '#9a94b8', 'center', 'normal');
}

export function draw(ctx, world) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawBackground(ctx, world);
  drawPath(ctx);
  drawKeep(ctx, world);
  drawPads(ctx, world);
  const enemies = world.screen === SCREEN.TITLE ? world.ambient : world.enemies;
  for (const enemy of enemies) drawEnemy(ctx, enemy, world.time);
  if (world.screen !== SCREEN.TITLE) {
    for (const tower of world.towers) drawTower(ctx, tower);
    const selected = world.towerById(world.selectedTowerId);
    if (selected) {
      const stats = towerStats(selected.type, selected.level);
      ctx.strokeStyle = 'rgba(255,210,122,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const hoverTower = world.hoverPad !== null ? world.towerAtPad(world.hoverPad) : null;
    if (hoverTower && hoverTower.id !== (selected && selected.id)) {
      const stats = towerStats(hoverTower.type, hoverTower.level);
      ctx.strokeStyle = 'rgba(255,210,122,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoverTower.x, hoverTower.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawProjectiles(ctx, world);
  } else {
    for (const tower of world.towers) drawTower(ctx, tower);
  }
  drawFx(ctx, world);
  if (world.screen === SCREEN.PLAYING) {
    drawHud(ctx, world);
    drawShop(ctx, world);
    if (world.selectedPad !== null || world.selectedTowerId !== null) drawPanel(ctx, world);
    if (world.paused) {
      overlay(ctx);
      text(ctx, 'Paused', VIEW.width / 2, 330, 44, '#f2ead8', 'center');
      text(ctx, 'Press P to resume', VIEW.width / 2, 380, 16, '#9a94b8', 'center', 'normal');
    }
  } else if (world.screen === SCREEN.TITLE) {
    drawTitle(ctx, world);
  } else {
    drawEnd(ctx, world);
  }
}

// Every rectangle the player can click, in the current screen, for input.js.
export function hitRegions(world) {
  const regions = [];
  if (world.screen === SCREEN.TITLE) {
    regions.push({ id: 'start', x: VIEW.width / 2 - 130, y: 430, w: 260, h: 52 });
    return regions;
  }
  if (world.screen === SCREEN.VICTORY || world.screen === SCREEN.DEFEAT) {
    regions.push({ id: 'restart', x: VIEW.width / 2 - 130, y: 410, w: 260, h: 52 });
    return regions;
  }
  regions.push({ id: 'startWave', x: 950, y: 10, w: 150, h: 36 });
  regions.push({ id: 'speed', x: 1108, y: 10, w: 46, h: 36 });
  regions.push({ id: 'pause', x: 1162, y: 10, w: 46, h: 36 });
  regions.push({ id: 'mute', x: 1216, y: 10, w: 46, h: 36 });
  TOWER_ORDER.forEach((type, i) => {
    regions.push({ id: 'shop', type, x: 16 + i * (SHOP.cardWidth + SHOP.gap), y: SHOP.y + 8, w: SHOP.cardWidth, h: 50 });
  });
  if (world.selectedPad !== null) {
    TOWER_ORDER.forEach((type, i) => {
      regions.push({ id: 'build', type, x: PANEL.x + 12, y: PANEL.y + 48 + i * 52, w: PANEL.width - 24, h: 44 });
    });
  }
  if (world.selectedTowerId !== null) {
    const tower = world.towerById(world.selectedTowerId);
    if (tower && upgradeCost(tower) !== null) {
      regions.push({ id: 'upgrade', x: PANEL.x + 16, y: PANEL.y + 116, w: 130, h: 36 });
    }
    regions.push({ id: 'sell', x: PANEL.x + 156, y: PANEL.y + 116, w: 120, h: 36 });
  }
  return regions;
}
