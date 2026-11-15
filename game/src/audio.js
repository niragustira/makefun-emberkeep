// Sound, synthesized live with WebAudio: no audio files, no network, nothing to load.
// Every call is a no-op until the player has clicked once (browsers block audio
// before a gesture) and whenever the AudioContext is missing, as in a Node test run.
let context = null;
let master = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

// Call from the first user gesture; safe to call again.
export function unlockAudio() {
  if (typeof window === 'undefined' || context) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
  } catch {
    context = null;
  }
}

function tone(freq, duration, type, volume, slideTo) {
  if (!context || !master || muted) return;
  try {
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Sound is garnish; a failure here must never break the game.
  }
}

function noiseBurst(duration, volume, lowFreq) {
  if (!context || !master || muted) return;
  try {
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  } catch {
    // Sound is garnish; a failure here must never break the game.
  }
}

export const sfx = {
  shoot() { tone(880, 0.07, 'square', 0.05, 660); },
  mortar() { noiseBurst(0.16, 0.12, 900); },
  frost() { tone(1320, 0.12, 'sine', 0.06, 1760); },
  kill() { tone(660, 0.09, 'triangle', 0.09, 990); },
  coin() { tone(1180, 0.08, 'sine', 0.08, 1560); },
  leak() { tone(220, 0.3, 'sawtooth', 0.12, 110); },
  build() { tone(520, 0.12, 'triangle', 0.1, 780); },
  upgrade() { tone(520, 0.1, 'triangle', 0.1, 780); setTimeout(() => tone(780, 0.14, 'triangle', 0.1, 1040), 90); },
  denied() { tone(180, 0.15, 'square', 0.08, 140); },
  horn() { tone(196, 0.35, 'sawtooth', 0.1, 262); setTimeout(() => tone(262, 0.3, 'sawtooth', 0.08, 330), 160); },
  waveClear() { tone(523, 0.12, 'triangle', 0.1); setTimeout(() => tone(659, 0.12, 'triangle', 0.1), 110); setTimeout(() => tone(784, 0.2, 'triangle', 0.1), 220); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.11), i * 140)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.08), i * 170)); },
};
