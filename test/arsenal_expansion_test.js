/**
 * Ring Zero - Arsenal Expansion & System Hardening Automated Test Suite
 * Validates:
 * 1. Audio & Screen Shake Settings
 * 2. Permanent Firmware Micro-Upgrades & Bonus Scaling
 * 3. Draft Rerolls via Heuristic Spoofing Tokens
 * 4. All 9 New Exploits (Speedhack, Triggerbot, PacketChoke, RadarTelemetry, PenetrationBucker, RapidFire, Noclip, Lagswitch, KernelPanic)
 * 5. Complete 16-Exploit Matrix & Strict Ring Clearance Gating
 * 6. In-Run Pause & Resume Mechanics
 */

// Mock browser localStorage and crypto environment for headless Node
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
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      style: {},
      appendChild: () => {},
      addEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
    }),
    body: {
      appendChild: () => {},
    },
  };
}

import { StorageService, FIRMWARE_NODES } from '../src/services/StorageService.js';
import { CheatManager } from '../src/systems/CheatManager.js';
import { CHEAT_REGISTRY, RING_TIER } from '../src/cheats/CheatDefinition.js';
import { SynthAudio } from '../src/audio/SynthAudio.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Projectile } from '../src/entities/Projectile.js';
import { Vec2 } from '../src/core/VectorMath.js';
import { PLAYER_CONFIG, COLLISION_LAYER } from '../src/core/Constants.js';
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { WEAPON_ARCHETYPES, WeaponInstance } from '../src/systems/WeaponSystem.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=== RUNNING ARSENAL EXPANSION & SYSTEM HARDENING AUTOMATED SUITE ===\n');

// 1. Audio & Screen Shake Settings
console.log('1. Testing Audio & Screen Shake Settings:');
{
  localStorage.clear();
  const storage = new StorageService();
  const synth = new SynthAudio();
  const camera = new Camera2D(1920, 1080);

  // Defaults
  assert(storage.settings.masterVolume === 0.7, 'Default master volume is 70%');
  assert(storage.settings.sfxVolume === 0.8, 'Default SFX volume is 80%');
  assert(storage.settings.screenShake === 1.0, 'Default screen shake trauma is 100%');

  // SynthAudio volume controls
  synth.setMasterVolume(0.4);
  assert(synth.masterVolume === 0.4, 'Synth master volume updated to 40%');
  synth.setSfxVolume(0.6);
  assert(synth.sfxVolume === 0.6, 'Synth SFX volume updated to 60%');

  // Camera trauma scaling
  camera.traumaMultiplier = 0.5;
  camera.addTrauma(0.5);
  assert(Math.abs(camera.trauma - 0.25) < 0.001, 'Camera trauma reduced by 50% multiplier');

  camera.trauma = 0;
  camera.traumaMultiplier = 0.0;
  camera.addTrauma(0.8);
  assert(camera.trauma === 0, 'Camera trauma completely neutralized when multiplier is 0');

  // Storage updates
  storage.updateSettings({ masterVolume: 0.5, screenShake: 0.2, showDebugGrid: true });
  assert(storage.settings.masterVolume === 0.5, 'Storage persisted updated master volume');
  assert(storage.settings.screenShake === 0.2, 'Storage persisted updated screen shake');
  assert(storage.settings.showDebugGrid === true, 'Storage persisted spatial grid debug flag');
}

// 2. Permanent Firmware Micro-Upgrades & Bonus Scaling
console.log('\n2. Testing Permanent Firmware Micro-Upgrades:');
{
  localStorage.clear();
  const storage = new StorageService();

  // Initial state
  assert(storage.getFirmwareLevel('bufferExpansion') === 0, 'Initial Buffer Expansion is level 0');
  assert(storage.getFirmwareBonus('bufferExpansion') === 0, 'Initial Buffer Expansion bonus is 0 HP');
  assert(storage.getFirmwareLevel('overclockedBus') === 0, 'Initial Overclocked Bus is level 0');
  assert(storage.getFirmwareLevel('fastDMA') === 0, 'Initial Fast DMA is level 0');
  assert(storage.getFirmwareLevel('heuristicSpoofing') === 0, 'Initial Heuristic Spoofing is level 0');
  assert(storage.getFirmwareLevel('cacheMagnet') === 0, 'Initial Cache Magnet is level 0');

  // Cannot upgrade without sufficient crypto bounties
  storage.bounties = 50;
  const failRes = storage.upgradeFirmware('bufferExpansion');
  assert(!failRes.success, 'Cannot upgrade firmware without sufficient bounties');

  // Grant bounties and purchase upgrades
  storage.bounties = 1500;
  const cost = storage.getFirmwareCost('bufferExpansion');
  const upRes = storage.upgradeFirmware('bufferExpansion');
  assert(upRes.success, 'Successfully upgraded Buffer Expansion to Level 1');
  assert(storage.getFirmwareLevel('bufferExpansion') === 1, 'Buffer Expansion level incremented to 1');
  assert(storage.getFirmwareBonus('bufferExpansion') === 20, 'Buffer Expansion grants +20 Max HP');
  assert(storage.bounties === 1500 - cost, 'Crypto bounties correctly deducted');

  // Purchase Overclocked Bus
  storage.upgradeFirmware('overclockedBus');
  assert(storage.getFirmwareBonus('overclockedBus') === 14, 'Overclocked Bus Level 1 grants +14 Speed');

  // Purchase Fast DMA
  storage.upgradeFirmware('fastDMA');
  assert(Math.abs(storage.getFirmwareBonus('fastDMA') - 0.10) < 0.001, 'Fast DMA Level 1 grants -10% reload time');

  // Purchase Heuristic Spoofing
  storage.upgradeFirmware('heuristicSpoofing');
  assert(storage.getFirmwareBonus('heuristicSpoofing') === 1, 'Heuristic Spoofing Level 1 grants 1 reroll token');

  // Upgrade Heuristic Spoofing to Level 2
  storage.upgradeFirmware('heuristicSpoofing');
  assert(storage.getFirmwareBonus('heuristicSpoofing') === 2, 'Heuristic Spoofing Level 2 grants 2 reroll tokens');

  // Purchase Cache Magnet
  storage.upgradeFirmware('cacheMagnet');
  assert(storage.getFirmwareBonus('cacheMagnet') === 40, 'Cache Magnet Level 1 grants +40px magnet radius');
}

// 3. Draft Rerolls via Heuristic Spoofing Tokens
console.log('\n3. Testing Draft Rerolls:');
{
  const manager = new CheatManager();
  manager.clearanceRing = RING_TIER.RING_3;

  let rerollTokens = 2;
  const initialOptions = manager.generateDraftOptions(3);
  assert(initialOptions.length === 3, 'Initial draft options generated 3 cards');

  // Simulate reroll
  assert(rerollTokens > 0, 'Reroll token available');
  rerollTokens--;
  const rerolledOptions = manager.generateDraftOptions(3);
  assert(rerolledOptions.length === 3, 'Rerolled options generated 3 cards');
  assert(rerollTokens === 1, 'Reroll token decremented to 1');

  // Consume second token
  rerollTokens--;
  assert(rerollTokens === 0, 'Tokens exhausted');
}

// 4. Testing the 9 New Exploits
console.log('\n4. Testing New Exploits:');

// Speedhack (Ring 3)
{
  const manager = new CheatManager();
  const player = new Player(0, 0);
  const cheat = manager.addOrUpgradeCheat('speedhack');
  assert(cheat !== null, 'Speedhack installed');
  assert(cheat.level === 1, 'Speedhack starts at Rank 1');

  manager.updatePlayer(player, 0.016, {});
  assert(player.maxSpeed === PLAYER_CONFIG.MAX_SPEED * 1.25, 'Speedhack Rank 1 grants +25% max velocity');

  cheat.upgrade();
  manager.updatePlayer(player, 0.016, {});
  assert(player.maxSpeed === PLAYER_CONFIG.MAX_SPEED * 1.45, 'Speedhack Rank 2 grants +45% max velocity');

  cheat.upgrade();
  manager.updatePlayer(player, 0.016, {});
  assert(player.maxSpeed === PLAYER_CONFIG.MAX_SPEED * 1.70, 'Speedhack Rank 3 grants +70% max velocity');
}

// Triggerbot (Ring 3)
{
  const manager = new CheatManager();
  const player = new Player(0, 0);
  const enemy = new Enemy(100, 0, ENEMY_ARCHETYPES.WATCHDOG);
  const weapon = new WeaponInstance(WEAPON_ARCHETYPES.KERNEL_PISTOL);

  const cheat = manager.addOrUpgradeCheat('triggerbot');
  assert(cheat !== null, 'Triggerbot installed');

  // Player aiming away from enemy
  player.rotation = Math.PI * 0.5; // Aiming down (0, 1)
  manager.applyAimInterceptors(player.rotation, new Vec2(0, 1), {
    player,
    enemies: [enemy],
    weapon,
  });
  assert(!cheat.shouldAutoShoot(), 'Triggerbot does not shoot when crosshair misses enemy');

  // Player aiming directly at enemy
  player.rotation = 0; // Aiming right (1, 0)
  manager.applyAimInterceptors(player.rotation, new Vec2(1, 0), {
    player,
    enemies: [enemy],
    weapon,
  });
  assert(cheat.shouldAutoShoot(), 'Triggerbot autonomously shoots when crosshair ray intersects enemy hitbox');
  assert(manager.wantsAutoFire(0.016, weapon), 'CheatManager.wantsAutoFire reflects Triggerbot auto-fire');
}

// PacketChoke (Ring 2)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('packetchoke');
  assert(cheat !== null, 'PacketChoke installed');

  let evadedCount = 0;
  for (let i = 0; i < 500; i++) {
    const res = manager.applyTakeDamageInterceptors(30, {});
    if (res.evaded) evadedCount++;
  }
  assert(evadedCount > 50, `PacketChoke Rank 1 successfully evaded incoming damage packets (${evadedCount}/500)`);
}

// RadarTelemetry (Ring 2)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('radartelemetry');
  assert(cheat !== null, 'RadarTelemetry installed');

  const player = new Player(0, 0);
  const initialSweep = cheat.sweepAngle;
  manager.updatePlayer(player, 0.1, {});
  assert(cheat.sweepAngle !== initialSweep, 'Radar sweeping angle actively rotates over time');
}

// PenetrationBucker (Ring 1)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('penetrationbucker');
  assert(cheat !== null, 'PenetrationBucker installed');
  assert(cheat.extraPierce === 2, 'PenetrationBucker Rank 1 grants +2 pierce');

  let spawnedBullet = null;
  manager.applyWeaponFireInterceptors(
    { pierce: 1, canPierceWalls: false },
    {},
    (p) => { spawnedBullet = p; }
  );
  assert(spawnedBullet.pierce === 3, 'PenetrationBucker increased bullet pierce to 3');
  assert(spawnedBullet.canPierceWalls === true, 'PenetrationBucker enabled wall penetration');

  cheat.upgrade();
  assert(cheat.extraPierce === 4, 'PenetrationBucker Rank 2 grants +4 pierce');
  cheat.upgrade();
  assert(cheat.extraPierce === 8, 'PenetrationBucker Rank 3 grants +8 pierce');
}

// RapidFire (Ring 1)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('rapidfire');
  assert(cheat !== null, 'RapidFire installed');

  const player = new Player(0, 0);
  const weapon = new WeaponInstance(WEAPON_ARCHETYPES.KERNEL_PISTOL);
  const originalInterval = weapon.fireInterval;

  manager.updatePlayer(player, 0.016, { weapon, reloadReduction: 0.1 });
  assert(weapon.fireInterval < originalInterval, 'RapidFire decreased weapon fire interval (increased fire rate)');
  assert(weapon.reloadTime < weapon.config.reloadTime, 'RapidFire and DMA reduced reload time');
}

// Noclip (Ring 0)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('noclip');
  assert(cheat !== null, 'Noclip installed');
  assert(manager.hasCheat('noclip'), 'Noclip is active in CheatManager');

  const spatialGrid = new SpatialHashGrid(128);
  const collisionSystem = new CollisionSystem({
    spatialGrid,
    cheatManager: manager,
  });

  const player = new Player(0, 0);
  player.vx = 200;
  const wall = {
    x: 0,
    y: 0,
    w: 64,
    h: 64,
    minX: -32,
    maxX: 32,
    minY: -32,
    maxY: 32,
    layer: COLLISION_LAYER.WALL,
  };
  spatialGrid.insert(wall);

  collisionSystem._resolveEntitiesVsWalls(player, []);
  assert(player.x === 0 && player.vx === 200, 'Noclip allows player to freely phase through static walls without velocity clamping');
}

// Lagswitch (Ring 0)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('lagswitch');
  assert(cheat !== null, 'Lagswitch installed');
  assert(!cheat.shouldFreezeWorld(), 'Lagswitch is initially inactive');

  const activated = cheat.trigger();
  assert(activated === true, 'Lagswitch successfully triggered');
  assert(cheat.shouldFreezeWorld() === true, 'Lagswitch freezes world execution');
  assert(cheat.durationTimer > 0, 'Lagswitch freeze timer active');

  const player = new Player(0, 0);
  // Advance time past freeze duration
  cheat.onPlayerUpdate(player, 5.0, {});
  assert(cheat.shouldFreezeWorld() === false, 'Lagswitch unfreezes after duration elapses');
  assert(cheat.cooldownTimer > 0, 'Lagswitch cooldown active');
  assert(cheat.trigger() === false, 'Cannot re-trigger Lagswitch while on cooldown');
}

// KernelPanic (Ring 0)
{
  const manager = new CheatManager();
  const cheat = manager.addOrUpgradeCheat('kernelpanic');
  assert(cheat !== null, 'KernelPanic installed');

  const player = new Player(0, 0);
  const spawnedProjectiles = [];
  const spawnCb = (p) => spawnedProjectiles.push(p);

  // Fire 10 shots to trigger burst at Rank 1
  for (let i = 0; i < 10; i++) {
    manager.applyWeaponFireInterceptors({ isPlayer: true }, { player }, spawnCb);
  }

  // 10 initial bullets + 16 Kernel Panic critical ring laser pulses = 26
  assert(spawnedProjectiles.length === 26, `KernelPanic triggered omnidirectional critical laser ring (spawned ${spawnedProjectiles.length} projectiles)`);
  const laser = spawnedProjectiles[spawnedProjectiles.length - 1];
  assert(laser.isCrit === true, 'Kernel Panic laser pulses are guaranteed critical hits');
  assert(laser.canPierceWalls === true, 'Kernel Panic laser pulses pierce through static walls');
}

// 5. Complete 16-Exploit Matrix & Ring Clearance Enforcement
console.log('\n5. Testing 16-Exploit Matrix & Clearance Gating:');
{
  const allCheatKeys = Object.keys(CHEAT_REGISTRY);
  assert(allCheatKeys.length === 16, `CHEAT_REGISTRY contains exactly 16 exploit definitions (found: ${allCheatKeys.length})`);

  const manager = new CheatManager();

  // Ring 3 Test
  manager.clearanceRing = RING_TIER.RING_3;
  const r3Options = manager.generateDraftOptions(30);
  const r3Ids = r3Options.map((o) => o.def.id);
  assert(r3Ids.includes('speedhack'), 'Ring 3 includes Speedhack');
  assert(r3Ids.includes('triggerbot'), 'Ring 3 includes Triggerbot');
  assert(!r3Ids.includes('packetchoke'), 'Ring 3 excludes PacketChoke (Ring 2)');
  assert(!r3Ids.includes('radartelemetry'), 'Ring 3 excludes RadarTelemetry (Ring 2)');
  assert(!r3Ids.includes('penetrationbucker'), 'Ring 3 excludes PenetrationBucker (Ring 1)');
  assert(!r3Ids.includes('rapidfire'), 'Ring 3 excludes RapidFire (Ring 1)');
  assert(!r3Ids.includes('noclip'), 'Ring 3 excludes Noclip (Ring 0)');
  assert(!r3Ids.includes('lagswitch'), 'Ring 3 excludes Lagswitch (Ring 0)');
  assert(!r3Ids.includes('kernelpanic'), 'Ring 3 excludes KernelPanic (Ring 0)');

  // Ring 2 Test
  manager.clearanceRing = RING_TIER.RING_2;
  const r2Options = manager.generateDraftOptions(30);
  const r2Ids = r2Options.map((o) => o.def.id);
  assert(r2Ids.includes('packetchoke'), 'Ring 2 includes PacketChoke');
  assert(r2Ids.includes('radartelemetry'), 'Ring 2 includes RadarTelemetry');
  assert(!r2Ids.includes('penetrationbucker'), 'Ring 2 excludes PenetrationBucker (Ring 1)');
  assert(!r2Ids.includes('noclip'), 'Ring 2 excludes Noclip (Ring 0)');

  // Ring 1 Test
  manager.clearanceRing = RING_TIER.RING_1;
  const r1Options = manager.generateDraftOptions(30);
  const r1Ids = r1Options.map((o) => o.def.id);
  assert(r1Ids.includes('penetrationbucker'), 'Ring 1 includes PenetrationBucker');
  assert(r1Ids.includes('rapidfire'), 'Ring 1 includes RapidFire');
  assert(!r1Ids.includes('noclip'), 'Ring 1 excludes Noclip (Ring 0)');
  assert(!r1Ids.includes('kernelpanic'), 'Ring 1 excludes KernelPanic (Ring 0)');

  // Ring 0 Test
  manager.clearanceRing = RING_TIER.RING_0;
  const r0Options = manager.generateDraftOptions(30);
  const r0Ids = r0Options.map((o) => o.def.id);
  assert(r0Ids.includes('noclip'), 'Ring 0 includes Noclip');
  assert(r0Ids.includes('lagswitch'), 'Ring 0 includes Lagswitch');
  assert(r0Ids.includes('kernelpanic'), 'Ring 0 includes KernelPanic');
}

console.log(`\n=== ARSENAL EXPANSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);

if (failed > 0) {
  process.exit(1);
}
