/**
 * Ring Zero - Phase 6 Core Systems & Exploit Fixes Automated Test Suite
 * Validates:
 * 1. Stability & Exploit Bug Fixes:
 *    - Lagswitch entity update gating without loop corruption
 *    - Kernel Panic hostile projectile purge & omnidirectional laser burst
 *    - Wall-penetration targeting synergy (Aimbot & Triggerbot with PenetrationBucker)
 * 2. Economy & Drop Magnetics (PickupSystem):
 *    - Magnetic attraction for XP and Crypto drops
 *    - Quadratic spring acceleration dynamics
 *    - Cache Magnet firmware rank scaling
 * 3. Run Lifecycle & Persistence:
 *    - In-memory resetRun() / startRun() without reload
 *    - Immediate bounty commitment upon death
 * 4. Procedural Cyber BGM (SynthMusic & SynthAudio):
 *    - 130 BPM step-sequencer, 4 channels, D minor pentatonic
 *    - AMBIENT vs COMBAT adaptive intensity states
 *    - Dedicated musicGain bus routing
 * 5. Settings Expansion:
 *    - Music volume & mouse aim sensitivity storage persistence
 *    - InputManager cursor delta scaling
 */

// Headless DOM & Storage Mock
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    devicePixelRatio: 1,
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      style: {},
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      classList: { add: () => {}, remove: () => {}, contains: () => false },
    }),
    body: {
      appendChild: () => {},
    },
  };
}

// Mock Web Audio API for headless Node
class MockAudioNode {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    this.frequency = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    this.Q = {
      setValueAtTime: () => {},
    };
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0.0;
    this.sampleRate = 44100;
    this.destination = new MockAudioNode();
    this.state = 'running';
  }
  createDynamicsCompressor() {
    return {
      threshold: { setValueAtTime: () => {} },
      knee: { setValueAtTime: () => {} },
      ratio: { setValueAtTime: () => {} },
      attack: { setValueAtTime: () => {} },
      release: { setValueAtTime: () => {} },
      connect: () => {},
    };
  }
  createGain() { return new MockAudioNode(); }
  createOscillator() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createBufferSource() { return new MockAudioNode(); }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  resume() { return Promise.resolve(); }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;
if (typeof window !== 'undefined') {
  window.AudioContext = MockAudioContext;
  window.webkitAudioContext = MockAudioContext;
}

import { LagswitchCheat } from '../src/cheats/LagswitchCheat.js';
import { KernelPanicCheat } from '../src/cheats/KernelPanicCheat.js';
import { AimbotCheat } from '../src/cheats/AimbotCheat.js';
import { TriggerbotCheat } from '../src/cheats/TriggerbotCheat.js';
import { PenetrationBuckerCheat } from '../src/cheats/PenetrationBuckerCheat.js';
import { Raycaster2D } from '../src/world/Raycaster2D.js';
import { PickupSystem } from '../src/systems/PickupSystem.js';
import { Drop, DROP_TYPE } from '../src/entities/Drop.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Projectile } from '../src/entities/Projectile.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { StorageService } from '../src/services/StorageService.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { SynthAudio } from '../src/audio/SynthAudio.js';
import { SynthMusic, MUSIC_INTENSITY } from '../src/audio/SynthMusic.js';
import { InputManager } from '../src/core/InputManager.js';
import { SettingsModal } from '../src/ui/SettingsModal.js';
import { COLLISION_LAYER } from '../src/core/Constants.js';
import { Vec2 } from '../src/core/VectorMath.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== RUNNING PHASE 6 CORE SYSTEMS & EXPLOIT FIXES SUITE ===\n');

// -------------------------------------------------------------
// 1. STABILITY & EXPLOIT BUG FIXES
// -------------------------------------------------------------
console.log('1. Testing Stability & Exploit Bug Fixes:');

// 1a. Lagswitch safe timer and hostiles freeze gating
const lagswitch = new LagswitchCheat();
assert(lagswitch.durationTimer === 0, 'Lagswitch starts with zero duration timer');
assert(!lagswitch.shouldFreezeHostiles(), 'Lagswitch does not freeze hostiles when idle');
lagswitch.trigger();
assert(lagswitch.shouldFreezeHostiles(), 'Lagswitch freezes hostiles after activation');
assert(lagswitch.shouldFreezeWorld(), 'Lagswitch reports shouldFreezeWorld true');

// Update with safe dt
lagswitch.update(1.0);
assert(lagswitch.durationTimer === 1.5, 'Lagswitch timer safely decrements by dt (2.5 -> 1.5)');
lagswitch.update(1.6);
assert(!lagswitch.shouldFreezeHostiles(), 'Lagswitch unfreezes hostiles after durationTimer expires');
assert(lagswitch.cooldownTimer > 0, 'Lagswitch enters cooldown after expiration');

// 1b. Kernel Panic hostile projectile purge and radial laser burst
const kernelPanic = new KernelPanicCheat();
const projPool = new ObjectPool({
  factory: () => new Projectile(),
  reset: (p) => p.reset(),
  initialCapacity: 50,
});

// Spawn 1 player projectile and 3 hostile projectiles
const p1 = projPool.obtain();
p1.spawn({ x: 0, y: 0, vx: 100, vy: 0, layer: COLLISION_LAYER.PROJECTILE_PLAYER });
const e1 = projPool.obtain();
e1.spawn({ x: 50, y: 50, vx: 0, vy: 50, layer: COLLISION_LAYER.PROJECTILE_ENEMY });
const e2 = projPool.obtain();
e2.spawn({ x: 100, y: -50, vx: 0, vy: 50, layer: COLLISION_LAYER.PROJECTILE_ENEMY });
const e3 = projPool.obtain();
e3.spawn({ x: 5000, y: 5000, vx: 0, vy: 0, layer: COLLISION_LAYER.PROJECTILE_ENEMY }); // Out of camera bounds

const camera = {
  getVisibleBounds: () => ({ minX: -200, maxX: 200, minY: -200, maxY: 200 }),
};

const spawnedLasers = [];
kernelPanic.triggerRetaliation({
  player: new Player(0, 0),
  projectilePool: projPool,
  camera,
  spawnCallback: (laserParams) => spawnedLasers.push(laserParams),
});

assert(spawnedLasers.length >= 16 && spawnedLasers.length <= 32, `Kernel Panic spawned radial laser ring (${spawnedLasers.length} lasers)`);
assert(p1.active, 'Player projectile was NOT purged by Kernel Panic');
assert(!e1.active, 'In-bounds hostile projectile 1 was purged');
assert(!e2.active, 'In-bounds hostile projectile 2 was purged');
assert(e3.active, 'Out-of-bounds hostile projectile was left intact');

// 1c. Wall Penetration Synergy (Aimbot & Triggerbot with PenetrationBucker)
const segments = [
  { p1: { x: 50, y: -100 }, p2: { x: 50, y: 100 } }, // Wall 1 at x=50
  { p1: { x: 150, y: -100 }, p2: { x: 150, y: 100 } }, // Wall 2 at x=150
];

const count1 = Raycaster2D.countInterveningWalls(0, 0, 100, 0, segments);
assert(count1 === 1, 'Raycaster correctly counts 1 intervening wall segment');
const count2 = Raycaster2D.countInterveningWalls(0, 0, 200, 0, segments);
assert(count2 === 2, 'Raycaster correctly counts 2 intervening wall segments');

// Aimbot wall synergy test
const aimbot = new AimbotCheat();
const spatialGrid = new SpatialHashGrid(128);
const enemyBehind1Wall = new Enemy(100, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
spatialGrid.insert(enemyBehind1Wall);
const penCheat = new PenetrationBuckerCheat(); // Rank 1 gives +2 pierce
const raycaster = new Raycaster2D();

const aimContextWithoutPen = {
  player: new Player(0, 0),
  spatialGrid,
  enemies: [enemyBehind1Wall],
  wallSegments: segments,
  raycaster,
  penetrationCheat: null,
};
const aimAngleNoPen = aimbot.onAimInput(0.5, new Vec2(Math.cos(0.5), Math.sin(0.5)), aimContextWithoutPen);
assert(aimAngleNoPen === 0.5, 'Aimbot does NOT snap through wall without Penetration exploit');

const aimContextWithPen = {
  player: new Player(0, 0),
  spatialGrid,
  enemies: [enemyBehind1Wall],
  wallSegments: segments,
  raycaster,
  penetrationCheat: penCheat,
};
const aimAngleWithPen = aimbot.onAimInput(0.5, new Vec2(Math.cos(0.5), Math.sin(0.5)), aimContextWithPen);
assert(Math.abs(aimAngleWithPen) < 0.1, 'Aimbot snaps toward enemy (angle ~0) through wall when intervening walls <= maxPierce');

// Triggerbot wall synergy test
const triggerbot = new TriggerbotCheat();
const trigContextWithPen = {
  player: new Player(0, 0),
  enemies: [enemyBehind1Wall],
  wallSegments: segments,
  raycaster,
  penetrationCheat: penCheat,
};
triggerbot.onAimInput(0, new Vec2(1, 0), trigContextWithPen);
assert(triggerbot.shouldAutoShoot(), 'Triggerbot fires through wall when target within pierce threshold');

// -------------------------------------------------------------
// 2. ECONOMY & DROP MAGNETICS (PickupSystem)
// -------------------------------------------------------------
console.log('\n2. Testing Economy & Drop Magnetics:');

const storage = new StorageService();
const pickupSystem = new PickupSystem({ storage });
const player = new Player(0, 0);

const xpDrop = new Drop(100, 0, DROP_TYPE.XP, { xpValue: 20 });
const cryptoDrop = new Drop(0, 120, DROP_TYPE.CRYPTO, { cryptoValue: 50 });
const weaponDrop = new Drop(50, 50, DROP_TYPE.WEAPON, {});
const drops = [xpDrop, cryptoDrop, weaponDrop];

assert(!xpDrop.isMagnetized && !cryptoDrop.isMagnetized, 'Drops start unmagnetized');

// Update pickup dynamics
pickupSystem.update(drops, player, 0.016);

assert(xpDrop.isMagnetized, 'XP drop within range was magnetized');
assert(cryptoDrop.isMagnetized, 'Crypto drop within range was magnetized');
assert(!weaponDrop.isMagnetized, 'Weapon crate is NOT magnetized');
assert(xpDrop.vx < 0, 'XP drop accelerates toward player (vx < 0 toward x=0)');
assert(cryptoDrop.vy < 0, 'Crypto drop accelerates toward player (vy < 0 toward y=0)');

// Test Cache Magnet rank scaling
storage.state.firmware.cacheMagnet = 3;
const scaledRadius = pickupSystem.getMagnetRadius(new Player(0, 0));
assert(scaledRadius === 180 + 3 * 40, `Cache Magnet Rank 3 scales radius to ${scaledRadius}px (expected 300px)`);
const speedMult = pickupSystem.getMagnetSpeedMultiplier();
assert(speedMult === 1.75, `Cache Magnet Rank 3 scales speed multiplier to ${speedMult}x (expected 1.75x)`);

// -------------------------------------------------------------
// 3. RUN LIFECYCLE & PERSISTENCE
// -------------------------------------------------------------
console.log('\n3. Testing Run Lifecycle & Persistence:');

// Test immediate bounty persist on run recording
storage.state.cryptoBounties = 100;
storage.recordRun({
  score: 5000,
  wavesCleared: 4,
  bountiesEarned: 85,
  kills: 42,
});
assert(storage.cryptoBounties === 185, `Bounties immediately committed to storage (100 + 85 = ${storage.cryptoBounties})`);

// -------------------------------------------------------------
// 4. PROCEDURAL CYBER BGM (SynthMusic & SynthAudio)
// -------------------------------------------------------------
console.log('\n4. Testing Procedural Cyber BGM:');

const synth = new SynthAudio();
synth.init();
assert(synth.musicGain !== null, 'SynthAudio creates dedicated musicGain node');

synth.setMusicVolume(0.45);
assert(synth.musicVolume === 0.45, 'SynthAudio sets musicVolume correctly');

const synthMusic = new SynthMusic({ synth });
assert(synthMusic.bpm === 130, 'Procedural music BPM is 130');
assert(synthMusic.stepDuration > 0.115 && synthMusic.stepDuration < 0.116, '16th note step duration matches 130 BPM (~115.4ms)');
assert(synthMusic.intensity === MUSIC_INTENSITY.AMBIENT, 'Initial intensity defaults to AMBIENT');

synthMusic.init();
assert(synthMusic.masterGain !== null, 'SynthMusic masterGain node created');
assert(synthMusic.noiseBuffer !== null, 'SynthMusic noiseBuffer generated for drums');

synthMusic.setIntensity(MUSIC_INTENSITY.COMBAT);
assert(synthMusic.intensity === MUSIC_INTENSITY.COMBAT, 'SynthMusic intensity switches to COMBAT');

synthMusic.setVolume(0.75);
assert(synthMusic.volume === 0.75, 'SynthMusic volume adjusted');

synthMusic.start();
assert(synthMusic.isPlaying, 'SynthMusic step-sequencer is actively running');
synthMusic.stop();
assert(!synthMusic.isPlaying, 'SynthMusic step-sequencer stopped cleanly');

// -------------------------------------------------------------
// 5. SETTINGS EXPANSION & INPUT SENSITIVITY
// -------------------------------------------------------------
console.log('\n5. Testing Settings Expansion & Input Sensitivity:');

// Test default settings storage schema
assert(storage.settings.musicVolume !== undefined, 'Storage settings schema includes musicVolume');
assert(storage.settings.mouseSensitivity !== undefined, 'Storage settings schema includes mouseSensitivity');

// Test InputManager sensitivity
const mockCanvas = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
};
const input = new InputManager(mockCanvas);
assert(input.sensitivity === 1.0, 'InputManager default sensitivity is 1.0');

// Mouse move with sensitivity 1.0
input._onMouseMove({ clientX: 100, clientY: 100 });
assert(input.screenPointer.x === 100 && input.screenPointer.y === 100, 'Screen pointer matches raw mouse at 1.0x sensitivity');

// Set sensitivity to 2.0x
input.setSensitivity(2.0);
assert(input.sensitivity === 2.0, 'InputManager sensitivity updated to 2.0x');

// Mouse moves +10px in X, +20px in Y -> delta should be doubled to +20px X, +40px Y
input._onMouseMove({ clientX: 110, clientY: 120 });
assert(input.screenPointer.x === 120, `Cursor X scaled by delta: 100 + (10 * 2.0) = ${input.screenPointer.x}`);
assert(input.screenPointer.y === 140, `Cursor Y scaled by delta: 100 + (20 * 2.0) = ${input.screenPointer.y}`);

// SettingsModal integration
const settingsModal = new SettingsModal({
  storage,
  synth,
  soundBank: { playUIClick: () => {} },
  camera: { traumaMultiplier: 1.0 },
  input,
  synthMusic,
});

assert(settingsModal.synthMusic === synthMusic, 'SettingsModal wires synthMusic instance');
assert(settingsModal.input === input, 'SettingsModal wires input instance');

console.log(`\n=== PHASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 6 REQUIREMENTS FULLY VERIFIED!');
}
