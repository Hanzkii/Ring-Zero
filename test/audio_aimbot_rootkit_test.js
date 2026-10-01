/**
 * Ring Zero - Audio Pacing, Aimbot Decoupling & Rootkit Verification Test
 * Verifies:
 * 1. Procedural Dark Synthwave OST (140-165 BPM, D Minor, C# Phrygian, tracks rotation)
 * 2. Complete decoupling of Aimbot from player velocity and strafing inertia
 * 3. Rootkit.sys Ring 0 Kernel EMP Screen Purge, damage, and i-frames
 */

import { strict as assert } from 'assert';
import { SynthMusic, MUSIC_INTENSITY, MUSIC_TRACKS, TRACK_CONFIGS } from '../src/audio/SynthMusic.js';
import { AimbotCheat } from '../src/cheats/AimbotCheat.js';
import { RootkitCheat } from '../src/cheats/RootkitCheat.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Projectile } from '../src/entities/Projectile.js';
import { WaveManager, WAVE_STATE } from '../src/systems/WaveManager.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { Vec2 } from '../src/core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../src/core/Constants.js';

console.log('=== AUDIO PACING, AIMBOT DECOUPLING & ROOTKIT TEST ===\n');

// Mock Web Audio Context
class MockAudioParam {
  constructor(val = 0) {
    this.value = val;
  }
  setValueAtTime(val) {
    this.value = val;
  }
  linearRampToValueAtTime(val) {
    this.value = val;
  }
  exponentialRampToValueAtTime(val) {
    this.value = val;
  }
}

class MockAudioNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
    this.Q = new MockAudioParam(1);
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new MockAudioNode();
  }
  createGain() {
    return new MockAudioNode();
  }
  createOscillator() {
    return new MockAudioNode();
  }
  createBiquadFilter() {
    return new MockAudioNode();
  }
  createBufferSource() {
    return new MockAudioNode();
  }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  resume() {
    return Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// 1. PROCEDURAL DARK SYNTHWAVE OST
// ---------------------------------------------------------------------------
console.log('1. Testing Procedural Dark Synthwave OST (SynthMusic.js):');
{
  const mockCtx = new MockAudioContext();
  const synthMusic = new SynthMusic({ ctx: mockCtx });
  assert.equal(synthMusic.bpm, 130, 'Default constructor maintains backwards-compatible 130 BPM');

  // Verify all 3 distinct tracks
  assert.ok(TRACK_CONFIGS[MUSIC_TRACKS.OVERCLOCK_PULSE], 'OVERCLOCK_PULSE track exists');
  assert.ok(TRACK_CONFIGS[MUSIC_TRACKS.CYBER_PURGE], 'CYBER_PURGE track exists');
  assert.ok(TRACK_CONFIGS[MUSIC_TRACKS.KERNEL_BREACH], 'KERNEL_BREACH track exists');

  // Track 1: OVERCLOCK_PULSE
  synthMusic.setTrack(MUSIC_TRACKS.OVERCLOCK_PULSE);
  assert.equal(synthMusic.bpm, 145, 'OVERCLOCK_PULSE BPM is 145');
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.OVERCLOCK_PULSE, 'Current track is OVERCLOCK_PULSE');
  assert(Math.abs(synthMusic.stepDuration - 60 / (145 * 4)) < 0.0001, 'Step duration matches 145 BPM');
  assert.equal(TRACK_CONFIGS[MUSIC_TRACKS.OVERCLOCK_PULSE].bass.length, 32, '32-step bass sequence');
  assert.equal(TRACK_CONFIGS[MUSIC_TRACKS.OVERCLOCK_PULSE].lead.length, 32, '32-step lead sequence');

  // Track 2: CYBER_PURGE (C# Phrygian, 158 BPM)
  synthMusic.setTrack(MUSIC_TRACKS.CYBER_PURGE);
  assert.equal(synthMusic.bpm, 158, 'CYBER_PURGE BPM is 158');
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.CYBER_PURGE, 'Current track is CYBER_PURGE');
  assert(Math.abs(synthMusic.stepDuration - 60 / (158 * 4)) < 0.0001, 'Step duration matches 158 BPM');
  assert.equal(TRACK_CONFIGS[MUSIC_TRACKS.CYBER_PURGE].mode, 'CSHARP_PHRYGIAN', 'CYBER_PURGE uses C# Phrygian mode');

  // Track 3: KERNEL_BREACH (Relentless Breakbeat, 165 BPM)
  synthMusic.setTrack(MUSIC_TRACKS.KERNEL_BREACH);
  assert.equal(synthMusic.bpm, 165, 'KERNEL_BREACH BPM is 165');
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.KERNEL_BREACH, 'Current track is KERNEL_BREACH');
  assert(Math.abs(synthMusic.stepDuration - 60 / (165 * 4)) < 0.0001, 'Step duration matches 165 BPM');

  // Dynamic wave rotation:
  // Wave 1 -> OVERCLOCK_PULSE
  synthMusic.setTrackForWave(1);
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.OVERCLOCK_PULSE, 'Wave 1 rotates to OVERCLOCK_PULSE');

  // Wave 2 -> CYBER_PURGE
  synthMusic.setTrackForWave(2);
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.CYBER_PURGE, 'Wave 2 rotates to CYBER_PURGE');

  // Wave 5 (Boss) -> KERNEL_BREACH
  synthMusic.setTrackForWave(5);
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.KERNEL_BREACH, 'Boss Wave 5 rotates to KERNEL_BREACH');

  // Wave 10 (Major Boss) -> KERNEL_BREACH
  synthMusic.setTrackForWave(10);
  assert.equal(synthMusic.currentTrack, MUSIC_TRACKS.KERNEL_BREACH, 'Major Boss Wave 10 rotates to KERNEL_BREACH');

  // Node initialization and scheduler execution
  synthMusic.init();
  assert.ok(synthMusic.masterGain, 'Master gain initialized');
  assert.ok(synthMusic.noiseBuffer, 'Noise buffer generated');

  // Step scheduling creates zero errors
  synthMusic.setIntensity(MUSIC_INTENSITY.COMBAT);
  synthMusic._scheduleStep(0, 0.1);
  synthMusic._scheduleStep(2, 0.2); // open hat
  synthMusic._scheduleStep(4, 0.3); // snare

  console.log('  [PASS] Procedural darksynth OST tracks, tempo, and wave rotation verified');
}

// ---------------------------------------------------------------------------
// 2. DECOUPLE AIMBOT FROM MOVEMENT VELOCITY & CLOSET ENEMY SELECTION
// ---------------------------------------------------------------------------
console.log('\n2. Testing Aimbot Decoupling and Closest Enemy Acquisition (AimbotCheat.js & Player.js):');
{
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);
  const aimbot = new AimbotCheat();
  aimbot.enabled = true;

  // Add two enemies:
  // Enemy 1: physically closest at (50, 50) -> distance squared 5000
  // Enemy 2: farther away at (200, 0) -> distance squared 40000, but perfectly aligned with crosshair angle (0)
  const enemyClose = new Enemy(50, 50, ENEMY_ARCHETYPES.BIT_SCANNER);
  const enemyFar = new Enemy(200, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemyClose);
  spatialGrid.insert(enemyFar);

  // Player moving up-right (WASD), crosshair aiming directly at enemyFar (angle 0)
  const moveDir = new Vec2(1, 0).normalize();
  const rawAimAngle = 0.0; // pointing right at enemyFar

  const modifiedAngle = aimbot.onAimInput(rawAimAngle, new Vec2(0, 1), {
    player,
    spatialGrid,
    enemies: [enemyFar, enemyClose],
    dt: 0.016,
    weapon: { speed: 1200 },
    raycaster: null,
    wallSegments: [],
    hasWallhack: true,
  });

  // Closest enemy is at (50, 50), which is at angle Math.PI / 4 (~0.785)
  // Aimbot must prioritize the closest enemy over the one aligned with the crosshair!
  const expectedAngle = Math.atan2(50, 50);
  assert(Math.abs(modifiedAngle - expectedAngle) < 0.01, 'Aimbot prioritized physically closest enemy over crosshair angle');

  // Aimbot must NOT touch player velocity or max speed
  assert.equal(player.vx, 0, 'Aimbot did not alter player.vx');
  assert.equal(player.vy, 0, 'Aimbot did not alter player.vy');

  // Aimbot update lifecycle is a no-op for kinematics
  aimbot.update(0.016, { player });
  assert.equal(player.vx, 0, 'aimbot.update() did not alter player.vx');

  // Player advances with WASD moveDir: full acceleration occurs regardless of aimbot lock
  for (let tick = 0; tick < 30; tick++) {
    player.update(0.016, moveDir, modifiedAngle);
  }
  assert(player.vx > 100, 'Player accelerates normally under WASD input during aimbot lock');
  assert.equal(player.vy, 0, 'Player maintains pure horizontal velocity vector');

  // Tactile weapon recoil applies impulse along firing axis without zeroing strafe inertia
  const vxBeforeRecoil = player.vx;
  player.applyRecoil(0.2, 0); // Firing at angle 0 (rightwards)
  assert(player.recoilKickOffset > 0, 'Recoil visual offset applied');
  assert(player.vx < vxBeforeRecoil, 'Recoil impulse pushed backwards along firing axis');
  assert(player.vx > 50, 'Strafing velocity preserved; strafe inertia was NOT zeroed out');

  console.log('  [PASS] Aimbot closest-enemy targeting and movement decoupling verified');
}

// ---------------------------------------------------------------------------
// 3. ROOTKIT.SYS: TIER 0 KERNEL EMP SCREEN PURGE
// ---------------------------------------------------------------------------
console.log('\n3. Testing Rootkit.sys Tier 0 Kernel Exploit (RootkitCheat.js, CheatManager.js):');
{
  const cheatManager = new CheatManager();
  cheatManager.addOrUpgradeCheat('rootkit');
  const rootkit = cheatManager.getCheat('rootkit');

  assert.ok(rootkit, 'Rootkit registered in CheatManager');
  assert.equal(rootkit.tier, 0, 'Rootkit is Tier 0 Ring exploit');

  // Mock game dependencies
  const player = new Player(0, 0);
  player.iFramesTimer = 0;

  const enemy1 = new Enemy(100, 100, ENEMY_ARCHETYPES.BIT_SCANNER);
  const enemy2 = new Enemy(300, 200, ENEMY_ARCHETYPES.SENTINEL);
  const enemies = [enemy1, enemy2];

  const purgedProjectiles = [];
  const projectilePool = {
    forEachActive: (fn) => {
      // Create mock projectiles
      const pHostile = { isHostile: true, active: true };
      const pPlayer = { isHostile: false, active: true };
      fn(pHostile);
      fn(pPlayer);
    },
    release: (proj) => {
      purgedProjectiles.push(proj);
    },
  };

  const camera = {
    addTrauma: (amt) => {
      camera.trauma = amt;
    },
  };

  const particleSystem = {
    emitted: [],
    emitRing: (x, y, count, color, speed) => {
      particleSystem.emitted.push({ x, y, count, color, speed });
    },
  };

  const soundBank = {
    played: [],
    play: (id) => soundBank.played.push(id),
  };

  // Trigger Rootkit EMP Screen Purge
  const triggered = rootkit.trigger({
    player,
    enemies,
    projectilePool,
    camera,
    particleSystem,
    soundBank,
  });

  assert.equal(triggered, true, 'Rootkit triggered successfully');
  assert(rootkit.cooldownTimer > 0, 'Cooldown initiated after trigger');

  // Verify EMP Screen Purge effects:
  // 1. Hostile projectiles obliterated
  assert.equal(purgedProjectiles.length, 1, 'Hostile projectiles purged from arena');
  assert.equal(purgedProjectiles[0].isHostile, true, 'Purged projectile was hostile');

  // 2. All enemies took Tier 0 shockwave damage (300 damage at level 1)
  assert(enemy1.health < enemy1.maxHealth, 'Enemy 1 damaged by EMP shockwave');
  assert(enemy2.health < enemy2.maxHealth, 'Enemy 2 damaged by EMP shockwave');

  // 3. Player granted invulnerability frames
  assert(player.iFramesTimer >= 2.0, 'Player received invulnerability frames');

  // 4. Camera trauma and FX triggered
  assert(camera.trauma > 0, 'Camera trauma triggered');
  assert(particleSystem.emitted.length > 0, 'EMP shockwave particles emitted');

  console.log('  [PASS] Rootkit EMP screen purge, projectile obliteration, damage & i-frames verified');
}

console.log('\n=== ALL AUDIO, AIMBOT & ROOTKIT TESTS PASSED! ===\n');
