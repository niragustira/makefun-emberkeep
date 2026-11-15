// Emberkeep configuration: every number that tunes the game lives in this one file,
// so balance changes never touch the rules in world.js or the drawing in render.js.
export const VIEW = { width: 1280, height: 720 };

// The road the shadow wisps walk, from the dark edge on the left to the Keep on the right.
export const PATH_POINTS = [
  { x: -40, y: 120 },
  { x: 280, y: 120 },
  { x: 280, y: 300 },
  { x: 880, y: 300 },
  { x: 880, y: 540 },
  { x: 1120, y: 540 },
  { x: 1204, y: 540 },
];
export const PATH_WIDTH = 46;

// The Keep the player defends, at the end of the road.
export const KEEP = { x: 1228, y: 540, radius: 30 };

// Stone circles where a lantern tower may be built. Each sits clear of the road.
export const PADS = [
  { x: 700, y: 610 }, { x: 820, y: 610 }, { x: 90, y: 185 }, { x: 190, y: 185 },
  { x: 205, y: 210 }, { x: 355, y: 210 },
  { x: 400, y: 235 }, { x: 520, y: 235 }, { x: 640, y: 235 }, { x: 760, y: 235 },
  { x: 400, y: 365 }, { x: 520, y: 365 }, { x: 640, y: 365 }, { x: 760, y: 365 },
  { x: 805, y: 420 }, { x: 955, y: 420 },
  { x: 980, y: 470 }, { x: 1000, y: 610 },
];
export const PAD_RADIUS = 26;

export const START_EMBERS = 170;
export const START_LIGHT = 20;
export const MAX_WAVES = 10;
export const SELL_RATE = 0.7;
export const STEP = 1 / 60;

// Screen names the world, the renderer and the screenshot scenes share.
export const SCREEN = {
  TITLE: 'title',
  PLAYING: 'playing',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

// Tower types. levels[i] is what a tower becomes at level i + 1; cost is the price
// to build (level 1) or to upgrade into that level. Frost also slows what it hits.
export const TOWER_TYPES = {
  spark: {
    name: 'Spark Lantern',
    blurb: 'Fast sparks, steady damage',
    hotkey: '1',
    projectileSpeed: 460,
    levels: [
      { damage: 9, rate: 2.2, range: 130, cost: 60 },
      { damage: 14, rate: 2.6, range: 145, cost: 50 },
      { damage: 22, rate: 3.2, range: 160, cost: 90 },
    ],
  },
  mortar: {
    name: 'Ember Mortar',
    blurb: 'Slow shells, splash damage',
    hotkey: '2',
    projectileSpeed: 300,
    levels: [
      { damage: 26, rate: 0.55, range: 190, splash: 70, cost: 110 },
      { damage: 40, rate: 0.6, range: 205, splash: 85, cost: 85 },
      { damage: 62, rate: 0.7, range: 220, splash: 100, cost: 150 },
    ],
  },
  frost: {
    name: 'Frost Brazier',
    blurb: 'Chills enemies, slows the march',
    hotkey: '3',
    projectileSpeed: 380,
    levels: [
      { damage: 4, rate: 1.5, range: 150, slow: 0.45, slowTime: 1.6, cost: 80 },
      { damage: 7, rate: 1.6, range: 165, slow: 0.55, slowTime: 1.8, cost: 65 },
      { damage: 12, rate: 1.8, range: 180, slow: 0.65, slowTime: 2.0, cost: 110 },
    ],
  },
};
export const TOWER_ORDER = ['spark', 'mortar', 'frost'];

// Enemy kinds. hp and speed grow with the wave (see waves.js); reward is embers,
// leak is the light lost when one reaches the Keep.
export const ENEMY_TYPES = {
  wisp: { name: 'Wisp', hp: 30, speed: 78, reward: 6, leak: 1, radius: 11 },
  mote: { name: 'Mote', hp: 12, speed: 96, reward: 3, leak: 1, radius: 7 },
  shade: { name: 'Shade', hp: 135, speed: 46, reward: 12, leak: 2, radius: 15 },
  wraith: { name: 'Wraith', hp: 72, speed: 108, reward: 10, leak: 1, radius: 10 },
  gilded: { name: 'Gilded Wisp', hp: 20, speed: 122, reward: 25, leak: 1, radius: 9 },
  boss: { name: 'Gloomlord', hp: 2800, speed: 34, reward: 150, leak: 5, radius: 24 },
};

// Embers paid when a wave is cleared, and score values.
export function waveClearEmbers(wave) {
  return 25 + wave * 5;
}
export function killScore(kind, wave) {
  return ENEMY_TYPES[kind].reward * 10 + wave * 5;
}
export function waveClearScore(wave) {
  return 100 * wave;
}
