// Input: mouse and keyboard, translated into World actions. The canvas is scaled to
// fit the window, so every pointer position is mapped back into the game's own
// 1280x720 coordinates before anything is hit-tested.
import { SCREEN, TOWER_TYPES, VIEW } from './config.js';
import { hitRegions } from './render.js';
import { toggleMute, unlockAudio } from './audio.js';

export function attachInput(canvas, world, hooks) {
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
    offsetX = (rect.width - VIEW.width * scale) / 2;
    offsetY = (rect.height - VIEW.height * scale) / 2;
  }

  function toGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  function regionAt(x, y) {
    for (const region of hitRegions(world)) {
      if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) return region;
    }
    return null;
  }

  function onPointerDown(event) {
    unlockAudio();
    const pos = toGame(event.clientX, event.clientY);
    const region = regionAt(pos.x, pos.y);
    if (region) {
      if (region.id === 'start') { world.startGame(); return; }
      if (region.id === 'restart') { world.restart(); return; }
      if (region.id === 'startWave') { world.startWave(); return; }
      if (region.id === 'speed') { world.toggleSpeed(); return; }
      if (region.id === 'pause') { world.togglePause(); return; }
      if (region.id === 'mute') { toggleMute(); return; }
      if (region.id === 'shop') { world.selectedBuildType = region.type; return; }
      if (region.id === 'build') {
        if (world.selectedPad !== null) world.buildOnPad(world.selectedPad, region.type);
        return;
      }
      if (region.id === 'upgrade') { world.upgradeSelected(); return; }
      if (region.id === 'sell') { world.sellSelected(); return; }
    }
    if (world.screen !== SCREEN.PLAYING) return;
    const padIndex = world.padAt(pos.x, pos.y);
    if (padIndex !== null) {
      const tower = world.towerAtPad(padIndex);
      if (tower) {
        world.selectedTowerId = tower.id;
        world.selectedPad = null;
      } else {
        world.selectedPad = padIndex;
        world.selectedTowerId = null;
      }
      return;
    }
    world.selectedPad = null;
    world.selectedTowerId = null;
  }

  function onPointerMove(event) {
    const pos = toGame(event.clientX, event.clientY);
    world.hoverPad = world.padAt(pos.x, pos.y);
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'enter' && world.screen === SCREEN.TITLE) { unlockAudio(); world.startGame(); return; }
    if (key === 'r') {
      if (world.screen === SCREEN.VICTORY || world.screen === SCREEN.DEFEAT) world.restart();
      return;
    }
    if (world.screen !== SCREEN.PLAYING) return;
    if (key === ' ') { event.preventDefault(); unlockAudio(); world.startWave(); return; }
    if (key === 'p') { world.togglePause(); return; }
    if (key === 'f') { world.toggleSpeed(); return; }
    if (key === 'm') { toggleMute(); return; }
    if (key === 'escape') { world.selectedPad = null; world.selectedTowerId = null; return; }
    for (const type of Object.keys(TOWER_TYPES)) {
      if (key === TOWER_TYPES[type].hotkey) {
        world.selectedBuildType = type;
        if (world.selectedPad !== null) world.buildOnPad(world.selectedPad, type);
        return;
      }
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  resize();
  return { resize };
}
