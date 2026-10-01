/**
 * Ring Zero - Audio Pacing, Aimbot Decoupling & Lagswitch Verification Test
 * Verifies:
 * 1. Procedural Dark Synthwave OST (140-165 BPM, D Minor, C# Phrygian, tracks rotation)
 * 2. Complete decoupling of Aimbot from player velocity and strafing inertia
 * 3. Repaired Lagswitch temporal freeze: enemy dt=0, stutter ghost afterimages,
 *    hostile projectile freeze, wave spawn timer pause, and unfreeze catchup
 */

import { strict as assert } from 'assert';
import { SynthMusic, MUSIC_INTENSITY, MUSIC_TRACKS, TRACK_CONFIGS } from '../src/audio/SynthMusic.js';
import { AimbotCheat } from '../src/cheats/AimbotCheat.js';
import { LagswitchCheat } from '../src/cheats/LagswitchCheat.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Projectile } from '../src/entities/Projectile.js';
import { WaveManager, WAVE_STATE } from '../src/systems/WaveManager.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { Vec2 } from '../src/core/VectorMath.js';
import { COLOR, COLLISION_LAYER } from '../src/core/Constants.js';

console.log('=== AUDIO PACING, AIMBOT DECOUPLING & LAGSWITCH TEST ===\n');

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
// 2. DECOUPLE AIMBOT FROM MOVEMENT VELOCITY
// ---------------------------------------------------------------------------
console.log('\n2. Testing Aimbot Decoupling from Player Velocity (AimbotCheat.js & Player.js):');
{
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);
  const aimbot = new AimbotCheat();
  aimbot.enabled = true;

  // Add enemy at (200, 0)
  const enemy = new Enemy(200, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemy);

  // Player moving up-right (WASD)
  const moveDir = new Vec2(1, 0).normalize();
  const rawAimAngle = 0.3; // crosshair slightly offset from enemy at angle 0

  const modifiedAngle = aimbot.onAimInput(rawAimAngle, new Vec2(0, 1), {
    player,
    spatialGrid,
    enemies: [enemy],
    dt: 0.016,
    weapon: { speed: 1200 },
    raycaster: null,
    wallSegments: [],
    hasWallhack: true,
  });

  // Aimbot snaps aimAngle toward enemy at (200, 0) -> angle ~0
  assert(Math.abs(modifiedAngle) < 0.1, 'Aimbot successfully acquired and snapped aimAngle to enemy');

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

  console.log('  [PASS] Aimbot completely decoupled from player velocity & strafing inertia');
}

// ---------------------------------------------------------------------------
// 3. REPAIRED LAGSWITCH TEMPORAL FREEZE
// ---------------------------------------------------------------------------
console.log('\n3. Testing Repaired Lagswitch Temporal Freeze (LagswitchCheat.js, Enemy.js, Projectile.js, WaveManager.js):');
{
  const cheatManager = new CheatManager();
  cheatManager.addOrUpgradeCheat('lagswitch');
  const lagswitch = cheatManager.getCheat('lagswitch');

  assert.ok(lagswitch, 'Lagswitch registered in CheatManager');
  assert.equal(typeof lagswitch.active, 'boolean', 'Lagswitch supports .active getter');

  // Trigger lagswitch
  const triggered = lagswitch.trigger();
  assert.equal(triggered, true, 'Lagswitch activated successfully');
  assert.equal(lagswitch.active, true, 'lagswitch.active is true');
  assert.equal(cheatManager.isActive('lagswitch'), true, 'cheatManager.isActive("lagswitch") is true');
  assert.equal(lagswitch.shouldFreezeHostiles(), true, 'shouldFreezeHostiles() returns true');
  assert.equal(lagswitch.shouldFreezeWorld(), true, 'shouldFreezeWorld() returns true');

  // Enemy freeze & ghost afterimage trail verification
  const player = new Player(0, 0);
  const enemy = new Enemy(150, 100, ENEMY_ARCHETYPES.BIT_SCANNER);
  const startX = enemy.x;
  const startY = enemy.y;

  // Update enemy AI during freeze
  enemy.updateAI(0.016, player, null, null, cheatManager);
  assert.equal(enemy.x, startX, 'Enemy X position completely frozen');
  assert.equal(enemy.y, startY, 'Enemy Y position completely frozen');
  assert.equal(enemy.isLagswitchFrozen, true, 'enemy.isLagswitchFrozen is set to true');

  // Verify ghost afterimage slots are populated
  const activeGhosts = enemy._ghostTrails.filter((g) => g.alpha > 0);
  assert(activeGhosts.length > 0, 'Stutter ghost afterimages recorded for frozen hostile');

  // Direct enemy.update() also obeys lagswitch
  enemy.update(0.016, cheatManager);
  assert.equal(enemy.x, startX, 'Enemy position not advanced in enemy.update()');

  // Projectile freeze verification
  const enemyProj = new Projectile();
  enemyProj.spawn({
    x: 100,
    y: 100,
    angle: 0,
    speed: 500,
    layer: COLLISION_LAYER.PROJECTILE_ENEMY,
  });
  assert.equal(enemyProj.isHostile, true, 'Enemy projectile marked as hostile');

  const pStartX = enemyProj.x;
  enemyProj.update(0.016, cheatManager);
  assert.equal(enemyProj.x, pStartX, 'Hostile projectile position frozen in mid-air');
  assert.equal(enemyProj.lifetime, 0, 'Hostile projectile lifetime frozen');

  // Player projectile ticks normally
  const playerProj = new Projectile();
  playerProj.spawn({
    x: 0,
    y: 0,
    angle: 0,
    speed: 1000,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
  });
  playerProj.update(0.016, cheatManager);
  assert(playerProj.x > 0, 'Player projectile moves at full speed during lagswitch freeze');

  // WaveManager spawn timer pause verification
  let spawnedCount = 0;
  const waveManager = new WaveManager({
    onSpawnEnemy: () => spawnedCount++,
  });
  waveManager.state = WAVE_STATE.COMBAT;
  waveManager.spawnTimer = 0.8;

  // When frozen, waveManager.update must pause
  waveManager.update(0.016, player, 1, true);
  assert.equal(waveManager.spawnTimer, 0.8, 'WaveManager spawnTimer paused during lagswitch freeze');

  // Unfreeze catchup simulation
  lagswitch.isActive = false;
  assert.equal(cheatManager.isActive('lagswitch'), false, 'Lagswitch deactivated');

  // Unfreezing enemy updates and clears freeze flag
  enemy.updateAI(0.016, player, null, null, cheatManager);
  assert.equal(enemy.isLagswitchFrozen, false, 'enemy.isLagswitchFrozen cleared upon unfreezing');

  console.log('  [PASS] Lagswitch execution, enemy freeze, ghost afterimages, and projectile freeze verified');
}

console.log('\n=== ALL AUDIO, AIMBOT & LAGSWITCH TESTS PASSED! ===\n');
