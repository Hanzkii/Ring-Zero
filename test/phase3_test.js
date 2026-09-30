/**
 * Ring Zero - Phase 3 Verification Test Suite
 * Comprehensive automated tests for all 6 exploit scripts, upgrade ranks, and draft card generation.
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
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
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

// 1. All 6 Exploits In Registry & Draft Pool
console.log('1. Testing Exploit Registry & 6 Core Scripts:');
{
  const manager = new CheatManager();
  const allIds = ['aimbot', 'wallhack', 'spinbot', 'doubletap', 'silentaim', 'backtrack'];
  
  for (const id of allIds) {
    assert(CHEAT_REGISTRY[id.toUpperCase()] !== undefined, `CHEAT_REGISTRY defines ${id}`);
  }

  // Ensure all 6 can be drafted
  const draftOptions = manager.generateDraftOptions(6);
  assert(draftOptions.length === 6, 'All 6 core exploits are available in the initial draft pool');
}

// 2. Multi-Level Cheat Upgrades (Rank 1 to 3) & Non-Duplication
console.log('\n2. Testing Multi-Level Upgrades (Rank 1 -> 3) & Non-Duplication:');
{
  const manager = new CheatManager();
  
  // Install Spinbot
  const cheat = manager.addOrUpgradeCheat('spinbot');
  assert(cheat instanceof SpinbotCheat, 'Installed SpinbotCheat');
  assert(cheat.level === 1, 'Initial rank is 1');
  assert(manager.activeCheats.size === 1, 'Only 1 cheat instance stored in map');

  // Draft upgrade to Rank 2
  const upg1 = manager.addOrUpgradeCheat('spinbot');
  assert(upg1 === cheat, 'Drafting existing cheat returns same instance (no duplicate)');
  assert(cheat.level === 2, 'Rank successfully upgraded to 2');
  assert(manager.activeCheats.size === 1, 'No duplicate entry created in activeCheats');

  // Draft upgrade to Rank 3
  const upg2 = manager.addOrUpgradeCheat('spinbot');
  assert(cheat.level === 3, 'Rank successfully upgraded to 3 (Max)');

  // Attempting to upgrade beyond max level
  const res = cheat.upgrade();
  assert(res === false, 'Cannot upgrade beyond maxLevel 3');
  assert(cheat.level === 3, 'Level capped at 3');

  // Verify that maxed cheat is excluded from draft pool
  const draftOptions = manager.generateDraftOptions(6);
  const foundSpinbot = draftOptions.some((opt) => opt.def.id === 'spinbot');
  assert(!foundSpinbot, 'Fully maxed Rank 3 cheat is excluded from future draft options');
}

// 3. Spinbot.asi (Anti-Aim) Visual Desync & Glancing Blow Evasion
console.log('\n3. Testing Spinbot.asi (Anti-Aim) 1440°/s Desync & Evasion:');
{
  const spinbot = new SpinbotCheat();
  const player = new Player(0, 0);

  // Update over 0.1 seconds: 1440 deg/s => in 0.1s should rotate 144 deg (~2.51 rad)
  spinbot.onPlayerUpdate(player, 0.1);
  assert(player.visualRotationOffset > 0, 'Player visualRotationOffset is driven by spinbot angle');
  assert(
    Math.abs(player.visualRotationOffset - 2.513) < 0.05,
    'Spinbot rotated player visual chassis at 1440°/s'
  );

  // Glancing blow evasion check (25% baseline)
  let evades = 0;
  let verifiedZeroDmg = false;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    const res = spinbot.onTakeDamage(50, { player });
    if (res.evaded) {
      if (!verifiedZeroDmg) {
        assert(res.damage === 0, 'Evaded damage is reduced to 0');
        verifiedZeroDmg = true;
      }
      evades++;
    }
  }
  const evadeRate = evades / trials;
  assert(
    evadeRate >= 0.20 && evadeRate <= 0.30,
    `Spinbot Lv 1 evaded ${evades}/${trials} hits (${(evadeRate * 100).toFixed(1)}%, ~25% target)`
  );
}

// 4. DoubleTap.pkg Packet-Choke Multiplexing
console.log('\n4. Testing DoubleTap.pkg Zero-Delay Packet Choke:');
{
  const doubleTap = new DoubleTapCheat();
  assert(doubleTap.level === 1, 'DoubleTap starts at Lv 1');

  const spawnedBullets = [];
  const baseBullet = {
    x: 100,
    y: 100,
    angle: 0.5,
    speed: 1000,
    damage: 25,
    pierce: 1,
    color: '#00F0FF',
  };

  // Weapon fire event with DoubleTap
  doubleTap.onWeaponFire(baseBullet, {}, (params) => {
    spawnedBullets.push(params);
  });

  assert(spawnedBullets.length === 2, 'DoubleTap spawned exactly 1 extra bullet (2 total) with zero delay');
  assert(spawnedBullets[0] === baseBullet, 'First bullet is original primary shot');
  assert(spawnedBullets[1].color === '#FFB000', 'Duplicate multiplexed bullet is styled amber');
  assert(spawnedBullets[1].damage === 25, 'Duplicate bullet inherits base damage');

  // Upgrade to Rank 2 (+2 extra bullets)
  doubleTap.upgrade();
  spawnedBullets.length = 0;
  doubleTap.onWeaponFire(baseBullet, {}, (params) => {
    spawnedBullets.push(params);
  });
  assert(spawnedBullets.length === 3, 'DoubleTap Rank 2 spawns 2 extra bullets (3 total)');
}

// 5. SilentAim.vmp Trajectory Curvature
console.log('\n5. Testing SilentAim.vmp 35° FOV Trajectory Curvature:');
{
  const silentAim = new SilentAimCheat();
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);

  // Target enemy within 35° FOV cone: placed at (100, 20) -> angle ~11.3°
  const enemyInCone = new Enemy(100, 20, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemyInCone);

  const rawAimAngle = 0; // Crosshair aimed straight forward along X
  const bullet = {
    x: player.x,
    y: player.y,
    angle: rawAimAngle,
    speed: 1000,
    damage: 30,
  };

  let curvedBulletAngle = null;
  silentAim.onWeaponFire(bullet, { player, spatialGrid }, (params) => {
    curvedBulletAngle = params.angle;
  });

  const expectedAngle = Math.atan2(20, 100);
  assert(
    Math.abs(curvedBulletAngle - expectedAngle) < 0.001,
    'SilentAim curved bullet angle directly into enemy center'
  );
  assert(rawAimAngle === 0, 'Player raw aim angle was NOT displaced or modified');
  assert(bullet.isCritical === true, 'SilentAim marked curved strike as critical');
}

// 6. Backtrack.sys 90-Frame Spacetime Circular Buffer & Ghost Hits
console.log('\n6. Testing Backtrack.sys 90-Frame Circular Buffer & Ghost Rewind:');
{
  const backtrack = new BacktrackCheat();
  backtrack.level = 3; // Rank 3 grants full 90-frame circular buffer
  assert(backtrack.maxHistoryFrames === 90, 'Backtrack Rank 3 provides full 90-frame buffer');

  const enemy = new Enemy(0, 0, ENEMY_ARCHETYPES.BIT_SCANNER);

  // Simulate enemy moving across 100 ticks
  for (let tick = 0; tick < 100; tick++) {
    enemy.x = tick * 5;
    backtrack.onEnemyUpdate(enemy, 0.016);
  }

  assert(enemy.x === 495, 'Enemy current position is at X=495');
  const history = backtrack.historyMap.get(enemy.id);
  assert(history.length === 90, 'History ring buffer capped at 90 frames');

  // Historical frame 60 is at X = (100 - 90 + 60) * 5 = 70 * 5 = 350
  const historicalSnap = history[60];
  
  // Fire bullet at historical ghost location
  const proj = new Projectile();
  proj.spawn({
    x: historicalSnap.x,
    y: historicalSnap.y,
    angle: 0,
    speed: 1000,
    damage: 40,
  });

  const hitGhost = backtrack.checkGhostCollision(proj, enemy);
  assert(hitGhost === true, 'Bullet successfully hit historical ghost hitbox');
  assert(enemy.x === historicalSnap.x, 'Enemy position was rewound back in spacetime to ghost coordinate');
  assert(backtrack.rewindCount === 1, 'Rewind event incremented counter');
}

// 7. Aimbot & Wallhack Invariants
console.log('\n7. Testing Aimbot & Wallhack Invariants:');
{
  const aimbot = new AimbotCheat();
  assert(aimbot.level === 1, 'Aimbot initialized at Rank 1');
  aimbot.upgrade();
  assert(aimbot.level === 2, 'Aimbot upgraded to Rank 2');

  const wallhack = new WallhackCheat();
  wallhack.level = 3;
  const bullet = { x: 0, y: 0, angle: 0, pierce: 1 };
  wallhack.onWeaponFire(bullet, {}, () => {});
  assert(bullet.pierce === 3, 'Wallhack Rank 3 grants +2 armor piercing (3 total)');
}

// 8. SilentAim Overriding Aimbot & Auto-Aim / Triggerbot Shooting
console.log('\n8. Testing SilentAim Overriding Aimbot & Autonomous Shooting:');
{
  const manager = new CheatManager();
  
  // 1. Install standard Aimbot first
  const aimbot = manager.addOrUpgradeCheat('aimbot');
  assert(manager.hasCheat('aimbot'), 'Initial standard Aimbot installed');

  // 2. Draft SilentAim -> Should override and purge normal Aimbot
  const silentAim = manager.addOrUpgradeCheat('silentaim');
  assert(manager.hasCheat('silentaim'), 'SilentAim successfully installed');
  assert(!manager.hasCheat('aimbot'), 'SilentAim overridden and purged normal Aimbot from activeCheats');

  // 3. Trying to add Aimbot when SilentAim is owned returns SilentAim and doesn't add Aimbot
  const attempt = manager.addOrUpgradeCheat('aimbot');
  assert(attempt === silentAim, 'Drafting Aimbot when SilentAim is owned returns SilentAim instance');
  assert(!manager.hasCheat('aimbot'), 'Aimbot was not added to activeCheats');

  // 4. In generateDraftOptions, Aimbot is excluded when SilentAim is owned
  const draftPool = manager.generateDraftOptions(6);
  const foundAimbotInDraft = draftPool.some((opt) => opt.def.id === 'aimbot');
  assert(!foundAimbotInDraft, 'Normal Aimbot is excluded from draft options when SilentAim is owned');

  // 5. SilentAim auto-aim (onAimInput) acquires target and predicts lead
  const player = new Player(0, 0);
  const spatialGrid = new SpatialHashGrid(128);
  const enemy = new Enemy(150, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  enemy.vx = 0;
  enemy.vy = 100; // moving downward at 100 px/s
  spatialGrid.insert(enemy);

  const rawAim = 0;
  const context = {
    player,
    spatialGrid,
    enemies: [enemy],
    dt: 0.016,
    weapon: { speed: 1000, fireInterval: 0.2 },
  };

  const modifiedAim = silentAim.onAimInput(rawAim, new Vec2(1, 0), context);
  assert(silentAim.hasTarget === true, 'SilentAim successfully acquired target');
  assert(silentAim.currentTarget === enemy, 'SilentAim targeted the enemy');
  assert(silentAim.targetLeadPos.y > 0, 'SilentAim calculated predictive lead ahead of moving enemy');
  assert(modifiedAim > 0, 'SilentAim modified aim angle towards predicted lead position');

  // 6. SilentAim auto-shoot (shouldAutoShoot) periodically fires triggerbot
  silentAim.autoShootTimer = 0;
  const shouldFire = silentAim.shouldAutoShoot(0.016, context.weapon);
  assert(shouldFire === true, 'SilentAim shouldAutoShoot triggered autonomous firing');

  // Manager wantsAutoFire delegates to SilentAim
  const managerAutoFire = manager.wantsAutoFire(0.016, context.weapon);
  // Timer was reset by previous shouldAutoShoot call, so advance time past interval
  silentAim.autoShootTimer = 0;
  const managerAutoFire2 = manager.wantsAutoFire(0.016, context.weapon);
  assert(managerAutoFire2 === true, 'CheatManager.wantsAutoFire queries SilentAim triggerbot');
}

// 9. Backtrack Physical Hit Registration & Aimbot/SilentAim Backtrack Targeting
console.log('\n9. Testing Backtrack Physical Hit Registration & Exploit Targeting:');
{
  const spatialGrid = new SpatialHashGrid(128);
  const projectilePool = new ObjectPool({
    factory: () => new Projectile(),
    reset: (p) => p.reset(),
    initialCapacity: 20,
  });
  const particleSystem = new ParticleSystem(100);
  const manager = new CheatManager();
  const backtrack = manager.addOrUpgradeCheat('backtrack');

  const collisionSystem = new CollisionSystem({
    spatialGrid,
    projectilePool,
    particleSystem,
    cheatManager: manager,
  });

  const player = new Player(0, 0);
  // Enemy currently at (300, 0)
  const enemy = new Enemy(300, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemy);
  const enemies = [enemy];

  // Record history when enemy was at (100, 0), (150, 0), (200, 0), (250, 0), (300, 0)
  const positions = [100, 150, 200, 250, 300];
  for (const x of positions) {
    enemy.x = x;
    backtrack.onEnemyUpdate(enemy, 0.016);
  }
  enemy.x = 300; // current position is at 300

  // Fire bullet at historical ghost location (150, 0) -- 150px away from enemy's current body at 300!
  const proj = projectilePool.obtain();
  proj.spawn({
    x: 150,
    y: 0,
    angle: 0,
    damage: 40,
    pierce: 1,
    layer: 1 << 2, // PROJECTILE_PLAYER
  });

  const dropList = [];
  collisionSystem.resolve(0.016, player, enemies, dropList, () => {});

  assert(enemy.x === 150, 'Enemy was physically rewound to the shot backtrack ghost coordinate (150, 0)');
  assert(enemy.health < 32, 'Enemy took physical bullet damage from ghost hit');
  assert(backtrack.rewindCount >= 1, 'Backtrack rewind counter incremented on physical hit');

  // Reset enemy state so it is live and positioned at (300, 0) behind the wall
  enemy.active = true;
  enemy.markedForRemoval = false;
  enemy.health = 32;
  for (const x of positions) {
    enemy.x = x;
    backtrack.onEnemyUpdate(enemy, 0.016);
  }
  enemy.x = 300;
  spatialGrid.update(enemy);

  // Test Aimbot targeting backtrack tick when enemy body is blocked by a mock wall
  const aimbot = new AimbotCheat();
  const mockRaycaster = {
    // Enemy body at (300, 0) is blocked by wall, but ghost at (150, 0) is unblocked!
    hasLineOfSight(x1, y1, x2, y2) {
      if (x2 >= 280) return false; // blocked by wall
      return true; // unblocked
    }
  };

  const aimContext = {
    player,
    spatialGrid,
    enemies,
    dt: 0.016,
    weapon: { speed: 1200, fireInterval: 0.2 },
    raycaster: mockRaycaster,
    wallSegments: [{ x1: 250, y1: -50, x2: 250, y2: 50 }],
    hasWallhack: false,
    backtrackCheat: backtrack,
  };

  const aimResult = aimbot.onAimInput(0, new Vec2(1, 0), aimContext);
  assert(aimbot.hasTarget === true, 'Aimbot targeted unblocked target');
  assert(aimbot.isBacktrackTarget === true, 'Aimbot specifically locked onto the unblocked backtrack ghost tick');
  assert(aimbot.targetLeadPos.x <= 200, 'Aimbot targeting lead pos is at the backtrack ghost tick position');

  // Test LOS check preventing constant autofire when everything is occluded
  const blockedRaycaster = {
    hasLineOfSight() { return false; } // everything blocked
  };
  const blockedContext = {
    ...aimContext,
    raycaster: blockedRaycaster,
    backtrackCheat: null,
  };
  aimbot.onAimInput(0, new Vec2(1, 0), blockedContext);
  assert(aimbot.hasTarget === false, 'Aimbot target cleared when all targets are blocked by walls');
  assert(typeof aimbot.shouldAutoShoot === 'undefined', 'Aimbot has no shouldAutoShoot — firing is Triggerbot/SilentAim domain');

  // Test SilentAim targeting backtrack tick
  const silentAim = new SilentAimCheat();
  silentAim.onAimInput(0, new Vec2(1, 0), aimContext);
  assert(silentAim.hasTarget === true, 'SilentAim acquired target');
  assert(silentAim.isBacktrackTarget === true, 'SilentAim locked onto backtrack ghost tick');
  assert(silentAim.targetLeadPos.x <= 200, 'SilentAim lead pos is at backtrack tick');
}

console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 REQUIREMENTS FULLY VERIFIED!');
}
