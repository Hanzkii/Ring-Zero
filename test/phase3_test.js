/**
 * Ring Zero - Phase 3 Verification Test Suite
 * Automated tests for exploit interceptors, aim snapping, double-tap, anti-aim, backtrack, and draft generator.
 */

import { CheatManager } from '../src/systems/CheatManager.js';
import { CHEAT_REGISTRY, RING_TIER } from '../src/cheats/CheatDefinition.js';
import { AimbotCheat } from '../src/cheats/AimbotCheat.js';
import { DoubleTapCheat } from '../src/cheats/DoubleTapCheat.js';
import { SilentAimCheat } from '../src/cheats/SilentAimCheat.js';
import { SpinbotCheat } from '../src/cheats/SpinbotCheat.js';
import { BacktrackCheat } from '../src/cheats/BacktrackCheat.js';
import { WallhackCheat } from '../src/cheats/WallhackCheat.js';
import { Player } from '../src/entities/Player.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Projectile } from '../src/entities/Projectile.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
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

console.log('=== RUNNING PHASE 3 AUTOMATED VERIFICATION ===\n');

// 1. CheatManager Lifecycle & Draft Options
console.log('1. Testing CheatManager Lifecycle:');
{
  const manager = new CheatManager();
  manager.clearanceRing = RING_TIER.RING_3;

  const aimbot = manager.addOrUpgradeCheat('aimbot');
  assert(aimbot instanceof AimbotCheat, 'Successfully installed AimbotCheat');
  assert(aimbot.level === 1, 'Initial cheat rank is 1');

  // Upgrade
  manager.addOrUpgradeCheat('aimbot');
  assert(aimbot.level === 2, 'Upgraded AimbotCheat to rank 2');

  // Draft options generation
  const options = manager.generateDraftOptions(3);
  assert(options.length <= 3 && options.length > 0, 'Generated up to 3 randomized draft cards');

  // Check if aimbot in options is marked as upgrade
  const aimbotCard = options.find((opt) => opt.def.id === 'aimbot');
  if (aimbotCard) {
    assert(aimbotCard.isUpgrade === true, 'Existing cheat in draft options is flagged as upgrade');
    assert(aimbotCard.currentLevel === 2, 'Existing cheat reflects current level 2');
  } else {
    assert(true, 'Draft options randomized without aimbot');
  }
}

// 2. Aimbot.dll Snapping & Predictive Leading
console.log('\n2. Testing Aimbot.dll Snapping:');
{
  const aimbot = new AimbotCheat();
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);

  // Place enemy at (200, 50) moving upward
  const enemy = new Enemy(200, 50, ENEMY_ARCHETYPES.BIT_SCANNER);
  enemy.vx = 0;
  enemy.vy = 100;
  spatialGrid.insert(enemy);

  const rawAimAngle = 0; // Pointing directly along +X
  const aimVec = new Vec2(1, 0);

  const context = {
    player,
    spatialGrid,
    enemies: [enemy],
    dt: 0.05,
    weapon: { speed: 1000 },
  };

  const modifiedAngle = aimbot.onAimInput(rawAimAngle, aimVec, context);
  assert(aimbot.hasTarget === true, 'Aimbot acquired enemy target in FOV');
  assert(modifiedAngle > rawAimAngle, 'Aimbot adjusted aim angle toward target lead position');
  assert(aimbot.targetLeadPos.y > enemy.y, 'Predictive lead accounts for enemy velocity');
}

// 3. DoubleTap.pkg Projectile Multiplexing
console.log('\n3. Testing DoubleTap.pkg Projectile Multiplexing:');
{
  const doubleTap = new DoubleTapCheat();
  assert(doubleTap.level === 1, 'DoubleTap starts at Lv 1 (+1 extra round)');

  const spawnedBullets = [];
  const bulletParams = {
    x: 0,
    y: 0,
    angle: 0,
    speed: 1000,
    damage: 20,
    pierce: 1,
    color: '#00F0FF',
  };

  doubleTap.onWeaponFire(bulletParams, {}, (params) => {
    spawnedBullets.push(params);
  });

  assert(spawnedBullets.length === 2, 'DoubleTap Lv 1 bursts 2 bullets (original + 1 clone)');
  assert(spawnedBullets[1].color === '#FFB000', 'Multiplexed packet round colored amber');

  // Upgrade to Lv 2
  doubleTap.upgrade();
  spawnedBullets.length = 0;
  doubleTap.onWeaponFire(bulletParams, {}, (params) => {
    spawnedBullets.push(params);
  });
  assert(spawnedBullets.length === 3, 'DoubleTap Lv 2 bursts 3 bullets (original + 2 clones)');
}

// 4. SilentAim.vmp Trajectory Curvature
console.log('\n4. Testing SilentAim.vmp Curvature:');
{
  const silentAim = new SilentAimCheat();
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);

  // Place enemy at (100, 30)
  const enemy = new Enemy(100, 30, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemy);

  const expectedAngle = Math.atan2(30, 100);
  const rawAngle = 0; // Crosshair aimed straight forward

  const bulletParams = {
    x: player.x,
    y: player.y,
    angle: rawAngle,
    speed: 1000,
    damage: 25,
  };

  let outputAngle = rawAngle;
  silentAim.onWeaponFire(bulletParams, { player, spatialGrid }, (params) => {
    outputAngle = params.angle;
  });

  assert(
    Math.abs(outputAngle - expectedAngle) < 0.001,
    'SilentAim curved bullet angle directly toward enemy hitbox'
  );
  assert(bulletParams.isCritical === true, 'SilentAim marks curved strike as critical');
}

// 5. Spinbot.asi (Anti-Aim) Evasion
console.log('\n5. Testing Spinbot.asi Desync & Evasion:');
{
  const spinbot = new SpinbotCheat();
  const player = new Player(0, 0);

  // Update rotation
  spinbot.onPlayerUpdate(player, 0.1);
  assert(spinbot.spinAngle > 0, 'Spinbot desync angle advances dynamically');

  // Evasion check over 100 damage events
  let evades = 0;
  for (let i = 0; i < 200; i++) {
    const res = spinbot.onTakeDamage(20, { player });
    if (res.evaded) evades++;
  }

  assert(evades > 20 && evades < 100, `Spinbot evaded ${evades}/200 incoming hits (~25% baseline rate)`);
}

// 6. Wallhack.lua (ESP) Piercing Upgrade
console.log('\n6. Testing Wallhack.lua Piercing:');
{
  const wallhack = new WallhackCheat();
  wallhack.level = 2; // Lv 2 grants +1 pierce

  const bulletParams = {
    x: 0,
    y: 0,
    angle: 0,
    pierce: 1,
  };

  wallhack.onWeaponFire(bulletParams, {}, (params) => {});
  assert(bulletParams.pierce === 2, 'Wallhack Lv 2 grants +1 armor piercing');
}

// 7. Backtrack.sys Spacetime History & Rewind
console.log('\n7. Testing Backtrack.sys Spacetime History:');
{
  const backtrack = new BacktrackCheat();
  const enemy = new Enemy(0, 0, ENEMY_ARCHETYPES.BIT_SCANNER);

  // Move enemy along +X over 20 frames
  for (let i = 0; i < 20; i++) {
    enemy.x = i * 10;
    backtrack.onEnemyUpdate(enemy, 0.016);
  }

  assert(enemy.x === 190, 'Enemy is currently at X=190');

  // Shoot at historical position X=50
  const proj = new Projectile();
  proj.spawn({
    x: 50,
    y: 0,
    angle: 0,
    speed: 1000,
    damage: 30,
  });

  const rewound = backtrack.checkGhostCollision(proj, enemy);
  assert(rewound === true, 'Backtrack registered hit on historical ghost coordinate');
  assert(enemy.x === 50, 'Enemy spacetime state was successfully rewound back to X=50');
}

console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 EXPLOIT SYSTEMS VERIFIED SUCCESSFULLY!');
}
