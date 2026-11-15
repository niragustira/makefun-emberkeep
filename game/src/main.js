// Emberkeep: hold the light through 10 waves of shadow wisps.
// A tower-defence game in plain ES modules: no library, no network, no assets to
// load. The canvas is fixed at 1280x720 inside and scaled to fit the window.
import { SCREEN, STEP, VIEW } from './config.js';
import { World } from './world.js';
import { attachInput } from './input.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

const world = new World(seed);
let shotScreen = null;
if (shotName) {
  shotScreen = stageShot(shotName, world).screen;
}

attachInput(canvas, world, {});

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// Drain the world's events into sound, at most a few per frame.
function playEvents() {
  const events = world.events.splice(0, world.events.length);
  for (const event of events.slice(0, 6)) {
    if (event === 'shoot') sfx.shoot();
    else if (event === 'mortar') sfx.mortar();
    else if (event === 'frost') sfx.frost();
    else if (event === 'kill') sfx.kill();
    else if (event === 'coin') sfx.coin();
    else if (event === 'leak') sfx.leak();
    else if (event === 'build') sfx.build();
    else if (event === 'upgrade') sfx.upgrade();
    else if (event === 'denied') sfx.denied();
    else if (event === 'horn') sfx.horn();
    else if (event === 'waveClear') sfx.waveClear();
    else if (event === 'victory') sfx.victory();
    else if (event === 'defeat') sfx.defeat();
  }
}

function announce() {
  if (!statusEl) return;
  const s = world.stats();
  statusEl.textContent =
    world.screen === SCREEN.TITLE
      ? 'Emberkeep: a tower defence game. Press Enter to begin.'
      : world.screen === SCREEN.VICTORY
        ? `Victory. Score ${s.score}. Press R to play again.`
        : world.screen === SCREEN.DEFEAT
          ? `Defeat on wave ${s.wave}. Score ${s.score}. Press R to try again.`
          : `Wave ${Math.max(1, s.wave)} of 10. ${s.embers} embers. ${s.light} light. Score ${s.score}.`;
}

// A fixed 60 Hz step, decoupled from the frame rate; 2x speed steps twice as often.
let last = performance.now();
let accumulator = 0;
let announcedAt = 0;
function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  if (!shotName) {
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      world.step(STEP * world.speed);
      accumulator -= STEP;
      guard += 1;
    }
    if (guard >= 8) accumulator = 0;
    playEvents();
  }
  draw(ctx, world);
  if (now - announcedAt > 1000) {
    announcedAt = now;
    announce();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A screenshot scene is fully staged at load: tell the harness it may shoot now.
if (shotName) {
  window.__shotReady = true;
}
