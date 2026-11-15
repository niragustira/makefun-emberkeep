// Screenshot scenes: deterministic stagings of the real game behind ?shot=, the way
// the house games do it. Each scene plays the actual rules forward from a fresh
// world with a fixed seed and a scripted autopilot, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
//
//   ?shot=start   the title over a lit map with towers and wisps wandering
//   ?shot=play    mid wave 5, towers firing, the HUD full
//   ?shot=victory the victory screen after all 10 waves
//   ?shot=defeat  the defeat screen after a thin defence falls
import { SCREEN, STEP } from './config.js';

// Where the autopilot builds, in order: [padIndex, towerType, upgradeToLevel].
// Pads 7-10 sit along the long middle stretch; 15-16 guard the last bend.
const STRONG_PLAN = [
  [7, 'spark', 2], [8, 'mortar', 2], [9, 'spark', 2], [11, 'frost', 2],
  [12, 'mortar', 2], [10, 'spark', 3], [13, 'frost', 2], [15, 'mortar', 2],
  [16, 'spark', 2], [6, 'frost', 3], [14, 'mortar', 3], [17, 'spark', 2],
];
const WEAK_PLAN = [[7, 'spark', 1]];

function runSteps(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP);
}

// Spend what the plan asks for, whenever the embers allow it.
function followPlan(world, plan) {
  for (const [padIndex, type, level] of plan) {
    const tower = world.towerAtPad(padIndex);
    if (!tower) {
      if (world.embers >= 60) world.buildOnPad(padIndex, type);
      continue;
    }
    if (tower.level < level) {
      world.selectedTowerId = tower.id;
      world.upgradeSelected();
      world.selectedTowerId = null;
    }
  }
}

function playWaves(world, plan, untilWave, untilDefeat) {
  while (world.screen === SCREEN.PLAYING) {
    if (world.phase === 'build') {
      if (world.wave >= untilWave) return;
      followPlan(world, plan);
      world.startWave();
    }
    runSteps(world, 0.5);
    if (untilDefeat && world.screen === SCREEN.DEFEAT) return;
    if (world.wave > 12) return;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any other name is the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.startGame();
    world.placeDecor('spark', 7);
    world.placeDecor('mortar', 8);
    world.placeDecor('frost', 11);
    // Clear waves 1-4 with the plan, then stop in the middle of wave 5,
    // with enemies on the road and towers firing.
    playWaves(world, STRONG_PLAN, 4, false);
    followPlan(world, STRONG_PLAN);
    world.startWave();
    runSteps(world, 8);
    return { screen: SCREEN.PLAYING };
  }
  if (name === 'victory') {
    world.startGame();
    playWaves(world, STRONG_PLAN, 10, false);
    runSteps(world, 2);
    return { screen: world.screen };
  }
  if (name === 'defeat') {
    world.startGame();
    playWaves(world, WEAK_PLAN, 10, true);
    runSteps(world, 2);
    return { screen: world.screen };
  }
  world.placeDecor('spark', 7);
  world.placeDecor('mortar', 8);
  world.placeDecor('frost', 11);
  world.placeDecor('spark', 15);
  world.spawnAmbient(5);
  runSteps(world, 5);
  return { screen: SCREEN.TITLE };
}
