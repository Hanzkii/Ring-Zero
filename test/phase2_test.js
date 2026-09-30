/**
 * Ring Zero - Phase 2 Verification Test Suite
 * Automated tests for weapons, ballistics, enemy archetypes, collision arbiter, and wave director.
 */

import { Vec2 } from '../src/core/VectorMath.js';
import { ObjectPool } from '../src/core/ObjectPool.js';
import { SpatialHashGrid } from '../src/systems/SpatialHashGrid.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { WeaponSystem, WEAPON_ARCHETYPES, WeaponInstance } from '../src/systems/WeaponSystem.js';
import { WaveManager, WAVE_STATE } from '../src/systems/WaveManager.js';
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { Player } from '../src/entities/Player.js';
import { Projectile } from '../src/entities/Projectile.js';
import { Enemy, ENEMY_ARCHETYPES } from '../src/entities/Enemy.js';
import { Drop, DROP_TYPE } from '../src/entities/Drop.js';
import { Camera2D } from '../src/core/Camera2D.js';
import { COLLISION_LAYER } from '../src/core/Constants.js';

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

console.log('=== RUNNING PHASE 2 AUTOMATED VERIFICATION ===\n');

// 1. WeaponSystem & Ballistics
console.log('1. Testing WeaponSystem & Archetypes:');
{
  const pool = new ObjectPool({
    factory: () => new Projectile(),
    reset: (p) => p.reset(),
    initialCapacity: 50,
  });
  const weaponSys = new WeaponSystem(pool);

  assert(weaponSys.activeWeapon.id === 'kernel_pistol', 'Default primary weapon is Kernel Pistol');
  assert(weaponSys.activeWeapon.currentAmmo === 12, 'Kernel Pistol starts with 12 rounds');

  // Test firing
  const player = new Player(0, 0);
  const camera = new Camera2D(800, 600);
  const mockInput = {
    isKeyJustPressed: () => false,
    isMouseButtonDown: () => false,
    isMouseButtonJustPressed: (btn) => btn === 0,
    aimAngle: 0,
  };

  weaponSys.update(0.016, mockInput, player, camera);
  assert(pool.activeCount === 1, 'Firing Kernel Pistol spawns 1 bullet into pool');
  assert(weaponSys.activeWeapon.currentAmmo === 11, 'Ammo decrements to 11');

  // Test reload
  weaponSys.activeWeapon.currentAmmo = 0;
  weaponSys.activeWeapon.startReload();
  assert(weaponSys.activeWeapon.isReloading === true, 'Weapon enters reload state');
  weaponSys.activeWeapon.update(1.0); // Wait reload time (0.9s)
  assert(weaponSys.activeWeapon.currentAmmo === 12, 'Weapon reloaded back to full clip');
  assert(weaponSys.activeWeapon.isReloading === false, 'Weapon exits reload state');

  // Test automatic reload when reaching 0 ammo
  weaponSys.activeWeapon.currentAmmo = 0;
  weaponSys.activeWeapon.update(0.016);
  assert(weaponSys.activeWeapon.isReloading === true, 'Weapon automatically enters reload state when ammo reaches 0');
  weaponSys.activeWeapon.update(1.0);
  assert(weaponSys.activeWeapon.currentAmmo === 12, 'Weapon auto-reload completed back to full clip');

  // Test Multi-pellet weapon (Combat Sweeper) - stored in secondary slot without force-switch
  const sweeper = new WeaponInstance(WEAPON_ARCHETYPES.COMBAT_SWEEPER);
  weaponSys.equipWeapon(sweeper, false);
  assert(weaponSys.slots[1].id === 'combat_sweeper', 'Equipped Combat Sweeper into reserve slot');
  assert(weaponSys.activeWeapon.id === 'kernel_pistol', 'Does not automatically switch active weapon on pickup');
  weaponSys.switchWeapon();
  assert(weaponSys.activeWeapon.id === 'combat_sweeper', 'Manual switch activates Combat Sweeper');

  const prevBullets = pool.activeCount;
  weaponSys.update(0.016, mockInput, player, camera);
  assert(pool.activeCount === prevBullets + 8, 'Combat Sweeper spawns 8 spread pellets in a single blast');

  // Test weapon drop despawn lifetime decay
  const dropWeapon = new Drop(0, 0, DROP_TYPE.WEAPON, { weapon: sweeper, lifetime: 2.0 });
  assert(dropWeapon.markedForRemoval === false, 'Weapon drop is active initially');
  dropWeapon.update(1.0, player);
  assert(dropWeapon.markedForRemoval === false, 'Weapon drop remains active after 1 second');
  dropWeapon.update(1.5, player); // Expired past 2.0s
  assert(dropWeapon.markedForRemoval === true, 'Weapon drop automatically despawns after lifetime expires');
}

// 2. Projectile Piercing & Lifecycle
console.log('\n2. Testing Projectile Piercing:');
{
  const proj = new Projectile();
  proj.spawn({
    x: 0,
    y: 0,
    angle: 0,
    speed: 1000,
    damage: 100,
    pierce: 2,
  });

  const dummy1 = new Enemy(10, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  const dummy2 = new Enemy(20, 0, ENEMY_ARCHETYPES.BIT_SCANNER);

  const despawnOnHit1 = proj.onHit(dummy1);
  assert(despawnOnHit1 === false, 'Piercing projectile does not despawn on first hit (1/2 hits left)');
  assert(proj.hitsRemaining === 1, 'Hits remaining decrements to 1');

  const despawnOnHit2 = proj.onHit(dummy2);
  assert(despawnOnHit2 === true, 'Projectile marks for removal after exhausting pierce capacity');
  assert(proj.markedForRemoval === true, 'markedForRemoval flag is set');
}

// 3. Enemy Archetypes & Swarm AI
console.log('\n3. Testing Enemy Archetypes & AI:');
{
  const scanner = new Enemy(100, 100, ENEMY_ARCHETYPES.BIT_SCANNER);
  const watchdog = new Enemy(200, 200, ENEMY_ARCHETYPES.WATCHDOG);
  const memoryLeak = new Enemy(300, 300, ENEMY_ARCHETYPES.MEMORY_LEAK);
  const sentinel = new Enemy(400, 400, ENEMY_ARCHETYPES.SENTINEL);

  assert(scanner.health === 32, 'Bit-Scanner has 32 health');
  assert(watchdog.health === 85, 'Watchdog has 85 health');
  assert(memoryLeak.health === 240, 'Memory-Leak has 240 health');
  assert(sentinel.health === 140, 'Sentinel has 140 health');

  // Damage test
  const dead = scanner.takeDamage(40);
  assert(dead === true, 'Bit-Scanner dies when damage exceeds max health');
  assert(scanner.markedForRemoval === true, 'Enemy marked for removal');

  // Drop generation
  const drops = memoryLeak.generateDrops();
  assert(drops.length >= 1, 'Destroyed enemy generates at least 1 loot drop');
  assert(drops[0].type === DROP_TYPE.XP, 'First drop is Memory Fragment XP');
}

// 4. CollisionSystem Resolution
console.log('\n4. Testing CollisionSystem:');
{
  const spatialGrid = new SpatialHashGrid(128);
  const projectilePool = new ObjectPool({
    factory: () => new Projectile(),
    reset: (p) => p.reset(),
    initialCapacity: 20,
  });
  const particleSystem = new ParticleSystem(100);
  const weaponSystem = new WeaponSystem(projectilePool);
  const camera = new Camera2D(800, 600);

  const collisionSystem = new CollisionSystem({
    spatialGrid,
    projectilePool,
    particleSystem,
    weaponSystem,
    camera,
  });

  const player = new Player(0, 0);
  const enemy = new Enemy(50, 0, ENEMY_ARCHETYPES.BIT_SCANNER);
  spatialGrid.insert(enemy);

  // Spawn projectile directly overlapping enemy
  const proj = projectilePool.obtain();
  proj.spawn({
    x: 50,
    y: 0,
    angle: 0,
    damage: 50,
    pierce: 1,
    layer: COLLISION_LAYER.PROJECTILE_PLAYER,
  });

  const enemies = [enemy];
  const drops = [];
  let splitSpawned = false;

  collisionSystem.resolve(0.016, player, enemies, drops, () => { splitSpawned = true; });

  assert(enemy.markedForRemoval === true, 'Bullet successfully hit and eliminated enemy');
  assert(drops.length > 0, 'Eliminated enemy added loot to drops list');

  // Test player XP collection
  const xpDrop = drops[0];
  xpDrop.x = player.x;
  xpDrop.y = player.y;
  spatialGrid.insert(xpDrop);

  const initialXP = player.xp;
  collisionSystem.resolve(0.016, player, enemies, drops, () => {});
  assert(player.xp > initialXP, 'Player collected XP from memory fragment');
  assert(xpDrop.markedForRemoval === true, 'Collected drop is marked for removal');
}

// 5. WaveManager Pacing & Escalation
console.log('\n5. Testing WaveManager:');
{
  let spawnedCount = 0;
  const waveMgr = new WaveManager({
    onSpawnEnemy: () => { spawnedCount++; },
  });

  assert(waveMgr.waveNumber === 1, 'Initial wave is 1');
  assert(waveMgr.state === WAVE_STATE.PREPARING, 'Wave begins in PREPARING telemetry state');

  // Advance past prep timer (2.0s)
  waveMgr.update(2.1, new Player(0, 0), 0);
  assert(waveMgr.state === WAVE_STATE.COMBAT, 'Wave transitions to COMBAT state after prep');

  // Advance to spawn enemies
  waveMgr.update(1.5, new Player(0, 0), 0);
  assert(spawnedCount > 0, 'Wave director spawned security daemons into arena');
  assert(waveMgr.budgetSpent > 0, 'Director tracked budget expenditure');
}

console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 2 SYSTEMS VERIFIED SUCCESSFULLY!');
}
